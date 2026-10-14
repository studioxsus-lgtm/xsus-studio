// services/custom-knowledge-service.js
let customData = [];

export async function loadCustomKnowledge() {
    try {
        const res = await fetch('services/data/xsus-ecosystem.json');
        if (res.ok) {
            const json = await res.json();
            if (json.items) {
                customData.push(...json.items);
                console.log("Custom Knowledge u ngarkua me sukses!");
            }
        }
    } catch (e) {
        console.warn("Gabim në ngarkimin e Custom Knowledge:", e);
    }
}

export function checkCustomKnowledge(userQuery) {
    const query = userQuery.toLowerCase();
    for (const item of customData) {
        const match = item.keywords.some(kw => query.includes(kw.toLowerCase()));
        if (match) {
            return item.answer;
        }
    }
    return null;
}
