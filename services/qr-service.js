// services/qr-service.js

export async function checkQRCode(userQuery) {
    if (!userQuery) return null;
    
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // Kontrollojmë nëse përmban fjalën QR ose "kod"
    if (!lowerQuery.includes("qr") && !lowerQuery.includes("code")) return null;

    // Nxjerrim linkun ose tekstin që do të bëhet QR
    let targetText = query
        .replace(/krijo|gjenero|make|create|generate|code|kod|qrcode|qr/gi, '')
        .replace(/^[:\s"']+|[:\s"']+$|për|per|for|pour/gi, '')
        .trim();

    if (!targetText) {
        targetText = "https://xsusstudio.com";
    }

    // Krijojmë direkt imazhin Markdown që të shfaqet në chat
    const encodedText = encodeURIComponent(targetText);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedText}`;

    return `📱 **Kodi QR u gjenerua me sukses për:** \`${targetText}\`\n\n![QR Code](${qrImageUrl})`;
}
