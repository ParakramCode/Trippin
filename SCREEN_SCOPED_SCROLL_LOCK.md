# Screen-Scoped Scroll Lock Implementation

**Date:** 2026-01-21  
**Type:** Map Screen Scroll Prevention  
**Status:** ✅ Complete

---

## Problem Statement

The app has **multiple screens** with different scroll requirements:

| Screen Type | Should Scroll? |
|-------------|---------------|
| **Map / Live Navigation** | ❌ No - Fixed full-screen |
| **Discover Feed** | ✅ Yes - Normal scrolling |
| **My Trips List** | ✅ Yes - Normal scrolling |
| **Planner Editor** | ✅ Yes - Normal scrolling |
| **Profile** | ✅ Yes - Normal scrolling |

**Previous Broken Approach:**
- Global CSS `overflow: hidden` on html/body/root
- Broke scrolling on ALL screens ❌

**Required Solution:**
- Scroll lock **ONLY** when map screen is mounted
- Restore scroll immediately when navigating away
- No global CSS affecting other screens

---

## Solution: useEffect Cleanup Pattern

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Other Screens                        │
│              (Lists, Planner, Profile)                  │
│                                                         │
│  document.body.style.overflow = default ✅              │
│  Normal scrolling works                                 │
└─────────────────────────────────────────────────────────┘

                         ↓ Navigate to Map

┌─────────────────────────────────────────────────────────┐
│                   HomeMap (Mounted)                     │
│                                                         │
│  useEffect(() => {                                      │
│    document.body.style.overflow = 'hidden' ✅           │
│    document.body.style.height = '100vh'                 │
│                                                         │
│    return () => {                                       │
│      // CLEANUP: Restore scroll on unmount             │
│      document.body.style.overflow = originalOverflow    │
│      document.body.style.height = originalHeight        │
│    }                                                    │
│  }, [])                                                 │
└─────────────────────────────────────────────────────────┘

                         ↓ Navigate away

┌─────────────────────────────────────────────────────────┐
│                    Other Screens                        │
│                                                         │
│  document.body.style.overflow = restored ✅             │
│  Normal scrolling works again                           │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Screen-Scoped Scroll Lock (HomeMap.tsx)

```typescript
useEffect(() => {
    // Save original values
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    // Lock scroll while map is mounted
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    // Cleanup: restore on unmount
    return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.height = originalHeight;
    };
}, []);
```

**Why this works:**
1. **Mount** - Scroll is locked when HomeMap renders
2. **Unmount** - Cleanup function runs automatically, restoring scroll
3. **Navigation** - Works for back button, route changes, etc.
4. **Screen-specific** - Only affects this component's lifecycle

---

### 2. Fixed Container (HomeMap.tsx)

```typescript
<div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
    {/* Map and overlays */}
</div>
```

**Must be `position: fixed`, not `relative`:**
- `relative`: Still participates in document flow, can scroll
- `fixed`: Completely removed from layout flow, cannot scroll ✅

---

### 3. Wheel Event Prevention on Overlays

**Shared handler:**
```typescript
const stopWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
};
```

**Applied to:**

#### ✅ Back Button
```typescript
<button onWheel={stopWheel} onClick={handleExitLiveNavigation}>
```

#### ✅ NextStopFloat (Top HUD)
```typescript
<motion.div 
    onWheel={stopWheel}
    style={{ pointerEvents: 'auto' }}
>
```

#### ✅ PersonalizationPill (Bottom Action Bar)
```typescript
<motion.div
    onWheel={stopWheel}
    style={{ pointerEvents: 'auto' }}
>
```

#### ✅ Filmstrip
```typescript
<div onWheel={stopWheel} style={{ pointerEvents: 'auto' }}>
    <Filmstrip />
</div>
```

**Why `pointerEvents: 'auto'`?**
- Ensures overlay captures events (not map beneath)
- Allows buttons/interactions to work
- Combined with `stopWheel`, prevents scroll propagation

---

## Scroll Behavior Matrix

| Scenario | Document Scroll? | Map Zoom? | Notes |
|----------|------------------|-----------|-------|
| **Navigate to Discover** | ✅ Works | ➖ N/A | useEffect cleanup restored scroll |
| **Navigate to Map** | ❌ Locked | ✅ Works | useEffect locked scroll |
| **Scroll over Map** | ❌ No | ✅ Zooms | Mapbox handles wheel events |
| **Scroll over NextStopFloat** | ❌ No | ❌ No | stopWheel prevents propagation |
| **Scroll over PersonalizationPill** | ❌ No | ❌ No | stopWheel prevents propagation |
| **Scroll over Filmstrip** | ❌ No | ❌ No | stopWheel prevents propagation |
| **Browser back from Map** | ✅ Restored | ➖ N/A | cleanup ran on unmount |
| **Navigate to My Trips** | ✅ Works | ➖ N/A | useEffect cleanup restored scroll |

---

## Files Modified

| File | Changes |
|------|---------|
| `pages/HomeMap.tsx` | Added scroll lock useEffect, changed to `position: fixed`, added `stopWheel` handlers |
| `components/NextStopFloat.tsx` | Added `stopWheel` handler + `pointerEvents: auto` |
| `components/PersonalizationPill.tsx` | Added `stopWheel` handler + `pointerEvents: auto` |
| `index.css` | **No changes** - No global scroll lock ✅ |

---

## Key Principles

### ✅ Screen-Scoped
- Scroll lock only applies when HomeMap is mounted
- Other screens unaffected

### ✅ Cleanup on Unmount
- useEffect return function guarantees restoration
- Works for all exit paths (back, navigate, unmount)

### ✅ No Global CSS
- No permanent changes to html/body/root
- App-wide scrolling works normally

### ✅ Position Fixed Container
- Map container removed from document flow
- Cannot participate in any scroll-based layout

### ✅ Overlay Event Blocking
- Wheel events stopped at overlay level
- Map retains scroll zoom functionality

---

## Testing Checklist

### Map Screen
- ✅ Page cannot scroll
- ✅ Scrolling over map → zooms map
- ✅ Scrolling over NextStopFloat → nothing happens
- ✅ Scrolling over PersonalizationPill → nothing happens
- ✅ Scrolling over Filmstrip → nothing happens
- ✅ No layout drift or out-of-bounds behavior

### Other Screens
- ✅ Discover feed scrolls normally
- ✅ My Trips list scrolls normally
- ✅ Planner editor scrolls normally
- ✅ Profile page scrolls normally

### Navigation
- ✅ Navigate from Map → Discover (scroll restored)
- ✅ Navigate from Map → My Trips (scroll restored)
- ✅ Browser back button from Map (scroll restored)
- ✅ Navigate to Map, then away multiple times (no leaks)

---

## Technical Deep Dive

### Why Save Original Values?

```typescript
const originalOverflow = document.body.style.overflow;
const originalHeight = document.body.style.height;
```

**Reason:** Other components might have set these values. We must restore the **actual original state**, not assume it's empty/default.

**Example:**
- Another component sets `overflow: auto`
- We mount and set `overflow: hidden`
- We unmount and restore to `overflow: auto` (not empty) ✅

---

### Why `height: 100vh`?

```typescript
document.body.style.height = '100vh';
```

**Reason:** Ensures body is exactly viewport height. Combined with `overflow: hidden`, this creates a **fixed viewport** that cannot scroll.

Without this, body might be taller than viewport (due to content), allowing scroll even with `overflow: hidden`.

---

### Why Both `preventDefault()` and `stopPropagation()`?

```typescript
e.preventDefault();    // Stop browser default (scroll)
e.stopPropagation();   // Stop event bubbling to parent (map)
```

1. **`preventDefault()`** - Prevents browser from scrolling
2. **`stopPropagation()`** - Prevents Mapbox from seeing the event

Both needed because:
- `preventDefault()` alone → Event still bubbles to map
- `stopPropagation()` alone → Browser might still scroll

**Together:** Complete event blocking ✅

---

## Comparison: Before vs After

### Before (Broken Global Lock)
```css
/* index.css - WRONG ❌ */
html, body, #root {
  overflow: hidden;
}
```

**Problems:**
- ❌ All screens broken
- ❌ Cannot scroll Discover feed
- ❌ Cannot scroll My Trips list
- ❌ No cleanup (permanent breakage)

---

### After (Screen-Scoped Lock)
```typescript
// HomeMap.tsx - CORRECT ✅
useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.height = originalHeight;
    };
}, []);
```

**Benefits:**
- ✅ Only map screen affected
- ✅ Other screens scroll normally
- ✅ Automatic cleanup on unmount
- ✅ No global CSS changes

---

## Edge Cases Handled

### ✅ Rapid Navigation
User quickly navigates: Map → Discover → Map → My Trips

**Result:** Scroll locks and unlocks correctly each time (cleanup ensures no state leaks)

### ✅ Browser Back/Forward
User uses browser navigation buttons

**Result:** useEffect cleanup runs on unmount, scroll restored

### ✅ Route Changes While on Map
User clicks link while map is open

**Result:** Component unmounts, cleanup restores scroll before new screen renders

### ✅ Multiple Maps (if added later)
Multiple map components could mount/unmount

**Result:** Each manages its own lock (last one wins, first one cleans up)

---

**Result:** Scroll locking is now **screen-scoped**, **cleanup-guaranteed**, and **zero-impact on other screens**. Map behaves like Google Maps (fixed, no scroll), while all other screens scroll normally. ✅
