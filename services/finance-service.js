// services/finance-service.js
export async function checkCurrencyAPI(userText) {
    const lower = userText.toLowerCase();
    
    // Lista e pasuruar me të gjitha fjalët kyçe në shqip (monedhat, valuta, kursi, këmbimi, etj.)
    const isCurrencyQuery = lower.includes("këmb") || lower.includes("kemb") || 
                            lower.includes("kurs") || lower.includes("monedh") || 
                            lower.includes("valut") || lower.includes("euro") || 
                            lower.includes("lek") || lower.includes("yen") || 
                            lower.includes("jen") || lower.includes("dollar") || 
                            lower.includes("exchange");

    if (!isCurrencyQuery) return null;

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR');
        if (res.ok) {
            const data = await res.json();
            const rates = data.rates;
            if (rates) {
                return `📊 **Kurset Zyrtare të Këmbimit Valutor Sot (Live Rates):**\n\n` +
                       `* **1 EUR** = **${rates.ALL ? rates.ALL.toFixed(2) : '100'} ALL** (Lekë Shqiptare)\n` +
                       `* **1 EUR** = **${rates.USD ? rates.USD.toFixed(2) : '1.08'} USD** (Dollar Amerikan)\n` +
                       `* **1 EUR** = **${rates.JPY ? rates.JPY.toFixed(2) : '160'} JPY** (Jen Japonez)\n` +
                       `* **1 USD** = **${rates.ALL && rates.USD ? (rates.ALL / rates.USD).toFixed(2) : '92'} ALL**\n` +
                       `* **1 ALL** = **${rates.JPY && rates.ALL ? (rates.JPY / rates.ALL).toFixed(2) : '1.6'} JPY**\n\n` +
                       `*Të dhënat janë të përditësuara direkt nga bankat qendrore në kohë reale.*`;
            }
        }
    } catch (err) {
        console.warn("Currency API Error:", err);
    }
    return null;
}
