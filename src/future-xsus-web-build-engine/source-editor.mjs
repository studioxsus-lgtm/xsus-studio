export function createSourceEditor(initial,{historyLimit=30}={}){
 if(!Number.isInteger(historyLimit)||historyLimit<1||historyLimit>100)throw TypeError('Invalid history limit');
 const pathOk=p=>typeof p==='string'&&p.length<=200&&/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(html|css|js|mjs)$/.test(p);
 function validate(files){if(!files||typeof files!=='object'||Array.isArray(files))throw TypeError('Invalid files');const entries=Object.entries(files);if(entries.length<1||entries.length>500||!Object.hasOwn(files,'index.html'))throw TypeError('Invalid file count or entry');let size=0;const seen=new Set();for(const [p,v] of entries){if(!pathOk(p)||seen.has(p.toLowerCase())||typeof v!=='string'||v.length>250000)throw TypeError('Invalid file');seen.add(p.toLowerCase());size+=v.length;if(size>5000000)throw TypeError('Project too large')}return Object.fromEntries(entries)}
 let files=validate(initial),revision=0,undo=[],redo=[];
 const snapshot=()=>({revision,files:structuredClone(files),canUndo:undo.length>0,canRedo:redo.length>0,publicationAuthorized:false});
 function check(expected){if(expected!==revision)throw Error('Revision conflict')}
 function commit(next,expected){check(expected);const validated=validate(next);undo.push(files);if(undo.length>historyLimit)undo.shift();files=validated;redo=[];revision++;return snapshot()}
 return Object.freeze({
 snapshot,
 read(path){if(!Object.hasOwn(files,path))throw Error('File not found');return files[path]},
 update(path,content,expected){if(!Object.hasOwn(files,path))throw Error('File not found');return commit({...files,[path]:content},expected)},
 add(path,content,expected){if(Object.hasOwn(files,path))throw Error('File exists');return commit({...files,[path]:content},expected)},
 remove(path,expected){if(path==='index.html'||!Object.hasOwn(files,path))throw Error('File cannot be removed');const next={...files};delete next[path];return commit(next,expected)},
 undo(expected){check(expected);if(!undo.length)throw Error('No undo');redo.push(files);files=undo.pop();revision++;return snapshot()},
 redo(expected){check(expected);if(!redo.length)throw Error('No redo');undo.push(files);files=redo.pop();revision++;return snapshot()}
 });
}
