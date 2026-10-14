// services/converter-service.js

export async function checkConverter(userQuery) {
    const query = userQuery.toLowerCase().trim();

    // Kontrolli për fjalë kyçe konvertimi
    const keywords = ["sa bëjnë", "sa bejne", "konverto", "sa është", "sa eshte", "convert", "how much is"];
    const isConverter = keywords.some(k => query.includes(k)) || query.includes(" euro") || query.includes(" usd") || query.includes(" lek");

    if (!isConverter) return null;

    // 1. Konvertimi i Temperaturës (°C <-> °F)
    const tempMatch = query.match(/(\d+\.?\d*)\s*(celsius|c|fahrenheit|f)/);
    if (tempMatch && (query.includes("fahrenheit") || query.includes("celsius") || query.includes(" në f") || query.includes(" në c"))) {
        const val = parseFloat(tempMatch[1]);
        const unit = tempMatch[2];

        if (unit === "c" || unit === "celsius" || query.includes("në fahrenheit") || query.includes("ne fahrenheit") || query.includes("në f")) {
            const res = (val * 9/5) + 32;
            return `🌡️ **Konvertimi i Temperaturës:**\n\n${val}°C = **${res.toFixed(1)}°F**`;
        } else {
            const res = (val - 32) * 5/9;
            return `🌡️ **Konvertimi i Temperaturës:**\n\n${val}°F = **${res.toFixed(1)}°C**`;
        }
    }

    // 2. Konvertimi i Njësive të Distancës e Peshës (km/mi, kg/lbs)
    const distMatch = query.match(/(\d+\.?\d*)\s*(km|km\/h|milje|miles|kg|lbs|paund)/);
    if (distMatch) {
        const val = parseFloat(distMatch[1]);
        const unit = distMatch[2];

        if (unit === "km") {
            const miles = val * 0.621371;
            return `📏 **Konvertimi i Distancës:**\n\n${val} km = **${miles.toFixed(2)} milje**`;
        } else if (unit === "milje" || unit === "miles") {
            const km = val * 1.60934;
            return `📏 **Konvertimi i Distancës:**\n\n${val} milje = **${km.toFixed(2)} km**`;
        } else if (unit === "kg") {
            const lbs = val * 2.20462;
            return `⚖️ **Konvertimi i Peshës:**\n\n${val} kg = **${lbs.toFixed(2)} lbs (paund)**`;
        } else if (unit === "lbs" || unit === "paund") {
            const kg = val * 0.453592;
            return `⚖️ **Konvertimi i Peshës:**\n\n${val} lbs = **${kg.toFixed(2)} kg**`;
        }
    }

    // 3. Konvertimi i Valutave (EUR, USD, GBP, CHF, LEK) me kurs Live
    const currMatch = query.match(/(\d+\.?\d*)\s*(eur|euro|usd|dollar|gbp|paund|chf|lek)/i);
    if (currMatch) {
        const amount = parseFloat(currMatch[1]);
        let fromCurr = currMatch[2].toUpperCase();
        
        if (fromCurr === "EURO") fromCurr = "EUR";
        if (fromCurr === "DOLLAR") fromCurr = "USD";
        if (fromCurr === "PAUND") fromCurr = "GBP";

        let toCurr = "USD";
        if (fromCurr === "USD") toCurr = "EUR";
        if (query.includes("lek")) toCurr = "ALL";
        if (query.includes("chf")) toCurr = "CHF";
        if (query.includes("eur") || query.includes("euro")) toCurr = "EUR";

        try {
            const res = await fetch(`https://open.er-api.com/v6/latest/${fromCurr}`);
            const data = await res.json();

            if (data && data.rates && data.rates[toCurr]) {
                const converted = (amount * data.rates[toCurr]).toFixed(2);
                return `💱 **Konvertimi i Valutës (Live):**\n\n${amount} ${fromCurr} = **${converted} ${toCurr}**`;
            }
        } catch (e) {
            console.warn("Gabim te Currency API:", e);
        }
    }

    return null;
}
