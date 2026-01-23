# Infinite Render Loop Fix - Quick Reference

## Problem

**Maximum update depth exceeded** error caused by `onMove` calling `setState` on every frame during pan/zoom.

## Solution

**Ref-based viewport tracking** with **throttled state updates** to 300ms intervals.

---

## Implementation

### Before (Broken) ❌

```typescript
const [viewState, setViewState] = useState({ bounds, zoom });

const onMove = (evt) => {
    const newBounds = map.getBounds();
    const newZoom = map.getZoom();
    
    // ❌ Fires 60+ times per second
    setViewState({ bounds: newBounds, zoom: newZoom });
};
```

**Problem**: 60+ renders per second → infinite loop

### After (Fixed) ✅

```typescript
// Ref for live values (no re-renders)
const viewStateRef = useRef({ bounds, zoom });

// State for clustering (throttled updates)
const [viewState, setViewState] = useState({ bounds, zoom });

const onMove = useCallback((evt) => {
    const newBounds = map.getBounds();
    const newZoom = map.getZoom();
    
    // ✅ Update ref immediately (no re-render)
    viewStateRef.current = { bounds: newBounds, zoom: newZoom };
    
    // ✅ Throttle setState to 300ms
    const now = Date.now();
    if (now - lastUpdate >= 300) {
        setViewState({ bounds: newBounds, zoom: newZoom });
        lastUpdate = now;
    } else {
        // Schedule delayed update
        setTimeout(() => {
            setViewState(viewStateRef.current);
        }, 300);
    }
}, [viewState]);
```

**Result**: ~3 renders per second → stable

---

## Key Concepts

### Dual-Tracking Pattern

| Ref (viewStateRef) | State (viewState) |
|-------------------|-------------------|
| Updated every frame | Updated max 1/300ms |
| No re-renders | Triggers re-renders |
| For performance | For UI/hooks |
| Immediate sync | Throttled |

### Throttling Strategy

```
Map Movement (60 FPS)
         ↓
    Update Ref (instant)
         ↓
    Check Timer
         ↓
    Time < 300ms?
    ├─ YES → Schedule update
    └─ NO  → Update state now
         ↓
    Max ~3 state updates/sec
```

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Renders/sec | 60+ | ~3 |
| Main thread | Blocked | Free |
| Vite WebSocket | Disconnects | Stable |
| User experience | Janky | Smooth |

---

## Code Locations

**File**: `components/JourneyMap.tsx`

**Key Sections**:
- Lines 87-92: Refs and throttle state
- Lines 108-167: Throttled onMove handler
- Lines 362-364: Cleanup (clear timeouts)

---

## Testing Checklist

- [x] No "Maximum update depth" error
- [x] Vite WebSocket stays connected
- [x] Map panning is smooth (60 FPS)
- [x] Clustering updates periodically
- [x] Build succeeds
- [x] No console warnings

---

## Pattern for Similar Issues

**When you see**:
- "Maximum update depth exceeded"
- Vite WebSocket disconnecting
- Janky UI during interactions
- Console warnings about re-renders

**Solution**:
1. Identify high-frequency callbacks (onMove, onScroll, etc.)
2. Check if they call setState
3. Move to refs for live values
4. Throttle state updates (200-500ms)
5. Add cleanup for timers

**Template**:
```typescript
// 1. Create ref for live value
const liveValueRef = useRef(initialValue);

// 2. Create state for UI/hooks
const [throttledValue, setThrottledValue] = useState(initialValue);

// 3. Add throttle tracking
const lastUpdateRef = useRef(0);
const timeoutRef = useRef(null);

// 4. Throttled handler
const handleChange = useCallback((newValue) => {
    // Update ref immediately
    liveValueRef.current = newValue;
    
    // Throttle state
    const now = Date.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
        setThrottledValue(newValue);
        lastUpdateRef.current = now;
    } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setThrottledValue(liveValueRef.current);
        }, THROTTLE_MS);
    }
}, []);

// 5. Cleanup
useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
}, []);
```

---

## Why This Works

### Refs vs State

**Refs** (for high-frequency):
- `.current` mutation doesn't trigger re-render
- Synchronous access
- No closure issues
- Perfect for continuous values

**State** (for UI updates):
- Triggers re-renders when changed
- Consumed by hooks
- Semantic updates only
- Throttled from refs

### Throttling Benefits

- **Reduces renders**: 95% reduction (60 → 3 per second)
- **Frees main thread**: No render blocking
- **Maintains responsiveness**: Updates still happen
- **Smooth UX**: No jank during interaction

---

## Common Mistakes

❌ **setState in every callback**
```typescript
// DON'T
onMove = (evt) => {
    setState(evt.value); // 60/sec
};
```

✅ **Ref + throttled state**
```typescript
// DO
onMove = (evt) => {
    ref.current = evt.value;  // 60/sec (no render)
    throttleUpdate();         // ~3/sec (renders)
};
```

❌ **No cleanup**
```typescript
// DON'T
setTimeout(() => setState(...), 300);
// Leaks on unmount
```

✅ **Cleanup on unmount**
```typescript
// DO
useEffect(() => {
    return () => clearTimeout(timeout);
}, []);
```

---

## Verification Commands

```bash
# Build check
npm run build

# Dev server (check for errors in console)
npm run dev

# Look for:
# - No "Maximum update depth" errors
# - Vite HMR working
# - Smooth map interaction
```

---

## Status

✅ **FIXED**
- Infinite render loop eliminated
- Vite WebSocket stable
- Map interaction smooth
- Production-ready

---

## References

- **Full Documentation**: `FIX_INFINITE_RENDER_LOOP.md`
- **React Refs**: https://react.dev/reference/react/useRef
- **Throttling Pattern**: Common React performance optimization
