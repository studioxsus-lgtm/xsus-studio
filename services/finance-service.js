// services/finance-service.js

export async function checkFinance(userQuery) {
    const query = userQuery.toLowerCase().trim();

    // Fjalët kyçe për zbulimin e kërkesës financiare
    const financeKeywords = [
        "btc", "bitcoin", "eth", "ethereum", "usdt", "solana", "crypto", "kripto",
        "apple", "aapl", "tesla", "tsla", "google", "googl", "microsoft", "msft", 
        "nvidia", "nvda", "amazon", "amzn", "aksione", "stocks", "stock", "actions",
        "çmimi i", "cmimi i", "sa kushton", "price of", "prix de"
    ];

    const isFinanceRequest = financeKeywords.some(keyword => query.includes(keyword));
    if (!isFinanceRequest) return null;

    // Zbulimi i saktë i gjuhës së përdoruesit
    const isSq = query.includes("çmimi") || query.includes("cmimi") || query.includes("sa kushton") || query.includes("kripto") || query.includes("aksione");
    const isFr = query.includes("prix") || query.includes("combien") || query.includes("actions");

    // Mapa e Kriptomonedhave
    const cryptoMap = {
        "bitcoin": "bitcoin", "btc": "bitcoin",
        "ethereum": "ethereum", "eth": "ethereum",
        "tether": "tether", "usdt": "tether",
        "solana": "solana", "sol": "solana",
        "binancecoin": "binancecoin", "bnb": "binancecoin"
    };

    // Mapa e Aksioneve të Bursës
    const stockMap = {
        "apple": "AAPL", "aapl": "AAPL",
        "tesla": "TSLA", "tsla": "TSLA",
        "google": "GOOGL", "googl": "GOOGL",
        "microsoft": "MSFT", "msft": "MSFT",
        "nvidia": "NVDA", "nvda": "NVDA",
        "amazon": "AMZN", "amzn": "AMZN"
    };

    // 1. Kontrolli për Kriptomonedha (CoinGecko API)
    for (const [key, cryptoId] of Object.entries(cryptoMap)) {
        if (query.includes(key)) {
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`);
                const data = await res.json();

                if (data[cryptoId]) {
                    const price = data[cryptoId].usd;
                    const change = data[cryptoId].usd_24h_change ? data[cryptoId].usd_24h_change.toFixed(2) : 0;
                    const nameUpper = cryptoId.toUpperCase();
                    const trend = change >= 0 ? "📈 +" : "📉 ";

                    if (isSq) {
                        return `💰 Çmimi i ${nameUpper}:\n\n` +
                               `- Vlera live: $${price.toLocaleString("en-US")}\n` +
                               `- Ndryshimi (24 orët e fundit): ${trend}${change}%`;
                    } else if (isFr) {
                        return `💰 Prix de ${nameUpper}:\n\n` +
                               `- Valeur en direct: $${price.toLocaleString("en-US")}\n` +
                               `- Variation (24h): ${trend}${change}%`;
                    } else {
                        return `💰 ${nameUpper} Price:\n\n` +
                               `- Live Value: $${price.toLocaleString("en-US")}\n` +
                               `- 24h Change: ${trend}${change}%`;
                    }
                }
            } catch (err) {
                console.warn("Gabim te Kripto API:", err);
            }
        }
    }

    // 2. Kontrolli për Aksionet (Stooq API)
    for (const [key, ticker] of Object.entries(stockMap)) {
        if (query.includes(key)) {
            try {
                const res = await fetch(`https://stooq.com/q/l/?s=${ticker}.us&f=sd2t2ohlcv&h&e=json`);
                const data = await res.json();

                if (data.symbols && data.symbols[0] && data.symbols[0].close) {
                    const price = data.symbols[0].close;

                    if (isSq) {
                        return `📊 Aksionet e ${ticker}:\n\n` +
                               `- Çmimi në bursë: $${price} USD\n` +
                               `- Tregu: NASDAQ / NYSE`;
                    } else if (isFr) {
                        return `📊 Actions ${ticker}:\n\n` +
                               `- Prix du marché: $${price} USD\n` +
                               `- Marché: NASDAQ / NYSE`;
                    } else {
                        return `📊 ${ticker} Stock Price:\n\n` +
                               `- Market Price: $${price} USD\n` +
                               `- Exchange: NASDAQ / NYSE`;
                    }
                }
            } catch (err) {
                console.warn("Gabim te Stock API:", err);
            }
        }
    }

    return null;
}
