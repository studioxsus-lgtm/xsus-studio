// services/code-service.js

export function checkCodeRequest(userQuery) {
    const query = userQuery.toLowerCase().trim();

    const codeKeywords = [
        "krijo kod", "shkruaj kod", "më jep kod", "me jep kod", "kod ne", "kod në", "kod",
        "write code", "create code", "generate code", "code in", "code",
        "écris du code", "ecris du code", "crée du code", "cree du code", "code en"
    ];

    const isCodeRequest = codeKeywords.some(keyword => query.includes(keyword));
    if (!isCodeRequest) return null;

    const isSq = query.includes("kod") || query.includes("shkruaj") || query.includes("krijo") || query.includes("më jep") || query.includes("me jep");
    const isFr = query.includes("code") || query.includes("écris") || query.includes("ecris") || query.includes("crée") || query.includes("cree");

    const languageMap = {
        "html": "html", "css": "css", "javascript": "javascript", "js": "javascript",
        "typescript": "typescript", "ts": "typescript", "python": "python", "py": "python",
        "php": "php", "sql": "sql", "c++": "cpp", "cpp": "cpp", "c#": "csharp",
        "java": "java", "bash": "bash", "json": "json"
    };

    let detectedLanguage = "html";
    for (const [key, lang] of Object.entries(languageMap)) {
        if (query.includes(key)) {
            detectedLanguage = lang;
            break;
        }
    }

    let headerText = isSq ? "Ja kodi i kërkuar për websajtin tuaj:" :
                     isFr ? "Voici le code demandé:" :
                            "Here is the requested code:";

    // Shembull kodi bazë HTML/CSS nëse kërkohet për websajt
    const sampleCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Xsus Studio Web</title>
    <style>
        body { background: #0d1117; color: #fff; font-family: sans-serif; text-align: center; padding: 50px; }
        h1 { color: #00f2fe; }
    </style>
</head>
<body>
    <h1>Mirë se erdhët në Xsus Studio</h1>
    <p>Ky është kodi juaj i gjeneruar automatikisht.</p>
</body>
</html>`;

    return formatCodeBlock(headerText, sampleCode, detectedLanguage, isSq, isFr);
}

function formatCodeBlock(headerText, codeText, language, isSq, isFr) {
    const buttonText = isSq ? "Kopjo" : isFr ? "Copier" : "Copy";
    const copiedText = isSq ? "U kopjua!" : isFr ? "Copié!" : "Copied!";

    const escapedCode = codeText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return `${headerText}\n\n` +
`<div class="code-container" style="background: #0d1117; border: 1px solid #30363d; border-radius: 8px; margin: 10px 0; overflow: hidden; font-family: monospace;">
    <div style="background: #161b22; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d;">
        <span style="color: #8b949e; font-size: 12px; text-transform: uppercase;">${language}</span>
        <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); this.innerText='${copiedText}'; setTimeout(()=>this.innerText='${buttonText}', 2000);" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">
            ${buttonText}
        </button>
    </div>
    <pre style="margin: 0; padding: 12px; color: #e6edf3; overflow-x: auto; font-size: 13px; line-height: 1.5;"><code>${escapedCode}</code></pre>
</div>`;
}
