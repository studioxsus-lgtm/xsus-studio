import unittest
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace

from core.contracts.common import Audio, Capability, ContractVersion, LanguageTag, V1
from core.contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance, LanguageSupport
from core.contracts.request import Conversation, EngineRequest, SpeechSynthesis, Transcription, Translation
from core.registry.engine_registry import EngineRegistry
from core.registry.errors import RegistrationConflict, UnknownEngine, UnknownInstance
from core.registry.instance import InstanceStatus

SQ = LanguageTag("sq")
EN = LanguageTag("en")
FR = LanguageTag("fr")


class EngineRegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = EngineRegistry()
        self.engine = EngineIdentity("xsus-sq", "1.0.0", V1)
        self.support = LanguageSupport(
            SQ,
            frozenset(Capability),
            translation_targets=frozenset({EN}),
            transcription_formats=frozenset({"audio/wav"}),
            voice_ids=frozenset({"sq-natural"}),
        )
        self.descriptor = EngineDescriptor(self.engine, (self.support,))
        self.registry.register_engine(self.descriptor)
        self.tirana = EngineInstance(self.engine, "tirana-01")
        self.brussels = EngineInstance(self.engine, "brussels-01")
        self.request = EngineRequest(
            "request-1", "attempt-1", V1, SQ, 2_000_000_000_000,
            Transcription(Audio(b"test audio", "audio/wav")),
        )

    def test_returns_both_ready_replicas_and_removes_unavailable_one(self):
        self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        self.registry.register_instance(self.brussels, status=InstanceStatus.READY)
        self.assertEqual(self.registry.candidates(self.request), (self.brussels, self.tirana))
        self.registry.set_instance_status("tirana-01", InstanceStatus.UNAVAILABLE)
        self.assertEqual(self.registry.candidates(self.request), (self.brussels,))

    def test_new_instances_are_unavailable_until_ready_and_draining_leaves_routes(self):
        self.registry.register_instance(self.tirana)
        self.assertEqual(self.registry.candidates(self.request), ())
        self.registry.set_instance_status("tirana-01", InstanceStatus.READY)
        self.assertEqual(self.registry.candidates(self.request), (self.tirana,))
        self.registry.set_instance_status("tirana-01", InstanceStatus.DRAINING)
        self.assertEqual(self.registry.candidates(self.request), ())

    def test_repeated_registration_preserves_current_status(self):
        self.registry.register_engine(self.descriptor)
        self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        self.registry.set_instance_status("tirana-01", InstanceStatus.DRAINING)
        record = self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        self.assertIs(record.status, InstanceStatus.DRAINING)
        self.assertEqual(self.registry.candidates(self.request), ())

    def test_conflicting_declarations_and_instances_do_not_change_state(self):
        self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        other_contract = replace(self.engine, contract=ContractVersion(2, 0))
        with self.assertRaises(RegistrationConflict):
            self.registry.register_engine(EngineDescriptor(other_contract, (self.support,)))
        with self.assertRaises(RegistrationConflict):
            self.registry.register_instance(EngineInstance(other_contract, "tirana-02"))
        with self.assertRaises(RegistrationConflict):
            self.registry.register_instance(replace(self.tirana, engine=other_contract))
        self.assertEqual(self.registry.candidates(self.request), (self.tirana,))

    def test_unknown_engine_and_instance_have_distinct_errors(self):
        instance = replace(self.tirana, engine=replace(self.engine, revision="missing"))
        with self.assertRaises(UnknownEngine):
            self.registry.register_instance(instance)
        with self.assertRaises(UnknownInstance):
            self.registry.set_instance_status("missing", InstanceStatus.READY)

    def test_routing_uses_exact_locale_and_contract(self):
        self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        for request in (
            replace(self.request, language=LanguageTag("sq-AL")),
            replace(self.request, language=EN),
            replace(self.request, contract=ContractVersion(2, 0)),
            replace(self.request, operation=Transcription(Audio(b"x", "audio/ogg"))),
        ):
            with self.subTest(request=request):
                self.assertEqual(self.registry.candidates(request), ())

    def test_routing_honors_translation_targets_and_synthesis_voices(self):
        self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        for accepted, rejected in (
            (Translation("Mirëdita", EN), Translation("Mirëdita", FR)),
            (SpeechSynthesis("Mirëdita", "sq-natural"), SpeechSynthesis("Mirëdita", "unknown")),
        ):
            with self.subTest(operation=accepted):
                self.assertEqual(self.registry.candidates(replace(self.request, operation=accepted)), (self.tirana,))
                self.assertEqual(self.registry.candidates(replace(self.request, operation=rejected)), ())

    def test_candidate_lookup_can_pin_revision_and_exclude_attempted_instances(self):
        newer = replace(self.engine, revision="2.0.0")
        other_revision = EngineInstance(newer, "vienna-01")
        self.registry.register_engine(EngineDescriptor(newer, (self.support,)))
        for instance in (self.tirana, self.brussels, other_revision):
            self.registry.register_instance(instance, status=InstanceStatus.READY)
        self.assertEqual(len(self.registry.candidates(self.request)), 3)
        self.assertEqual(
            self.registry.candidates(self.request, engine=self.engine, exclude_instance_ids=("tirana-01",)),
            (self.brussels,),
        )

    def test_unregister_removes_all_routes_for_the_instance(self):
        self.registry.register_instance(self.tirana, status=InstanceStatus.READY)
        self.assertTrue(self.registry.unregister_instance("tirana-01"))
        self.assertFalse(self.registry.unregister_instance("tirana-01"))
        self.assertEqual(self.registry.candidates(self.request), ())
        self.assertEqual(self.registry.candidates(replace(self.request, operation=Conversation("Mirëdita"))), ())

    def test_concurrent_updates_keep_ready_index_consistent(self):
        def update(number):
            instance = EngineInstance(self.engine, f"replica-{number}")
            self.registry.register_instance(instance)
            self.registry.set_instance_status(instance.instance_id, InstanceStatus.READY)
            if number % 2:
                self.registry.unregister_instance(instance.instance_id)

        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(update, range(60)))

        self.assertEqual(
            {instance.instance_id for instance in self.registry.candidates(self.request)},
            {f"replica-{number}" for number in range(0, 60, 2)},
        )
