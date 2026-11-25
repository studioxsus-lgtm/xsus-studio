export function mountStudioView(root){
 const dom=root.ownerDocument;
 const node=(tag,attrs={},children=[])=>{const e=dom.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);for(const child of children)e.append(child);return e};
 const label=(key,id)=>node('label',{for:id,'data-logo-i18n':key});
 const button=(key,id)=>node('button',{id,type:'button','data-logo-i18n':key,disabled:''});
 const heading=key=>node('h2',{'data-logo-i18n':key});
 const input=(id,type='text')=>node('input',{id,type,disabled:''});
 const panel=(cls,children)=>node('section',{class:'studio-panel '+cls},children);
 const select=(id,values)=>node('select',{id,disabled:''},values.map(v=>node('option',{value:v},[v])));
 const projects=panel('studio-projects',[heading('projects'),button('newProject','logo-new'),node('div',{id:'logo-project-list'}),label('brandName','logo-name'),input('logo-name'),button('save','logo-save'),button('remove','logo-delete')]);
 const editor=panel('studio-editor',[heading('brief'),label('brief','logo-prompt'),node('textarea',{id:'logo-prompt',maxlength:'4000',disabled:''}),node('div',{class:'studio-toolbar'},[button('generate','logo-generate'),button('cancel','logo-cancel')]),node('p',{id:'logo-status',class:'studio-status',role:'status','aria-live':'polite'}),heading('canvas'),node('div',{class:'studio-toolbar'},[button('undo','logo-undo'),button('redo','logo-redo')]),node('div',{id:'logo-canvas',class:'studio-canvas'}),heading('variants'),node('div',{id:'logo-variants',class:'studio-variants'})]);
 const inspector=panel('studio-inspector',[heading('layers'),node('div',{id:'logo-layers'}),node('div',{class:'studio-toolbar'},[button('add','logo-add'),button('duplicate','logo-duplicate'),button('remove','logo-remove-layer'),button('up','logo-up'),button('down','logo-down')]),heading('properties'),label('fill','logo-fill'),input('logo-fill','color'),label('text','logo-text'),input('logo-text'),label('fontSize','logo-font-size'),input('logo-font-size','number'),button('apply','logo-apply'),heading('export'),label('format','logo-format'),select('logo-format',['svg','png','jpeg','webp','json']),button('export','logo-export')]);
 root.classList.add('logo-studio');
 root.replaceChildren(node('h1',{},['XSUS LOGO STUDIO']),node('div',{class:'studio-toolbar'},[label('language','logo-language'),select('logo-language',['en','fr','sq'])]),node('div',{class:'studio-layout'},[projects,editor,inspector]));
 return Object.freeze({get:id=>root.querySelector('#logo-'+id)});
}
