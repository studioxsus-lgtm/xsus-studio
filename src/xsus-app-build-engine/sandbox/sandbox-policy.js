export const SANDBOX_POLICY_VERSION="0.1.0";
const LIMITS=Object.freeze({timeoutMs:30000,memoryMb:256,cpuMs:15000,maxOutputBytes:65536});
export function createSandboxPolicy(input={}){
  if(!input || typeof input!=="object" || Array.isArray(input))throw new TypeError("Invalid sandbox policy");
  for(const key of Object.keys(input))if(!Object.hasOwn(LIMITS,key))throw new TypeError("Unsupported sandbox policy option");
  const policy={};
  for(const [key,limit] of Object.entries(LIMITS)){
    const value=input[key]??limit;
    if(!Number.isSafeInteger(value)||value<1||value>limit)throw new RangeError("Sandbox limit exceeds permitted maximum");
    policy[key]=value;
  }
  return Object.freeze({version:SANDBOX_POLICY_VERSION,...policy,network:"disabled",filesystem:"ephemeral",privileged:false});
}
