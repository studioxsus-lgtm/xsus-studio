export const RUNTIME_RECOVERY_VERSION="0.1.0";
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const CONTAINER=/^xsus-([a-zA-Z0-9_-]{8,128})$/;
export function createRuntimeRecovery({listContainers,listStaging,removeContainer,removeStaging,isExecutionActive}={}){
  for(const [name,fn] of Object.entries({listContainers,listStaging,removeContainer,removeStaging,isExecutionActive}))
    if(typeof fn!=="function")throw new TypeError("Recovery requires "+name);
  return Object.freeze({
    async inspect(){
      const [containers,staging]=await Promise.all([listContainers(),listStaging()]);
      if(!Array.isArray(containers)||!Array.isArray(staging))throw new TypeError("Invalid recovery inventory");
      const byId=new Map();
      for(const name of containers){
        if(typeof name!=="string")throw new TypeError("Invalid container inventory");
        const match=CONTAINER.exec(name);
        if(!match)continue;
        const id=match[1];
        if(byId.get(id)?.container)throw new Error("Duplicate recovery container");
        byId.set(id,{...byId.get(id),executionId:id,container:name});
      }
      for(const id of staging){
        if(typeof id!=="string")throw new TypeError("Invalid staging inventory");
        if(!ID.test(id))continue;
        if(byId.get(id)?.staging)throw new Error("Duplicate recovery staging");
        byId.set(id,{...byId.get(id),executionId:id,staging:true});
      }
      return Object.freeze([...byId.values()].sort((a,b)=>a.executionId.localeCompare(b.executionId)).map(item=>Object.freeze({...item})));
    },
    async recover({approvedIds=[],dryRun=true}={}){
      if(!Array.isArray(approvedIds)||approvedIds.some(id=>typeof id!=="string"||!ID.test(id))||new Set(approvedIds).size!==approvedIds.length)throw new TypeError("Invalid recovery approvals");
      if(typeof dryRun!=="boolean")throw new TypeError("Invalid recovery mode");
      const inventory=await this.inspect();
      const known=new Set(inventory.map(item=>item.executionId));
      if(approvedIds.some(id=>!known.has(id)))throw new Error("Recovery approval references unknown execution");
      const selected=new Set(approvedIds);
      const actions=[];
      for(const item of inventory){
        const active=await isExecutionActive(item.executionId);
        if(typeof active!=="boolean")throw new TypeError("Invalid execution activity result");
        if(active)continue;
        if(!selected.has(item.executionId))continue;
        if(dryRun){actions.push(Object.freeze({executionId:item.executionId,status:"planned",container:Boolean(item.container),staging:Boolean(item.staging)}));continue;}
        // Container termination must complete before staging removal.
        if(item.container)await removeContainer(item.container);
        if(item.staging)await removeStaging(item.executionId);
        actions.push(Object.freeze({executionId:item.executionId,status:"cleaned",container:Boolean(item.container),staging:Boolean(item.staging)}));
      }
      return Object.freeze({dryRun,actions:Object.freeze(actions)});
    }
  });
}
