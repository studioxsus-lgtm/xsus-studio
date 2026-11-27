import {layouts} from './composition.mjs';
export function chooseComposition({explicit,preferred='vertical',slot=0,width=512,height=512,usage=[],prompt=''}={}){
 if(explicit!==undefined){if(!layouts.includes(explicit))throw RangeError('invalid_layout');return explicit;}
 if(/favicon|icon only|symbol only|vetëm simbol|icône seule/i.test(prompt)||preferred==='symbol')return 'symbol';
 if(preferred==='text'||/wordmark only|vetëm tekst|texte seul/i.test(prompt))return 'text';
 if(!Number.isSafeInteger(slot)||slot<0)throw RangeError('invalid_slot');
 const wide=width/height>=1.5,tall=height/width>=1.5;
 const order=wide?['horizontal','modular','asymmetric']:tall?['vertical','central','typographic']:[preferred,'vertical','horizontal','central','modular','typographic'];
 const unique=[...new Set(order.filter(x=>layouts.includes(x)&&!['symbol','text'].includes(x)))];
 return unique[slot%unique.length];
}
