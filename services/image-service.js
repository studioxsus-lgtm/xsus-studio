// services/image-service.js

export async function checkImageGeneration(userQuery) {
    const lower = userQuery.toLowerCase().trim();

    // Zgjerojmë rrjetën e fjalëve kyçe (foto, imazh, picture, photo, gjenero, krijo, etj.)
    const isImageReq = lower.startsWith("/image") || 
                       lower.includes("krijo imazh") || 
                       lower.includes("krijo nje imazh") || 
                       lower.includes("krijo foto") || 
                       lower.includes("krijo nje foto") || 
                       lower.includes("gjenero foto") || 
                       lower.includes("gjenero imazh") || 
                       lower.includes("bëj një foto") || 
                       lower.includes("bej nje foto") || 
                       lower.includes("vizato") || 
                       lower.includes("generate image") || 
                       lower.includes("generate photo") || 
                       lower.includes("draw") || 
                       lower.includes("photo") || 
                       lower.includes("foto") || 
                       lower.includes("imazh");

    // Nëse nuk kërkon qartësisht krijim/gjenerim por thjesht përmend fjalën, shohim nëse ka folje krijimi
    const hasCreationIntent = lower.includes("krijo") || lower.includes("gjenero") || 
                               lower.includes("bëj") || lower.includes("bej") || 
                               lower.includes("vizato") || lower.includes("shfaq") || 
                               lower.includes("ep") || lower.includes("dua") || 
                               lower.startsWith("/image");

    if (!isImageReq || !hasCreationIntent) return null;

    // Pastrojmë prompt-in nga fjalët e panevojshme për të lënë vetëm subjektin e imazhit
    let prompt = userQuery
        .replace(/\/image/i, '')
        .replace(/krijo imazh për/i, '')
        .replace(/krijo imazh për mua/i, '')
        .replace(/krijo imazh/i, '')
        .replace(/krijo nje imazh/i, '')
        .replace(/krijo foto/i, '')
        .replace(/krijo nje foto/i, '')
        .replace(/gjenero foto/i, '')
        .replace(/gjenero imazh/i, '')
        .replace(/bëj një foto/i, '')
        .replace(/bej nje foto/i, '')
        .replace(/a mund të gjenerosh foto/i, '')
        .replace(/a mund te gjenerosh foto/i, '')
        .replace(/vizato/i, '')
        .replace(/generate image for/i, '')
        .replace(/generate image/i, '')
        .replace(/generate photo/i, '')
        .replace(/draw/i, '')
        .trim();

    if (!prompt || prompt.length < 3) {
        prompt = "cyberpunk neon futuristic city landscape";
    }

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 10000)}`;

    return `🎨 **Imazhi i Gjeneruar nga Xsus AI:**\n\n![${prompt}](${imageUrl})\n\n*Kërkesa:* "${prompt}"`;
}
