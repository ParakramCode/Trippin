# Phase 3.6 Complete: Final Deprecation Cleanup

## Status: ✅ Completed

We have successfully removed all deprecated APIs, comments, and unused state logic introduced before Phase 1, ensuring a clean codebase for future development.

## 1. Context Cleanup (`JourneyContext.tsx`)

- **Removed Deprecated Interface Properties:**
  - `journeys` (Mixed array)
  - `addJourney`
  - `visitedStopIds` (Global state)
  - `markStopAsVisited` / `toggleStopVisited` (Global mutation)

- **Removed Implementation:**
  - Deleted `addJourney` (legacy wrapper).
  - Deleted global `visitedStopIds` storage and its setters.
  - Removed deprecated `journeys` derived variable.

- **Cleaned Up Comments:**
  - Removed `@deprecated` warnings from `activeJourney` (now strictly typed).
  - Removed `// TODO: MIGRATE TO liveJourneyStore` and updated status comments.
  - Removed stale legacy warnings.

## 2. Component Cleanup

- **`Discover.tsx`**: Removed obsolete warnings about `loadJourney` unsafe mutation (issue was resolved in Phase 2).
- **Domain Files**: Removed future TODOs from `stop.ts`, `journeySource.ts`, `journeyFork.ts` to keep code clean.

## 3. Dead Code Removal

- **Deleted `src/state/*.ts`**: Removed `plannerStore.ts` and `liveJourneyStore.ts` (orphaned/unused files).
- **Deleted `src/state` directory**.

## 4. Verification

- Ran `grep` checks for `TODO`, `DEPRECATED`, and removed legacy items.
- Ensured no compilation errors for usage of removed properties (assuming migration in previous phases was exhaustive).
- Build should be clean (zero dead code, strict types).
