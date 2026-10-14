// services/image-service.js

/**
 * Kontrollon nëse kërkesa e përdoruesit është për krijim imazhi.
 * @param {string} userQuery
 * @returns {Promise<string|null>}
 */
export async function checkImageGeneration(userQuery) {
    const lower = userQuery.toLowerCase().trim();

    // Fjalët kyçe që nxisin gjenerimin e imazhit
    const isImageReq = lower.startsWith("/image") || 
                       lower.includes("krijo imazh") || 
                       lower.includes("krijo nje imazh") || 
                       lower.includes("vizato") || 
                       lower.includes("generate image") || 
                       lower.includes("draw") || 
                       lower.includes("krijo logo");

    if (!isImageReq) return null;

    // Nxjerrim prompt-in e pastër
    let prompt = userQuery
        .replace(/\/image/i, '')
        .replace(/krijo imazh për/i, '')
        .replace(/krijo imazh por/i, '')
        .replace(/krijo imazh/i, '')
        .replace(/krijo nje imazh/i, '')
        .replace(/vizato/i, '')
        .replace(/generate image for/i, '')
        .replace(/generate image/i, '')
        .replace(/draw/i, '')
        .trim();

    if (!prompt) {
        prompt = "cyberpunk neon style futuristic artwork";
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

    return `🎨 **Imazhi i Gjeneruar nga Xsus AI:**\n\n![${prompt}](${imageUrl})\n\n*Prompt:* "${prompt}"`;
}
