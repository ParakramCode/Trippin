# Phase 3.3: Component Migration to currentJourney (Complete)

**Status:** ✅ **COMPLETE**

## Objective
Standardize rendering logic to use `currentJourney` (Context-provided) instead of manually selecting between `activeJourney` and `inspectionJourney` or accessing `activeJourney` directly for display.

---

## Changes Implemented

### 1. HomeMap.tsx
- **Removed Local Logic:** Deleted local `const currentJourney = inspectionJourney || activeJourney` fallback.
- **Context Usage:** Now imports `currentJourney` and `isReadOnlyJourney` directly from `useJourneys`.
- **Display:** Uses `isReadOnlyJourney` for read-only checks.
- **Mutation:** Retained `activeJourney` for mutation actions (starting navigation).

### 2. JourneyMap.tsx
- **Display:** Updated `MomentModal` usage to pass `currentJourney.author` instead of `activeJourney.author`.
- **Benefit:** Author attribution now works in Inspection Mode (read-only), where `activeJourney` is null.
- **Mutation:** Retained `activeJourney` for `markStopVisitedInJourney` and `stopJourney`.

---

## Standardization Rules

1. **Rendering / Display:** ALWAYS use `currentJourney` (supports Inspection & Active modes).
2. **Mutations / Actions:** ALWAYS use `activeJourney` (ensures changes apply only to forked user state).
3. **NavigationDrawer:** Retained `activeJourney` usage as this component implies active navigation/control.

## Benefits

- **Single Source of Truth:** `currentJourney` in Context manages the priority (Inspection > Active).
- **Reduced Complexity:** Components don't need to know about the fallbacks.
- **Consistent UI:** Read-only mode correctly displays all derived data (like authors) without modification.

Phase 3.3 Complete. UI logic is now strictly separated from Mutation logic.
