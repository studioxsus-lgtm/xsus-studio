import {symbolNames} from './symbol-names.mjs';
export function mountStudioView(root){
 const dom=root.ownerDocument;
 const node=(tag,attrs={},children=[])=>{const e=dom.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);for(const child of children)e.append(child);return e};
 const label=(key,id)=>node('label',{for:id,'data-logo-i18n':key});
 const button=(key,id)=>node('button',{id,type:'button','data-logo-i18n':key,disabled:''});
 const heading=key=>node('h2',{'data-logo-i18n':key});
 const input=(id,type='text')=>node('input',{id,type,disabled:''});
 const panel=(cls,children)=>node('section',{class:'studio-panel '+cls},children);
 const select=(id,values)=>node('select',{id,disabled:''},values.map(v=>node('option',{value:v},[v])));
 const projects=node('details',{class:'studio-panel studio-projects',id:'logo-projects'},[
  node('summary',{'data-logo-i18n':'myProjects'}),button('newProject','logo-new'),
  node('div',{id:'logo-project-list'}),button('remove','logo-delete')
 ]);
 const backgrounds=node('div',{class:'studio-toolbar preview-choices',role:'group','data-logo-label':'background'},[
  label('background','logo-white'),...['white','dark','transparent'].map(key=>node('button',{
   id:'logo-'+key,type:'button','data-logo-i18n':key,'aria-pressed':String(key==='white')
  }))
 ]);
 const editor=panel('studio-editor',[
  label('brief','logo-prompt'),node('textarea',{id:'logo-prompt',maxlength:'4000','data-logo-placeholder':'example',disabled:''}),
  node('div',{class:'creative-controls'},[
   node('div',{},[label('creativeMode','logo-mode'),node('select',{id:'logo-mode'},[node('option',{value:'professional'},['Professional V5'])])]),
   node('div',{},[label('conceptCount','logo-count'),node('select',{id:'logo-count'},[node('option',{value:'','data-logo-i18n':'fromBrief'}),...['3','6','9','12'].map(value=>node('option',{value},[value]))])]),
   node('div',{},[label('variationSeed','logo-seed'),node('input',{id:'logo-seed',type:'number',min:'0',max:'2147483647',step:'1'})])
  ]),
  label('catalogSymbol','logo-symbol'),node('input',{id:'logo-symbol',list:'logo-symbol-list',autocomplete:'off',maxlength:'80','data-logo-placeholder':'catalogHint'}),
  node('datalist',{id:'logo-symbol-list'},symbolNames.map(value=>node('option',{value}))),
  node('div',{class:'studio-toolbar'},[button('generate','logo-generate'),button('cancel','logo-cancel')]),
  node('p',{id:'logo-status',class:'studio-status',role:'status','aria-live':'polite'}),
  heading('canvas'),node('div',{class:'studio-toolbar'},[button('undo','logo-undo'),button('redo','logo-redo')]),
  backgrounds,node('div',{id:'logo-canvas',class:'studio-canvas','data-background':'white'}),
  heading('variants'),node('div',{id:'logo-variants',class:'studio-variants'}),button('regenConcept','logo-regen'),
  node('div',{class:'document-actions'},[
   node('div',{},[label('projectName','logo-name'),input('logo-name'),button('save','logo-save')]),
   node('div',{},[label('format','logo-format'),select('logo-format',['svg','svg-text','png','jpeg','webp','json','pdf','zip']),button('export','logo-export')])
  ])
 ]);
 const inspector=panel('studio-inspector',[heading('layers'),node('div',{id:'logo-layers'}),node('div',{class:'studio-toolbar'},[button('add','logo-add'),button('duplicate','logo-duplicate'),button('remove','logo-remove-layer'),button('up','logo-up'),button('down','logo-down')]),heading('properties'),label('fill','logo-fill'),input('logo-fill','color'),label('text','logo-text'),input('logo-text'),label('fontSize','logo-font-size'),input('logo-font-size','number'),button('apply','logo-apply')]);
 root.classList.add('logo-studio');
 root.replaceChildren(node('h1',{},['XSUS LOGO STUDIO']),node('div',{class:'studio-layout'},[projects,editor,inspector]));
 return Object.freeze({get:id=>root.querySelector('#logo-'+id)});
}
