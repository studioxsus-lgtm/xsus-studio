export function artisticFamily(domain,slot=0){
 const families=domain==='fashion'?['elegant','condensed','original']:domain==='technology'?['forward','wide','original']:domain==='environment'?['original','elegant','wide']:['original','wide','condensed'];
 return families[((slot%families.length)+families.length)%families.length];
}
