from dataclasses import replace
import unittest

from core.contracts.common import Audio, Capability, ContractVersion, LanguageTag, V1
from core.contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance, LanguageSupport
from core.contracts.errors import EngineError, ErrorCode
from core.contracts.request import Conversation, EngineRequest, SpeechSynthesis, Transcription, Translation
from core.contracts.response import AudioResult, EngineResponse, TextResult, TranscriptResult

SQ = LanguageTag("sq")
EN = LanguageTag("en")
FR = LanguageTag("fr")
WAV = Audio(b"opaque test fixture", "audio/wav")


class EngineContractTests(unittest.TestCase):
    def setUp(self):
        self.request = EngineRequest("req-1", "attempt-1", V1, SQ, 1_800_000_000_000, Conversation("Mirëdita"))
        self.identity = EngineIdentity("xsus-sq", "0.1.0", V1)
        self.tirana = EngineInstance(self.identity, "tirana-01")
        self.brussels = EngineInstance(self.identity, "brussels-01")
        self.support = LanguageSupport(
            SQ,
            frozenset(Capability),
            translation_targets=frozenset({EN}),
            transcription_formats=frozenset({"audio/wav"}),
            voice_ids=frozenset({"albanian-default"}),
        )
        self.descriptor = EngineDescriptor(self.identity, (self.support,))

    def response(self, request, instance, outcome):
        return EngineResponse(request.request_id, request.attempt_id, instance, outcome)

    def test_locale_keys_are_case_insensitive_and_allow_script_and_region(self):
        self.assertEqual(LanguageTag("ZH-Hant-TW"), LanguageTag("zh-hant-tw"))
        for value in ("sq_AL", "../sq", "sl-rozaj-rozaj"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                LanguageTag(value)

    def test_compatibility_requires_same_major_and_sufficient_minor(self):
        self.assertTrue(ContractVersion(1, 2).supports(V1))
        self.assertFalse(V1.supports(ContractVersion(1, 1)))
        self.assertFalse(ContractVersion(2, 0).supports(V1))
        with self.assertRaises(ValueError):
            ContractVersion(True, 0)

    def test_routing_matches_exact_language_variant(self):
        self.assertTrue(self.descriptor.accepts(self.request))
        self.assertFalse(self.descriptor.accepts(replace(self.request, language=LanguageTag("sq-AL"))))
        self.assertFalse(self.descriptor.accepts(replace(self.request, language=EN)))
        self.assertFalse(self.descriptor.accepts(replace(self.request, contract=ContractVersion(2, 0))))

    def test_language_declarations_cannot_mix_primary_languages(self):
        with self.assertRaises(ValueError):
            EngineDescriptor(self.identity, (self.support, LanguageSupport(EN, frozenset())))

    def test_translation_requires_an_advertised_direction(self):
        self.assertTrue(self.descriptor.accepts(replace(self.request, operation=Translation("Mirëdita", EN))))
        self.assertFalse(self.descriptor.accepts(replace(self.request, operation=Translation("Mirëdita", FR))))
        with self.assertRaises(ValueError):
            replace(self.request, operation=Translation("Mirëdita", SQ))

    def test_translation_result_must_use_the_target_language(self):
        request = replace(self.request, operation=Translation("Mirëdita", EN))
        self.response(request, self.tirana, TextResult("Good afternoon", EN)).validate_for(request, self.tirana)
        with self.assertRaisesRegex(ValueError, "expected language"):
            self.response(request, self.tirana, TextResult("Mirëdita", SQ)).validate_for(request, self.tirana)

    def test_transcription_accepts_supported_format_and_empty_silence(self):
        request = replace(self.request, operation=Transcription(WAV))
        self.assertTrue(self.descriptor.accepts(request))
        self.response(request, self.tirana, TranscriptResult("", SQ)).validate_for(request, self.tirana)
        self.assertFalse(self.descriptor.accepts(replace(request, operation=Transcription(Audio(b"x", "audio/ogg")))))

    def test_synthesis_requires_an_advertised_voice_and_audio_output(self):
        request = replace(self.request, operation=SpeechSynthesis("Mirëdita", "albanian-default"))
        self.assertTrue(self.descriptor.accepts(request))
        self.assertFalse(self.descriptor.accepts(replace(request, operation=SpeechSynthesis("Mirëdita", "other"))))
        self.response(request, self.tirana, AudioResult(WAV, SQ)).validate_for(request, self.tirana)
        with self.assertRaisesRegex(ValueError, "must return audio"):
            self.response(request, self.tirana, TextResult("Mirëdita", SQ)).validate_for(request, self.tirana)

    def test_retry_keeps_request_deadline_and_rejects_late_or_wrong_instance(self):
        retry = replace(self.request, attempt_id="attempt-2")
        self.assertEqual(retry.request_id, self.request.request_id)
        self.assertEqual(retry.deadline_unix_ms, self.request.deadline_unix_ms)
        self.assertEqual(self.tirana.engine, self.brussels.engine)
        self.response(retry, self.brussels, TextResult("Mirëdita", SQ)).validate_for(retry, self.brussels)
        with self.assertRaisesRegex(ValueError, "different request or attempt"):
            self.response(self.request, self.tirana, TextResult("Mirëdita", SQ)).validate_for(retry, self.brussels)
        with self.assertRaisesRegex(ValueError, "different engine instance"):
            self.response(retry, self.tirana, TextResult("Mirëdita", SQ)).validate_for(retry, self.brussels)

    def test_only_transient_instance_errors_allow_trying_another_instance(self):
        transient = {ErrorCode.INSTANCE_OVERLOADED, ErrorCode.INSTANCE_TIMEOUT, ErrorCode.INSTANCE_UNAVAILABLE}
        for code in ErrorCode:
            with self.subTest(code=code):
                self.assertEqual(EngineError(code, "Test error").allows_alternate_instance, code in transient)

    def test_invalid_deadlines_and_payloads_fail_at_the_boundary(self):
        for value in (0, -1, True):
            with self.subTest(value=value), self.assertRaises(ValueError):
                replace(self.request, deadline_unix_ms=value)
        with self.assertRaises(ValueError):
            Conversation(" ")
        with self.assertRaises(ValueError):
            Audio(b"", "audio/wav")
