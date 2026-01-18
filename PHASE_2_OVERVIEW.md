# Phase 2 Overview: Semantic APIs & Defensive Guards

**Date:** 2026-01-18  
**Status:** ✅ **COMPLETE**

## Purpose

Phase 2 introduced **semantic clarity** to the journey state management system through derived values, explicit modes, and defensive validation. The goal was to make the codebase **self-documenting** and **safer** without breaking existing functionality.

---

## The Problem We Were Solving

### Before Phase 2: Implicit Complexity

The journey state system worked, but required developers to:
- Manually choose between `inspectionJourney` and `activeJourney` for rendering
- Check multiple boolean flags to determine navigation state
- Remember which journey reference to use for mutations vs display
- Understand implicit ownership rules that weren't enforced

**Example of old complexity:**
```typescript
// Which journey to render? Developer must decide
const journey = inspectionJourney || activeJourney;

// Is user navigating? Multiple checks needed
const isNavigating = isFollowing || activeJourney?.status === 'LIVE';

// Can I mutate this? Hope for the best
updateStopNote(journey.id, stopId, note);  // Could be template!
```

**Problems:**
- **Cognitive load:** Every component reimplements mode detection
- **Inconsistency:** Different components might choose differently
- **Unsafe:** Nothing prevents mutating templates
- **Opaque:** Domain rules only exist in comments

---

## Phase 2: Making Implicit Knowledge Explicit

Phase 2 added **derived values** and **defensive guards** that encode domain knowledge directly in code:

### Derived Values (Read This, Not That)

Instead of forcing components to choose, we provide:
- `currentJourney` - "Render this journey"
- `viewMode` - "You're in INSPECTION | ACTIVE | NONE mode"
- `journeyMode` - "The journey lifecycle is INSPECTION | PLANNING | NAVIGATION | COMPLETED"
- `isReadOnlyJourney` - "Can the user edit? Boolean answer"

### Defensive Guards (Can't Do That)

Instead of hoping developers use the right journey:
- `setActiveJourney` validates fork metadata
- Mutation functions check journey ownership
- Fork validation prevents template corruption

---

## Phase 2 Sub-Phases

### Phase 2.1: Active Journey Enforcement

**What:** Strict validation that `activeJourney` only accepts `JourneyFork` instances

**Why:** Templates must never become active (prevents mutations on immutable data)

**How:** 
- Added `isJourneyFork` type guard
- `setActiveJourney` blocks templates with detailed error
- `loadJourney` routes templates to `inspectionJourney` automatically

**Impact:**
- Templates **cannot** become `activeJourney` (enforced at runtime)
- Developers get clear error messages if they try
- Domain invariant now encoded in code, not just comments

---

### Phase 2.2: Journey Mode (Unified State)

**What:** Single `journeyMode` value instead of checking multiple flags

**Why:** Reduce complexity, central source of truth for journey state

**How:**
- Derived from `inspectionJourney`, `activeJourney.isCompleted`, `activeJourney.status`, `isFollowing`
- Returns: `'INSPECTION' | 'PLANNING' | 'NAVIGATION' | 'COMPLETED' | null`

**Impact:**
- Components check one value instead of multiple flags
- Consistent mode determination across the app
- Clear lifecycle stages

**Before:**
```typescript
const isNavigating = isFollowing || activeJourney?.status === 'LIVE';
const isReadOnly = !!inspectionJourney;
const isCompleted = activeJourney?.isCompleted;
```

**After:**
```typescript
const { journeyMode } = useJourneys();

switch (journeyMode) {
  case 'NAVIGATION': /* ... */
  case 'PLANNING': /* ... */
  case 'INSPECTION': /* ... */
  case 'COMPLETED': /* ... */
}
```

---

### Phase 2.3: Read vs Write Separation

**What:** Clear distinction between rendering and mutating

**Why:** Prevent accidental mutations through wrong reference

**How:**
- Enhanced `currentJourney` documentation (render-only)
- Added `isReadOnlyJourney` boolean (UI toggling)
- Clarified `activeJourney` is mutation-only

**Impact:**
- Developers know which reference to use when
- `currentJourney` for rendering (could be template or fork)
- `activeJourney` for mutations (guaranteed fork)
- UI can disable edit controls with simple boolean

**Pattern:**
```typescript
const {
  currentJourney,    // ← USE FOR RENDERING
  activeJourney,     // ← USE FOR MUTATIONS
  isReadOnlyJourney  // ← USE FOR DISABLED STATES
} = useJourneys();

// Render
<JourneyMap journey={currentJourney} />

// Mutate (check activeJourney, not currentJourney)
if (activeJourney) {
  updateStopNote(activeJourney.id, stopId, note);
}

// UI toggle
<EditButton disabled={isReadOnlyJourney} />
```

---

### Phase 2.4: Mutation Guard Layer

**What:** Defensive fork validation in mutation functions

**Why:** Prevent data corruption even if UI has bugs

**How:**
- `moveStop` and `removeStop` check `isJourneyFork` before mutating
- Warnings logged if non-fork mutation attempted
- Graceful failure (no crashes)

**Impact:**
- Templates cannot be mutated (verified at function level)
- Clear error messages if invalid mutation attempted
- Multi-layer defense (UI prevention + runtime guards)

**Example:**
```typescript
// Even if UI accidentally calls this on a template:
moveStop('template-id', 0, 'up');

// Guard blocks it:
// [moveStop] Journey is not a fork. Templates are immutable.
// Action: Fork this journey first to make changes.
```

---

## Core Concepts

### 1. Derived State vs Base State

**Base State** (stored, mutable):
- `inspectionJourney` - Journey being previewed
- `activeJourney` - Journey being edited/navigated
- `isFollowing` - Navigation flag
- Journey `status` and `isCompleted` fields

**Derived State** (computed, read-only):
- `currentJourney = inspectionJourney ?? activeJourney`
- `viewMode` - Computed from presence of journeys
- `journeyMode` - Computed from multiple flags
- `isReadOnlyJourney = Boolean(inspectionJourney)`

**Why Derive?**
- Single source of truth (no drift)
- Consistent across components
- Updates automatically
- No manual flag coordination

---

### 2. Render State vs Mutation State

**Render State** (what to display):
- `currentJourney` - Could be template or fork
- `viewMode` - INSPECTION or ACTIVE
- `journeyMode` - Full lifecycle state

**Mutation State** (what can be edited):
- `activeJourney` - Only forks, never templates
- Checked by mutation functions
- Protected by guards

**Why Separate?**
- Templates need to be **viewable** (render state)
- Templates must not be **editable** (mutation state)
- Same journey appears different depending on intent

**Example:**
```typescript
// Template journey
const template = { id: 'himachal-1', title: 'Spiti Valley' };

// Viewing it
loadJourney('himachal-1');
// → inspectionJourney = template
// → currentJourney = template (render this)
// → activeJourney = null (cannot mutate)
// → isReadOnlyJourney = true (UI disabled)

// Editing requires fork first
forkJourney(template);
// → Creates new fork
// → activeJourney = fork (can mutate)
// → isReadOnlyJourney = false (UI enabled)
```

---

### 3. Why Legacy Flags Still Exist

**Question:** "If we have `journeyMode`, why keep `isFollowing`?"

**Answer:** Backward compatibility during migration

**Strategy:**
- **Phase 2:** Add new APIs, keep old ones (gradual adoption)
- **Phase 3:** Migrate components to new APIs
- **Phase 4:** Remove old APIs (breaking change, but safe)

**Current State:**
```typescript
// OLD API (still works)
const isNavigating = isFollowing;

// NEW API (preferred)
const isNavigating = journeyMode === 'NAVIGATION';

// BOTH work right now for smooth migration
```

**Why This Matters:**
- No forced component rewrites
- Gradual migration reduces risk
- Old code keeps working during transition
- New code can use better patterns immediately

---

### 4. Type System Limitations

**Challenge:** TypeScript can't fully express our domain model yet

**Current Types:**
```typescript
// TOO PERMISSIVE
activeJourney: Journey | null

// SHOULD BE (Phase 3)
activeJourney: JourneyFork | null
```

**Why Not Change It Now?**
- `Journey` type used everywhere
- Would break existing components
- Requires type narrowing at usage sites

**Phase 2 Solution:**
- Runtime guards (`isJourneyFork`)
- Type casts (`as any` where safe)
- Documentation explaining intent

**Phase 3 Plan:**
- Narrow `activeJourney` type
- Update components gradually
- Remove type casts
- Full type safety

---

## Architectural Intent

### The Journey Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    JOURNEY LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. DISCOVERED (JourneySource)
   │
   │  [User browses in Discover tab]
   │
   ├─→ loadJourney(templateId)
   │   → inspectionJourney = template
   │   → currentJourney = template
   │   → viewMode = 'INSPECTION'
   │   → journeyMode = 'INSPECTION'
   │   → isReadOnlyJourney = true
   │
   └─→ forkJourney(template)
       │
       2. FORKED (JourneyFork - status: PLANNED)
          │
          │  [User saves to My Trips]
          │
          ├─→ loadJourney(forkId)
          │   → activeJourney = fork
          │   → currentJourney = fork
          │   → viewMode = 'ACTIVE'
          │   → journeyMode = 'PLANNING'
          │   → isReadOnlyJourney = false
          │
          └─→ startJourney(forkId)
              │
              3. NAVIGATING (JourneyFork - status: LIVE)
                 │
                 │  [User navigates route]
                 │
                 │  → journeyMode = 'NAVIGATION'
                 │  → isFollowing = true
                 │
                 └─→ completeJourney(forkId)
                     │
                     4. COMPLETED (JourneyFork - isCompleted: true)
                        │
                        │  → journeyMode = 'COMPLETED'
                        │  → isReadOnlyJourney = true
```

### State Transitions

**Inspection → Active:** Fork it
```typescript
forkJourney(inspectionJourney);  // Creates fork in plannerJourneys
loadJourney(forkId);              // Activates the fork
```

**Planning → Navigation:** Start it
```typescript
startJourney(activeJourney.id);  // Sets status='LIVE', isFollowing=true
```

**Navigation → Completed:** Complete it
```typescript
completeJourney(activeJourney.id);  // Sets isCompleted=true
```

---

## Do's and Don'ts

### ✅ DO: Use Derived Values for UI Logic

```typescript
// ✅ GOOD: Single value, clear intent
const { journeyMode } = useJourneys();

if (journeyMode === 'NAVIGATION') {
  return <LiveNavigationUI />;
}
```

```typescript
// ❌ BAD: Manual flag checking, can drift
if (isFollowing || activeJourney?.status === 'LIVE') {
  return <LiveNavigationUI />;
}
```

---

### ✅ DO: Render from currentJourney

```typescript
// ✅ GOOD: Centralized display priority
const { currentJourney } = useJourneys();

return <JourneyMap journey={currentJourney} />;
```

```typescript
// ❌ BAD: Manual choice, inconsistent
const journey = inspectionJourney || activeJourney;

return <JourneyMap journey={journey} />;
```

---

### ✅ DO: Mutate Through activeJourney Only

```typescript
// ✅ GOOD: Explicit mutation reference
const { activeJourney, updateStopNote } = useJourneys();

const handleSave = (noteText) => {
  if (activeJourney) {
    updateStopNote(activeJourney.id, stopId, noteText);
  }
};
```

```typescript
// ❌ BAD: Could be template
const { currentJourney, updateStopNote } = useJourneys();

const handleSave = (noteText) => {
  if (currentJourney) {
    updateStopNote(currentJourney.id, stopId, noteText);  // Unsafe!
  }
};
```

---

### ✅ DO: Use isReadOnlyJourney for UI Toggles

```typescript
// ✅ GOOD: Simple boolean
const { isReadOnlyJourney } = useJourneys();

return (
  <>
    <TextField disabled={isReadOnlyJourney} />
    {!isReadOnlyJourney && <SaveButton />}
  </>
);
```

```typescript
// ❌ BAD: Manual checking
const canEdit = activeJourney && !inspectionJourney;

return (
  <>
    <TextField disabled={!canEdit} />
    {canEdit && <SaveButton />}
  </>
);
```

---

### ✅ DO: Trust the Guards

```typescript
// ✅ GOOD: Call mutation, guards handle safety
const { removeStop } = useJourneys();

removeStop(journeyId, stopId);
// If invalid: Warning logged, no crash
// If valid: Mutation performed
```

```typescript
// ❌ BAD: Manual validation, duplicates guard logic
const journey = plannerJourneys.find(j => j.id === journeyId);
if (journey && journey.sourceJourneyId) {
  removeStop(journeyId, stopId);
}
```

---

### ❌ DON'T: Mutate currentJourney Directly

```typescript
// ❌ VERY BAD: Direct mutation
currentJourney.stops[0].visited = true;
```

```typescript
// ✅ GOOD: Use mutation functions
if (activeJourney) {
  toggleStopVisitedInJourney(activeJourney.id, stop.id);
}
```

---

### ❌ DON'T: Call setActiveJourney Directly

```typescript
// ❌ BAD: Bypasses validation
const template = templateJourneys[0];
setActiveJourney(template);  // Blocked by guard, but intent is wrong
```

```typescript
// ✅ GOOD: Use loadJourney (routes correctly)
loadJourney(templateId);  // → inspectionJourney
loadJourney(forkId);      // → activeJourney
```

---

## What Phase 3 Will Do

### Type Narrowing

**Phase 2 (Current):**
```typescript
activeJourney: Journey | null  // Too permissive
```

**Phase 3 (Future):**
```typescript
activeJourney: JourneyFork | null  // Precise
```

### API Cleanup

**Phase 2 (Current):**
```typescript
// Both APIs exposed
isFollowing: boolean;           // Legacy
journeyMode: JourneyMode;       // New
```

**Phase 3 (Future):**
```typescript
// Only new API
journeyMode: JourneyMode;       // Preferred
// isFollowing deprecated with warnings
```

### Component Migration

**Phase 2 (Current):**
```typescript
// Components can use either
const isNav = isFollowing;  // Works
const isNav = journeyMode === 'NAVIGATION';  // Also works
```

**Phase 3 (Future):**
```typescript
// Components migrated to new API
const isNav = journeyMode === 'NAVIGATION';  // Only way
```

### Internal Cleanup

**Remove:**
- Type casts (`as any`)
- Deprecated function implementations
- Legacy flag coordination code

**Enforce:**
- Type safety at compile time (not just runtime)
- Explicit journey modes everywhere
- No manual flag checking

---

## Success Metrics

### What Phase 2 Achieved

✅ **Semantic Clarity**
- `currentJourney` makes render intent explicit
- `journeyMode` unifies scattered flags
- `isReadOnlyJourney` simplifies UI logic

✅ **Safety Guards**
- Templates cannot become `activeJourney`
- Mutations validate fork metadata
- Clear warnings instead of crashes

✅ **Backward Compatibility**
- Zero breaking changes
- All old code still works
- Gradual migration possible

✅ **Developer Experience**
- Self-documenting state values
- Clear error messages
- Examples in documentation

✅ **Data Integrity**
- Multi-layer mutation protection
- Domain rules enforced in code
- Defensive programming patterns

---

## The Bigger Picture

### Phase 1: Foundation
- Separated storage (templates vs forks)
- Added ownership guards

### Phase 2: Semantics ← **We Are Here**
- Made implicit knowledge explicit
- Added derived values
- Enforced invariants with guards

### Phase 3: Enforcement (Future)
- Type system alignment
- Remove deprecated APIs
- Component migrations

### Phase 4: Optimization (Future)
- Store integrations
- Performance improvements
- Advanced patterns

---

## Conclusion

Phase 2 transformed the journey state system from **implicit and unsafe** to **explicit and guarded**. The codebase now **documents itself** through derived values, and **protects itself** through defensive guards.

**Key Insight:**  
Good architecture makes the right thing easy and the wrong thing hard. Phase 2 makes it easy to render journeys correctly and hard to mutate templates accidentally.

**For Developers:**  
Use the derived values (`currentJourney`, `journeyMode`, `isReadOnlyJourney`) instead of manual flag checks. Trust the guards to prevent mistakes. The domain rules are now encoded in the API itself.

**For the Roadmap:**  
Phase 2's semantic foundation enables Phase 3's type enforcement. We can now safely migrate components knowing the guards will catch any mistakes during the transition.

---

## Quick Reference Card

```typescript
const {
  // RENDER THESE
  currentJourney,     // Journey to display (could be template or fork)
  viewMode,           // 'INSPECTION' | 'ACTIVE' | 'NONE'
  journeyMode,        // Full lifecycle state
  isReadOnlyJourney,  // Boolean for UI toggling
  
  // MUTATE THROUGH THIS
  activeJourney,      // Fork being edited (null if inspection mode)
  
  // USE THESE FUNCTIONS
  loadJourney,        // Correct way to activate/view
  forkJourney,        // Template → Fork
  updateStopNote,     // Mutations (guard-protected)
  // ...other mutation functions
} = useJourneys();

// PATTERN
<JourneyMap journey={currentJourney} />  // Render
{!isReadOnlyJourney && <EditButton />}   // Toggle
if (activeJourney) { /* mutate */ }      // Safety
```

---

**Status:** Phase 2 complete. The semantic foundation is solid. Ready for Phase 3's type enforcement and component migrations.
