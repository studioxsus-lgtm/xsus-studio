import { APP_SPECIFICATION_CONTRACT_VERSION, deepFreeze, validatePlanningResult } from "./contract.js";
import { bookingProfile } from "./profiles/booking.js";
import { onlineStoreProfile } from "./profiles/online-store.js";
import { taskManagerProfile } from "./profiles/task-manager.js";

const GENERAL_PROFILE = Object.freeze({
  id: "general",
  productLabel: "Application",
  pages: [],
  components: [],
  dataModels: [],
  interactions: [],
  questions: [
    "Which pages or screens should the application contain?",
    "Which information should the application store?",
    "What actions should each user be able to perform?",
    "Are there different user roles or permissions?"
  ]
});

function profileFor(goal) {
  return [taskManagerProfile, bookingProfile, onlineStoreProfile].find(profile => profile.matches(goal)) ?? GENERAL_PROFILE;
}

export function createAppSpecification(result) {
  validatePlanningResult(result);
  const goal = result.plan.goal.trim();
  const profile = profileFor(goal);
  return deepFreeze({
    contractVersion: APP_SPECIFICATION_CONTRACT_VERSION,
    kind: "xsus-app-specification",
    state: "draft",
    requestId: result.requestId,
    product: { profileId: profile.id, label: profile.productLabel, goal },
    requirements: result.plan.steps.map(step => ({
      id: step.id,
      text: step.task.trim(),
      dependsOn: [...step.dependsOn],
      source: "user-supplied-plan"
    })),
    proposedStructure: {
      pages: [...profile.pages],
      components: [...profile.components],
      dataModels: [...profile.dataModels],
      interactions: [...profile.interactions]
    },
    openQuestions: [...profile.questions],
    review: { requiredBeforeImplementation: true, acceptedByUser: false },
    safety: { codeGenerated: false, codeExecuted: false, persisted: false, deployed: false }
  });
}
