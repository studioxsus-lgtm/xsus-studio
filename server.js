/**
 * XSUS Studio — HTTP API
 * Version: 1.0.0
 *
 * Lidh ndërfaqen publike me XSUS AI Core.
 * Përdor vetëm modulet standarde të Node.js.
 */

import { createServer } from "node:http";
import { processAIRequest } from "./src/core/ai-core.js";

const PORT = Number(process.env.PORT) || 3000;

const MAX_BODY_BYTES = 32 * 1024;
const MAX_QUERY_LENGTH = 8000;

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS"
    );
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );
  }
}

function sendJSON(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  response.end(JSON.stringify(data));
}

async function readJSONBody(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > MAX_BODY_BYTES) {
      const error = new Error("Kërkesa është tepër e madhe.");
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error("Formati JSON nuk është i vlefshëm.");
    error.statusCode = 400;
    throw error;
  }
}

const server = createServer(async (request, response) => {
  setCorsHeaders(request, response);

  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`
  );

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJSON(response, 200, {
      status: "ok",
      service: "xsus-ai-api",
      apiVersion: "1.0.0",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/chat") {
    try {
      const input = await readJSONBody(request);

      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input)
      ) {
        sendJSON(response, 400, {
          error: "Kërkesa duhet të jetë objekt JSON.",
        });
        return;
      }

      const query =
        typeof input.query === "string"
          ? input.query.trim()
          : typeof input.message === "string"
            ? input.message.trim()
            : "";

      if (!query) {
        sendJSON(response, 400, {
          error: "Shkruaj një pyetje për XSUS AI.",
        });
        return;
      }

      if (query.length > MAX_QUERY_LENGTH) {
        sendJSON(response, 413, {
          error: `Pyetja nuk mund të kalojë ${MAX_QUERY_LENGTH} karaktere.`,
        });
        return;
      }

      // Mos lejo që klienti të zëvendësojë fushat e kërkesës.
      const result = await processAIRequest({
        query,
        language:
          typeof input.language === "string"
            ? input.language
            : "auto",
        conversationId:
          typeof input.conversationId === "string"
            ? input.conversationId
            : undefined,
      });

      const failed =
        Boolean(result?.error) ||
        result?.success === false;

      sendJSON(response, failed ? 422 : 200, result);
    } catch (error) {
      if (error?.statusCode === 400 || error?.statusCode === 413) {
        sendJSON(response, error.statusCode, {
          error: error.message,
        });
        return;
      }

      console.error("XSUS AI API error:", error);

      sendJSON(response, 500, {
        error: "Ndodhi një gabim gjatë përpunimit të kërkesës.",
      });
    }

    return;
  }

  sendJSON(response, 404, {
    error: "Endpoint-i nuk u gjet.",
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`XSUS AI API po dëgjon në portën ${PORT}.`);
});
