// services/sports-service.js

export async function checkSports(userQuery) {
    const query = userQuery.toLowerCase().trim();

    // Fjalët kyçe për sportin në tri gjuhët e mbështetura
    const isSportsRequest = [
        // Shqip
        "sport", "sportet", "futboll", "ndeshje", "rezultate", "kampionat",
        // Frëngjisht
        "sport", "sports", "football", "match", "résultats", "championnat", "actualités sportives",
        // Anglisht
        "sport", "sports", "football", "soccer", "match", "results", "champions league", "premier league"
    ].some(keyword => query.includes(keyword));

    if (!isSportsRequest) return null;

    // Përcaktimi i saktë i gjuhës bazuar në pyetjen e përdoruesit
    const isFr = query.includes("match") || query.includes("résultats") || query.includes("championnat") || query.includes("actualités") || query.includes("sports");
    const isSq = query.includes("futboll") || query.includes("ndeshje") || query.includes("rezultate") || query.includes("sportet") || query.includes("kampionat");

    // Lidhja RSS sipas temës
    let rssUrl = "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en";
    
    let regionTitle = isSq ? "⚽ **Titujt dhe rezultatet më të fundit sportive:**" :
                      isFr ? "⚽ **Dernières actualités et résultats sportifs:**" :
                             "⚽ **Top Sports Headlines & Results:**";

    let footerNote = isSq ? "_Mund të pyesni për futboll, Champions League ose liga të tjera._" :
                     isFr ? "_Vous pouvez demander des actualités sur le football, la Ligue des champions ou d'autres ligues._" :
                            "_You can ask for football, Champions League, or other leagues._";

    if (query.includes("champions") || query.includes("uefa") || query.includes("league")) {
        rssUrl = "https://news.google.com/rss/search?q=Champions+League&hl=en-US&gl=US&ceid=US:en";
        regionTitle = isSq ? "🏆 **Lajmet dhe përditësimet për UEFA Champions League:**" :
                      isFr ? "🏆 **Actualités et mises à jour de l'UEFA Champions League:**" :
                             "🏆 **UEFA Champions League Updates:**";
    } else if (query.includes("premier") || query.includes("england")) {
        rssUrl = "https://news.google.com/rss/search?q=Premier+League&hl=en-US&gl=US&ceid=US:en";
        regionTitle = isSq ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Lajmet për Premier League:**" :
                      isFr ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Actualités de la Premier League:**" :
                             "🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Premier League News:**";
    }

    try {
        const feedUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(feedUrl);
        
        if (!response.ok) return null;

        const data = await response.json();

        if (data.status === "ok" && data.items.length > 0) {
            const topSports = data.items.slice(0, 5);
            let sportsOutput = `${regionTitle}\n\n`;

            topSports.forEach((item, index) => {
                sportsOutput += `${index + 1}. ${item.title}\n`;
            });

            sportsOutput += `\n${footerNote}`;
            return sportsOutput;
        }
    } catch (error) {
        console.warn("Gabim gjatë marrjes së të dhënave sportive:", error);
    }

    return null;
}
