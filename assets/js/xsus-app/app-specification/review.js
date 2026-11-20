const EDITABLE_SECTIONS = Object.freeze(["pages", "components", "dataModels", "interactions", "requirements"]);
const MAX_ITEMS = 40;
const MAX_ITEM_LENGTH = 240;

export function createSpecificationReviewDraft(specification) {
  return {
    state: "draft",
    product: { ...specification.product },
    proposedStructure: {
      pages: [...specification.proposedStructure.pages],
      components: [...specification.proposedStructure.components],
      dataModels: [...specification.proposedStructure.dataModels],
      interactions: [...specification.proposedStructure.interactions]
    },
    requirements: specification.requirements.map(item => item.text),
    openQuestions: [...specification.openQuestions]
  };
}

export function parseSpecificationList(value) {
  if (typeof value !== "string") return [];
  return value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
}

export function validateSpecificationReviewDraft(draft) {
  const errors = [];
  if (!draft || draft.state !== "draft" || !draft.proposedStructure || !Array.isArray(draft.requirements)) {
    return ["invalid_draft"];
  }
  for (const key of EDITABLE_SECTIONS.slice(0, 4)) {
    const items = draft.proposedStructure[key];
    if (!Array.isArray(items)) {
      errors.push(`invalid_${key}`);
      continue;
    }
    if (items.length > MAX_ITEMS || items.some(item => typeof item !== "string" || item.length > MAX_ITEM_LENGTH)) {
      errors.push(`invalid_${key}`);
    }
  }
  if (draft.proposedStructure.pages?.length < 1) errors.push("pages_required");
  if (draft.requirements.length < 1) errors.push("requirements_required");
  if (draft.requirements.length > MAX_ITEMS || draft.requirements.some(item => typeof item !== "string" || !item.trim() || item.length > MAX_ITEM_LENGTH)) {
    errors.push("invalid_requirements");
  }
  return errors;
}

export function approveSpecificationReviewDraft(draft) {
  const errors = validateSpecificationReviewDraft(draft);
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    specification: {
      ...draft,
      state: "approved_for_next_phase",
      requirements: [...draft.requirements],
      proposedStructure: Object.fromEntries(EDITABLE_SECTIONS.slice(0, 4).map(key => [key, [...draft.proposedStructure[key]]])),
      review: { requiredBeforeImplementation: false, acceptedByUser: true },
      safety: { codeGenerated: false, codeExecuted: false, persisted: false, deployed: false }
    }
  };
}
