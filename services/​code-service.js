// services/code-service.js

export function checkCodeRequest(userQuery) {
    const query = userQuery.toLowerCase().trim();

    const codeKeywords = [
        "krijo kod", "shkruaj kod", "më jep kod", "me jep kod", "kod",
        "write code", "create code", "generate code", "code",
        "écris du code", "ecris du code", "crée du code", "cree du code"
    ];

    const isCodeRequest = codeKeywords.some(keyword => query.includes(keyword));
    if (!isCodeRequest) return null;

    const isSq = query.includes("kod") || query.includes("shkruaj") || query.includes("krijo");
    const isFr = query.includes("code") || query.includes("écris") || query.includes("crée");

    let language = "html";
    if (query.includes("css")) language = "css";
    else if (query.includes("javascript") || query.includes("js")) language = "javascript";
    else if (query.includes("python") || query.includes("py")) language = "python";

    const headerText = isSq ? "Ja kodi i kërkuar për ju:" :
                       isFr ? "Voici le code demandé:" :
                              "Here is the requested code:";

    const sampleCode = `<!DOCTYPE html>
<html>
<head>
    <title>Xsus Studio</title>
</head>
<body>
    <h1>Përshëndetje nga Xsus AI</h1>
</body>
</html>`;

    const buttonText = isSq ? "Kopjo" : isFr ? "Copier" : "Copy";
    const copiedText = isSq ? "U kopjua!" : isFr ? "Copié!" : "Copied!";

    return `${headerText}\n\n` +
`<div style="background: #0d1117; border: 1px solid #30363d; border-radius: 8px; margin: 10px 0; overflow: hidden; font-family: monospace;">
    <div style="background: #161b22; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #30363d;">
        <span style="color: #8b949e; font-size: 12px; text-transform: uppercase;">${language}</span>
        <button onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); this.innerText='${copiedText}'; setTimeout(()=>this.innerText='${buttonText}', 2000);" style="background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">
            ${buttonText}
        </button>
    </div>
    <pre style="margin: 0; padding: 12px; color: #e6edf3; overflow-x: auto; font-size: 13px; line-height: 1.5;"><code>${sampleCode}</code></pre>
</div>`;
}
