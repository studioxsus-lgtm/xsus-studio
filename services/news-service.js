// services/news-service.js

export async function checkNews(userQuery) {
    const query = userQuery.toLowerCase().trim();

    // Fjalët kyçe për kërkim lajmesh
    const isNewsRequest = [
        "lajme", "lajmet", "news", "latest news", "top headlines",
        "actualités", "dernières nouvelles", "world news", "global news"
    ].some(keyword => query.includes(keyword));

    if (!isNewsRequest) return null;

    // Zbulojmë gjuhën e përdoruesit për mesazhin hyrës
    const isSq = query.includes("lajm") || query.includes("sot");
    const isFr = query.includes("actualit") || query.includes("nouvelle");

    // Parazgjedhja globale (US/Global)
    let rssUrl = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"; 
    
    // Titujt sipas gjuhës
    let regionTitle = isSq ? "🌍 **Titujt kryesorë botërorë:**" :
                      isFr ? "🌍 **Titres principaux mondiaux:**" :
                             "🌍 **Top Global Headlines:**";

    let footerNote = isSq ? "_Mund të pyesni për lajme nga Evropa, Amerika apo Teknologjia._" :
                     isFr ? "_Vous pouvez demander des actualités sur l'Europe, les USA ou la Technologie._" :
                            "_You can ask for Europe news, USA news, or Tech news._";

    if (query.includes("evrop") || query.includes("europ") || query.includes("europe")) {
        rssUrl = "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-GB&gl=GB&ceid=GB:en";
        regionTitle = isSq ? "🇪🇺 **Lajmet kryesore nga Evropa dhe Bota:**" :
                      isFr ? "🇪🇺 **Actualités principales d'Europe et du Monde:**" :
                             "🇪🇺 **Top News from Europe & World:**";
    } else if (query.includes("amerik") || query.includes("usa") || query.includes("us") || query.includes("america")) {
        rssUrl = "https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en";
        regionTitle = isSq ? "🇺🇸 **Lajmet më të fundit nga SHBA:**" :
                      isFr ? "🇺🇸 **Dernières actualités des États-Unis:**" :
                             "🇺🇸 **Top News from the United States:**";
    } else if (query.includes("teknologji") || query.includes("tech") || query.includes("technology")) {
        rssUrl = "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en";
        regionTitle = isSq ? "💻 **Lajmet më të fundit nga Teknologjia:**" :
                      isFr ? "💻 **Dernières actualités Technologie:**" :
                             "💻 **Top Technology News:**";
    }

    try {
        const feedUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const response = await fetch(feedUrl);
        
        if (!response.ok) return null;

        const data = await response.json();

        if (data.status === "ok" && data.items.length > 0) {
            const topNews = data.items.slice(0, 5);
            let newsOutput = `${regionTitle}\n\n`;

            topNews.forEach((item, index) => {
                newsOutput += `${index + 1}. ${item.title}\n`;
            });

            newsOutput += `\n${footerNote}`;
            return newsOutput;
        }
    } catch (error) {
        console.warn("Gabim gjatë marrjes së lajmeve:", error);
    }

    return null;
}
