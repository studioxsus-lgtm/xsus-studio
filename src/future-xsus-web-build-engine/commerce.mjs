const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
export function quoteCart({products,items,currency='EUR',discountBps=0}={}){
 if(!Array.isArray(products)||products.length>10000||!Array.isArray(items)||!items.length||items.length>100||!['EUR','USD','GBP'].includes(currency)||!integer(discountBps,0,10000))throw new TypeError('Invalid cart');
 const catalog=new Map();
 for(const p of products){if(!p||!id(p.id)||catalog.has(p.id)||!integer(p.priceMinor,0,100000000)||!integer(p.stock,0,1000000))throw new TypeError('Invalid product');catalog.set(p.id,p)}
 const quantities=new Map();
 for(const item of items){if(!item||!id(item.id)||!integer(item.quantity,1,1000))throw new TypeError('Invalid item');const n=(quantities.get(item.id)??0)+item.quantity;if(n>1000)throw new Error('Quantity limit');quantities.set(item.id,n)}
 const lines=[...quantities].map(([id,quantity])=>{const p=catalog.get(id);if(!p)throw new Error('Unknown product');if(quantity>p.stock)throw new Error('Insufficient stock');return {id,quantity,unitPriceMinor:p.priceMinor,totalMinor:p.priceMinor*quantity}});
 const subtotalMinor=lines.reduce((n,l)=>n+l.totalMinor,0);
 const discountMinor=Number(BigInt(subtotalMinor)*BigInt(discountBps)/10000n);
 return {currency,lines,subtotalMinor,discountMinor,totalMinor:subtotalMinor-discountMinor};
}
export function prepareCheckout(input){
 const quote=quoteCart(input);
 return {status:'draft',quote,inventoryReserved:false,paymentAuthorized:false,reviewRequired:true,executable:false,taxIncluded:false,shippingIncluded:false};
}
