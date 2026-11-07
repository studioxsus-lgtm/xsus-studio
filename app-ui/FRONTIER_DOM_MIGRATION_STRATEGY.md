
# XSUS APP — FRONTIER DOM MIGRATION STRATEGY

Version: 1.0.0  
Status: PLANNED  
Phase: 1.8.12  
Platform: XSUS App — Hyper Nexus

## 1. Objective

Migrate the existing XSUS App Frontier interface into
the Hyper Nexus Shell without losing existing application
features, breaking public APIs, or merging independent
Core systems.

The migration must be incremental, reversible,
and verified through automated tests.

## 2. Architectural Boundaries

The following systems remain separate:

- XSUS App
- XSUS AI Core
- Hyper XSUS Core

XSUS App may communicate with the Core systems only
through explicitly controlled adapters.

The Hyper Nexus UI must not directly import or execute
either Core system.

No dependencies on the repository's main demo
implementation may be introduced.

## 3. Existing Frontier Features

The migration must preserve:

- Frontier Overview
- Application Architect
- Development Workspace
- XSUS Nexus status
- Frontier Engines presentation
- System Monitoring presentation
- Architecture presentation
- Existing App Bridge integration

Application Architect must preserve these IDs:

- app-form
- prompt
- platform
- generate-button
- message
- result

Bridge status must preserve:

- status-dot
- status-text
- bridge-metric

The existing processXsusAppRequest() and
getXsusAppBridgeStatus() integrations must remain
operational.

## 4. Unified DOM Structure

The target application must contain exactly one:

- #xsus-app root
- .xsus-sidebar
- #hyper-nexus-sidebar
- #hyper-nexus-menu-toggle
- #hyper-nexus-page-title
- #hyper-nexus-module-container
- #hyper-nexus-module-loading
- #hyper-nexus-module-error

The module container must preserve an Overview section
with data-module="overview".

No duplicate DOM IDs are permitted.

The unified shell must not be embedded inside another
independent application shell.

## 5. Navigation Ownership

Hyper Nexus Navigation Controller becomes the only
controller responsible for browser route history.

Legacy routes must resolve through the existing
Legacy Route Resolver.

Route mappings:

| Frontier route | Hyper Nexus module |
|---|---|
| overview | overview |
| architect | command-center |
| workspace | living-workspace |
| nexus | integration-layer |
| engines | system-control |
| monitoring | system-control |
| architecture | architecture |

Both engines and monitoring resolve to system-control.
Their distinct legacy content must not be discarded.

Route mapping alone does not activate a module.

## 6. Module Migration Policy

Existing Frontier sections must not be removed until
their replacement or migration is verified.

The migration order is:

1. Preserve existing Frontier content.
2. Prepare unified DOM structure.
3. Introduce controlled navigation ownership.
4. Register verified module factories.
5. Activate migrated modules individually.
6. Verify existing application behavior.
7. Remove obsolete markup only after verification.

A planned module must never be marked available
without a working implementation and passing tests.

## 7. Application Architect Protection

The Application Architect form must remain functional.

The migration must preserve:

- Form submission behavior
- Prompt input
- Platform selection
- Loading and error feedback
- Result rendering
- Existing App Bridge API calls

The form must not be replaced by a placeholder.

Its event handlers must not be registered twice.

Moving or reusing the form must not destroy its
existing state or event listeners.

## 8. Module Loader Integration

Hyper Nexus Module Loader remains responsible for
dynamic module lifecycle management.

Migration must preserve its existing public API.

Only modules explicitly registered as available
may be activated.

The current Module Registry status must not be
changed merely to satisfy migration tests.

A separate implementation and verification phase
is required before activating each planned module.

## 9. Styling Strategy

The following stylesheets must be reviewed together:

- app-ui/styles/design-system.css
- app-ui/styles/layout.css
- app-ui/styles/components.css
- app-ui/styles/responsive.css
- app-ui/shell/shell.css

Existing Frontier styling must not be overwritten
without compatibility verification.

The unified application must retain responsive
behavior and mobile navigation.

## 10. Validation Gates

Gate A — Existing Frontier DOM audit passes.

Gate B — Frontier Integration Adapter tests pass.

Gate C — Frontier DOM Contract tests pass.

Gate D — Unified DOM structure passes validation.

Gate E — Navigation and browser history tests pass.

Gate F — Application Architect remains operational.

Gate G — App Bridge integration is verified.

Gate H — Module lifecycle and cleanup tests pass.

Gate I — Full Hyper Nexus test suite passes.

Passing Gates A–C does not imply that Gates D–I
have been completed.

## 11. Rollback Policy

Before changing app.html:

- Preserve the last verified implementation.
- Keep changes isolated in reviewable commits.
- Avoid simultaneous changes to Core systems.
- Maintain the ability to restore the previous UI.
- Do not delete legacy sections prematurely.

If a migration gate fails, stop further integration
until the failure is understood and corrected.

## 12. Completion Criteria

The migration is complete only when:

- One unified Shell owns navigation.
- Frontier functionality is preserved.
- Application Architect works end-to-end.
- App Bridge behavior is verified.
- Available modules load and unload correctly.
- Planned modules remain honestly represented.
- No duplicate application roots exist.
- All required tests pass.
- Independent Core boundaries remain intact.

## 13. Current Status

The migration strategy is documented.

The Frontier Integration Adapter and DOM Contract
have been created.

The user has reported success for their associated
tests.

The unified app.html migration has not yet been
implemented or verified.

Next phase:
1.8.13 — Unified DOM Migration Readiness Assessment.
