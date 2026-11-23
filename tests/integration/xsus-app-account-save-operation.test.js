import {describe,it,expect} from 'vitest';
import {updateLinkedAccountProject} from '../../assets/js/xsus-app/account-save-operation.js';
function mockClient({row='project-1',error=null}={}){
  const calls=[];
  const query={
    eq(...args){calls.push(['eq',...args]);return this;},
    is(...args){calls.push(['is',...args]);return this;},
    select(...args){calls.push(['select',...args]);return this;},
    async maybeSingle(){return {data:row?{id:row}:null,error};}
  };
  return {calls,from(table){calls.push(['from',table]);return {update(payload){calls.push(['update',payload]);return query;}}}};
}
const base={owner:'user-1',id:'project-1',token:'rev-1',snapshot:{version:1,saveToken:'rev-2'}};
describe('XSUS App phase 1.6 account persistence integration contract',()=>{
  it('updates only the correct owner, project and revision',async()=>{
    const client=mockClient();
    expect(await updateLinkedAccountProject(client,base)).toBe('saved');
    expect(client.calls).toContainEqual(['eq','owner_id','user-1']);
    expect(client.calls).toContainEqual(['eq','id','project-1']);
    expect(client.calls).toContainEqual(['eq','snapshot->>saveToken','rev-1']);
  });
  it('uses null-token CAS for legacy saved projects',async()=>{
    const client=mockClient();
    expect(await updateLinkedAccountProject(client,{...base,token:null,name:'Task app'})).toBe('saved');
    expect(client.calls).toContainEqual(['is','snapshot->>saveToken',null]);
    expect(client.calls).toContainEqual(['update',{name:'Task app',snapshot:base.snapshot}]);
  });
  it('treats a deleted or concurrently changed row as conflict',async()=>{
    expect(await updateLinkedAccountProject(mockClient({row:null}),base)).toBe('revision-conflict');
    expect(await updateLinkedAccountProject(mockClient({row:'other'}),base)).toBe('revision-conflict');
  });
  it('reports network/database errors as retryable, not conflicts',async()=>{
    expect(await updateLinkedAccountProject(mockClient({error:{message:'offline'},row:null}),base)).toBe('retryable-error');
  });
  it('rejects missing ownership before any database write',async()=>{
    const client=mockClient();
    await expect(updateLinkedAccountProject(client,{...base,owner:''})).rejects.toThrow(TypeError);
    expect(client.calls).toEqual([]);
  });
});
