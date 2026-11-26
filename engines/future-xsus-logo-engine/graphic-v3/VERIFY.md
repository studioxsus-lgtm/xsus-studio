# Professional graphic contract

The authenticated generation endpoint accepts the existing Creative V2 envelope and an optional graphic object. Future interprets the brief, Hyper authorizes its strategy and Logo composes the design. Graphic processing only runs when requested. Classic and V2 projects retain their original envelopes. Professional documents use the existing project storage envelope (1.0.0) plus graphic.version 3.0.0. Data-only layers accept compound curves, elliptical arcs, groups, affine matrices, gradient stops, strokes and opacity. A text layer carries its editable spelling and font settings alongside portable glyph outlines. The API enforces the existing account, concurrency and quota checks.

## Geometry and typography

Closed polygon Boolean operations use Clipper nonzero winding and 1/64 unit coordinates in the supported +/-4096 editing domain. Intersection and crop share intersection semantics. Exclusion and XOR use symmetric difference. Trim subtracts the second shape. Divide returns the two exclusive regions and the shared region. A Boolean edit keeps its immediate source shapes; earlier operations remain in session undo history. Open paths must be stroked or closed to represent an area. Curve subdivision has a 0.2-unit default flatness tolerance and rejects excessive recursion or point counts. Elliptical arcs are subdivided into cubic pieces of at most 90 degrees. Editor control handles and PDF paths remain vector data.

Thirty-five named style families each supply compact, balanced and expansive treatments. In blends, the first family takes precedence for type and layout; continuous parameters use a weighted mean. Monochrome overrides multicolor fills. Composition coordinates are fractions of the artboard with separate safe boxes for marks and wordmarks. Glyphs are shaped from pinned Fontsource packages. The catalog records upstream source, version, license, character coverage checks and file digests. The package lock pins every package. GSUB tables unsupported by the installed shaper use glyph-by-glyph placement with kerning. Images of suggested aesthetic quality are not a property of the contract: final geometry and contrast are measured; visual balance and small-size warnings are heuristics.

## Export and limits

Ordinary SVG preserves glyph contours. Editable SVG embeds the font bytes for straight wordmarks. Native text on curved baselines uses the outlined SVG option for portable output. ZIP includes the editable JSON and standalone vector SVG. PDF uses vector paths and shading; unsupported transparent gradient stops or noncenter strokes are reported before a file is downloaded. CMYK conversion is an unprofiled approximation. Print proofing, PDF/X, and ICC matching need separate production workflows. SVG has no native conic gradient primitive. An excessively large gallery is returned for review before autosave.

## Verification

Run npm ci and npm test in this engine. Set the deployed independent core adapters before running npm run test:live. Browser regressions are under assets/xsus-logo/tests on main. They exercise persistence with isolated fixture accounts, actual curve editing, seven export formats and rendered pixel comparisons. No fixture supplies evidence of an authenticated production user session.
