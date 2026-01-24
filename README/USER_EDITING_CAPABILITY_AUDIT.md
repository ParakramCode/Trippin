# User Editing Capability Audit - JourneyFork

**Branch**: `feature/user-editable-journeys`  
**Audit Date**: 2026-01-19  
**Purpose**: Assess current vs. missing editing capabilities for user-owned JourneyFork instances

---

## EXECUTIVE SUMMARY

**Current State**: Core editing infrastructure is **implemented** with strong architectural foundations. User can edit routes, notes, and rename journeys. However, advanced features like **adding new stops**, **journey-level notes**, and **photo uploads** are **missing**.

**Architecture Status**: ✅ **SOLID** - Proper separation between read-only (inspection) and mutable (active) journeys enforced.

---

## DETAILED CAPABILITY ASSESSMENT

### 1️⃣ ROUTE EDITING (Add/Remove/Reorder Stops)

#### 🟢 **IMPLEMENTED**: Remove Stops
- **Function**: `removeStop(journey: JourneyFork, stopId: string)` 
- **Location**: `context/JourneyContext.tsx:1027`
- **UI**: `pages/Planner.tsx:78-81` (with confirmation dialog)
- **How it works**: Filters out stop from `journey.stops[]`, updates plannerJourneys
- **Status**: ✅ **Fully functional**

#### 🟢 **IMPLEMENTED**: Reorder Stops
- **Function**: `moveStop(journey: JourneyFork, stopIndex: number, direction: 'up' | 'down')`
- **Location**: `context/JourneyContext.tsx:983`
- **UI**: `pages/Planner.tsx:194, 209` (arrow buttons)
- **How it works**: Swaps adjacent stops in array
- **Status**: ✅ **Fully functional**

#### 🔴 **MISSING**: Add New Stops
- **Function**: None found
- **Expected signature**: `addStop(journey: JourneyFork, stop: UserStop, insertIndex?: number)`
- **Implications**: Users can only remove/reorder existing stops, not expand routes
- **Workaround**: Custom journeys start with empty `stops: []` but can't add to them
- **Priority**: **HIGH** - Critical for custom journey creation

---

### 2️⃣ NOTES ON STOPS

#### 🟢 **IMPLEMENTED**: Stop-Level Notes
- **Function**: `updateStopNote(journey: JourneyFork, stopId: string, note: string)`
- **Location**: `context/JourneyContext.tsx:1065`
- **UI**: `pages/Planner.tsx:50-76` (expand/edit/save/cancel flow)
- **Data Model**: `Stop.note?: string` (`types.ts:44`)
- **How it works**: Updates `stop.note` property, syncs activeJourney + plannerJourneys
- **Status**: ✅ **Fully functional**

---

### 3️⃣ JOURNEY-LEVEL NOTES

#### 🔴 **MISSING**: Journey-Wide Notes/Description
- **Data Model**: No `notes` or `description` field on `JourneyFork`
- **Expected field**: `JourneyFork.notes?: string` or `JourneyFork.description?: string`
- **Use case**: User wants to add overall trip notes, budget, packing list
- **Workaround**: None
- **Priority**: **MEDIUM** - Useful but not critical

---

### 4️⃣ PHOTOS ATTACHED TO JOURNEYS OR STOPS

#### 🟡 **PARTIALLY IMPLEMENTED**: Moments (User Photos)
- **Data Model**: `JourneyFork.moments?: Moment[]` (`src/domain/journeyFork.ts:67`)
- **Display**: `components/MomentModal.tsx` (view-only modal)
- **Viewing**: `components/JourneyMap.tsx:391` (displays existing moments)
- **Missing**: 
  - ❌ No function to **add** new moments
  - ❌ No function to **delete** moments
  - ❌ No photo upload UI
  - ❌ No camera integration
- **Status**: 🟡 **Data structure exists, CRUD operations missing**

#### 🔴 **MISSING**: Stop-Level Photo Attachments
- **Data Model**: `Stop.images?: string[]` exists (`types.ts:41`) but read-only from template
- **Expected**: User-uploaded photos per stop (not just template images)
- **Workaround**: Could repurpose moments with coordinates near stop
- **Priority**: **LOW** - Nice-to-have, moments system could suffice

---

### 5️⃣ MOMENTS / TIMELINE ENTRIES

#### 🟡 **PARTIALLY IMPLEMENTED**: Moment System
- **Data Model**: ✅ `JourneyFork.moments` defined
  ```typescript
  moments?: Array<{
    id: string;
    coordinates: [number, number];
    imageUrl: string;
    caption: string;
    author?: Author;
  }>
  ```
- **Viewing**: ✅ `MomentModal` component shows moments in gallery
- **Missing CRUD**:
  - ❌ `addMoment(journey: JourneyFork, moment: Moment)`
  - ❌ `updateMomentCaption(journey: JourneyFork, momentId: string, caption: string)`
  - ❌ `deleteMoment(journey: JourneyFork, momentId: string)`
  - ❌ Photo upload/camera integration

**Status**: 🟡 **Read-only infrastructure, write operations missing**

---

### 6️⃣ COMPLETION BEHAVIOR (Post-Completion Edits)

#### 🟢 **IMPLEMENTED**: Immutability After Completion
- **Function**: `isJourneyEditable(journey: JourneyFork)`
- **Location**: `context/JourneyContext.tsx:947`
- **Logic**: `journey.status !== 'COMPLETED'`
- **UI**: `pages/Planner.tsx:36` - `isEditable` flag disables editing
- **Architecture**: Completed journeys moved to `completedJourneys` collection
- **Behavior**: 
  - ✅ Completed journeys can be **viewed** (inspection mode)
  - ✅ Editing UI is **disabled** after completion
  - ✅ Completed journeys cannot be set to LIVE again
- **Status**: ✅ **Properly enforced**

#### File References:
- `context/JourneyContext.tsx:740-747` - Completed journeys routed to inspection mode
- `context/JourneyContext.tsx:911-938` - Completion moves journey to separate collection
- `src/domain/journeyFork.ts:106-123` - `canBeLive()` prevents completed from going live

---

### 7️⃣ SHARED JOURNEY IMMUTABILITY ENFORCEMENT

#### 🟢 **IMPLEMENTED**: Template Protection
- **Architecture**: ✅ **Separation enforced** at routing level
- **Key Mechanism**: `loadJourney()` function (`context/JourneyContext.tsx:716-749`)
  - Templates → `inspectionJourney` (Readonly<Journey>)
  - Forks → `activeJourney` (JourneyFork, mutable)
- **Type Safety**: 
  - `inspectionJourney: Readonly<Journey> | null` (line 78)
  - `activeJourney: JourneyFork | null` (line 89)
- **Runtime Guards**:
  - `setActiveJourneyWithValidation` enforces only JourneyFork accepted (line 618-642)
  - Templates auto-route to inspection, never active
- **Status**: ✅ **Fully enforced, architecturally sound**

#### File References:
- `context/JourneyContext.tsx:618-642` - activeJourney guard prevents templates
- `context/JourneyContext.tsx:716-749` - loadJourney auto-routing logic
- `ACTIVE_JOURNEY_OWNERSHIP.md` - Architecture documentation

---

### 8️⃣ CUSTOM TRIPS (JourneyFork with No sourceJourneyId)

#### 🟡 **PARTIALLY IMPLEMENTED**: Custom Journey Creation
- **Function**: `createCustomJourney()` exists
- **Location**: `context/JourneyContext.tsx:1098-1115`
- **UI Trigger**: `pages/MyTrips.tsx:102` (+ button)
- **Creates**:
  ```typescript
  {
    id: `custom-${Date.now()}`,
    title: 'My Custom Journey',
    location: 'Add location...',
    duration: '1 Day',
    stops: [],  // Empty array
    sourceJourneyId: id,  // Points to itself
    isCustom: true,
    status: 'PLANNED'
  }
  ```

#### 🔴 **ARCHITECTURAL ISSUE**: sourceJourneyId Contradiction
- **Problem**: Line 1108: `sourceJourneyId: id` (points to self)
- **Expected**: Custom journeys should have **NO** sourceJourneyId (undefined)
- **Current**: Technically valid as JourneyFork but semantically incorrect
- **Impact**: 
  - `canBeLive()` checks `sourceJourneyId` exists (line 113 in journeyFork.ts)
  - Self-referential ID works but violates "no source" concept
- **Recommendation**: Change to `sourceJourneyId: undefined` OR create separate `CustomJourney` type

#### 🔴 **MISSING**: Custom Journey Editing
- **Can't add stops** - `addStop()` function missing (see #1)
- **Can rename** - ✅ Works
- **Can't set location** - No `updateLocation()` function
- **Can't set duration** - No `updateDuration()` function
- **Can't upload cover image** - No image upload function

**Status**: 🟡 **Shell exists, critical editing functions missing**

---

## CAPABILITY MATRIX

| Feature | Status | Implementation % | Blocker |
|---------|--------|------------------|---------|
| Remove stops | ✅ Complete | 100% | None |
| Reorder stops | ✅ Complete | 100% | None |
| **Add new stops** | ❌ Missing | 0% | No function |
| Stop notes | ✅ Complete | 100% | None |
| **Journey notes** | ❌ Missing | 0% | No data field |
| View moments | ✅ Complete | 100% | None |
| **Add moments** | ❌ Missing | 0% | No function |
| **Upload photos** | ❌ Missing | 0% | No upload system |
| Completion lock | ✅ Complete | 100% | None |
| Template protection | ✅ Complete | 100% | None |
| Create custom journey | 🟡 Partial | 30% | Can't add stops |
| Edit custom metadata | 🟡 Partial | 25% | Only title editable |

**Overall Completion**: **~45%** (6.5 / 12 features complete)

---

## RISK ASSESSMENT

### 🔴 HIGH RISK: Missing Core Editing Functions

**Issue**: Users can create custom journeys but can't add stops → **unusable feature**

**Impact**:
- Custom journey feature is incomplete
- User frustration (can't build routes from scratch)
- Data model supports stops, but no way to add them

**Recommendation**: **Implement `addStop()` before shipping custom journeys**

---

### 🟡 MEDIUM RISK: Photo Upload Infrastructure

**Issue**: Moments exist as data, but no way to create them

**Impact**:
- Feature appears in UI (MomentModal) but is read-only
- Users may expect to add photos, can't
- No backend photo storage implemented

**Recommendation**: Either remove moments UI or implement full flow (camera + upload + storage)

---

### 🟢 LOW RISK: Architecture Solid

**Strength**: Immutability enforcement is excellent
- Templates cannot be mutated (type-safe)
- Completed journeys properly locked
- Fork-first pattern prevents corruption

**No action needed** - Keep current architecture

---

## SUGGESTED IMPLEMENTATION ORDER

### Phase 1: Critical Blockers (Ship-Blocking)
1. ✅ **`addStop(journey, stop, insertIndex?)`** - Enable custom journey building
   - Location: `context/JourneyContext.tsx`
   - UI: New "+ Add Stop" button in `pages/Planner.tsx`
   - Priority: **CRITICAL**

2. ✅ **Fix `createCustomJourney` sourceJourneyId** - Remove self-reference
   - Change line 1108 to `sourceJourneyId: undefined`
   - OR: Keep if `canBeLive()` requires it (document why)
   - Priority: **CRITICAL (architectural clarity)**

### Phase 2: User Experience Enhancements
3. ✅ **Journey-level metadata editing**
   - `updateLocation(journey, location)`
   - `updateDuration(journey, duration)`
   - `updateCoverImage(journey, imageUrl)`
   - Priority: **HIGH**

4. ✅ **Journey description/notes**
   - Add `JourneyFork.description?: string` field
   - Add `updateJourneyDescription()` function
   - UI: Text area in Planner header
   - Priority: **MEDIUM**

### Phase 3: Advanced Features (Post-MVP)
5. 🔄 **Moments CRUD**
   - `addMoment(journey, moment)`
   - `updateMoment(journey, momentId, updates)`
   - `deleteMoment(journey, momentId)`
   - Camera integration (future: use device camera API)
   - Priority: **LOW** (infrastructure complex)

6. 🔄 **Photo Upload System**
   - Backend storage (S3/Firebase/Cloudinary)
   - Image compression/optimization
   - Progress indicators
   - Priority: **LOW** (requires backend)

---

## ARCHITECTURAL NOTES

### ✅ **Strengths**
1. **Clean separation**: Templates vs Forks properly isolated
2. **Type safety**: `JourneyFork` enforcedfor mutations
3. **Immutability**: Readonly types + runtime guards
4. **State ownership**: Clear plannerJourneys vs completedJourneys split

### 🔍 **Observations**
1. All edit functions follow pattern: `(journey: JourneyFork, ...) => void`
2. Updates are applied to both `plannerJourneys` AND `activeJourney` (sync pattern)
3. Completed journeys isolated in separate collection (good)

### 🚨 **Concerns**
1. **Missing addStop**: Users can't expand routes
2. **Moments read-only**: Data model exists but no writes
3. **Custom journey semantics**: `sourceJourneyId = self` is confusing

---

## CONCLUSION

**Core editing infrastructure is solid** with proper architecture for immutability and type safety. However, **critical user-facing features are missing**:

- ❌ Can't add new stops (blocks custom journey feature)
- ❌ Can't add moments/photos (moments UI is misleading)
- ❌ Can't edit journey metadata beyond title

**Recommendation**: Complete Phase 1 tasks before shipping. Phases 2-3 can follow based on user demand.

**Next Steps**: Implement `addStop()` function + UI as highest priority blocker.
