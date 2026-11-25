export function createBrandAssistant({client,onChange=()=>{}}={}){
 if(typeof client?.generate!=='function'||typeof onChange!=='function')throw new TypeError('Invalid assistant configuration');
 let state={status:'idle',variants:[],selected:null,reasons:[],error:null},controller,sequence=0;
 const snapshot=()=>structuredClone(state);
 const publish=patch=>{state={...state,...patch};onChange(snapshot());return snapshot()};
 return Object.freeze({
 state:snapshot,
 async generate({prompt,language='en'}={}){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||!['en','fr','sq'].includes(language))throw new TypeError('Invalid brief');
 controller?.abort();const current=++sequence;controller=new AbortController();
 publish({status:'generating',error:null,reasons:[]});
 try{
 const result=await client.generate({prompt:prompt.trim(),language,signal:controller.signal});
 if(current!==sequence)return snapshot();
 if(result.status==='review_required')return publish({status:'review_required',reasons:Array.isArray(result.reasons)?result.reasons.filter(x=>typeof x==='string').slice(0,16):[]});
 const variants=result.kit?.variants;
 if(result.status!=='generated'||!Array.isArray(variants)||!variants.length||variants.length>16||variants.some(v=>!v.document||v.document.version!=='1.0.0'||!Array.isArray(v.document.layers)))throw Error('invalid_response');
 return publish({status:'generated',variants:variants.map(v=>({symbol:String(v.symbol??''),document:{...structuredClone(v.document),layers:v.document.layers.map(l=>l.type==='polygon'?{...structuredClone(l),points:l.points.map(p=>Array.isArray(p)?{x:p[0],y:p[1]}:p)}:structuredClone(l))}})),selected:0});
 }catch(error){if(current!==sequence)return snapshot();const known=['authentication_required','rate_limit','generation_unavailable','generation_failed','invalid_response'];return publish({status:'error',error:known.includes(error?.message)||/^(HTTP_[1-5][0-9]{2}|NETWORK_OR_CORS|REQUEST_TIMEOUT|invalid_[a-z_]+|unsupported_layer)$/.test(error?.message??'')?error.message:'generation_failed'})}
 },
 select(index){if(!Number.isInteger(index)||index<0||index>=state.variants.length)throw RangeError('Invalid variant');return publish({selected:index})},
 document(){return state.selected===null?null:structuredClone(state.variants[state.selected].document)},
 cancel(){++sequence;controller?.abort();return publish({status:'idle',error:null,reasons:[]})},
 reset(){++sequence;controller?.abort();return publish({status:'idle',variants:[],selected:null,error:null,reasons:[]})}
 });
}
