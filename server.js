
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
import { checkHyperStartupReadiness } from "./src/platform/xsus-app/hyper-startup-readiness.js";
import {createAndroidReviewRoute, ANDROID_REVIEW_PATH} from "./src/platform/xsus-app/hyper-android-review-route.js";
const androidReviewRoute = createAndroidReviewRoute(process.env);
import { createHyperReadinessDiagnostic } from "./src/platform/xsus-app/hyper-readiness-diagnostic.js";
import { createHyperV81Route } from "./src/platform/xsus-app/hyper-v81-route.js";
import { createHyperApplicationHttpHandler } from "./src/platform/xsus-app/xsus-hyper-application-http.js";
import { createHyperApplicationDispatcher } from "./src/platform/xsus-app/xsus-hyper-application-dispatcher.js";
import { createHyperFutureBridge, HYPER_FUTURE_BRIDGE_PATH } from "./src/platform/xsus-app/hyper-future-bridge.js";
import { createHyperNodeRuntimeRoute } from "./src/platform/xsus-app/hyper-v8235-node-runtime-route.js";
import { createHyperAppBackendComposition } from "./src/platform/xsus-app/hyper-v8234-backend-composition.js";
import { createHyperEvidenceOwnerAuthorizer } from "./src/platform/xsus-app/hyper-evidence-owner-authorizer.js";
import { processAIRequest } from "./src/core/ai-core.js";
import { createPrivateChatHandler } from "./src/server/private-chat-handler.js";
import { createAssistantMessageWriter } from "./src/server/assistant-message-writer.js";
import { createPrivateChatAuthorization } from "./src/server/private-chat-authorization.js";
import { createXsusHyperAdapter } from "./src/platform/xsus-app/xsus-hyper-adapter.js";
import { inspectHyperDeploymentConfig } from "./src/platform/xsus-app/hyper-deployment-gate.js";
import { createTrustedRecoveryAuditAnchor } from "./src/hyper-xsus-core/knowledge-reasoning/trusted-recovery-audit-anchor.js";
import { createDurableRecoveryAudit } from "./src/hyper-xsus-core/knowledge-reasoning/durable-recovery-audit.js";

const PORT = Number(process.env.PORT) || 3000;
const hyperV81Route = createHyperV81Route({ env: process.env });
const hyperReadinessDiagnostic = createHyperReadinessDiagnostic({
    env: process.env,
    enabled: process.env.XSUS_HYPER_READINESS_ENABLED === "true"
});

// v8.2.35: route is registered but remains fail-closed until an independently
// verified evidence-ownership provider and database migration are available.
// Never enable this by a public request or client-supplied userId.
// A 64-character hexadecimal secret is decoded to the 32-byte key required
// by the HMAC provenance engine. Reject malformed secrets before enabling.
function readHyperEvidenceKey(value) {
    if (typeof value !== "string" || !/^[0-9a-fA-F]{64}$/.test(value))
        throw new Error("Hyper evidence HMAC key must be 64 hexadecimal characters.");
    return Buffer.from(value, "hex");
}
const hyperEvidenceEnabled = process.env.XSUS_HYPER_EVIDENCE_ROUTE_ENABLED === "true";
const hyperEvidenceComposition = hyperEvidenceEnabled
    ? createHyperAppBackendComposition({
        supabaseUrl: process.env.SUPABASE_URL,
        publishableKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        evidenceKey: readHyperEvidenceKey(process.env.XSUS_HYPER_EVIDENCE_KEY),
        evidenceKeyId: process.env.XSUS_HYPER_EVIDENCE_KEY_ID,
        authorizeEvidenceOwner: createHyperEvidenceOwnerAuthorizer({
            url: process.env.SUPABASE_URL,
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
        }),
        enabled: true
    })
    : { async handle() {
        return { status: 503, body: { ok: false, code: "EVIDENCE_ROUTE_DISABLED" } };
    } };
const hyperEvidenceRoute = createHyperNodeRuntimeRoute({
    composition: hyperEvidenceComposition,
    enabled: hyperEvidenceEnabled
});

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

const hyperAdapter = process.env.XSUS_HYPER_APP_ENABLED === "true"
    ? (() => {
        const gate = inspectHyperDeploymentConfig(process.env);
        if (!gate.ready) {
            throw new Error("Hyper XSUS App deployment gate blocked: " + gate.blockers.join(", "));
        }
        const auth = createPrivateChatAuthorization({
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_ANON_KEY
        });
        const audit = createDurableRecoveryAudit({
            directory: process.env.XSUS_HYPER_AUDIT_DIRECTORY,
            key: process.env.XSUS_HYPER_AUDIT_KEY,
            keyId: process.env.XSUS_HYPER_AUDIT_KEY_ID
        });
        const trusted = createTrustedRecoveryAuditAnchor({
            directory: process.env.XSUS_HYPER_ANCHOR_DIRECTORY,
            key: process.env.XSUS_HYPER_ANCHOR_KEY,
            keyId: process.env.XSUS_HYPER_ANCHOR_KEY_ID,
            auditDirectory: process.env.XSUS_HYPER_AUDIT_DIRECTORY,
            readDurableAudit: () => audit.read(),
            // Read-only endpoint: never grant anchor advancement here.
            authorize: async () => false
        });
        return createXsusHyperAdapter({
            verifyUser: authorization => auth.verifyUser(authorization),
            inspectHealth: () => trusted.inspectHealth()
        });
    })()
    : null;

// A separate authenticated path composes Future's stateless language check
// with Hyper's draft-plan validator. It remains closed until explicitly enabled.
const hyperFutureBridge = process.env.XSUS_HYPER_FUTURE_BRIDGE_ENABLED === "true"
    ? (() => {
        const auth = createPrivateChatAuthorization({
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_ANON_KEY
        });
        return createHyperFutureBridge({ verifyUser: auth.verifyUser });
    })()
    : null;

// The Hyper application route is registered, but its server-side project-owner
// provider and real plan/build executors have not been verified. Keep this
// capability disabled instead of falling back to XSUS AI Core.
// The HTTP handler/dispatcher require trusted injected dependencies and cannot
// be constructed from request input. This handler is intentionally not mounted.
void createHyperApplicationHttpHandler;
void createHyperApplicationDispatcher;

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
                apiVersion: "1.0.1",
                capabilities: {
                    privateChat: Boolean(privateChatHandler),
                    privateReplyWrites: Boolean(privateChatHandler && privateReplyWriter)
                }
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

        if (pathname === ANDROID_REVIEW_PATH) {
            if (!androidReviewRoute) return sendJSON(res,503,{error:"Android review disabled"});
            if (req.method !== "POST") return sendJSON(res,405,{error:"Method not allowed"});
            if (!androidReviewRoute.authorized(req.headers.authorization)) return sendJSON(res,401,{error:"Unauthorized"});
            if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")) return sendJSON(res,415,{error:"Invalid content type"});
            try {
                const chunks=[]; let size=0;
                for await (const chunk of req) {
                    size+=chunk.length;
                    if(size>262144) return sendJSON(res,413,{error:"Payload too large"});
                    chunks.push(chunk);
                }
                const body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks)));
                return sendJSON(res,200,androidReviewRoute.review(body));
            } catch { return sendJSON(res,400,{error:"Invalid review request"}); }
        }

        // Read-only diagnostic; requires verified Supabase user and explicit flag.
        if (pathname === hyperReadinessDiagnostic.path) {
            const result = await hyperReadinessDiagnostic.handle({
                method: req.method, authorization: req.headers.authorization
            });
            return sendJSON(res, result.status, result.body);
        }

        // Registered Hyper evidence verification path; intentionally disabled.
        // No database access or user identity can bypass this security gate.
        if (pathname === hyperEvidenceRoute.path) {
            return hyperEvidenceRoute.handle(req, res);
        }

        // New Hyper v8.1 route: fail-closed until independently verified.
        if (pathname === "/api/xsus-app/hyper/v81/assurance") {
            const result = await hyperV81Route.handle({
                method: req.method,
                authorization: req.headers.authorization
            });
            return sendJSON(res, result.status, result.data);
        }

        // Server-only authenticated, read-only Hyper XSUS Core status endpoint.
        if (pathname === "/api/xsus-app/hyper/assurance") {
            if (!hyperAdapter) return sendJSON(res, 503, { error: "Hyper integration is not enabled." });
            const result = await hyperAdapter.handle({
                method: req.method,
                authorization: req.headers.authorization
            });
            return sendJSON(res, result.status, result.data);
        }

        // Explicit bridge between the independent Hyper and Future cores.
        // Future proofreads without persistence; Hyper validates a non-executable draft.
        if (pathname === HYPER_FUTURE_BRIDGE_PATH) {
            if (!hyperFutureBridge) {
                return sendJSON(res, 503, { error: "Hyper-Future bridge is not enabled." });
            }
            if (req.method !== "POST") {
                return sendJSON(res, 405, { error: "Method not allowed." });
            }
            if (!req.headers["content-type"]?.includes("application/json")) {
                return sendJSON(res, 415, { error: "Content-Type must be application/json." });
            }
            try {
                const body = await readJSONBody(req);
                const result = await hyperFutureBridge.handle({
                    method: req.method,
                    authorization: req.headers.authorization,
                    body
                });
                return sendJSON(res, result.status, result.data);
            } catch (error) {
                const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 400;
                return sendJSON(res, statusCode, {
                    error: statusCode === 413 ? "Request body is too large." : "Invalid bridge request."
                });
            }
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
        // Safe, read-only check at boot. No HTTP route or secret output.
        void checkHyperStartupReadiness({ env: process.env })
            .then(result => console.log("XSUS Hyper Supabase readiness:", JSON.stringify(result)))
            .catch(() => console.log("XSUS Hyper Supabase readiness: CHECK_UNAVAILABLE"));
    }
);
