# Production readiness plan (2026-09-30)

## Estimate
**25% ready** (rough engineering judgment). The UI and rich in-memory workflow demonstrate a concept; backend execution, access control, persistence, and truthful status reporting are unfinished.

## Evidence
- `server.ts` holds mutable workspace state in memory and exposes many unauthenticated write endpoints for tasks, agents, plugins, actions, and computer control.
- Multiple responses announce authorization, dispatch, compilation, connection, or verification without corresponding external operations.
- No tests, CI, or lockfile appears in the default-branch tree.

## Execute on this branch
1. Gate production startup on an explicit authentication strategy and disable unauthenticated action routes. **Immediate priority.**
2. Mark simulated actions/statuses clearly; remove fabricated execution confirmations.
3. Separate real tool execution from demo state; require scoped grants and human approval for sensitive actions.
4. Persist workspace state with migrations, audit records, concurrency handling, and recovery.
5. Add integration tests and CI; pin dependencies with a lockfile and document deployment.

## Production gate
No public deployment until verified identity, authorization on every mutation, truthful action results, persistence, and repeatable tests exist.
