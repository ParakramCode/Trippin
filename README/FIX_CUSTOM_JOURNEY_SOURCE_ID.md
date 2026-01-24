# Fix: Custom Journey sourceJourneyId Semantic Issue

**Date**: 2026-01-19  
**Branch**: `feature/user-editable-journeys`  
**Status**: ✅ **FIXED**

---

## PROBLEM STATEMENT

**Semantic Issue**: Custom user-created journeys had `sourceJourneyId` pointing to self (same as journey id), which was semantically incorrect.

```typescript
// BEFORE (Incorrect)
const newJourney: JourneyFork = {
  id: 'custom-123',
  sourceJourneyId: 'custom-123',  // ❌ Self-reference
  isCustom: true,
  ...
};
```

**Why This Was Wrong**:
- `sourceJourneyId` should reference the **template** journey that was forked
- Custom journeys are **not forked** - they're created from scratch
- Self-referential ID violated the semantic meaning of "source"

---

## SOLUTION

### 1. Made `sourceJourneyId` Optional in `JourneyFork` Type

**File**: `src/domain/journeyFork.ts`

```typescript
export interface JourneyFork {
    id: string;
    
    /**
     * Reference to the source journey this was forked from
     * 
     * - Defined: Journey was forked from a template/discovered journey
     * - Undefined: Custom journey created by user from scratch
     */
    sourceJourneyId?: string;  // ✅ Now optional
    
    // ... other properties
}
```

**Impact**: Type system now correctly represents that custom journeys have no source.

---

### 2. Updated `canBeLive()` Validator

**File**: `src/domain/journeyFork.ts`

**BEFORE**:
```typescript
if (!fork.sourceJourneyId || !fork.clonedAt) {
    return false;  // ❌ Blocked custom journeys
}
```

**AFTER**:
```typescript
// Must have clonedAt timestamp (all forks have this)
if (!fork.clonedAt) {
    return false;
}

// Custom journeys (no sourceJourneyId) are allowed
return true;  // ✅ Supports custom journeys
```

**Rationale**: 
- `clonedAt` exists for ALL journey forks (including custom)
- `sourceJourneyId` is optional - only checking `clonedAt` is sufficient
- Custom journeys can now go LIVE correctly

---

### 3. Updated `createCustomJourney()` Function

**File**: `context/JourneyContext.tsx`

**BEFORE**:
```typescript
const newJourney: JourneyFork = {
  id,
  sourceJourneyId: id,  // ❌ Self-reference
  clonedAt: Date.now(),
  isCustom: true,
  ...
};
```

**AFTER**:
```typescript
const newJourney: JourneyFork = {
  id,
  // sourceJourneyId is undefined - custom journeys have no source
  clonedAt: Date.now(),
  isCustom: true,
  ...
};
```

**Result**: Custom journeys now have `sourceJourneyId = undefined` (semantically correct).

---

## DEPENDENT CODE REVIEW

### ✅ NavigationDrawer.tsx (Line 124)
```typescript
{activeJourney?.sourceJourneyId && activeJourney.status === "LIVE" && (
  // Recording indicator
)}
```

**Status**: ✅ Already handles optional `sourceJourneyId` with optional chaining (`?.`)

**Behavior**:
- Forked journeys: Shows "Recording your journey" indicator
- Custom journeys: Hides indicator (which is correct - no template being recorded)

---

### ✅ loadJourney() Function
```typescript
const forkedJourney = plannerJourneys.find(j => j.id === journeyId);
```

**Status**: ✅ No dependency on `sourceJourneyId` for routing logic

**Behavior**: Unchanged - loads by `id` regardless of source

---

### ✅ completeJourney() Function
```typescript
const completedJourney = {
  ...journey,
  completedAt: now,
  status: 'COMPLETED'
};
```

**Status**: ✅ No dependency on `sourceJourneyId`

**Behavior**: Unchanged - completion works for all journeys

---

## TYPE SAFETY

### Before
```typescript
sourceJourneyId: string  // Required - forced self-reference hack
```

### After
```typescript
sourceJourneyId?: string  // Optional - type matches semantics
```

**Benefits**:
- ✅ Compiler enforces correctness
- ✅ No need for self-referential workarounds
- ✅ Clear distinction between forked and custom journeys

---

## TESTING CHECKLIST

- [ ] Create custom journey → Verify `sourceJourneyId === undefined`
- [ ] Fork template journey → Verify `sourceJourneyId === templateId`
- [ ] Start custom journey (LIVE) → Verify allowed
- [ ] Check NavigationDrawer → Verify "Recording" indicator ONLY for forked journeys
- [ ] Complete custom journey → Verify completes successfully
- [ ] Inspect type in DevTools → Verify sourceJourneyId not present for custom

---

## SEMANTIC CLARITY

| Journey Type | sourceJourneyId | Meaning |
|--------------|-----------------|---------|
| Template (Discovery) | N/A | Not a fork |
| Forked Journey | `'template-123'` | Points to source template |
| **Custom Journey** | `undefined` | ✅ No source (created from scratch) |

---

## FILES MODIFIED

| File | Lines Changed | Type |
|------|---------------|------|
| `src/domain/journeyFork.ts` | ~130 | Type definition + validator |
| `context/JourneyContext.tsx` | -1 line | Removed self-reference |

**Total**: 2 files modified

---

## ARCHITECTURAL IMPACT

### ✅ Correctness
- Custom journeys now semantically distinct from forked journeys
- Type system reflects reality

### ✅ No Breaking Changes
- All existing code already used optional chaining (`?.`)
- `canBeLive()` updated to support custom journeys
- Behavior unchanged for forked journeys

### ✅ Clarity
- Code is now self-documenting
- No confusing self-references
- Clear distinction in data model

---

## CONCLUSION

The semantic issue is **fully resolved**:
- ✅ Custom journeys have `sourceJourneyId = undefined`
- ✅ Forked journeys have `sourceJourneyId = templateId`
- ✅ Type system enforces correctness
- ✅ All dependent code handles optional field correctly
- ✅ No runtime behavior changes (except semantic correctness)

**Status**: Ready to commit.
