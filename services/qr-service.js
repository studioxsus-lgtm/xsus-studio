// services/qr-service.js

export async function checkQRCode(userQuery) {
    if (!userQuery) return null;
    
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // 1. Kontrollojmë nëse kërkesa përmban fjalën kyçe QR
    const hasQRKeyword = lowerQuery.includes("qr") || 
                         lowerQuery.includes("qrcode") || 
                         lowerQuery.includes("kod qr") || 
                         lowerQuery.includes("code qr");

    if (!hasQRKeyword) return null;

    // 2. Pastrojmë tekstin për të marrë vetëm linkun ose përmbajtjen
    let targetText = query
        .replace(/krijo|gjenero|make|create|generate|code|kod|qrcode|qr/gi, '')
        .replace(/^[:\s"']+|[:\s"']+$|për|per|for|pour/gi, '')
        .trim();

    // 3. Nëse nuk ka vendosur tekst/link, kërkojmë të vendosë një
    if (!targetText) {
        return lowerQuery.includes("fr") ? "Ju lutem specifikoni një link ose tekst për të krijuar kodin QR (p.sh: 'Krijo QR https://kallabak.com')." :
               lowerQuery.includes("sq") ? "Ju lutem specifikoni një link ose tekst për të krijuar kodin QR (p.sh: 'Krijo QR https://kallabak.com')." :
               "Please specify a link or text to generate the QR code (e.g., 'Create QR https://kallabak.com').";
    }

    // 4. Gjenerojmë imazhin e kodit QR
    const encodedText = encodeURIComponent(targetText);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedText}`;

    const isSq = lowerQuery.includes("krijo") || lowerQuery.includes("për") || lowerQuery.includes("per") || lowerQuery.includes("kod");
    const isFr = lowerQuery.includes("créer") || lowerQuery.includes("pour");

    let title = isSq ? `📱 **Kodi QR u gjenerua me sukses!**` :
                isFr ? `📱 **Code QR généré avec succès!**` :
                       `📱 **QR Code generated successfully!**`;

    let info = isSq ? `Për përmbajtjen: \`${targetText}\`` :
               isFr ? `Pour le contenu: \`${targetText}\`` :
                      `For content: \`${targetText}\``;

    return `${title}\n\n${info}\n\n![QR Code](${qrImageUrl})\n\n_Mund ta skanoni direkt me telefon!_`;
}
