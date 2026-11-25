export function createAdmission({limit=60,windowMs=60000,maxSubjects=10000,maxActive=8,maxRssBytes=536870912,clock=Date.now,memory=()=>process.memoryUsage().rss}={}){
 for(const n of [limit,windowMs,maxSubjects,maxActive,maxRssBytes])if(!Number.isSafeInteger(n)||n<1)throw TypeError('Invalid admission configuration');
 const subjects=new Map();let active=0;
 return Object.freeze({
 acquire(subject){if(typeof subject!=='string'||!subject||subject.length>200)throw TypeError('Invalid subject');
 const now=clock();if(!Number.isFinite(now))throw Error('Invalid clock');
 for(const [key,value] of subjects)if(now>=value.until)subjects.delete(key);
 if(active>=maxActive||memory()>=maxRssBytes)throw Error('Service capacity exceeded');
 let entry=subjects.get(subject);
 if(!entry){if(subjects.size>=maxSubjects)throw Error('Rate capacity exceeded');entry={count:0,until:now+windowMs};subjects.set(subject,entry)}
 if(entry.count>=limit)throw Error('Rate limit exceeded');
 entry.count++;active++;let released=false;
 return ()=>{if(!released){released=true;active--}};
 },
 diagnostics:()=>({active,subjects:subjects.size,maxActive,maxSubjects})
 });
}
