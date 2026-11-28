// Original geometric uppercase A/X outlines, in normalized em coordinates.
export function geometricLetter(letter){
 const A=[['M',0,0],['L',.42,-1],['L',.58,-1],['L',1,0],['L',.79,0],['L',.66,-.32],['L',.34,-.32],['L',.21,0],['Z'],['M',.41,-.49],['L',.59,-.49],['L',.5,-.74],['Z']];
 const X=[['M',0,-1],['L',.23,-1],['L',.5,-.65],['L',.77,-1],['L',1,-1],['L',.62,-.5],['L',1,0],['L',.77,0],['L',.5,-.35],['L',.23,0],['L',0,0],['L',.38,-.5],['Z']];
 return letter==='A'?A:letter==='X'?X:null;
}
