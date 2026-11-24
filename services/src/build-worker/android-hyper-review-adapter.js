// Trusted transport must authenticate the Hyper peer. This adapter does not authorize execution.
export async function requestAndroidHyperReview(request, transport) {
  if (!request || request.schema_version !== "1.0" || request.operation !== "project.review" ||
      request.source !== "future-xsus-core" || request.destination !== "hyper-xsus-core" ||
      request.execution_authorized !== false || typeof request.project_id !== "string" ||
      !request.project_id.trim() || !Number.isSafeInteger(request.revision) || request.revision < 0 ||
      !/^[a-f0-9]{64}$/.test(request.snapshot_digest ?? "") ||
      request.specification?.application?.platform !== "android" ||
      request.specification.project_id !== request.project_id ||
      request.specification.revision !== request.revision || typeof transport !== "function")
    throw new Error("Invalid review request");
  const expected = Object.fromEntries(["schema_version","project_id","revision","snapshot_digest"].map(k=>[k,request[k]]));
  const response = await transport(structuredClone(request));
  const keys = [...Object.keys(expected),"status","findings"].sort();
  if (!response || Object.keys(response).sort().join("|") !== keys.join("|") ||
      Object.keys(expected).some(k=>response[k] !== expected[k]) ||
      !["accepted","needs_changes","rejected"].includes(response.status) ||
      !Array.isArray(response.findings) || response.findings.length > 128 ||
      response.findings.some(f=>typeof f !== "string" || f.length > 2048))
    throw new Error("Invalid review response");
  return {...expected,status:response.status,findings:[...response.findings],execution_authorized:false};
}
