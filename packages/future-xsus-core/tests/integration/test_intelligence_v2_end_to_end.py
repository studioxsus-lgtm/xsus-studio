"""Cross-component regression checks; not production acceptance."""
import unittest
from core.intelligence.knowledge_v1 import KnowledgeStore, KnowledgeRecord, Evidence
from core.intelligence.knowledge_v2 import EvidenceReasoner
from core.intelligence.reasoning_v1 import Rule
from core.intelligence.problem_solver_v2 import ComplexProblemSolver
from core.intelligence.adaptive_learning_v2 import LearningCase, evaluate_candidate
from core.intelligence.multi_engine_v2 import AdvancedCoordinator
from core.intelligence.solution_search_v2 import search_solutions, verify_search
from core.intelligence.task_planner_v1 import Task
from core.intelligence.unseen_evaluation_v2 import evaluate_generated

class IntelligenceV2Integration(unittest.TestCase):
    def setUp(self):
        self.store=KnowledgeStore((KnowledgeRecord("a","true",Evidence.from_excerpt("source","a"),"alice"),))
        self.rules=(Rule(("a",),"b"),Rule(("b",),"goal"),Rule(("a",),"goal"))
        self.tasks=(Task("review","Review",("prepare",)),Task("prepare","Prepare"))
    def test_agreement(self):
        solution=ComplexProblemSolver().solve(("b","goal"),("a",),self.rules)
        coordination=AdvancedCoordinator(self.store).propose("alice",solution.goals,self.rules,self.tasks)
        self.assertEqual(solution.status,"solved")
        self.assertEqual(coordination.status,"proposed")
        self.assertEqual(tuple(e.query for e in coordination.evidence),solution.resolved)
        self.assertTrue(all(e.verified_derivation and not e.external_truth_verified for e in coordination.evidence))
        search=search_solutions("goal",("a",),self.rules)
        self.assertTrue(verify_search(search,("a",),self.rules))
        self.assertEqual(len(search.alternatives),2)
        self.assertFalse(coordination.execution_authorized or search.execution_authorized or solution.executable)
    def test_conflict_blocks_coordination(self):
        store=self.store.add(KnowledgeRecord("b","false",Evidence.from_excerpt("other","not b"),"alice"))
        result=AdvancedCoordinator(store).propose("alice",("b","goal"),self.rules,self.tasks)
        self.assertEqual(result.status,"abstained")
        self.assertEqual(result.ordered_tasks,())
        self.assertEqual(result.evidence[1].status,"supported")
        self.assertEqual(EvidenceReasoner(store).infer("bob","goal",self.rules).status,"unknown")
    def test_candidate_not_promoted(self):
        candidate=self.rules+(Rule(("goal",),"new_goal"),)
        report=evaluate_candidate(self.rules,candidate,(LearningCase(("a",),"new_goal",True),),
                                  (LearningCase(("a","extra"),"new_goal",True),LearningCase(("extra",),"new_goal",False)))
        self.assertEqual(report["status"],"eligible_for_manual_review")
        self.assertFalse(report["promotion_authorized"])
        self.assertEqual(EvidenceReasoner(self.store).infer("alice","new_goal",self.rules).status,"unknown")
    def test_deep_consistency(self):
        rules=tuple(Rule((f"a{i}",),f"a{i+1}") for i in range(256))
        store=KnowledgeStore((KnowledgeRecord("a0","true",Evidence.from_excerpt("source","a0"),"alice"),))
        result=AdvancedCoordinator(store).propose("alice",("a128","a256"),rules,self.tasks)
        self.assertEqual(result.status,"proposed")
        self.assertEqual(len(result.evidence[-1].proof),257)
        self.assertEqual(ComplexProblemSolver().solve(result.goals,("a0",),rules).status,"solved")
    def test_generated_regression(self):
        report=evaluate_generated(101001,cases=256)
        self.assertEqual(report["passed"],256)
        self.assertFalse(report["production_ready"])
