const families={
 'sans-serif':[['space-grotesk',.025,1],['montserrat',.075,1.04],['manrope',.04,.96],['outfit',.015,1.08],['raleway',.09,1],['oswald',.035,.92]],
 serif:[['libre-baskerville',.025,1],['playfair-display',.065,1.03]],
 monospace:[['ibm-plex-mono',.025,1]]
};
export function wordmarkDirection({family='sans-serif',slot=0,tracking=0,font,architecture}={}){
 if(!Number.isSafeInteger(slot)||slot<0||!Number.isFinite(tracking))throw RangeError('invalid_wordmark_direction');
 const options=families[family]??families['sans-serif'];
 const [id,spacing,stretch]=options[slot%options.length];
 return {font:font??id,tracking:font?tracking:Math.max(-.04,Math.min(.18,tracking+spacing)),stretch:font?1:stretch,architecture:architecture??null};
}
