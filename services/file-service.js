// services/file-service.js

/**
 * Lexon përmbajtjen e një skedari (PDF ose TXT/MD/KOD) dhe kthen tekstin e nxjerrë.
 * @param {File} file - Skedari i ngarkuar nga përdoruesi
 * @returns {Promise<string>} - Teksti i nxjerrë nga dokumenti
 */
export async function readDocumentFile(file) {
    if (!file) return null;

    const fileType = file.name.split('.').pop().toLowerCase();

    // 1. Skedarë Teksti (TXT, MD, JS, HTML, PY, CSS, JSON etj.)
    if (['txt', 'md', 'js', 'html', 'css', 'json', 'py', 'csv'].includes(fileType)) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject("Gabim gjatë leximit të skedarit të tekstit.");
            reader.readAsText(file);
        });
    }

    // 2. Skedarë PDF
    if (fileType === 'pdf') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    const typedarray = new Uint8Array(e.target.result);
                    
                    // Sigurohemi që pdfjsLib është i ngarkuar
                    if (!window.pdfjsLib) {
                        reject("Libraria pdf.js nuk u gjet.");
                        return;
                    }

                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                    const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';

                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        const page = await pdf.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += `--- Faqja ${pageNum} ---\n` + pageText + '\n\n';
                    }

                    resolve(fullText.trim());
                } catch (err) {
                    console.error("PDF Parsing Error:", err);
                    reject("Nuk u arrit të lexohej përmbajtja e skedarit PDF.");
                }
            };
            reader.onerror = () => reject("Gabim gjatë ngarkimit të PDF-së.");
            reader.readAsArrayBuffer(file);
        });
    }

    throw new Error("Lloji i skedarit nuk mbështetet. Ju lutem ngarkoni PDF ose skedarë teksti.");
}
