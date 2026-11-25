export function createWebClient({baseUrl,getToken,fetchImpl=globalThis.fetch}={}){
 const base=new URL(baseUrl);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||typeof getToken!=='function'||typeof fetchImpl!=='function')throw TypeError('Invalid client configuration');
 const projectId=id=>{if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw TypeError('Invalid project ID');return id};
 const revisionId=(v,min=1)=>{if(!Number.isSafeInteger(v)||v<min||v>999999999999999)throw TypeError('Invalid revision');return v};
 const versionPath=id=>'/projects/'+projectId(id)+'/versions';
 async function request(path,{method='GET',body,binary=false}={}){
 const token=await getToken();
 if(typeof token!=='string'||!token||token.length>8192||/\s/.test(token))throw Error('Authentication required');
 const headers={Authorization:'Bearer '+token,Accept:binary?'application/zip':'application/json'};
 if(body!==undefined)headers['Content-Type']='application/json';
 const response=await fetchImpl(new URL(path,base),{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(90000)});
 if(!response.ok){const error=new Error('Website request failed');error.status=response.status;throw error}
 const type=response.headers.get('content-type')||'';
 if(binary){if(!type.startsWith('application/zip'))throw Error('Invalid archive response');return response.blob()}
 if(!type.startsWith('application/json'))throw Error('Invalid JSON response');
 return response.json();
 }
 return Object.freeze({
 generate({name,prompt,language='en'}={}){if(typeof name!=='string'||!name.trim()||name.length>120||typeof prompt!=='string'||!prompt.trim()||prompt.length>12000||!['en','sq','fr'].includes(language))throw TypeError('Invalid website request');return request('/projects',{method:'POST',body:{name,prompt,language}})},
 list:()=>request('/projects'),
 get:id=>request('/projects/'+projectId(id)),
 download:id=>request('/projects/'+projectId(id)+'/download',{binary:true}),
 proposeVersion(id,{name,prompt,files,expectedRevision,language='en'}={}){
 if(typeof name!=='string'||!name.trim()||name.length>120||typeof prompt!=='string'||!prompt.trim()||prompt.length>12000||!['en','sq','fr'].includes(language)||!files||typeof files!=='object'||Array.isArray(files))throw TypeError('Invalid proposal');
 return request('/projects/'+projectId(id)+'/regenerate',{method:'POST',body:{name,prompt,files,expectedRevision:revisionId(expectedRevision,0),language,executionAllowed:false}});
 },
 listVersions:id=>request(versionPath(id)),
 getVersion:(id,revision)=>request(versionPath(id)+'/'+revisionId(revision)),
 saveVersion(id,files,expectedRevision){if(!files||typeof files!=='object'||Array.isArray(files))throw TypeError('Invalid files');return request(versionPath(id),{method:'POST',body:{files,expectedRevision:revisionId(expectedRevision,0)}})},
 restoreVersion:(id,revision,expectedRevision)=>request(versionPath(id)+'/'+revisionId(revision)+'/restore',{method:'POST',body:{expectedRevision:revisionId(expectedRevision,0)}})
 });
}
