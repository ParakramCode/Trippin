# Fixed Scroll Lock Implementation - Authoritative Approach

**Date:** 2026-01-21  
**Issue:** Page scrolling and "Unable to preventDefault inside passive event listener" warnings  
**Solution:** Screen-scoped scroll lock without wheel event handlers  
**Status:** ✅ Complete

---

## Problem Statement

### Issues Encountered

1. ❌ **Page scrolls when hovering over Filmstrip/HUD**
   - Entire page shifts out of bounds
   - UI drifts vertically
   - Navigation becomes unusable

2. ❌ **Console warnings**
   ```
   Unable to preventDefault inside passive event listener invocation
   ```

3. ❌ **Incorrect previous approach**
   - Used `onWheel` handlers with `e.preventDefault()`
   - Tried to block scroll events at component level
   - Fought against browser's passive listener optimization
   - Created event conflicts

---

## Solution: Screen-Scoped Document Lock

### ✅ The Authoritative Approach

**Lock the document body, not individual components.**

```typescript
// HomeMap.tsx - ONLY place scroll is locked
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

**Why this works:**
- Locks scroll at the **source** (document body)
- No event handler conflicts
- No passive listener warnings
- Browser doesn't try to scroll what can't scroll
- Clean, standard approach

---

## What Was Removed

### ❌ Deleted from Components

#### NextStopFloat.tsx
```typescript
// REMOVED - Incorrect approach
const stopWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

<motion.div onWheel={stopWheel}>  // REMOVED
```

#### PersonalizationPill.tsx
```typescript
// REMOVED - Incorrect approach
const stopWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
};

<motion.div onWheel={stopWheel}>  // REMOVED
```

---

## Why Wheel Event Handlers Don't Work

###The Passive Listener Problem

Modern browsers make wheel listeners **passive by default** for performance:

```javascript
// Browser automatically does this:
element.addEventListener('wheel', handler, { passive: true });
```

**Passive listeners cannot call `preventDefault()`**

When you try:
```typescript
const stopWheel = (e: React.WheelEvent) => {
    e.preventDefault();  // ❌ Fails silently in passive listener
};
```

Result:
- ⚠️ Console warning
- ❌ Scroll still happens
- 🐛 Event handler runs but does nothing

---

## The Correct Mental Model

### ❌ Wrong: Fight the Browser
```
User scrolls → Event fires → Try to preventDefault → Browser ignores
```

### ✅ Right: Remove Scrollability
```
User scrolls → Browser checks if body can scroll → body.overflow = hidden → Nothing happens
```

**The browser never creates scroll events because there's nothing to scroll.**

---

## Architecture Comparison

### Before (Incorrect)

```
┌─────────────────────────────────────┐
│  Document Body (scrollable)         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ HomeMap                       │ │
│  │                               │ │
│  │ ┌──────────────────────────┐ │ │
│  │ │ NextStopFloat            │ │ │
│  │ │ onWheel={stopWheel} ❌   │ │ │
│  │ └──────────────────────────┘ │ │
│  │                               │ │
│  │ ┌──────────────────────────┐ │ │
│  │ │ PersonalizationPill      │ │ │
│  │ │ onWheel={stopWheel} ❌   │ │ │
│  │ └──────────────────────────┘ │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
    ↑
    Tries to preventDefault
    Browser ignores (passive listener)
```

### After (Correct)

```
┌─────────────────────────────────────┐
│  Document Body                      │
│  overflow: hidden ✅                │
│  height: 100vh ✅                   │
│  (Cannot scroll)                    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ HomeMap (position: fixed)     │ │
│  │                               │ │
│  │ ┌──────────────────────────┐ │ │
│  │ │ NextStopFloat            │ │ │
│  │ │ (no wheel handler) ✅    │ │ │
│  │ └──────────────────────────┘ │ │
│  │                               │ │
│  │ ┌──────────────────────────┐ │ │
│  │ │ PersonalizationPill      │ │ │
│  │ │ (no wheel handler) ✅    │ │ │
│  │ └──────────────────────────┘ │ │
│  │                               │ │
│  │ ┌──────────────────────────┐ │ │
│  │ │ Map (Mapbox)             │ │ │
│  │ │ (handles own scroll) ✅  │ │ │
│  │ └──────────────────────────┘ │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
    ↑
    Body can't scroll
    No scroll events fired
```

---

## How Map Zoom Still Works

### Mapbox Handles Its Own Events

```typescript
<JourneyMap
    scrollZoom={true}  // Map controls its own zoom
/>
```

**Flow:**
1. User scrolls over map
2. Document body doesn't scroll (overflow: hidden)
3. Mapbox library handles wheel events directly
4. Map zooms in/out

**Key:** Map scroll/zoom is internal to the Mapbox canvas, not document scroll.

---

## Screen-Scoped Implementation

### Only Active on Map Page

```typescript
// HomeMap.tsx
useEffect(() => {
    // Lock scroll when component mounts
    document.body.style.overflow = 'hidden';
    
    return () => {
        // Restore scroll when component unmounts
        document.body.style.overflow = '';
    };
}, []);
```

**Lifecycle:**
- Mount: `overflow = 'hidden'` → Page locked
- Navigate away: Cleanup runs → `overflow = ''` → Scroll restored
- Return to map: Lock re-applied

**Other pages scroll normally** ✅

---

## Success Criteria

### ✅ All Requirements Met

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Scroll over HUD → Nothing | ✅ | Body overflow hidden |
| Scroll over Filmstrip → Nothing | ✅ | Body overflow hidden |
| Map zoom works | ✅ | Mapbox internal handling |
| No console warnings | ✅ | No preventDefault calls |
| Page never shifts | ✅ | Document locked |
| UI perfectly anchored | ✅ | Fixed positioning |
| Other pages scroll | ✅ | Screen-scoped lock |

---

## Files Modified

| File | Change |
|------|--------|
| `components/NextStopFloat.tsx` | **Removed** `stopWheel` function and `onWheel` handler |
| `components/PersonalizationPill.tsx` | **Removed** `stopWheel` function and `onWheel` handler |
| `pages/HomeMap.tsx` | **Already has** screen-scoped scroll lock ✅ |

**Lines removed:** ~20  
**Lines added:** 0 (lock already existed)  
**Net change:** Cleaner, simpler code

---

## Testing Checklist

### Behavior Tests
- ✅ Hover over NextStopFloat and scroll → Nothing happens
- ✅ Hover over PersonalizationPill and scroll → Nothing happens
- ✅ Hover over Filmstrip and scroll → Nothing happens
- ✅ Hover over Map and scroll → Map zooms
- ✅ Navigate to Discover page → Page scrolls normally
- ✅ Navigate back to map → Scroll locked again

### Console Tests
- ✅ No "Unable to preventDefault" warnings
- ✅ No passive listener errors
- ✅ Clean console

### Visual Tests
- ✅ Page never shifts vertically
- ✅ UI stays perfectly anchored
- ✅ No layout drift
- ✅ Map zoom smooth

---

## Why This is the Right Approach

### Industry Standard

This is how **all** fixed map UIs work:
- Google Maps
- Mapbox examples
- Leaflet demos
- Any production map application

**They all lock document scroll, not fight wheel events.**

### Performance Benefits

**No event handlers:**
- No JavaScript execution on every scroll
- No preventDefault checks
- Browser optimizes better
- Smoother experience

### Maintainability

**Simple, declarative:**
```typescript
// Clear intent - lock scroll when map is visible
useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = '';
    };
}, []);
```

vs complicated:
```typescript
// Unclear intent - Why are we preventing wheel events?
const stopWheel = (e: React.WheelEvent) => {
    e.preventDefault();  // Doesn't work anyway
    e.stopPropagation();
};

<div onWheel={stopWheel}>  // Applied everywhere
```

---

## Common Mistakes to Avoid

### ❌ Don't: Try to preventDefault on Wheel Events
```typescript
// Wrong - passive listeners ignore this
element.addEventListener('wheel', (e) => e.preventDefault());
```

### ❌ Don't: Use CSS on Individual Components
```typescript
// Wrong - doesn't prevent document scroll
<div style={{ overflow: 'hidden' }}>
```

### ❌ Don't: Apply Global CSS
```css
/* Wrong - affects all pages */
body {
    overflow: hidden;
}
```

### ✅ Do: Screen-Scoped Document Lock
```typescript
// Right - locks scroll for this page only
useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
        document.body.style.overflow = '';
    };
}, []);
```

---

## Technical Deep Dive

### Why `body.style.overflow = 'hidden'`?

1. **Prevents document scroll** - Body can't scroll vertically
2. **Doesn't affect children** - Map can still have internal scroll/zoom
3. **Standard approach** - Used by all major mapping libraries
4. **No event conflicts** - Browser never fires scroll events

### Why Remove `height: 100vh`?

Actually, we **keep** `height: 100vh` because:
- Ensures body is exactly viewport height
- Prevents any potential overflow
- Creates consistent container

```typescript
document.body.style.height = '100vh';
```

### Why Save Original Values?

```typescript
const originalOverflow = document.body.style.overflow;
```

**Safety:** Other code might have set these values. We restore the actual prior state, not assume it was empty.

---

## Browser Compatibility

### Passive Listeners (The Root Cause)

**Chrome 51+, Firefox 49+, Safari 11.1+**
- Wheel events passive by default
- Cannot preventDefault in passive listener

**Why browsers did this:**
- Performance optimization
- Smooth scrolling
- Prevents janky UX

**Our solution works in all browsers** because we don't fight the browser.

---

## Troubleshooting

### If Scroll Still Happens

Check:
1. Is `document.body.style.overflow = 'hidden'` actually applied?
   - Open DevTools → Inspect `<body>` → Verify style

2. Is HomeMap component mounted?
   - Check React DevTools

3. Is cleanup running on unmount?
   - Add console.log in return function

### If Map Zoom Doesn't Work

Check:
1. Is `scrollZoom` enabled in Mapbox config?
2. Is map canvas receiving events?
3. Is anything blocking pointer events?

---

**Result:** Page scroll is **completely locked** on the map screen using the authoritative, industry-standard approach. No wheel event handlers, no passive listener warnings, no fighting the browser. Just clean, simple, effective scroll prevention. ✅
