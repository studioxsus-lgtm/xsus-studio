
import http from "node:http";
import { processAIRequest } from "./src/core/ai-core.js";

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_QUERY_LENGTH = 8000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });

    res.end(JSON.stringify(data));
}

function applyCORS(req, res) {
    const origin = req.headers.origin;

    res.setHeader("Vary", "Origin");

    if (origin && allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return true;
    }

    return false;
}

function readJSONBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        let bytes = 0;
        let finished = false;

        req.on("data", (chunk) => {
            if (finished) return;

            bytes += chunk.length;

            if (bytes > MAX_BODY_BYTES) {
                finished = true;
                reject(Object.assign(
                    new Error("Request body is too large."),
                    { statusCode: 413 }
                ));
                req.destroy();
                return;
            }

            body += chunk.toString("utf8");
        });

        req.on("end", () => {
            if (finished) return;
            finished = true;

            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                reject(Object.assign(
                    new Error("Invalid JSON body."),
                    { statusCode: 400 }
                ));
            }
        });

        req.on("error", (error) => {
            if (finished) return;
            finished = true;
            reject(error);
        });
    });
}

const server = http.createServer(async (req, res) => {
    if (applyCORS(req, res)) return;

    const pathname = new URL(
        req.url || "/",
        `http://${req.headers.host || "localhost"}`
    ).pathname;

    if (req.method === "GET" && pathname === "/health") {
        return sendJSON(res, 200, {
            status: "ok",
            service: "xsus-ai-api",
            apiVersion: "1.0.0"
        });
    }

    if (req.method === "GET" && pathname === "/") {
        return sendJSON(res, 200, {
            service: "XSUS AI API",
            status: "online",
            endpoints: {
                health: "/health",
                chat: "POST /api/chat"
            }
        });
    }

    if (req.method !== "POST" || pathname !== "/api/chat") {
        return sendJSON(res, 404, {
            error: "Endpoint not found."
        });
    }

    if (!req.headers["content-type"]?.includes("application/json")) {
        return sendJSON(res, 415, {
            error: "Content-Type must be application/json."
        });
    }

    try {
        const body = await readJSONBody(req);

        const query = typeof body.query === "string"
            ? body.query.trim()
            : typeof body.message === "string"
                ? body.message.trim()
                : "";

        if (!query) {
            return sendJSON(res, 400, {
                error: "Query cannot be empty."
            });
        }

        if (query.length > MAX_QUERY_LENGTH) {
            return sendJSON(res, 413, {
                error: `Query exceeds ${MAX_QUERY_LENGTH} characters.`
            });
        }

        const language = typeof body.language === "string"
            ? body.language.trim().toLowerCase()
            : "en";

        const supportedLanguages = new Set([
            "sq", "en", "fr", "de", "es", "it",
            "pt", "nl", "ar", "zh", "ja", "ko", "ru"
        ]);

        if (!supportedLanguages.has(language)) {
            return sendJSON(res, 400, {
                error: "Unsupported language."
            });
        }

        const conversationId =
            typeof body.conversationId === "string" &&
            /^[a-zA-Z0-9_-]{1,100}$/.test(body.conversationId)
                ? body.conversationId
                : undefined;

        const result = await processAIRequest({
            query,
            language,
            ...(conversationId ? { conversationId } : {})
        });

        if (!result || typeof result !== "object") {
            return sendJSON(res, 500, {
                error: "XSUS AI Core returned an invalid response."
            });
        }

        if (result.error) {
            return sendJSON(res, 422, result);
        }

        return sendJSON(res, 200, result);
    } catch (error) {
        const statusCode = Number.isInteger(error.statusCode)
            ? error.statusCode
            : 500;

        if (statusCode >= 500) {
            console.error("XSUS API error:", error);
        }

        return sendJSON(res, statusCode, {
            error: statusCode === 500
                ? "Internal XSUS AI API error."
                : error.message
        });
    }
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`XSUS AI API listening on port ${PORT}`);
});
