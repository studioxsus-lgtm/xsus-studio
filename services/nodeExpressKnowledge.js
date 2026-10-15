// ============================================================================
// XSUS AI - NODE.JS & EXPRESS.JS PROFESSIONAL KNOWLEDGE BASE
// Version: 2.0.0
// Language: Albanian / English
// Format: JavaScript ES Modules, with CommonJS compatibility at the end
// ============================================================================

export const nodeExpressKnowledge = {
  id: "xsus-node-express-professional",
  title: "XSUS AI - Node.js & Express.js Professional Knowledge Base",
  title_sq: "XSUS AI - Baza Profesionale e Njohurive për Node.js dhe Express.js",
  description:
    "A structured backend engineering knowledge base covering Node.js, Express.js, REST APIs, CRUD, validation, authentication, authorization, security, databases, testing, and deployment.",
  description_sq:
    "Bazë e strukturuar e njohurive për zhvillimin backend, që përfshin Node.js, Express.js, REST API, CRUD, validimin, autentikimin, autorizimin, sigurinë, databazat, testimin dhe deployment-in.",
  version: "2.0.0",
  language: ["sq", "en"],

  metadata: {
    category: "backend-development",
    difficulty: ["beginner", "intermediate", "advanced"],
    technologies: [
      "Node.js",
      "Express.js",
      "JavaScript",
      "HTTP",
      "REST",
      "JWT",
      "bcrypt",
      "Zod",
      "SQL",
      "Testing"
    ],
    intendedUse: [
      "learning",
      "technical-reference",
      "AI-knowledge-base",
      "backend-development"
    ]
  },

  sections: [
    // ============================================================
    // 1. NODE.JS ARCHITECTURE AND EVENT LOOP
    // ============================================================
    {
      id: "node-architecture",
      title: "Node.js Architecture and Event Loop",
      title_sq: "Arkitektura e Node.js dhe Event Loop",

      content_sq: `
Node.js është një mjedis ekzekutimi për JavaScript, i ndërtuar mbi motorin V8. Ai përdor një model të orientuar nga ngjarjet dhe I/O asinkron, i cili është i përshtatshëm për API, aplikacione në kohë reale dhe shërbime që trajtojnë shumë lidhje.

Node.js zakonisht ekzekuton JavaScript-in e një procesi në një thread kryesor. Kjo nuk do të thotë se çdo operacion ekzekutohet në një thread të vetëm: disa operacione I/O delegohen te sistemi operativ ose te thread pool i libuv, ndërsa Worker Threads mund të përdoren për punë të rënda CPU.

Komponentët kryesorë:
- V8: ekzekuton JavaScript.
- Event Loop: koordinon callback-et dhe punët asinkrone.
- libuv: mbështet event loop, I/O dhe thread pool.
- Core modules: ofrojnë funksione për skedarët, rrjetin, procesin dhe më shumë.
- npm: menaxhon paketat dhe skriptet e projektit.

Analizë:
I/O asinkron nuk e bën automatikisht çdo kod të shpejtë. Një funksion sinkron që konsumon shumë CPU mund të bllokojë event loop dhe të vonojë kërkesat e tjera.
`,

      content_en: `
Node.js is a JavaScript runtime built on the V8 engine. Its event-driven, asynchronous I/O model is suitable for APIs, real-time applications, and services handling many connections.

JavaScript in a typical Node.js process runs on a main thread. However, not all work runs on that thread: some I/O is delegated to the operating system or libuv thread pool, and Worker Threads can be used for CPU-intensive work.

Key components include V8, the event loop, libuv, core modules, and npm.

Analysis:
Asynchronous I/O does not make every operation fast. CPU-intensive synchronous code can block the event loop and delay other requests.
`,

      example: `
const fs = require("node:fs");

console.log("1. Fillon programi");

fs.readFile("example.txt", "utf8", (error, data) => {
  if (error) {
    console.error("Gabim gjatë leximit:", error.message);
    return;
  }

  console.log("3. Përmbajtja:", data);
});

console.log("2. Programi vazhdon");
`,

      analysis: [
        {
          sq: "Leximi i skedarit është asinkron; callback ekzekutohet kur operacioni përfundon.",
          en: "File reading is asynchronous; the callback runs when the operation completes."
        },
        {
          sq: "Rreshti i fundit mund të shfaqet para rezultatit të leximit.",
          en: "The final log may appear before the file-read result."
        },
        {
          sq: "Gabimet e callback-ut duhet të trajtohen sipas modelit të API-së.",
          en: "Callback errors should be handled according to the API's error convention."
        }
      ],

      bestPractices: [
        {
          sq: "Shmang operacionet e rënda sinkrone në rrugët e kërkesave HTTP.",
          en: "Avoid heavy synchronous operations in HTTP request handlers."
        },
        {
          sq: "Përdor Worker Threads kur ke nevojë për llogaritje të rënda CPU.",
          en: "Use Worker Threads when CPU-intensive computation is needed."
        },
        {
          sq: "Përdor async/await për kod asinkron të lexueshëm.",
          en: "Use async/await for readable asynchronous code."
        }
      ]
    },

    // ============================================================
    // 2. PROJECT SETUP, MODULES, AND NPM
    // ============================================================
    {
      id: "project-setup-npm",
      title: "Project Setup, Core Modules, and npm",
      title_sq: "Konfigurimi i Projektit, Modulet Bazë dhe npm",

      content_sq: `
Një projekt Node.js duhet të ketë strukturë të qartë, varësi të kontrolluara dhe skripte të përsëritshme.

Komanda fillestare:
- npm init -y: krijon package.json.
- npm install express: instalon Express.
- npm install zod: instalon bibliotekën Zod për validim.
- npm install helmet cors express-rate-limit: instalon mjete të zakonshme sigurie.
- npm install --save-dev nodemon: instalon mjet zhvillimi për rinisje automatike.

Modulet e integruara:
- node:fs: skedarë.
- node:path: shtigje.
- node:http: HTTP.
- node:crypto: funksione kriptografike.
- node:process: informacion për procesin.
- node:util: mjete të përgjithshme.

Node.js mbështet CommonJS dhe ES Modules. Në një projekt ES Modules, package.json mund të përmbajë "type": "module". Në këtë rast përdoren import dhe export.

Analizë:
Zgjidh një sistem modulesh dhe përdore në mënyrë të qëndrueshme. Mos i përziej import/export me require/module.exports pa një arsye të qartë.
`,

      content_en: `
A Node.js project should have a clear structure, controlled dependencies, and repeatable scripts.

Common commands include npm init -y, npm install express, npm install zod, and installing security middleware. Core modules include node:fs, node:path, node:http, node:crypto, node:process, and node:util.

Node.js supports CommonJS and ES Modules. An ES Module project can set "type": "module" in package.json.

Analysis:
Choose one module system and use it consistently. Avoid mixing import/export with require/module.exports without a clear reason.
`,

      example: `
// package.json (illustrative configuration)
{
  "name": "xsus-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "node --test"
  }
}

// Install dependencies in the terminal:
// npm install express helmet cors express-rate-limit zod
// npm install --save-dev nodemon
`,

      analysis: [
        {
          sq: "package.json ruan metadata, skripte dhe varësitë e projektit.",
          en: "package.json stores project metadata, scripts, and dependencies."
        },
        {
          sq: "package-lock.json regjistron versionet e zgjidhura të varësive.",
          en: "package-lock.json records resolved dependency versions."
        },
        {
          sq: "Node.js duhet të jetë në një version të mbështetur dhe të përditësuar.",
          en: "Node.js should use a supported and up-to-date release."
        }
      ],

      bestPractices: [
        {
          sq: "Ruaj package-lock.json në kontrollin e versioneve për aplikacionet.",
          en: "Commit package-lock.json for applications."
        },
        {
          sq: "Mos ngarko node_modules në repository.",
          en: "Do not commit node_modules."
        },
        {
          sq: "Përdor skriptet npm për detyra të përsëritshme.",
          en: "Use npm scripts for repeatable tasks."
        }
      ]
    },

    // ============================================================
    // 3. EXPRESS APPLICATION AND ROUTING
    // ============================================================
    {
      id: "express-basics-routing",
      title: "Express Application and Routing",
      title_sq: "Aplikacioni Express dhe Routing",

      content_sq: `
Express është një framework web për Node.js që organizon kërkesat HTTP përmes routes dhe middleware.

Metodat e zakonshme:
- GET: lexon një burim.
- POST: krijon një burim ose nis një veprim.
- PUT: zëvendëson një përfaqësim të burimit.
- PATCH: ndryshon pjesë të një burimi.
- DELETE: kërkon fshirjen e një burimi.

Express Router ndihmon në ndarjen e rrugëve sipas funksionalitetit, si users, products ose authentication.

Analizë:
Rruga duhet të përcaktojë sjelljen HTTP, ndërsa logjika e biznesit duhet të mbahet jashtë handler-ave kur aplikacioni rritet.
`,

      content_en: `
Express is a Node.js web framework that organizes HTTP requests through routes and middleware.

Common methods are GET, POST, PUT, PATCH, and DELETE. Express Router allows routes to be grouped by domain, such as users, products, or authentication.

Analysis:
Routes should define HTTP behavior, while business logic should be separated from handlers as the application grows.
`,

      example: `
import express from "express";

const app = express();

app.use(express.json());

app.get("/api/v1/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "XSUS AI API"
  });
});

app.get("/api/v1/greeting/:name", (req, res) => {
  res.status(200).json({
    message: "Hello " + req.params.name
  });
});

export default app;
`,

      analysis: [
        {
          sq: "express.json() analizon JSON në trupin e kërkesës.",
          en: "express.json() parses JSON request bodies."
        },
        {
          sq: "req.params.name merr parametrin name nga URL-ja.",
          en: "req.params.name reads the name route parameter."
        },
        {
          sq: "res.status(200).json(...) dërgon përgjigje JSON me status HTTP 200.",
          en: "res.status(200).json(...) sends a JSON response with HTTP 200."
        }
      ],

      bestPractices: [
        {
          sq: "Versiono API-n, për shembull /api/v1.",
          en: "Version your API, for example with /api/v1."
        },
        {
          sq: "Përdor express.Router() për module të veçanta të routes.",
          en: "Use express.Router() to organize route modules."
        },
        {
          sq: "Mos dërgo stack trace ose detaje të brendshme klientit.",
          en: "Do not expose stack traces or internal details to clients."
        }
      ]
    },
    // ============================================================
    // 4. EXPRESS MIDDLEWARE
    // ============================================================
    {
      id: "express-middleware",
      title: "Express Middleware and Request Lifecycle",
      title_sq: "Middleware në Express dhe Cikli i Kërkesës",

      content_sq: `
Middleware është funksion që ekzekutohet gjatë ciklit të kërkesës HTTP. Ai mund të lexojë ose ndryshojë req dhe res, të përfundojë përgjigjen ose të thërrasë next().

Llojet kryesore:
- Application middleware: regjistrohet me app.use().
- Router middleware: aplikohet te një Express Router.
- Error middleware: përdor parametrat (err, req, res, next).
- Built-in middleware: express.json() dhe express.static().
- Third-party middleware: helmet, cors dhe express-rate-limit.

Rendi i regjistrimit është i rëndësishëm. Middleware që përpunon kërkesën duhet të vendoset para routes përkatëse. Error middleware zakonisht regjistrohet pas routes.

Analizë:
Nëse middleware nuk dërgon përgjigje dhe nuk thërret next(), kërkesa mund të mbetet e hapur.
`,

      content_en: `
Middleware functions run during the HTTP request lifecycle. They can inspect or modify req and res, end the response, or call next().

Types include application middleware, router middleware, error middleware, built-in middleware, and third-party middleware.

Registration order matters. Request-processing middleware should be registered before relevant routes, while error middleware is normally registered after routes.

Analysis:
If middleware neither sends a response nor calls next(), the request may remain pending.
`,

      example: `
import express from "express";

const app = express();

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start
    });
  });

  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
`,

      analysis: [
        {
          sq: "Limit-i i madhësisë së JSON ul rrezikun e kërkesave tepër të mëdha.",
          en: "A JSON body size limit reduces the risk from oversized requests."
        },
        {
          sq: "Ngjarja finish regjistrohet kur përgjigjja është dërguar.",
          en: "The finish event is emitted when the response has been sent."
        },
        {
          sq: "req.path regjistron shtegun pa query string.",
          en: "req.path records the path without the query string."
        }
      ],

      bestPractices: [
        {
          sq: "Mos regjistro fjalëkalime, token-a ose të dhëna sensitive.",
          en: "Never log passwords, tokens, or sensitive data."
        },
        {
          sq: "Vendos kufizime për madhësinë e request body.",
          en: "Set request body size limits."
        },
        {
          sq: "Përdor next(err) ose hedh përjashtimin në handler-at async sipas versionit dhe modelit të Express.",
          en: "Use next(err) or propagate rejected async handlers according to your Express version and error-handling model."
        }
      ]
    },

    // ============================================================
    // 5. REST API DESIGN AND HTTP STATUS CODES
    // ============================================================
    {
      id: "rest-api-design",
      title: "REST API Design and HTTP Semantics",
      title_sq: "Dizajnimi i REST API dhe Semantika HTTP",

      content_sq: `
REST API ekspozon burime përmes URL-ve dhe përdor metodat HTTP për të shprehur veprimet.

Shembuj:
- GET /api/v1/users: liston përdoruesit.
- GET /api/v1/users/:id: merr një përdorues.
- POST /api/v1/users: krijon përdorues.
- PATCH /api/v1/users/:id: përditëson pjesërisht një përdorues.
- DELETE /api/v1/users/:id: fshin një përdorues.

Status codes të zakonshme:
- 200 OK: kërkesa u krye me sukses.
- 201 Created: burimi u krijua.
- 204 No Content: operacioni u krye pa trup përgjigjeje.
- 400 Bad Request: kërkesa është e pavlefshme.
- 401 Unauthorized: mungon ose është i pavlefshëm autentikimi.
- 403 Forbidden: përdoruesi nuk ka leje.
- 404 Not Found: burimi nuk u gjet.
- 409 Conflict: konflikt me gjendjen ekzistuese.
- 422 Unprocessable Content: të dhënat nuk kalojnë rregullat e validimit.
- 429 Too Many Requests: u tejkalua kufiri i kërkesave.
- 500 Internal Server Error: gabim i papritur në server.

Analizë:
401 dhe 403 nuk janë të njëjta. 401 lidhet me mungesën ose pavlefshmërinë e kredencialeve; 403 tregon mungesë lejeje për veprimin.
`,

      content_en: `
A REST API exposes resources through URLs and uses HTTP methods to express operations.

Common endpoints include GET collection, GET by ID, POST to create, PATCH to update, and DELETE to remove a resource.

Common status codes include 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, and 500.

Analysis:
401 and 403 differ. A 401 response indicates missing or invalid authentication; 403 indicates insufficient permission.
`,

      example: `
import express from "express";

const router = express.Router();

router.get("/users", async (req, res) => {
  res.status(200).json({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    }
  });
});

router.post("/users", async (req, res) => {
  // Validimi dhe ruajtja duhet të kryhen para përgjigjes.
  res.status(201).json({
    message: "User created"
  });
});

export default router;
`,

      analysis: [
        {
          sq: "Koleksionet mund të kthehen me metadata për pagination.",
          en: "Collections can include pagination metadata."
        },
        {
          sq: "Kërkesat për krijim zakonisht kthejnë 201 Created.",
          en: "Creation requests commonly return 201 Created."
        },
        {
          sq: "Përgjigjet duhet të kenë strukturë të qëndrueshme dhe të dokumentuar.",
          en: "Responses should have a consistent, documented structure."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor emra burimesh në shumës, si /users dhe /products.",
          en: "Use plural resource names such as /users and /products."
        },
        {
          sq: "Shto pagination dhe kufi maksimal për listat.",
          en: "Add pagination and a maximum list size."
        },
        {
          sq: "Mos e ekspozo identifikuesin e brendshëm nëse nuk është pjesë e kontratës publike.",
          en: "Do not expose internal identifiers unless they are part of the public contract."
        }
      ]
    },

    // ============================================================
    // 6. CRUD PATTERNS AND SERVICE LAYER
    // ============================================================
    {
      id: "crud-service-layer",
      title: "CRUD Operations and Service Layer",
      title_sq: "Operacionet CRUD dhe Shtresa e Shërbimeve",

      content_sq: `
CRUD do të thotë Create, Read, Update dhe Delete.

Një strukturë e mirë ndan përgjegjësitë:
- Routes: përcaktojnë URL-të dhe metodat HTTP.
- Controllers: përpunojnë kërkesën dhe formojnë përgjigjen.
- Services: zbatojnë rregullat e biznesit.
- Repositories: komunikojnë me databazën.
- Schemas: validojnë input-et.

Shembulli më poshtë përdor një Map në memorie vetëm për demonstrim. Të dhënat humbasin kur procesi riniset dhe kjo nuk është zgjidhje për production.

Analizë:
Ndarja e shtresave e bën më të lehtë testimin dhe zëvendësimin e ruajtjes në memorie me databazë reale.
`,

      content_en: `
CRUD stands for Create, Read, Update, and Delete.

A maintainable architecture separates routes, controllers, services, repositories, and validation schemas.

The example below uses an in-memory Map for demonstration only. Data is lost when the process restarts, so this is not production storage.

Analysis:
Layer separation makes testing easier and allows in-memory storage to be replaced with a real database.
`,

      example: `
import express from "express";
import { randomUUID } from "node:crypto";

const router = express.Router();
const users = new Map();

router.post("/users", (req, res) => {
  const { name, email } = req.body ?? {};

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    typeof email !== "string" ||
    !email.includes("@")
  ) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Name or email is invalid"
      }
    });
  }

  const user = {
    id: randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase()
  };

  users.set(user.id, user);
  return res.status(201).json({ data: user });
});

router.get("/users", (req, res) => {
  return res.json({ data: [...users.values()] });
});

router.get("/users/:id", (req, res) => {
  const user = users.get(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: { code: "USER_NOT_FOUND", message: "User not found" }
    });
  }

  return res.json({ data: user });
});

router.patch("/users/:id", (req, res) => {
  const user = users.get(req.params.id);

  if (!user) {
    return res.status(404).json({
      error: { code: "USER_NOT_FOUND", message: "User not found" }
    });
  }

  const { name, email } = req.body ?? {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        error: { code: "INVALID_NAME", message: "Name is invalid" }
      });
    }
    user.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        error: { code: "INVALID_EMAIL", message: "Email is invalid" }
      });
    }
    user.email = email.trim().toLowerCase();
  }

  users.set(user.id, user);
  return res.json({ data: user });
});

router.delete("/users/:id", (req, res) => {
  const deleted = users.delete(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      error: { code: "USER_NOT_FOUND", message: "User not found" }
    });
  }

  return res.status(204).end();
});

export default router;
`,

      analysis: [
        {
          sq: "POST krijon një rekord dhe kthen 201.",
          en: "POST creates a record and returns 201."
        },
        {
          sq: "GET për një ID kthen 404 nëse burimi nuk ekziston.",
          en: "GET by ID returns 404 if the resource does not exist."
        },
        {
          sq: "PATCH ndryshon vetëm fushat e dërguara.",
          en: "PATCH updates only the supplied fields."
        },
        {
          sq: "DELETE kthen 204 kur fshirja kryhet pa trup përgjigjeje.",
          en: "DELETE returns 204 when deletion succeeds without a response body."
        },
        {
          sq: "Map përdoret vetëm si demonstrim dhe nuk ofron ruajtje të qëndrueshme.",
          en: "Map is for demonstration only and does not provide persistent storage."
        }
      ],

      bestPractices: [
        {
          sq: "Mos e përdor ruajtjen në memorie për të dhëna reale që duhet të mbijetojnë pas rinisjes.",
          en: "Do not use in-memory storage for real data that must survive restarts."
        },
        {
          sq: "Kontrollo pronësinë dhe lejet para përditësimit ose fshirjes.",
          en: "Check ownership and permissions before updating or deleting."
        },
        {
          sq: "Përdor validim skematik për çdo input nga klienti.",
          en: "Use schema validation for all client input."
        }
      ]
    },
    // ============================================================
    // 7. INPUT VALIDATION WITH ZOD
    // ============================================================
    {
      id: "input-validation",
      title: "Request Validation with Zod",
      title_sq: "Validimi i Kërkesave me Zod",

      content_sq: `
Validimi kontrollon nëse të dhënat e klientit përputhen me kontratën e API-së përpara se të përdoren.

Zod mund të validojë:
- Trupin JSON: req.body.
- Parametrat e URL-së: req.params.
- Query parameters: req.query.
- Tipet, gjatësitë, formatet dhe kufizimet e fushave.

Validimi nuk zëvendëson autorizimin. Një ID mund të jetë në format të saktë, por përdoruesi përsëri mund të mos ketë leje për të hyrë te burimi.

Analizë:
Përdor parse() ose safeParse() për të kontrolluar input-in. Mos u mbështet vetëm te validimi në frontend, sepse klientët mund të dërgojnë kërkesa të krijuara manualisht.
`,

      content_en: `
Validation checks whether client input matches the API contract before the data is used.

Zod can validate request bodies, route parameters, query parameters, types, lengths, formats, and field constraints.

Validation does not replace authorization. An ID can be correctly formatted while the requester still lacks permission to access the resource.

Analysis:
Use parse() or safeParse() to validate input. Never rely only on frontend validation because clients can construct requests manually.
`,

      example: `
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128)
}).strict();

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(254).optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be supplied" }
);

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body is invalid",
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

export {
  createUserSchema,
  updateUserSchema,
  validateBody
};
`,

      analysis: [
        {
          sq: "strict() refuzon fusha shtesë që nuk janë deklaruar në skemë.",
          en: "strict() rejects extra fields not declared in the schema."
        },
        {
          sq: "safeParse() kthen rezultat suksesi ose gabimi pa kërkuar try/catch.",
          en: "safeParse() returns a success or failure result without requiring try/catch."
        },
        {
          sq: "req.validatedBody përmban të dhënat që kaluan validimin.",
          en: "req.validatedBody contains data that passed validation."
        }
      ],

      bestPractices: [
        {
          sq: "Valido të gjitha të dhënat që vijnë nga klienti.",
          en: "Validate all data received from clients."
        },
        {
          sq: "Mos përfshi vlera të ndjeshme në detajet e gabimeve.",
          en: "Do not include sensitive values in validation errors."
        },
        {
          sq: "Përdor skema të veçanta për krijim dhe përditësim.",
          en: "Use separate schemas for creation and updates."
        }
      ]
    },

    // ============================================================
    // 8. CENTRALIZED ERROR HANDLING
    // ============================================================
    {
      id: "error-handling",
      title: "Centralized Error Handling",
      title_sq: "Trajtimi Qendror i Gabimeve",

      content_sq: `
Trajtimi qendror i gabimeve krijon përgjigje të parashikueshme dhe shmang ekspozimin e detajeve të brendshme.

Një model i zakonshëm përfshin:
- Gabime të njohura të aplikacionit.
- Middleware për 404.
- Middleware për gabimet e tjera.
- Logging në server.
- Mesazhe të sigurta për klientin.

Në Express 5, rejected promises nga route handlers asinkronë përcillen te error middleware. Në Express 4, përdor wrapper asinkron ose përcille gabimin shprehimisht me next(err).

Analizë:
Në production, klienti duhet të marrë mesazh të përgjithshëm për gabimet e papritura, ndërsa detajet regjistrohen në server me kujdes.
`,

      content_en: `
Centralized error handling creates predictable responses and prevents internal details from being exposed.

A common pattern includes application errors, a 404 handler, a general error middleware, server-side logging, and safe client messages.

In Express 5, rejected promises from async route handlers are forwarded to error middleware. In Express 4, use an async wrapper or explicitly pass errors to next(err).

Analysis:
In production, unexpected errors should produce a generic client response while details are logged securely on the server.
`,

      example: `
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

function notFoundHandler(req, res, next) {
  next(new AppError(
    404,
    "ROUTE_NOT_FOUND",
    "Route not found"
  ));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  // Në aplikacion real, përdor logger të strukturuar.
  console.error({
    message: err.message,
    method: req.method,
    path: req.path,
    statusCode
  });

  return res.status(statusCode).json({
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: statusCode === 500 && isProduction
        ? "An unexpected error occurred"
        : err.message || "Request failed"
    }
  });
}

export {
  AppError,
  notFoundHandler,
  errorHandler
};
`,

      analysis: [
        {
          sq: "AppError mban kodin HTTP dhe kodin e gabimit të aplikacionit.",
          en: "AppError stores the HTTP status and application error code."
        },
        {
          sq: "headersSent kontrollon nëse përgjigjja ka filluar të dërgohet.",
          en: "headersSent checks whether the response has already started."
        },
        {
          sq: "Gabimet e papritura marrin status 500.",
          en: "Unexpected errors receive status 500."
        }
      ],

      bestPractices: [
        {
          sq: "Mos dërgo stack trace klientit në production.",
          en: "Do not send stack traces to clients in production."
        },
        {
          sq: "Mos regjistro token-a, cookies ose fjalëkalime.",
          en: "Do not log tokens, cookies, or passwords."
        },
        {
          sq: "Përdor kodet e qëndrueshme të gabimeve për klientët API.",
          en: "Use stable error codes for API clients."
        }
      ]
    },

    // ============================================================
    // 9. PASSWORD HASHING AND AUTHENTICATION
    // ============================================================
    {
      id: "password-authentication",
      title: "Password Hashing and Authentication",
      title_sq: "Hashimi i Fjalëkalimeve dhe Autentikimi",

      content_sq: `
Autentikimi verifikon identitetin e përdoruesit. Ai duhet të jetë i ndarë nga autorizimi, i cili përcakton çfarë lejohet të bëjë përdoruesi.

Fjalëkalimet nuk duhet të ruhen në tekst të thjeshtë dhe nuk duhen enkriptuar në një mënyrë që lejon rikthimin e tyre. Përdor një password-hashing algorithm të përshtatshëm, si Argon2id ose bcrypt, me parametrat e rekomanduar për mjedisin.

Rrjedha tipike:
1. Klienti dërgon email dhe fjalëkalim përmes HTTPS.
2. Serveri kërkon llogarinë.
3. Serveri krahason fjalëkalimin me hash-in e ruajtur.
4. Serveri krijon sesion ose lëshon kredenciale autentikimi.
5. Përgjigjja nuk përfshin hash-in e fjalëkalimit.

Analizë:
Mos zbulo nëse email-i ekziston. Për hyrje të pasuksesshme, përdor një përgjigje të përgjithshme dhe kufizo përpjekjet e përsëritura.
`,

      content_en: `
Authentication verifies a user's identity. It must be distinguished from authorization, which determines what the user is allowed to do.

Passwords must never be stored in plaintext. Use a suitable password-hashing algorithm, such as Argon2id or bcrypt, with parameters appropriate for the environment.

Typical flow:
1. The client sends credentials over HTTPS.
2. The server looks up the account.
3. The server compares the supplied password with the stored hash.
4. The server creates a session or issues authentication credentials.
5. The response never includes the password hash.

Analysis:
Avoid revealing whether an email address exists. Use a generic login failure response and limit repeated attempts.
`,

      example: `
import bcrypt from "bcrypt";

const PASSWORD_HASH_ROUNDS = 12;

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Password does not meet policy");
  }

  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export async function verifyPassword(password, storedHash) {
  if (
    typeof password !== "string" ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  return bcrypt.compare(password, storedHash);
}

// Regjistrimi dhe login-i duhet të përdorin databazë reale,
// validim input-esh, rate limiting dhe HTTPS në production.
`,

      analysis: [
        {
          sq: "bcrypt.hash krijon hash me salt të menaxhuar nga biblioteka.",
          en: "bcrypt.hash creates a salted password hash managed by the library."
        },
        {
          sq: "bcrypt.compare krahason fjalëkalimin me hash-in pa e deshifruar atë.",
          en: "bcrypt.compare verifies the password against the hash without decrypting it."
        },
        {
          sq: "Kufiri i gjatësisë duhet të përshtatet me algoritmin dhe politikën e fjalëkalimeve.",
          en: "Length limits should match the selected algorithm and password policy."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor Argon2id ose bcrypt me parametra të përshtatshëm.",
          en: "Use Argon2id or bcrypt with appropriate parameters."
        },
        {
          sq: "Mos ruaj ose regjistro kurrë fjalëkalime në tekst të thjeshtë.",
          en: "Never store or log plaintext passwords."
        },
        {
          sq: "Përdor HTTPS dhe kufizo përpjekjet e hyrjes.",
          en: "Use HTTPS and rate-limit login attempts."
        }
      ]
    },
    // ============================================================
    // 10. JWT AUTHENTICATION
    // ============================================================
    {
      id: "jwt-authentication",
      title: "JWT Authentication and Token Validation",
      title_sq: "Autentikimi me JWT dhe Validimi i Token-it",

      content_sq: `
JSON Web Token (JWT) është format kompakt për transportimin e deklarimeve (claims). JWT i nënshkruar nuk është domosdoshmërisht i enkriptuar: payload-i mund të lexohet nga kushdo që ka token-in.

Një JWT zakonisht përmban:
- sub: identifikuesin e subjektit, shpesh përdoruesin.
- iss: issuer, kush e lëshoi token-in.
- aud: audience, për kë është token-i.
- exp: koha e skadimit.
- iat: koha kur u lëshua.

Serveri duhet të verifikojë nënshkrimin, algoritmin e lejuar, skadimin dhe claims përkatëse. Sekreti ose çelësi privat duhet të ruhet jashtë kodit.

Analizë:
Access token-at duhet të kenë jetëgjatësi të kufizuar. Për revokim, logout dhe refresh token-a nevojitet një strategji shtesë, si rotacioni i refresh token-ave ose një sesion i ruajtur në server.
`,

      content_en: `
A JSON Web Token (JWT) is a compact format for carrying claims. A signed JWT is not necessarily encrypted; its payload can be read by anyone who possesses the token.

Common claims include sub, iss, aud, exp, and iat. The server must verify the signature, allowed algorithm, expiration, and relevant claims. Secrets and private keys must be stored outside source code.

Analysis:
Access tokens should have limited lifetimes. Revocation, logout, and refresh tokens require an additional strategy, such as refresh-token rotation or server-side sessions.
`,

      example: `
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

function assertJwtConfiguration() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be configured securely");
  }

  if (!JWT_ISSUER || !JWT_AUDIENCE) {
    throw new Error("JWT issuer and audience must be configured");
  }
}

export function createAccessToken(user) {
  assertJwtConfiguration();

  return jwt.sign(
    {
      role: user.role
    },
    JWT_SECRET,
    {
      subject: String(user.id),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithm: "HS256",
      expiresIn: "15m"
    }
  );
}

export function verifyAccessToken(token) {
  assertJwtConfiguration();

  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}
`,

      analysis: [
        {
          sq: "expiresIn përcakton jetëgjatësinë e access token-it.",
          en: "expiresIn determines the access token's lifetime."
        },
        {
          sq: "algorithms kufizon algoritmet e pranueshme gjatë verifikimit.",
          en: "algorithms restricts which algorithms are accepted during verification."
        },
        {
          sq: "issuer dhe audience ndihmojnë të parandalohet pranimi i token-ave për shërbime të tjera.",
          en: "Issuer and audience checks help prevent accepting tokens intended for other services."
        },
        {
          sq: "Krijimi i token-it duhet të bëhet vetëm pasi kredencialet janë verifikuar.",
          en: "Tokens should be issued only after credentials have been verified."
        }
      ],

      bestPractices: [
        {
          sq: "Mos vendos fjalëkalime ose të dhëna sensitive në payload-in e JWT.",
          en: "Do not put passwords or sensitive data in a JWT payload."
        },
        {
          sq: "Mbaje access token-in jetëshkurtër.",
          en: "Keep access tokens short-lived."
        },
        {
          sq: "Mos prano algoritme ose claims pa verifikim.",
          en: "Do not accept algorithms or claims without verification."
        },
        {
          sq: "Përdor çelësa të fortë dhe plan rotacioni për sekretet.",
          en: "Use strong keys and a secret-rotation plan."
        }
      ]
    },

    // ============================================================
    // 11. AUTHENTICATION MIDDLEWARE
    // ============================================================
    {
      id: "authentication-middleware",
      title: "Bearer Token Middleware",
      title_sq: "Middleware për Bearer Token",

      content_sq: `
Middleware i autentikimit lexon header-in Authorization, verifikon access token-in dhe vendos identitetin e verifikuar te req.auth.

Formati standard i header-it është:
Authorization: Bearer <access-token>

Middleware duhet të refuzojë token-at që mungojnë, janë të pavlefshëm ose kanë skaduar. Mos beso te një user ID ose rol i dërguar drejtpërdrejt nga klienti.

Analizë:
req.auth duhet të mbushet vetëm nga claims të verifikuara. Nëse të dhënat e rolit ndryshojnë shpesh, kontrollo rolin aktual nga databaza ose nga një burim i besueshëm në server.
`,

      content_en: `
Authentication middleware reads the Authorization header, verifies the access token, and stores the verified identity in req.auth.

The standard header format is Authorization: Bearer <access-token>.

Middleware should reject missing, invalid, or expired tokens. Never trust a user ID or role supplied directly by the client.

Analysis:
req.auth must be populated only from verified claims. If roles change frequently, load the current role from the database or another trusted server-side source.
`,

      example: `
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.get("authorization");

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required"
      }
    });
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid access token"
      }
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid access token"
        }
      });
    }

    req.auth = {
      userId: payload.sub,
      role: typeof payload.role === "string"
        ? payload.role
        : "user"
    };

    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired access token"
      }
    });
  }
}
`,

      analysis: [
        {
          sq: "Bearer token-i merret nga header-i Authorization.",
          en: "The bearer token is read from the Authorization header."
        },
        {
          sq: "jwt.verify kontrollon nënshkrimin dhe claims e konfiguruara.",
          en: "jwt.verify checks the signature and configured claims."
        },
        {
          sq: "req.auth krijohet vetëm pasi verifikimi ka sukses.",
          en: "req.auth is populated only after successful verification."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor HTTPS për të mbrojtur token-at gjatë transmetimit.",
          en: "Use HTTPS to protect tokens in transit."
        },
        {
          sq: "Mos regjistro header-in Authorization.",
          en: "Do not log the Authorization header."
        },
        {
          sq: "Konfiguro sekretet dhe claims në mënyrë të njëjtë me krijimin e token-it.",
          en: "Configure secrets and claims consistently with token issuance."
        }
      ]
    },

    // ============================================================
    // 12. AUTHORIZATION, ROLES, AND OWNERSHIP
    // ============================================================
    {
      id: "authorization-rbac",
      title: "Authorization, RBAC, and Resource Ownership",
      title_sq: "Autorizimi, RBAC dhe Pronësia e Burimeve",

      content_sq: `
Autorizimi përcakton nëse përdoruesi i autentikuar ka leje për një veprim.

RBAC (Role-Based Access Control) lidh lejet me role, si user, editor ose admin. Kontrolli i pronësisë përcakton nëse përdoruesi mund të lexojë ose ndryshojë një burim të caktuar.

Kontrolle tipike:
- Identiteti: kush po bën kërkesën?
- Roli: çfarë veprimesh lejon roli?
- Pronësia: a i përket burimi këtij përdoruesi?
- Konteksti: a lejohet veprimi në gjendjen aktuale?

Analizë:
Kontrolli vetëm i ID-së në URL nuk mjafton. Nëse një përdorues mund të ndryshojë ID-në dhe të lexojë të dhënat e një përdoruesi tjetër, ekziston rreziku i IDOR/BOLA.
`,

      content_en: `
Authorization determines whether an authenticated user is permitted to perform an action.

Role-Based Access Control (RBAC) associates permissions with roles such as user, editor, or admin. Ownership checks determine whether a user may access or modify a specific resource.

Typical checks include identity, role, ownership, and business context.

Analysis:
Checking only the URL ID is insufficient. If a user can change an ID and access another user's data, the application may be vulnerable to IDOR/BOLA.
`,

      example: `
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required"
        }
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission"
        }
      });
    }

    return next();
  };
}

// Shembull përdorimi:
// app.delete(
//   "/api/v1/admin/users/:id",
//   requireAuth,
//   requireRole("admin"),
//   deleteUserHandler
// );

// Kontrolli i pronësisë duhet bërë në service/repository,
// duke përdorur identitetin e verifikuar nga req.auth.
`,

      analysis: [
        {
          sq: "requireRole lejon vetëm rolet e deklaruara.",
          en: "requireRole allows only the declared roles."
        },
        {
          sq: "403 tregon se përdoruesi nuk ka lejen e nevojshme.",
          en: "403 indicates the user lacks the required permission."
        },
        {
          sq: "Kontrolli i pronësisë duhet të zbatohet për çdo burim privat.",
          en: "Ownership checks should be enforced for every private resource."
        }
      ],

      bestPractices: [
        {
          sq: "Zbato parimin e privilegjit minimal.",
          en: "Apply the principle of least privilege."
        },
        {
          sq: "Mos u mbështet te kontrollet e ndërfaqes së përdoruesit.",
          en: "Do not rely on frontend controls for authorization."
        },
        {
          sq: "Testo që një përdorues nuk mund të lexojë ose ndryshojë burimet e tjetrit.",
          en: "Test that one user cannot read or modify another user's resources."
        }
      ]
    },
    // ============================================================
    // 13. SECURITY HEADERS, CORS, AND RATE LIMITING
    // ============================================================
    {
      id: "http-security",
      title: "HTTP Security, CORS, Helmet, and Rate Limiting",
      title_sq: "Siguria HTTP, CORS, Helmet dhe Kufizimi i Kërkesave",

      content_sq: `
Siguria e API-së kërkon disa shtresa mbrojtjeje.

Helmet vendos HTTP security headers. CORS kontrollon cilat origjina të shfletuesit lejohen të lexojnë përgjigjet e API-së; CORS nuk është mekanizëm autentikimi dhe nuk bllokon klientë si curl ose serverë të tjerë.

Rate limiting kufizon numrin e kërkesave brenda një intervali, për të ulur abuzimin dhe sulmet me shumë përpjekje. Për sisteme me shumë instanca, përdor një store të përbashkët të përshtatshëm.

Analizë:
Mos përdor origin: "*" bashkë me credentials: true. Për cookies autentikimi, konfigurimi i CORS, SameSite dhe mbrojtja CSRF duhet të planifikohen së bashku.
`,

      content_en: `
API security requires multiple layers.

Helmet sets HTTP security headers. CORS controls which browser origins may read API responses; CORS is not authentication and does not block clients such as curl or other servers.

Rate limiting restricts requests within a time window to reduce abuse and repeated attacks. Multi-instance deployments should use an appropriate shared store.

Analysis:
Do not combine origin: "*" with credentials: true. Cookie-based authentication requires coordinated CORS, SameSite, and CSRF protections.
`,

      example: `
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());

app.use(cors({
  origin(origin, callback) {
    // Kërkesat pa Origin, si disa mjete server-side, trajtohen
    // sipas politikës së aplikacionit.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.use(express.json({ limit: "100kb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

app.use("/api/", apiLimiter);
`,

      analysis: [
        {
          sq: "Helmet ndihmon me header-at e sigurisë, por nuk zëvendëson validimin.",
          en: "Helmet helps with security headers but does not replace validation."
        },
        {
          sq: "CORS duhet të konfigurohet sipas origjinave që aplikacioni njeh.",
          en: "CORS should be configured for the application's trusted origins."
        },
        {
          sq: "Rate limiting mund të kërkojë store të përbashkët në mjedise me shumë instanca.",
          en: "Rate limiting may require a shared store in multi-instance environments."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor HTTPS në production.",
          en: "Use HTTPS in production."
        },
        {
          sq: "Vendos kufij për madhësinë e trupit dhe numrin e kërkesave.",
          en: "Limit request body size and request rates."
        },
        {
          sq: "Mos lejo origjina të panjohura pa arsye të dokumentuar.",
          en: "Do not allow unknown origins without a documented reason."
        },
        {
          sq: "Për autentikim me cookies, vlerëso mbrojtjen CSRF.",
          en: "For cookie-based authentication, evaluate CSRF protection."
        }
      ]
    },

    // ============================================================
    // 14. ENVIRONMENT CONFIGURATION AND SECRETS
    // ============================================================
    {
      id: "environment-secrets",
      title: "Environment Configuration and Secret Management",
      title_sq: "Konfigurimi i Mjedisit dhe Menaxhimi i Sekreteve",

      content_sq: `
Konfigurimi i aplikacionit duhet të ndahet nga kodi burimor.

Vlera të zakonshme:
- NODE_ENV
- PORT
- DATABASE_URL
- JWT_SECRET
- JWT_ISSUER
- JWT_AUDIENCE
- CORS_ORIGINS

Në zhvillim, dotenv mund të ngarkojë vlera nga skedari .env. Në production, prefero secret manager ose mekanizmin e sekreteve të platformës.

Analizë:
Mos e komito skedarin .env dhe mos vendos sekrete reale në repository, logje ose mesazhe gabimesh. Validimi i konfigurimit duhet të ndodhë në nisje, që aplikacioni të mos funksionojë me konfigurim të paplotë.
`,

      content_en: `
Application configuration should be separated from source code.

Common values include NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, and CORS_ORIGINS.

During development, dotenv can load values from a .env file. In production, prefer a secret manager or the platform's secret mechanism.

Analysis:
Never commit .env files or place real secrets in repositories, logs, or error messages. Validate configuration at startup so the application does not run with incomplete settings.
`,

      example: `
import "dotenv/config";

function requiredEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error("Missing required environment variable: " + name);
  }

  return value;
}

function loadConfig() {
  const portValue = process.env.PORT || "3000";
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }

  return Object.freeze({
    nodeEnv: process.env.NODE_ENV || "development",
    port,
    databaseUrl: requiredEnv("DATABASE_URL"),
    jwtSecret: requiredEnv("JWT_SECRET"),
    jwtIssuer: requiredEnv("JWT_ISSUER"),
    jwtAudience: requiredEnv("JWT_AUDIENCE")
  });
}

export const config = loadConfig();

// Shembull .env për zhvillim (përdor vlera lokale të sigurta):
// NODE_ENV=development
// PORT=3000
// DATABASE_URL=...
// JWT_SECRET=...
// JWT_ISSUER=xsus-api
// JWT_AUDIENCE=xsus-client
`,

      analysis: [
        {
          sq: "requiredEnv e ndalon nisjen nëse mungon një vlerë e domosdoshme.",
          en: "requiredEnv prevents startup when a required value is missing."
        },
        {
          sq: "Object.freeze parandalon ndryshimin aksidental të objektit të konfigurimit.",
          en: "Object.freeze prevents accidental mutation of the configuration object."
        },
        {
          sq: "Konfigurimi duhet të validohet para se serveri të fillojë të pranojë kërkesa.",
          en: "Configuration should be validated before the server starts accepting requests."
        }
      ],

      bestPractices: [
        {
          sq: "Shto .env te .gitignore.",
          en: "Add .env to .gitignore."
        },
        {
          sq: "Përdor sekrete të ndryshme për zhvillim, testim dhe production.",
          en: "Use different secrets for development, testing, and production."
        },
        {
          sq: "Planifiko rotacionin e çelësave dhe kredencialeve.",
          en: "Plan key and credential rotation."
        }
      ]
    },

    // ============================================================
    // 15. DATABASES AND SQL INJECTION PREVENTION
    // ============================================================
    {
      id: "database-security",
      title: "Database Access, Transactions, and SQL Injection",
      title_sq: "Qasja në Databazë, Transaksionet dhe SQL Injection",

      content_sq: `
Backend-i duhet të përdorë databazë të përshtatshme për të dhënat që duhet të ruhen në mënyrë të qëndrueshme.

Opsionet e zakonshme përfshijnë PostgreSQL, MySQL dhe MongoDB. Zgjedhja varet nga modeli i të dhënave, transaksionet, kërkesat e kërkimit dhe infrastruktura.

SQL injection ndodh kur input-i i pakontrolluar bashkohet me SQL si tekst. Përdor parametrizimin e query-ve ose një ORM që e mbështet.

Transaksionet ndihmojnë të ruhen kufijtë e integritetit kur disa ndryshime duhet të kryhen së bashku.

Analizë:
Validimi i input-it është i dobishëm, por nuk e zëvendëson parametrizimin e query-ve. Për autorizimin, sigurohu që query-t të kufizohen sipas përdoruesit ose tenant-it përkatës.
`,

      content_en: `
A backend should use an appropriate database for data that must persist reliably.

Common options include PostgreSQL, MySQL, and MongoDB. Selection depends on the data model, transaction requirements, query patterns, and infrastructure.

SQL injection occurs when untrusted input is concatenated into SQL text. Use parameterized queries or an ORM that supports them.

Transactions help preserve integrity when several changes must succeed together.

Analysis:
Input validation is useful but does not replace parameterized queries. For authorization, ensure queries are scoped to the appropriate user or tenant.
`,

      example: `
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Në production, konfiguro TLS sipas kërkesave të provider-it.
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export async function findUserByEmail(email) {
  const result = await pool.query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email]
  );

  return result.rows[0] ?? null;
}

export async function closeDatabase() {
  await pool.end();
}

// Query i sigurt: vlera e email-it kalohet si parametër.
// Mos ndërto SQL duke bashkuar input-in e klientit.
`,

      analysis: [
        {
          sq: "Parametri $1 ndan vlerën e input-it nga teksti SQL.",
          en: "The $1 parameter separates the input value from SQL text."
        },
        {
          sq: "Pool ripërdor lidhjet dhe shmang krijimin e një lidhjeje të re për çdo query.",
          en: "A pool reuses connections instead of creating a new one for every query."
        },
        {
          sq: "password_hash nuk duhet të përfshihet në përgjigjen publike të API-së.",
          en: "password_hash must not be included in public API responses."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor query të parametrizuara.",
          en: "Use parameterized queries."
        },
        {
          sq: "Përdor transaksione për operacione që duhet të jenë atomike.",
          en: "Use transactions for operations that must be atomic."
        },
        {
          sq: "Përdor llogari databaze me privilegjet minimale.",
          en: "Use database accounts with least privilege."
        },
        {
          sq: "Mos kthe objekte databaze drejtpërdrejt pa filtruar fushat sensitive.",
          en: "Do not return database records directly without filtering sensitive fields."
        }
      ]
    },
    // ============================================================
    // 16. API TESTING
    // ============================================================
    {
      id: "api-testing",
      title: "API Testing and Test Strategy",
      title_sq: "Testimi i API-së dhe Strategjia e Testimit",

      content_sq: `
Testimi verifikon sjelljen e API-së dhe ndihmon në parandalimin e regresioneve.

Llojet kryesore:
- Unit tests: testojnë funksione ose shërbime të izoluara.
- Integration tests: testojnë ndërveprimin mes moduleve dhe databazës.
- API tests: kontrollojnë status codes, headers dhe trupin e përgjigjes.
- End-to-end tests: testojnë rrjedha të plota nga hyrja deri te rezultati.

Testo rastet pozitive, input-et e pavlefshme, mungesën e autentikimit, lejet e pamjaftueshme, burimet që mungojnë dhe gabimet e varësive.

Analizë:
Testet e autorizimit duhet të kontrollojnë edhe që një përdorues nuk mund të lexojë ose modifikojë burimet e një përdoruesi tjetër.
`,

      content_en: `
Testing verifies API behavior and helps prevent regressions.

Common types include unit tests, integration tests, API tests, and end-to-end tests.

Test successful requests, invalid inputs, missing authentication, insufficient permissions, missing resources, and dependency failures.

Analysis:
Authorization tests should verify that one user cannot read or modify another user's resources.
`,

      example: `
import test from "node:test";
import assert from "node:assert/strict";

test("valid email is normalized", () => {
  const email = "User@Example.com".trim().toLowerCase();

  assert.equal(email, "user@example.com");
});

test("invalid identifier is rejected", () => {
  const id = "";

  assert.equal(typeof id === "string" && id.length > 0, false);
});

// Testet e integrimit duhet të përdorin një databazë testimi
// dhe të mos ndryshojnë të dhëna reale të production.
`,

      analysis: [
        {
          sq: "node:test është test runner i integruar në Node.js.",
          en: "node:test is a built-in Node.js test runner."
        },
        {
          sq: "assert/strict ofron kontrolle të qarta për kushtet e pritura.",
          en: "assert/strict provides clear assertions for expected conditions."
        },
        {
          sq: "Testet e izoluara nuk zëvendësojnë testet e integrimit me databazë.",
          en: "Isolated tests do not replace database integration tests."
        }
      ],

      bestPractices: [
        {
          sq: "Mbaji testet të përsëritshme dhe të pavarura nga rendi i ekzekutimit.",
          en: "Keep tests repeatable and independent of execution order."
        },
        {
          sq: "Përdor të dhëna testimi të veçanta.",
          en: "Use separate test data."
        },
        {
          sq: "Përfshi testet e autorizimit dhe të gabimeve.",
          en: "Include authorization and error-path tests."
        }
      ]
    },

    // ============================================================
    // 17. LOGGING AND OBSERVABILITY
    // ============================================================
    {
      id: "logging-observability",
      title: "Logging, Metrics, and Observability",
      title_sq: "Logging, Metrikat dhe Observability",

      content_sq: `
Observability ndihmon ekipin të kuptojë gjendjen e aplikacionit përmes logs, metrics dhe traces.

Logging i strukturuar mund të përfshijë:
- timestamp.
- request ID.
- HTTP method dhe route.
- status code.
- kohëzgjatjen e kërkesës.
- kodin e gabimit.

Mos regjistro fjalëkalime, token-a, cookies, çelësa API ose të dhëna personale pa nevojë dhe pa bazë të përshtatshme.

Analizë:
Request ID ndihmon në lidhjen e eventeve të së njëjtës kërkesë në shërbime të ndryshme. Logjet duhet të kenë kufij ruajtjeje dhe qasje të kontrolluar.
`,

      content_en: `
Observability helps teams understand application behavior through logs, metrics, and traces.

Structured logs may include timestamps, request IDs, HTTP methods and routes, status codes, request duration, and error codes.

Never log passwords, tokens, cookies, API keys, or unnecessary personal data.

Analysis:
Request IDs help correlate events from the same request across services. Logs should have retention limits and controlled access.
`,

      example: `
import { randomUUID } from "node:crypto";

export function requestContext(req, res, next) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });

  next();
}

// Në sisteme production, përdor logger të përshtatshëm
// dhe shmang regjistrimin e të dhënave sensitive.
`,

      analysis: [
        {
          sq: "requestId krijon identifikues unik për lidhjen e logjeve.",
          en: "requestId creates a unique identifier for correlating logs."
        },
        {
          sq: "durationMs ndihmon në identifikimin e kërkesave të ngadalta.",
          en: "durationMs helps identify slow requests."
        },
        {
          sq: "Logjet nuk duhet të përmbajnë kredenciale ose sekrete.",
          en: "Logs must not contain credentials or secrets."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor JSON logging në shërbime që monitorohen automatikisht.",
          en: "Use JSON logging in automatically monitored services."
        },
        {
          sq: "Vendos alarme për gabime dhe rritje të latencës.",
          en: "Alert on errors and latency increases."
        },
        {
          sq: "Kontrollo qasjen dhe kohën e ruajtjes së logjeve.",
          en: "Control log access and retention."
        }
      ]
    },

    // ============================================================
    // 18. DEPLOYMENT AND PRODUCTION READINESS
    // ============================================================
    {
      id: "deployment-production",
      title: "Deployment and Production Readiness",
      title_sq: "Deployment dhe Gatishmëria për Production",

      content_sq: `
Para publikimit, aplikacioni duhet të ketë konfigurim të validuar, logging, kontrolle shëndeti, menaxhim të gabimeve dhe një proces të kontrolluar nisjeje e mbylljeje.

Konceptet kryesore:
- Health endpoint: tregon nëse procesi mund të përgjigjet.
- Readiness check: tregon nëse aplikacioni është gati për trafik.
- Graceful shutdown: ndalon pranimin e kërkesave të reja dhe mbyll lidhjet.
- Reverse proxy: mund të trajtojë TLS, routing dhe kufizime shtesë.
- CI/CD: automatizon testimin dhe publikimin.

Analizë:
Health endpoint nuk duhet të ekspozojë konfigurimin, sekretet ose detaje të brendshme. Nëse kontrollohet databaza, ndaje readiness nga liveness për të shmangur restart-et e panevojshme.
`,

      content_en: `
Before deployment, an application should have validated configuration, logging, health checks, error handling, and controlled startup and shutdown.

Key concepts include health endpoints, readiness checks, graceful shutdown, reverse proxies, and CI/CD.

Analysis:
Health endpoints must not expose configuration, secrets, or internal details. Separate readiness from liveness when checking dependencies to avoid unnecessary restarts.
`,

      example: `
import http from "node:http";
import app from "./app.js";

const port = Number(process.env.PORT || 3000);
const server = http.createServer(app);

server.listen(port, () => {
  console.log("Server listening on port " + port);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log("Received " + signal + "; shutting down");

  server.close((error) => {
    if (error) {
      console.error("Error closing server:", error.message);
      process.exitCode = 1;
    }

    process.exit();
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Në aplikacion real, mbyll edhe pool-et e databazës,
// lidhjet e mesazheve dhe burimet e tjera.
`,

      analysis: [
        {
          sq: "server.close ndalon pranimin e lidhjeve të reja dhe pret lidhjet aktive sipas sjelljes së serverit.",
          en: "server.close stops accepting new connections and waits for active connections according to server behavior."
        },
        {
          sq: "Graceful shutdown duhet të mbyllë edhe burimet e jashtme.",
          en: "Graceful shutdown should also close external resources."
        },
        {
          sq: "Timeout-i parandalon që procesi të mbetet i bllokuar pafundësisht.",
          en: "The timeout prevents the process from hanging indefinitely."
        }
      ],

      bestPractices: [
        {
          sq: "Përdor versione të mbështetura të Node.js.",
          en: "Use supported Node.js releases."
        },
        {
          sq: "Ekzekuto testet para deployment-it.",
          en: "Run tests before deployment."
        },
        {
          sq: "Mos e ekspozo debug mode në production.",
          en: "Do not expose debug mode in production."
        },
        {
          sq: "Planifiko backup-et dhe rikuperimin e databazës.",
          en: "Plan database backups and recovery."
        }
      ]
    },

    // ============================================================
    // 19. BACKEND DESIGN PRINCIPLES
    // ============================================================
    {
      id: "backend-best-practices",
      title: "Professional Backend Engineering Principles",
      title_sq: "Parimet Profesionale të Inxhinierisë Backend",

      content_sq: `
Një backend i mirë duhet të jetë i sigurt, i testueshëm, i vëzhgueshëm dhe i lehtë për t'u mirëmbajtur.

Parimet kryesore:
1. Ndarja e përgjegjësive.
2. Validimi i çdo input-i të jashtëm.
3. Autentikimi dhe autorizimi i çdo rruge private.
4. Përdorimi i query-ve të parametrizuara.
5. Menaxhimi i sekreteve jashtë kodit.
6. Trajtimi i centralizuar i gabimeve.
7. Testet automatike dhe integrimi i vazhdueshëm.
8. Logging pa të dhëna sensitive.
9. Kufizimi i madhësisë së kërkesave dhe ritmit të tyre.
10. Dokumentimi i kontratës së API-së.

Analizë:
Siguria nuk arrihet nga një paketë e vetme. Ajo kërkon konfigurim të saktë, kontrolle në çdo shtresë, testim dhe përditësim të vazhdueshëm.
`,

      content_en: `
A good backend should be secure, testable, observable, and maintainable.

Core principles include separation of concerns, validation of external input, authentication and authorization on private routes, parameterized queries, external secret management, centralized error handling, automated testing, safe logging, request limits, and API documentation.

Analysis:
Security is not provided by a single package. It requires correct configuration, layered controls, testing, and ongoing maintenance.
`,

      example: `
/*
Suggested project structure:

src/
  app.js
  server.js
  config/
    env.js
  middleware/
    authenticate.js
    authorize.js
    validate.js
    error-handler.js
  routes/
    auth.routes.js
    users.routes.js
  controllers/
    auth.controller.js
    users.controller.js
  services/
    auth.service.js
    users.service.js
  repositories/
    users.repository.js
  schemas/
    auth.schema.js
    users.schema.js
  utils/
    logger.js

tests/
  unit/
  integration/

*/
`,

      analysis: [
        {
          sq: "Struktura sipas përgjegjësive e bën më të lehtë mirëmbajtjen.",
          en: "Responsibility-based structure improves maintainability."
        },
        {
          sq: "Services përmbajnë logjikën e biznesit, ndërsa repositories menaxhojnë ruajtjen.",
          en: "Services contain business logic, while repositories handle persistence."
        },
        {
          sq: "Kontrollet e sigurisë duhet të jenë pjesë e arkitekturës që nga fillimi.",
          en: "Security controls should be part of the architecture from the beginning."
        }
      ],

      bestPractices: [
        {
          sq: "Mbaj funksionet të vogla dhe me një përgjegjësi të qartë.",
          en: "Keep functions small and focused."
        },
        {
          sq: "Dokumento status codes, skemat dhe kërkesat e autentikimit.",
          en: "Document status codes, schemas, and authentication requirements."
        },
        {
          sq: "Rishiko varësitë dhe përditësoji në mënyrë të kontrolluar.",
          en: "Review dependencies and update them in a controlled manner."
        }
      ]
    },

    // ============================================================
    // 20. NODE.JS AND EXPRESS GLOSSARY
    // ============================================================
    {
      id: "node-express-glossary",
      title: "Node.js and Express.js Glossary",
      title_sq: "Fjalorthi i Node.js dhe Express.js",

      content_sq: `
Fjalorth i termave bazë për zhvillimin backend.
`,

      content_en: `
A glossary of core backend development terminology.
`,

      terms: [
        {
          term: "Node.js",
          definition_sq: "Mjedis ekzekutimi për JavaScript jashtë shfletuesit.",
          definition_en: "A runtime environment for JavaScript outside the browser."
        },
        {
          term: "Event Loop",
          definition_sq: "Mekanizëm që koordinon callback-et dhe punën asinkrone.",
          definition_en: "A mechanism that coordinates callbacks and asynchronous work."
        },
        {
          term: "Express.js",
          definition_sq: "Framework web për Node.js.",
          definition_en: "A web framework for Node.js."
        },
        {
          term: "Middleware",
          definition_sq: "Funksion që ekzekutohet gjatë ciklit të kërkesës HTTP.",
          definition_en: "A function that runs during the HTTP request lifecycle."
        },
        {
          term: "REST API",
          definition_sq: "Ndërfaqe që ekspozon burime përmes HTTP sipas kontratës së API-së.",
          definition_en: "An interface exposing resources over HTTP according to an API contract."
        },
        {
          term: "CRUD",
          definition_sq: "Create, Read, Update, Delete.",
          definition_en: "Create, Read, Update, Delete."
        },
        {
          term: "Authentication",
          definition_sq: "Verifikimi i identitetit të përdoruesit.",
          definition_en: "Verification of a user's identity."
        },
        {
          term: "Authorization",
          definition_sq: "Përcaktimi i veprimeve që lejohen për një identitet.",
          definition_en: "Determining which actions an identity is allowed to perform."
        },
        {
          term: "JWT",
          definition_sq: "Format kompakt për bartjen e claims, shpesh të nënshkruara.",
          definition_en: "A compact format for carrying claims, often signed."
        },
        {
          term: "Hashing",
          definition_sq: "Transformim njëkahësh që përdoret, ndër të tjera, për ruajtjen e sigurt të fjalëkalimeve.",
          definition_en: "A one-way transformation used, among other things, for secure password storage."
        },
        {
          term: "Validation",
          definition_sq: "Kontrolli nëse input-i përputhet me rregullat e përcaktuara.",
          definition_en: "Checking whether input matches defined rules."
        },
        {
          term: "Rate Limiting",
          definition_sq: "Kufizimi i numrit të kërkesave brenda një intervali.",
          definition_en: "Limiting the number of requests within a time window."
        },
        {
          term: "CORS",
          definition_sq: "Politikë e shfletuesit që kontrollon qasjen ndërmjet origjinave.",
          definition_en: "A browser policy governing cross-origin access."
        },
        {
          term: "SQL Injection",
          definition_sq: "Sulm ku input-i ndikon në mënyrë të padëshiruar strukturën e një query SQL.",
          definition_en: "An attack in which input improperly influences SQL query structure."
        },
        {
          term: "ORM",
          definition_sq: "Mjet që lidh objektet e aplikacionit me modelet e databazës.",
          definition_en: "A tool mapping application objects to database models."
        },
        {
          term: "Middleware Error Handler",
          definition_sq: "Middleware që trajton gabimet e përcjella në Express.",
          definition_en: "Middleware that handles errors passed through Express."
        },
        {
          term: "Environment Variable",
          definition_sq: "Vlerë konfigurimi e dhënë procesit nga mjedisi.",
          definition_en: "A configuration value supplied to a process through its environment."
        },
        {
          term: "Integration Test",
          definition_sq: "Test që verifikon ndërveprimin mes disa komponentëve.",
          definition_en: "A test that verifies interaction between multiple components."
        },
        {
          term: "Graceful Shutdown",
          definition_sq: "Mbyllje e kontrolluar që lejon përfundimin e punës aktive dhe lirimin e burimeve.",
          definition_en: "A controlled shutdown that allows active work to finish and resources to be released."
        },
        {
          term: "IDOR / BOLA",
          definition_sq: "Dobësi autorizimi që lejon qasje të paautorizuar te burime përmes identifikuesve.",
          definition_en: "An authorization vulnerability allowing unauthorized resource access through identifiers."
        }
      ]
    }
  ]
};

// ES Modules export.
// CommonJS projects can use module.exports instead.
export { nodeExpressKnowledge };
export default nodeExpressKnowledge;
