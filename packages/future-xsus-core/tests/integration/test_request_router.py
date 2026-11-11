import unittest
from dataclasses import replace

from core.contracts.common import Capability, LanguageTag, V1
from core.contracts.engine import EngineDescriptor, EngineIdentity, EngineInstance, LanguageSupport
from core.contracts.request import Conversation, EngineRequest
from core.registry.engine_registry import EngineRegistry
from core.registry.instance import InstanceStatus
from core.routing.metrics import InstanceMetrics, RoutingMetrics
from core.routing.request_router import RequestRouter

SQ = LanguageTag("sq")
EN = LanguageTag("en")


class RequestRouterTests(unittest.TestCase):
    def setUp(self):
        self.now = 10_000_000_000
        self.metrics = RoutingMetrics(ttl_ms=1_000, clock_ns=lambda: self.now)
        self.registry = EngineRegistry()
        self.router = RequestRouter(self.registry, self.metrics)
        self.engine = EngineIdentity("xsus-sq", "1", V1)
        self.support = LanguageSupport(SQ, frozenset({Capability.CONVERSATION}))
        self.registry.register_engine(EngineDescriptor(self.engine, (self.support,)))
        self.tirana = self.register_ready("tirana", self.engine)
        self.brussels = self.register_ready("brussels", self.engine)
        self.request = EngineRequest("request-1", "attempt-1", V1, SQ, 2_000_000_000_000, Conversation("Mirëdita"))

    def register_ready(self, instance_id, engine):
        instance = EngineInstance(engine, instance_id)
        self.registry.register_instance(instance, status=InstanceStatus.READY)
        return instance

    def sample(self, instance, latency_us, in_flight=0, capacity=10):
        self.metrics.record(instance.instance_id, InstanceMetrics(latency_us, in_flight, capacity))

    def test_prefers_lower_latency_at_equal_load(self):
        self.sample(self.tirana, 20_000, in_flight=2)
        self.sample(self.brussels, 10_000, in_flight=2)
        choice = self.router.select(self.request)
        self.assertEqual(choice.instance, self.brussels)
        self.assertEqual(choice.estimated_delay_us, 12_500)

    def test_load_update_can_change_the_first_choice(self):
        self.sample(self.tirana, 20_000)
        self.sample(self.brussels, 10_000)
        self.assertEqual(self.router.select(self.request).instance, self.brussels)
        self.now += 1
        self.sample(self.brussels, 10_000, in_flight=8)
        self.assertEqual(
            [option.instance for option in self.router.rank(self.request)],
            [self.tirana, self.brussels],
        )

    def test_full_and_over_capacity_instances_are_skipped(self):
        self.sample(self.tirana, 10_000, in_flight=10)
        self.sample(self.brussels, 10_000, in_flight=11)
        self.assertIsNone(self.router.select(self.request))
        self.assertEqual(self.router.rank(self.request), ())

    def test_unknown_candidate_is_retained_when_measured_candidate_is_full(self):
        self.sample(self.brussels, 10_000, in_flight=10)
        choice = self.router.select(self.request)
        self.assertEqual(choice.instance, self.tirana)
        self.assertIsNone(choice.estimated_delay_us)

    def test_expired_measurements_fall_back_behind_fresh_ones(self):
        self.sample(self.brussels, 1)
        self.now += 1_000_000_000
        self.sample(self.tirana, 20_000)
        ranked = self.router.rank(self.request)
        self.assertEqual([option.instance for option in ranked], [self.tirana, self.brussels])
        self.assertIsNone(ranked[1].estimated_delay_us)

    def test_equal_estimates_and_unknown_metrics_have_stable_order(self):
        expected = [self.brussels, self.tirana]
        self.assertEqual([choice.instance for choice in self.router.rank(self.request)], expected)
        self.sample(self.tirana, 1_000)
        self.sample(self.brussels, 1_000)
        self.assertEqual([choice.instance for choice in self.router.rank(self.request)], expected)
        self.assertEqual(self.router.select(self.request), self.router.rank(self.request)[0])

    def test_unavailable_and_incompatible_instances_are_ignored(self):
        self.sample(self.brussels, 1)
        self.registry.set_instance_status("brussels", InstanceStatus.UNAVAILABLE)
        english = EngineIdentity("xsus-en", "1", V1)
        self.registry.register_engine(
            EngineDescriptor(english, (LanguageSupport(EN, self.support.capabilities),))
        )
        self.sample(self.register_ready("fast-english", english), 1)
        self.assertEqual(self.router.select(self.request).instance, self.tirana)

    def test_failover_filters_pin_revision_and_exclude_previous_instance(self):
        other_revision = replace(self.engine, revision="2")
        self.registry.register_engine(EngineDescriptor(other_revision, (self.support,)))
        self.sample(self.register_ready("fast-other-revision", other_revision), 1)
        self.assertEqual(
            self.router.select(
                self.request, engine=self.engine, exclude_instance_ids=("brussels",)
            ).instance,
            self.tirana,
        )

    def test_older_or_duplicate_samples_do_not_replace_newer_measurement(self):
        self.sample(self.tirana, 20_000)
        self.assertFalse(self.metrics.record("tirana", InstanceMetrics(1, 0, 1)))
        self.assertFalse(
            self.metrics.record("tirana", InstanceMetrics(1, 0, 1), observed_at_ns=self.now - 1)
        )
        self.assertEqual(self.metrics.snapshot(("tirana",))["tirana"].latency_us, 20_000)

    def test_future_timestamps_and_invalid_metrics_are_rejected(self):
        for values in ((0, 0, 1), (True, 0, 1), (1, -1, 1), (1, 0, 0)):
            with self.subTest(values=values), self.assertRaises(ValueError):
                InstanceMetrics(*values)
        with self.assertRaises(ValueError):
            self.metrics.record("tirana", InstanceMetrics(1, 0, 1), observed_at_ns=self.now + 1)

    def test_snapshot_only_reads_requested_ids_and_forget_removes_observation(self):
        self.sample(self.tirana, 10_000)
        self.sample(self.brussels, 20_000)
        self.assertEqual(set(self.metrics.snapshot(iter(("tirana", "missing")))), {"tirana"})
        self.assertTrue(self.metrics.forget("tirana"))
        self.assertFalse(self.metrics.forget("tirana"))
        self.assertEqual(self.metrics.snapshot(("tirana",)), {})
