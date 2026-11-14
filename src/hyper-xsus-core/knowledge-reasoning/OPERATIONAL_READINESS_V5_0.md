# Hyper XSUS Core v5.0 — Operational Recovery Readiness

Adds `createRecoveryOperationalReport` as a read-only operational
reporter and `inspectOperationalReadiness()` on the existing
`createIncidentRecoveryIntegration` facade.

The report combines authenticated archive verification, signed
checkpoint reading, the existing readiness guard and a second
readiness assessment. It returns a frozen result:

```js
{
 version:"5.0.0",
 status:"ready" | "manual-intervention-required",
 safeToResume:boolean,
 blockers:string[],
 archive:{count:number,tip:string},
 checkpoint:{count:number,tip:string}
}
```

Inconsistent snapshots fail closed with
`XSUS_RECOVERY_OPERATIONAL_CHANGED`; malformed assessments fail with
`XSUS_RECOVERY_OPERATIONAL_INVALID`. Underlying signature and
filesystem errors are preserved. The report does not approve
promotion, delete residue, repair evidence or alter the checkpoint.

Nine new tests cover clean readiness, unanchored tails, authorized
promotion, pending residue, archive locks, signature corruption,
inconsistent snapshots, malformed input and immutable results.

**Important limitations:** This is a point-in-time advisory report,
not an atomic distributed snapshot or an authorization token.
Filesystem state can change after the report is returned. No
automatic resumption is enabled. CI must pass before v5.0 is verified.

Branch `feature/xsus-ai-core`; `main` remains unchanged.
