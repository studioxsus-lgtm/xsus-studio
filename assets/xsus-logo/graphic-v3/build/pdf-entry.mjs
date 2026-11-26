import {jsPDF} from 'jspdf';
import {svg2pdf} from 'svg2pdf.js';
export async function pdf(svg,width,height){
 const doc=new jsPDF({orientation:width>=height?'landscape':'portrait',unit:'pt',format:[width,height],compress:true});
 await svg2pdf(svg,doc,{x:0,y:0,width,height});return doc.output('blob');
}
