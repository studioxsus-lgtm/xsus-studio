import {assertLanguageAdapter} from "./contracts.js";
export const LANGUAGE_SPEC_VERSION="1.0.0";
const SUPPORTED_LANGUAGES=Object.freeze(["en","sq","fr"]);
function validateSpec(spec) {
  if (!spec || typeof spec!=="object" || Array.isArray(spec)) throw new TypeError("Language engine must return an object");
  if (typeof spec.intent!=="string" || !spec.intent.trim()) throw new TypeError("Language spec requires intent");
  if (!Array.isArray(spec.features) || !spec.features.every(x=>typeof x==="string" && x.trim().length>0)) throw new TypeError("Language spec requires string features");
  return Object.freeze({version:LANGUAGE_SPEC_VERSION,intent:spec.intent.trim(),features:Object.freeze([...spec.features]),language:spec.language??"en"});
}
export function createFutureLanguageAdapter({engine,timeoutMs=10000}={}) {
  if (!engine || typeof engine.interpret!=="function") throw new TypeError("Future XSUS language engine must implement interpret");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>120000) throw new RangeError("Invalid adapter timeout");
  return assertLanguageAdapter(Object.freeze({
    async normalize(input,{signal}={}) {
      if (!input || typeof input.prompt!=="string" || !input.prompt.trim()) throw new TypeError("Valid prompt required");
      if (signal?.aborted) throw new Error("Language normalization cancelled");
      const controller=new AbortController();
      const onAbort=()=>controller.abort();
      signal?.addEventListener?.("abort",onAbort,{once:true});
      const timer=setTimeout(()=>controller.abort(),timeoutMs);
      try {
        const spec=await engine.interpret({text:input.prompt,allowedLanguages:SUPPORTED_LANGUAGES},{signal:controller.signal});
        if (controller.signal.aborted) throw new Error("Language normalization aborted or timed out");
        const validated=validateSpec(spec);
        if (!SUPPORTED_LANGUAGES.includes(validated.language)) throw new TypeError("Unsupported language");
        return Object.freeze({...input,specification:validated});
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener?.("abort",onAbort);
      }
    }
  }));
}
