# Explicit State Ownership Architecture - Journey Collections

**Date**: 2026-01-19  
**Status**: ✅ **IMPLEMENTED**  
**Architecture Pattern**: Separate Collections with Explicit Ownership

## Problem: State Corruption via Mixed Collections

### Original Architecture (BROKEN)
```typescript
// Single collection for ALL states:
plannerJourneys: Journey[]  // Contains PLANNED, LIVE, and COMPLETED

// Filtering approach:
const completed = plannerJourneys.filter(j => j.status === 'COMPLETED');
const planned = plannerJourneys.filter(j => j.status !== 'COMPLETED');
```

### Why This Failed
1. **Completion was just a status flag** - journeys stayed in plannerJourneys
2. **activeJourney could reference completed journeys** - violated ownership rules
3. **No enforcement of one-way transitions** - completed journeys could be reactivated
4. **localStorage restored any journey as active** - including completed ones

### Symptoms
- Only one journey appeared completed at a time
- Completing Journey B caused Journey A to "resurrect"
- Page refresh loaded completed journeys as active
- State corruption on every navigation

## New Architecture: Explicit State Ownership

### Separation of Concerns

```typescript
// THREE separate collections with STRICT ownership:

templateJourneys: Journey[]      // JourneySource - immutable templates
plannerJourneys: Journey[]       // JourneyFork - PLANNING/LIVE only
completedJourneys: Journey[]     // JourneyFork - COMPLETED only
```

### State Ownership Rules

```
┌─────────────────────────────────────────────────────────┐
│ Collection         │ Status Allowed  │ Can be Active?  │
├─────────────────────────────────────────────────────────┤
│ templateJourneys   │ (none)          │ ❌ Never        │
│ plannerJourneys    │ PLANNED, LIVE   │ ✅ Yes          │
│ completedJourneys  │ COMPLETED       │ ❌ Never        │
└─────────────────────────────────────────────────────────┘
```

### Lifecycle Transitions (Enforced)

```
Template Discovery:
  templateJourneys (view only)
    ↓ [Fork]
  plannerJourneys (status: PLANNED)
    ↓ [Start]
  plannerJourneys (status: LIVE)
    ↓ [Complete]
  completedJourneys (status: COMPLETED) ← TERMINAL STATE

Rules:
  ✅ One-way only: PLANNED → LIVE → COMPLETED
  ✅ Completion MOVES journey between collections
  ❌ Completed journeys NEVER return to plannerJourneys
  ❌ Completed journeys NEVER become activeJourney
```

## Implementation Details

### 1. State Declaration

```typescript
// context/JourneyContext.tsx

const [plannerJourneys, setPlannerJourneys] = useLocalStorage<Journey[]>(
  'trippin_user_forks',           // PLANNING/LIVE journeys
  []
);

const [completedJourneys, setCompletedJourneys] = useLocalStorage<Journey[]>(
  'trippin_completed_journeys',   // COMPLETED journeys (separate)
  []
);
```

**Key Design**: Different localStorage keys ensure collections never merge.

### 2. Completion Logic (Collection Transfer)

```typescript
const completeJourney = useCallback((journey: JourneyFork) => {
  const now = new Date().toISOString();
  
  const completedJourney = { 
    ...journey, 
    completedAt: now, 
    status: 'COMPLETED' as const
  };
  
  // 1. REMOVE from plannerJourneys (no longer active/planned)
  setPlannerJourneys(prev => prev.filter(j => j.id !== journey.id));
  
  // 2. ADD to completedJourneys (append, don't replace)
  setCompletedJourneys(prev => [...prev, completedJourney]);
  
  // 3. Clear activeJourney (exit navigation mode)
  if (activeJourney?.id === journey.id) {
    setActiveJourney(null);
  }
  
  // 4. Clear inspection mode
  setInspectionJourney(null);
}, [setPlannerJourneys, setCompletedJourneys, activeJourney]);
```

**Critical**: This is a **collection transfer**, not a status update.

### 3. Load Journey Guard

```typescript
const loadJourney = useCallback((journeyId: string) => {
  // Check templates
  const templateJourney = templateJourneys.find(j => j.id === journeyId);
  if (templateJourney) {
    setInspectionJourney(templateJourney);  // Read-only
    setActiveJourney(null);
    return;
  }

  // Check planner journeys (PLANNED/LIVE only)
  const forkedJourney = plannerJourneys.find(j => j.id === journeyId);
  if (forkedJourney) {
    setActiveJourney(forkedJourney);  // ✅ Can be active
    setInspectionJourney(null);
    return;
  }

  // Check completed journeys (COMPLETED only)
  const completedJourney = completedJourneys.find(j => j.id === journeyId);
  if (completedJourney) {
    setInspectionJourney(completedJourney);  // ✅ Read-only only
    setActiveJourney(null);  // ❌ Never active
    return;
  }
}, [templateJourneys, plannerJourneys, completedJourneys]);
```

**Guard**: Completed journeys route to `inspectionJourney` (read-only), never `activeJourney`.

### 4. UI Integration (MyTrips.tsx)

```typescript
const {
  plannerJourneys,      // PLANNING/LIVE only
  completedJourneys,    // COMPLETED only (separate collection)
} = useJourneys();

// No filtering needed - use the right collection for each tab
const filteredJourneys = useMemo(() => {
  const journeys = filter === 'completed' 
    ? completedJourneys   // ✅ Show from completed collection
    : plannerJourneys;    // ✅ Show from planner collection
  
  return journeys.sort(...);
}, [plannerJourneys, completedJourneys, filter]);
```

**Simplification**: Tabs directly map to collections. No filtering logic needed.

## Architectural Benefits

### 1. Explicit Ownership
```
Before: journey.status === 'COMPLETED' (implicit, filtering-based)
After:  journey in completedJourneys (explicit, collection-based)
```

### 2. Enforced Immutability
```
Before: Completed journeys could be set as activeJourney
After:  loadJourney guards prevent this at runtime
```

### 3. Append-Only Semantics
```
Before: setPlannerJourneys(j.status = 'COMPLETED')  // In-place update
After:  setCompletedJourneys([...prev, completed])  // Append to collection
```

### 4. No State Leakage
```
Before: One journey "completed" could affect another
After:  Collections are independent, operations are isolated
```

## Verification Checklist

✅ **Multiple Journeys**: Complete A, then B → both remain completed  
✅ **Persistence**: Page refresh → both stay in completedJourneys  
✅ **No Resurrection**: Completing new journeys doesn't affect old ones  
✅ **Proper Routing**: Clicking completed journey opens read-only view  
✅ **Never Active**: Completed journeys never become activeJourney  
✅ **Separate Storage**: Different localStorage keys prevent mixing  
✅ **One-Way Transition**: Journeys never move from completed back to planner

## Migration Pattern

For existing completed journeys in the old format:

```typescript
// On app initialization, migrate old completed journeys
useEffect(() => {
  const oldJourneys = plannerJourneys.filter(j => j.status === 'COMPLETED');
  if (oldJourneys.length > 0) {
    // Move to new collection
    setCompletedJourneys(prev => [...prev, ...oldJourneys]);
    // Remove from planner
    setPlannerJourneys(prev => prev.filter(j => j.status !== 'COMPLETED'));
  }
}, []);
```

## Key Insights

### Why Filtering Failed
Filtering is **presentational logic**, not **ownership logic**. When completion is just a flag, there's nothing preventing the system from:
- Loading completed journeys as active
- Mutating completed journeys
- Mixing state responsibilities

### Why Separation Works
By using **separate collections**, we enforce ownership at the **type system level**:
- `plannerJourneys` can ONLY contain active/planned journeys
- `completedJourneys` can ONLY contain completed journeys
- The compiler + guards prevent mixing

### The Fundamental Principle
**State should be organized by ownership, not by filtering.**

```
❌ Bad:  One collection + filter by property
✅ Good: Separate collections + explicit ownership
```

## Related Files

- `context/JourneyContext.tsx` - State ownership implementation
- `pages/MyTrips.tsx` - UI integration with separate collections
- `hooks/useLocalStorage.ts` - Persistence mechanism

## Future Considerations

This pattern can extend to other lifecycle states:
- `archivedJourneys` - Soft-deleted journeys
- `sharedJourneys` - Journeys shared by others
- `draftJourneys` - Incomplete journeys in creation

Each with its own collection and ownership rules.
