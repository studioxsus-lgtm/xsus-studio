
/**
 * XSUS AI Core — HTTP API Server
 * Version: 1.0.1
 * Brand: THE X IDENTITY
 *
 * Security:
 * - Public chat requests cannot access persistent
 *   conversation memory through client-provided IDs.
 * - Conversation ownership must be verified before
 *   authenticated persistence is enabled.
 * - XSUS AI Core remains independent.
 */

import http from "node:http";
import { processAIRequest } from "./src/core/ai-core.js";
import { createPrivateChatHandler } from "./src/server/private-chat-handler.js";
import { createAssistantMessageWriter } from "./src/server/assistant-message-writer.js";

const PORT = Number(process.env.PORT) || 3000;

const privateReplyWriter = process.env.XSUS_PRIVATE_REPLY_WRITES_ENABLED === "true"
    ? createAssistantMessageWriter({
        supabaseUrl: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    })
    : null;

const privateChatHandler = process.env.XSUS_PRIVATE_CHAT_ENABLED === "true"
    ? createPrivateChatHandler({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY,
        generate: privateReplyWriter ? ({ query }) => processAIRequest({ query }) : undefined,
        writer: privateReplyWriter || undefined
    })
    : null;

const MAX_BODY_BYTES = 32 * 1024;
const MAX_QUERY_LENGTH = 8000;

const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || ""
)
    .split(",")
    .map((origin) =>
        origin.trim().replace(/\/$/, "")
    )
    .filter(Boolean);

/**
 * Send JSON response with security headers.
 */
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type":
            "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    });

    res.end(JSON.stringify(data));
}

/**
 * Apply CORS policy.
 *
 * CORS is not authentication.
 * Conversation access is controlled separately.
 */
function applyCORS(req, res) {
    const origin = req.headers.origin;

    res.setHeader("Vary", "Origin");

    if (
        origin &&
        allowedOrigins.includes(
            origin.replace(/\/$/, "")
        )
    ) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            origin
        );

        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return true;
    }

    return false;
}

/**
 * Read JSON request body with size limits.
 */
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

                reject(
                    Object.assign(
                        new Error(
                            "Request body is too large."
                        ),
                        { statusCode: 413 }
                    )
                );

                req.destroy();
                return;
            }

            body += chunk.toString("utf8");
        });

        req.on("end", () => {
            if (finished) return;

            finished = true;

            try {
                resolve(
                    JSON.parse(body || "{}")
                );
            } catch {
                reject(
                    Object.assign(
                        new Error(
                            "Invalid JSON body."
                        ),
                        { statusCode: 400 }
                    )
                );
            }
        });

        req.on("error", (error) => {
            if (finished) return;

            finished = true;
            reject(error);
        });
    });
}

/**
 * HTTP Server
 */
const server = http.createServer(
    async (req, res) => {
        if (applyCORS(req, res)) {
            return;
        }

        const pathname = new URL(
            req.url || "/",
            `http://${req.headers.host || "localhost"}`
        ).pathname;

        /**
         * Health endpoint
         */
        if (
            req.method === "GET" &&
            pathname === "/health"
        ) {
            return sendJSON(res, 200, {
                status: "ok",
                service: "xsus-ai-api",
                apiVersion: "1.0.1"
            });
        }

        /**
         * API information endpoint
         */
        if (
            req.method === "GET" &&
            pathname === "/"
        ) {
            return sendJSON(res, 200, {
                service: "XSUS AI API",
                status: "online",
                endpoints: {
                    health: "/health",
                    chat: "POST /api/chat"
                }
            });
        }

        // Separate authenticated route; disabled unless explicitly configured.
        // Never changes the public /api/chat behavior.
        if (pathname === "/api/private-chat") {
            if (req.method !== "POST") {
                return sendJSON(res, 405, { error: "Method not allowed." });
            }
            if (!privateChatHandler) {
                return sendJSON(res, 503, { error: "Private chat is not enabled." });
            }
            if (!req.headers["content-type"]?.includes("application/json")) {
                return sendJSON(res, 415, { error: "Content-Type must be application/json." });
            }
            try {
                const body = await readJSONBody(req);
                const result = await privateChatHandler({
                    authorization: req.headers.authorization,
                    body
                });
                return sendJSON(res, result.status, result.data);
            } catch {
                return sendJSON(res, 400, { error: "Invalid private chat request." });
            }
        }

        /**
         * Route validation
         */
        if (
            req.method !== "POST" ||
            pathname !== "/api/chat"
        ) {
            return sendJSON(res, 404, {
                error: "Endpoint not found."
            });
        }

        /**
         * Content-Type validation
         */
        if (
            !req.headers["content-type"]?.includes(
                "application/json"
            )
        ) {
            return sendJSON(res, 415, {
                error:
                    "Content-Type must be application/json."
            });
        }

        try {
            const body = await readJSONBody(req);

            /**
             * Query validation
             */
            const query =
                typeof body.query === "string"
                    ? body.query.trim()
                    : typeof body.message === "string"
                        ? body.message.trim()
                        : "";

            if (!query) {
                return sendJSON(res, 400, {
                    error: "Query cannot be empty."
                });
            }

            if (
                query.length > MAX_QUERY_LENGTH
            ) {
                return sendJSON(res, 413, {
                    error:
                        `Query exceeds ${MAX_QUERY_LENGTH} characters.`
                });
            }

            /**
             * Language validation
             */
            const language =
                typeof body.language === "string"
                    ? body.language
                        .trim()
                        .toLowerCase()
                    : "en";

            const supportedLanguages = new Set([
                "sq",
                "en",
                "fr",
                "de",
                "es",
                "it",
                "pt",
                "nl",
                "ar",
                "zh",
                "ja",
                "ko",
                "ru"
            ]);

            if (
                !supportedLanguages.has(language)
            ) {
                return sendJSON(res, 400, {
                    error: "Unsupported language."
                });
            }

            /**
             * SECURITY — PUBLIC CHAT ISOLATION
             *
             * Never trust a conversationId supplied
             * by an unauthenticated browser.
             *
             * Previously:
             *
             * processAIRequest({
             *   query,
             *   language,
             *   conversationId
             * });
             *
             * That could allow access to another
             * conversation's memory if its ID
             * became known.
             *
             * Until authenticated ownership
             * verification is implemented,
             * do not forward conversationId.
             *
             * The frontend may continue sending
             * conversationId for compatibility.
             */
            const result = await processAIRequest({
                query,
                language
            });

            /**
             * Validate XSUS AI Core response
             */
            if (
                !result ||
                typeof result !== "object"
            ) {
                return sendJSON(res, 500, {
                    error:
                        "XSUS AI Core returned an invalid response."
                });
            }

            /**
             * XSUS AI Core error response
             */
            if (result.error) {
                return sendJSON(
                    res,
                    422,
                    result
                );
            }

            /**
             * Successful AI response
             */
            return sendJSON(
                res,
                200,
                result
            );

        } catch (error) {
            const statusCode =
                Number.isInteger(error.statusCode)
                    ? error.statusCode
                    : 500;

            if (statusCode >= 500) {
                console.error(
                    "XSUS API error:",
                    error
                );
            }

            return sendJSON(
                res,
                statusCode,
                {
                    error:
                        statusCode === 500
                            ? "Internal XSUS AI API error."
                            : error.message
                }
            );
        }
    }
);

/**
 * Start HTTP server
 */
server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `XSUS AI API listening on port ${PORT}`
        );
    }
);
