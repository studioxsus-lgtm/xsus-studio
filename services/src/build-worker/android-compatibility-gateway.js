// Compatibility gate only; review authenticity and execution authorization belong to the trusted server.
export function assessAndroidCompatibility(plan, review) {
  const ui = plan?.functional?.ui;
  const android = ui?.android;
  if (!android || !Array.isArray(android.features) || !Array.isArray(plan.unresolved) ||
      !Array.isArray(plan.storage) || !Array.isArray(plan.database) ||
      !Array.isArray(plan.requested_controls) || !Array.isArray(plan.suggested_controls) ||
      !Array.isArray(plan.permissions)) throw new Error("Invalid Android plan");
  const issues = [];
  if (!/^[a-f0-9]{64}$/.test(android.snapshot_digest ?? "") ||
      review?.snapshot_digest !== android.snapshot_digest ||
      review?.project_id !== android.project_id || review?.revision !== android.revision ||
      review?.status !== "accepted" || review?.execution_authorized !== false)
    issues.push("review_mismatch");
  if (plan.execution_authorized !== false) issues.push("invalid_authorization");
  if (plan.unresolved.length) issues.push("unresolved_requirements");
  const tasks = android.features.includes("task_management") &&
    android.features.every(f => ["task_management","search","filter"].includes(f));
  const restaurant = android.features.length === 1 && android.features[0] === "restaurant_orders" && ui.navigation === "bottom_bar";
  if (!tasks && !restaurant) issues.push("unsupported_features");
  if (plan.storage.length !== 1 || plan.storage[0] !== "atomic_json") issues.push("unsupported_storage");
  if (plan.database.length || plan.requested_controls.length || plan.suggested_controls.length || plan.permissions.length)
    issues.push("unsupported_security_or_database");
  if (!["single_screen","bottom_bar"].includes(ui.navigation) || ui.style !== "modern" ||
      ui.motion !== "system" || ui.adaptive_layout !== false || ui.typography !== "material_default" ||
      ui.design_system !== "material3" || ui.toolkit !== "jetpack_compose" ||
      !["system","dark","light"].includes(ui.theme) || !/^#[0-9a-fA-F]{6}$/.test(ui.primary_seed ?? ""))
    issues.push("unsupported_design");
  return {status:issues.length ? "review_required":"compatible",issues,execution_authorized:false};
}


