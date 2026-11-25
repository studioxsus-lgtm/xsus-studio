import {planLogo} from './hyper-logo-plan.js';
const profiles=Object.freeze({
 modern:{layout:'horizontal',weight:700,spacing:1,symbol:'geometric'},
 minimal:{layout:'icon',weight:500,spacing:2,symbol:'abstract'},
 classic:{layout:'stacked',weight:600,spacing:1,symbol:'emblem'},
 luxury:{layout:'stacked',weight:400,spacing:3,symbol:'monogram'}
});
export function decideLogo(request){
 const plan=planLogo(request);
 const profile=profiles[plan.style];
 const reasons=[...plan.reasons];
 const name=request.brief.name.trim();
 if(/[\u0000-\u001f\u007f]/u.test(name)) reasons.push('invalid_brand_text');
 const layout=name.length>24?'stacked':profile.layout;
 const usage=[
 {target:'website',layout:'horizontal',minimumSize:120},
 {target:'avatar',layout:'icon',minimumSize:32},
 {target:'print',layout:'stacked',vectorRequired:true}
 ];
 return {...plan,approved:reasons.length===0,review_required:reasons.length>0,reasons,design:{layout,weight:profile.weight,letterSpacing:profile.spacing,symbol:profile.symbol,usage,textContrastWarning:plan.contrast<4.5}};
}
