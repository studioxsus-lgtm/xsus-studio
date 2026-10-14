// services/qr-service.js

export async function checkQRCode(userQuery) {
    if (!userQuery) return null;
    
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // Kontrollojmë nëse përmban fjalën QR
    if (!lowerQuery.includes("qr")) return null;

    // Nxjerrim linkun ose tekstin
    let targetText = query
        .replace(/krijo|gjenero|make|create|generate|code|kod|qrcode|qr/gi, '')
        .replace(/^[:\s"']+|[:\s"']+$|për|per|for|pour/gi, '')
        .trim();

    if (!targetText) {
        return "Ju lutem specifikoni një link ose tekst për të krijuar kodin QR.";
    }

    // Gjenerojmë imazhin e kodit QR përmes API publike
    const encodedText = encodeURIComponent(targetText);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedText}`;

    return `📱 **Kodi QR u gjenerua me sukses!**\n\nPër përmbajtjen: \`${targetText}\` \n\n![QR Code](${qrImageUrl})\n\n_Mund ta skanoni direkt me telefon!_`;
}
