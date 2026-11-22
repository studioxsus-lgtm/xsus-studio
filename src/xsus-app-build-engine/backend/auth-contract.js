export const AUTH_CONTRACT_VERSION="0.1.0";
export function assertAuthenticatedActor(actor) {
  if(!actor || typeof actor!=="object" || typeof actor.userId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actor.userId)) throw new TypeError("Authenticated actor must have a valid user UUID");
  if(actor.verified!==true) throw new Error("Actor must be verified by trusted server authentication");
  return Object.freeze({version:AUTH_CONTRACT_VERSION,userId:actor.userId});
}
