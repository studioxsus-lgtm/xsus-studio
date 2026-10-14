// services/qr-service.js

export async function checkQRCode(userQuery) {
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // Fjalët kyçe për kërkim të kodeve QR
    const qrKeywords = [
        "krijo qr", "gjenero qr", "kod qr", "qr code",
        "create qr", "generate qr", "créer qr", "générer qr"
    ];

    const matchedKeyword = qrKeywords.find(keyword => lowerQuery.includes(keyword));

    if (!matchedKeyword) return null;

    // Nxjerrmë tekstin ose linkun që dëshiron përdoruesi të kthejë në QR
    let targetText = query;
    qrKeywords.forEach(kw => {
        targetText = targetText.replace(new RegExp(kw, 'gi'), '');
    });
    
    // Pastrojmë shenjat e tepërta si dypshënja (:), thonjëzat, etj.
    targetText = targetText.replace(/^[:\s"']+|[:\s"']+$|për|per|for|pour/gi, '').trim();

    if (!targetText) {
        return lowerQuery.includes("fr") ? "_Veuillez spécifier un lien ou un texte pour créer le code QR (ex: 'Krijo QR per https://kallabak.com')._" :
               lowerQuery.includes("sq") ? "_Ju lutem specifikoni një link ose tekst për të krijuar kodin QR (p.sh: 'Krijo QR per https://kallabak.com')._" :
               "_Please specify a link or text to generate the QR code (e.g., 'Create QR for https://kallabak.com')._";
    }

    // Linku publik i gjenerimit të QR kodesh
    const encodedText = encodeURIComponent(targetText);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedText}`;

    const isSq = lowerQuery.includes("krijo") || lowerQuery.includes("kod") || lowerQuery.includes("gjenero");
    const isFr = lowerQuery.includes("créer") || lowerQuery.includes("générer");

    let title = isSq ? `📱 **Kodi QR u gjenerua me sukses!**` :
                isFr ? `📱 **Code QR généré avec succès!**` :
                       `📱 **QR Code generated successfully!**`;

    let info = isSq ? `Për përmbajtjen: \`${targetText}\`` :
               isFr ? `Pour le contenu: \`${targetText}\`` :
                      `For content: \`${targetText}\``;

    return `${title}\n\n${info}\n\n![QR Code](${qrImageUrl})\n\n_Mund ta skanoni direkt me telefon!_`;
}
