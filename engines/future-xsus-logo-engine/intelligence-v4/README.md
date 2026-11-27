# Intelligent editing contract 4.0.0

POST /v4/public/edit uses the existing public gateway, verified session, owner-scoped PostgREST query, revision filter and forced database RLS. The client supplies project and request UUIDs, current revision, language, optional gallery slot and selected layer IDs. It cannot submit executable content or a replacement document. Saving an edit requires the digest returned by preview and a matching revision. Preview, analysis and multi-scale proof are read-only. Rejecting a preview discards it in the client.

The vector document stays at version 1 with the existing creative and graphic extensions. A separate intelligence envelope stores per-slot context, locks, variant preferences and reversible layer deltas. At most 24 accepted edits and 1.85 MB of serialized project data are retained. Over-budget writes fail atomically. Undo and restore verify layer digests before replay to detect conflicting manual revisions. No database DDL is required.

Visual fingerprints render the approved data-only SVG scene with resvg. They include SHA-256 over the rendered scene, a normalized 32-square silhouette and edge map, connected components and holes, DCT and difference hashes, position, sampled palette and separate wordmark attributes. Rotation checks sample 15-degree intervals in both mirror orientations. Alignment can obscure meaningful handedness or directional intent. Results are comparisons inside a project.

Ranking distinguishes measured ink contrast and vector validation from heuristic judgments. Unavailable evidence contributes no points or weight. Small-size ink coverage is measured at ten raster sizes. Estimated text size, numeric contrast and print scores do not establish human readability or print proof. Improvements evaluate at most three proposed edits and require a higher measured score and explicit approval.

Release checks include the full existing engine suite, local browser workflows, authenticated production project editing, owner isolation and export. Local fixtures do not verify deployment or cross-service credentials.
