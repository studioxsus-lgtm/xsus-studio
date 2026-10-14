// services/math-service.js

export async function checkMath(userQuery) {
    const query = userQuery.trim();
    const lowerQuery = query.toLowerCase();

    // 1. Përqindjet (p.sh. "sa është 20% e 150", "what is 15% of 200")
    if (lowerQuery.includes("%") || lowerQuery.includes("përqind") || lowerQuery.includes("percent")) {
        const numbers = query.match(/-?\d*\.?\d+/g);
        if (numbers && numbers.length >= 2) {
            const p = parseFloat(numbers[0]);
            const val = parseFloat(numbers[1]);
            const result = (p * val) / 100;

            const isSq = lowerQuery.includes("e") || lowerQuery.includes("sa");
            const isFr = lowerQuery.includes("de") || lowerQuery.includes("quel");

            return isSq ? `🧮 **Llogaritja e Përqindjes:**\n${p}\% e${val} është **${result}**` :
                   isFr ? `🧮 **Calcul de Pourcentage:**\n${p}\% de${val} est **${result}**` :
                          `🧮 **Percentage Calculation:**\n${p}\% of${val} is **${result}**`;
        }
    }

    // 2. Llogaritje bazike matematikore (p.sh. "llogarit 45 * 12", "calculate 100 / 4")
    const mathKeywords = ["llogarit", "calculate", "calcule", "sa bën", "how much is", "combien font"];
    const isMathRequest = mathKeywords.some(keyword => lowerQuery.includes(keyword));

    if (isMathRequest) {
        // Përpiqemi të nxjerrim shprehjen matematikore pas fjalës kyçe
        let cleanExpr = lowerQuery;
        mathKeywords.forEach(kw => {
            cleanExpr = cleanExpr.replace(kw, '');
        });
        cleanExpr = cleanExpr.replace(/[^0-9+\-*/().\s]/g, '').trim();

        if (cleanExpr) {
            try {
                // Përdorimi i Function në vend të eval() për siguri më të lartë
                const calculationResult = Function(`'use strict'; return (${cleanExpr})`)();
                
                if (!isNaN(calculationResult)) {
                    return `🧮 **Rezultati / Result:**\n\`${cleanExpr} = ${calculationResult}\``;
                }
            } catch (e) {
                // Nëse shprehja nuk është e vlefshme, kalon më poshtë
            }
        }
    }

    return null;
}
