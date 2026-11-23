# XSUS App Build Worker (isolated service scaffold)

This is a separate, fail-closed Render service entry point. It exposes only GET /healthz with buildEnabled:false and returns 503 for every other request. It intentionally has no Docker daemon access, project build execution, credentials or mutable endpoints. It is suitable for validating repository wiring and service creation, **not for generating applications**.

Before enabling builds, provision a verified isolated executor, secure artifact staging and UID mapping, durable PostgreSQL claims/fencing, authenticated server-to-server requests, cancellation/recovery, and monitoring. Never assume Render's Docker *build* runtime provides nested Docker execution. Keep deployment-api on main unchanged.
