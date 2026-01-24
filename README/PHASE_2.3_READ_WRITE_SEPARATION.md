# Phase 2.3: Read vs Write Separation (currentJourney)

**Date:** 2026-01-18  
**Status:** ✅ **COMPLETE** - Read/write separation clarified

## Overview

Phase 2.3 emphasizes the **read vs write separation** by enhancing `currentJourney` documentation and adding `isReadOnlyJourney` to make the distinction crystal clear.

This is **preparation only** - no component refactoring yet.

---

## Changes Made

### 1. ✅ Enhanced `currentJourney` Documentation

**Original docs (Phase 1):**
> Single source of truth for "journey to display"

**Enhanced docs (Phase 2.3):**
```typescript
/**
 * currentJourney: Single source of truth for "journey to display" (Phase 2.3)
 * 
 * READ VS WRITE SEPARATION:
 * - currentJourney = USE FOR RENDERING (map display, UI components)
 * - activeJourney = USE FOR MUTATIONS (editing, updating state)
 * - inspectionJourney = READ-ONLY EXPLORATION (templates, previews)
 * 
 * Purpose:
 * - Components render currentJourney (display concern)
 * - Components mutate activeJourney only (write concern)
 * - Never mutate through currentJourney reference
 * 
 * Example:
 * // GOOD: Render from currentJourney
 * <JourneyMap journey={currentJourney} />
 * 
 * // GOOD: Mutate activeJourney
 * if (activeJourney) {
 *   updateStopNote(activeJourney.id, stopId, note);
 * }
 * 
 * // BAD: Don't assume currentJourney is mutable
 * updateStopNote(currentJourney.id, stopId, note);  // ❌ Could be template!
 */
```

**Why Enhanced:**
- Makes read vs write intent explicit
- Provides clear usage examples
- Shows both correct and incorrect patterns

---

### 2. ✅ Added `isReadOnlyJourney` Boolean

**New Derived Value:**
```typescript
const isReadOnlyJourney = useMemo(
  () => Boolean(inspectionJourney),
  [inspectionJourney]
);
```

**Returns:**
- `true` - inspectionJourney is set (read-only mode)
- `false` - activeJourney is set (can edit)

**Purpose:**
Simple boolean for UI toggling (enable/disable edit controls)

---

### 3. ✅ Added to Interface

```typescript
interface JourneyContextType {
  /**
   * READ-ONLY INDICATOR (Derived - Phase 2.3)
   * 
   * isReadOnlyJourney: Boolean indicating if current journey is read-only
   * - true: inspectionJourney is set (viewing template/preview, no mutations allowed)
   * - false: activeJourney is set (user-owned fork, mutations allowed)
   * 
   * Purpose: Toggle UI elements based on mutability.
   * Use this to enable/disable edit buttons, forms, etc.
   * 
   * Example:
   * {!isReadOnlyJourney && <EditButton />}
   * <TextField disabled={isReadOnlyJourney} />
   */
  isReadOnlyJourney: boolean;
}
```

---

### 4. ✅ Exported in Context

```typescript
const value = {
  // ...
  currentJourney,    // ✅ Phase 2.3: Single source for rendering (read concern)
  isReadOnlyJourney, // ✅ Phase 2.3: Boolean for UI toggling (disabled states)
};
```

---

## Read vs Write Separation Explained

### Architectural Pattern

```
┌─────────────────────────────────────────────────┐
│              COMPONENT LAYER                    │
│                                                 │
│  ┌──────────────┐         ┌──────────────┐    │
│  │   RENDER     │         │   MUTATE     │    │
│  │   (Read)     │         │   (Write)    │    │
│  └──────────────┘         └──────────────┘    │
│        │                        │              │
│        │                        │              │
│        ▼                        ▼              │
│  currentJourney           activeJourney        │
│        │                        │              │
└────────┼────────────────────────┼──────────────┘
         │                        │
         │                        │
         ▼                        ▼
  inspectionJourney         JourneyFork
  (template/preview)        (user-owned)
```

---

### Three Journey References

#### 1. `currentJourney` - FOR RENDERING

**Purpose:** Display on map, show in UI  
**Source:** `inspectionJourney ?? activeJourney`  
**Mutability:** Unknown (could be template or fork)

**Use for:**
- ✅ Map rendering: `<JourneyMap journey={currentJourney} />`
- ✅ Displaying stops: `currentJourney?.stops.map(...)`
- ✅ Showing title: `<h1>{currentJourney?.title}</h1>`

**Do NOT use for:**
- ❌ Mutations: `updateStopNote(currentJourney.id, ...)` (could be template!)
- ❌ Checking editability: Use `isReadOnlyJourney` instead

---

#### 2. `activeJourney` - FOR MUTATIONS

**Purpose:** Editing, updating, writing state  
**Source:** User-owned JourneyFork  
**Mutability:** Mutable (guaranteed fork)

**Use for:**
- ✅ Mutations: `updateStopNote(activeJourney.id, stopId, note)`
- ✅ Editing: `renameJourney(activeJourney.id, newTitle)`
- ✅ State updates: `toggleStopVisitedInJourney(activeJourney.id, stopId)`

**Do NOT use for:**
- ❌ Rendering: Use `currentJourney` instead (better display priority)
- ❌ Map display: `currentJourney` handles both inspection and active

---

#### 3. `inspectionJourney` - FOR READ-ONLY EXPLORATION

**Purpose:** Viewing templates, previewing forks  
**Source:** Template or fork in read-only mode  
**Mutability:** Immutable (by intent)

**Use for:**
- ✅ Checking if read-only: `Boolean(inspectionJourney)`
- ✅ Internal routing decisions

**Do NOT use for:**
- ❌ Direct rendering: Use `currentJourney` instead
- ❌ Mutations: Should never mutate

---

## Usage Examples

### Example 1: Rendering Journey

**GOOD (Read Concern):**
```typescript
const { currentJourney } = useJourneys();

return (
  <div>
    <h1>{currentJourney?.title}</h1>
    <JourneyMap journey={currentJourney} />
    <StopList stops={currentJourney?.stops || []} />
  </div>
);
```

**Why:** `currentJourney` handles both inspection and active modes automatically

---

### Example 2: Mutating Journey

**GOOD (Write Concern):**
```typescript
const { activeJourney, updateStopNote } = useJourneys();

const handleSaveNote = (stopId: string, note: string) => {
  if (activeJourney) {
    updateStopNote(activeJourney.id, stopId, note);
  }
};
```

**Why:** Always check `activeJourney` exists before mutating

---

### Example 3: Conditional UI (Edit Controls)

**GOOD (Using isReadOnlyJourney):**
```typescript
const { isReadOnlyJourney } = useJourneys();

return (
  <div>
    {!isReadOnlyJourney && (
      <EditButton onClick={handleEdit} />
    )}
    
    <TextField
      value={note}
      disabled={isReadOnlyJourney}
      onChange={handleChange}
    />
    
    <SaveButton disabled={isReadOnlyJourney} />
  </div>
);
```

**Why:** Simple boolean for UI toggling

---

### Example 4: Combined Rendering + Mutating

**GOOD (Proper Separation):**
```typescript
const { currentJourney, activeJourney, isReadOnlyJourney } = useJourneys();

// RENDER from currentJourney
return (
  <div>
    <h1>{currentJourney?.title}</h1>
    
    {currentJourney?.stops.map(stop => (
      <StopCard
        key={stop.id}
        stop={stop}
        onToggleVisited={() => {
          // MUTATE through activeJourney
          if (activeJourney) {
            toggleStopVisitedInJourney(activeJourney.id, stop.id);
          }
        }}
        disabled={isReadOnlyJourney}
      />
    ))}
  </div>
);
```

**Why:**
- Rendering uses `currentJourney` (handles both modes)
- Mutations check `activeJourney` (write concern)
- UI disabled state uses `isReadOnlyJourney` (simple boolean)

---

### Example 5: BAD Pattern (Don't Do This)

**BAD:**
```typescript
const { currentJourney, updateStopNote } = useJourneys();

const handleSave = (stopId: string, note: string) => {
  // ❌ BAD: currentJourney could be a template!
  if (currentJourney) {
    updateStopNote(currentJourney.id, stopId, note);
  }
};
```

**Why Bad:**
- `currentJourney` might be `inspectionJourney` (template)
- Mutation function would be called on template ID
- Ownership guards will block it, but intent is wrong

**Fix:**
```typescript
const { activeJourney, updateStopNote } = useJourneys();

const handleSave = (stopId: string, note: string) => {
  // ✅ GOOD: Only mutate if activeJourney exists
  if (activeJourney) {
    updateStopNote(activeJourney.id, stopId, note);
  }
};
```

---

## Benefits of Separation

### 1. **Clear Intent**

```typescript
// Intent: "I want to display this journey"
<JourneyMap journey={currentJourney} />

// Intent: "I want to edit this journey"
if (activeJourney) {
  updateJourney(activeJourney.id, updates);
}
```

---

### 2. **Prevents Template Corruption**

```typescript
// OLD: Risky
const journey = inspectionJourney || activeJourney;
updateJourney(journey.id, ...);  // ❌ Could be template!

// NEW: Safe
if (activeJourney) {
  updateJourney(activeJourney.id, ...);  // ✅ Only forks
}
```

---

### 3. **Simplified UI Logic**

```typescript
// OLD: Complex checking
const canEdit = !!activeJourney && !inspectionJourney;

// NEW: Simple boolean
const canEdit = !isReadOnlyJourney;
```

---

### 4. **Future-Proof**

If we add more journey sources (e.g., shared journeys, collaborative journeys):
- `currentJourney` derivation handles display priority
- `activeJourney` still only contains user-owned forks
- Separation remains clean

---

## Validation Checklist ✅

### Implementation

- ✅ `currentJourney` exists (from Phase 1)
- ✅ `currentJourney` docs enhanced
- ✅ `isReadOnlyJourney` derived value added
- ✅ `isReadOnlyJourney` in interface
- ✅ `isReadOnlyJourney` exported in context

### Functionality

- ✅ `isReadOnlyJourney = true` when inspectionJourney set
- ✅ `isReadOnlyJourney = false` when activeJourney only
- ✅ `currentJourney` prioritizes inspection over active
- ✅ Both values update reactively

### Compatibility

- ✅ No existing code broken
- ✅ No component migrations required
- ✅ All old patterns still work
- ✅ Zero behavior changes

---

## What Was NOT Changed

### ❌ No Component Refactoring

Components can still use old patterns:
```typescript
// Still works (not forced to change)
const journey = inspectionJourney || activeJourney;
```

### ❌ No Behavior Changes

- Map still renders same journey
- Edit controls still function identically
- No UI changes

### ❌ No Enforcement

- Components can ignore `currentJourney`
- Components can ignore `isReadOnlyJourney`
- This is **preparation**, not migration

---

## Migration Path (Optional, Future)

### Phase 2.3 (Current):
- ✅ `currentJourney` and `isReadOnlyJourney` available
- Components continue using old patterns
- New components can adopt clean separation

### Phase 3 (Future):
- Components gradually adopt `currentJourney` for rendering
- Components use `isReadOnlyJourney` for UI toggling
- Old patterns deprecated (but still work)

### Phase 4 (Far Future):
- ESLint rules: "Use currentJourney for rendering"
- ESLint rules: "Use activeJourney for mutations only"
- Enforce separation through linting

---

## Summary

**What Phase 2.3 achieved:**
- ✅ Clear read vs write separation documented
- ✅ `isReadOnlyJourney` boolean for UI toggling
- ✅ Enhanced `currentJourney` with usage examples
- ✅ Architectural pattern clarified

**What Phase 2.3 preserved:**
- ✅ Zero behavior changes
- ✅ No component migrations
- ✅ All old patterns work
- ✅ Opt-in adoption

**Grade:** ✅ Perfect - Clear separation with zero breakage.

**Status:** Read vs write concerns are now explicitly separated! 🎉

**Quick Reference:**
```typescript
const {
  currentJourney,    // ← USE FOR RENDERING
  activeJourney,     // ← USE FOR MUTATIONS
  isReadOnlyJourney  // ← USE FOR UI DISABLED STATES
} = useJourneys();
```
