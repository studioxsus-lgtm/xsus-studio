export function createSessionAdapter({auth,onIdentityChange=()=>{}}={}){
 if(!auth||typeof auth.getSession!=='function'||typeof auth.onAuthStateChange!=='function'||typeof onIdentityChange!=='function')throw TypeError('Invalid authentication adapter');
 let identity=null,disposed=false,epoch=0;
 function observe(session){const next=session?.user?.id??null;if(next!==identity){identity=next;epoch++;onIdentityChange(next)}}
 const subscription=auth.onAuthStateChange((_event,session)=>{if(!disposed)observe(session)}).data.subscription;
 return Object.freeze({
 async getToken(){if(disposed)throw Error('Session unavailable');const before=epoch;const {data,error}=await auth.getSession();if(disposed||before!==epoch||error)throw Error('Session unavailable');const session=data?.session;observe(session);if(!identity||typeof session?.access_token!=='string'||!session.access_token)throw Error('Authentication required');return session.access_token},
 dispose(){if(disposed)return;disposed=true;epoch++;subscription.unsubscribe();identity=null;onIdentityChange(null)}
 });
}
