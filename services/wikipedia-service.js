// services/wikipedia-service.js

export async function checkWikipedia(userQuery) {
    // Heqim fjalë kyçe të panevojshme për të gjetur termin kryesor të kërkimit
    const cleanQuery = userQuery
        .replace(/çfarë është|kush është|tregomë për|për/gi, '')
        .trim();

    if (!cleanQuery || cleanQuery.length < 2) return null;

    try {
        // Përdorim API-në publike dhe falas të Wikipedia-s (në gjuhën shqipe ose angleze sipas nevojës)
        const url = `https://sq.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&origin=*`;
        
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        
        if (data.query && data.query.search.length > 0) {
            const firstResult = data.query.search[0];
            const title = firstResult.title;
            // Heqim etiketat HTML nga snipeti i Wikipedia-s
            const snippet = firstResult.snippet.replace(/<\/?[^>]+(>|$)/g, "");

            return `📚 **Wikipedia (${title}):**\n${snippet}...\n\n_Më i detajuar në Wikipedia._`;
        }
    } catch (e) {
        console.warn("Gabim gjatë kërkimit në Wikipedia:", e);
    }

    return null;
}
