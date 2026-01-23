# Instagram Stories-Style Destination Detail - Quick Reference

## What Changed

**Before**: Bottom sheet with horizontal image scroll  
**After**: Full-screen Instagram Stories-style interface

---

## Key Features

### 📱 Full-Screen Media
- Background spans entire viewport
- Gradient overlay for text legibility
- Smooth image transitions (300ms)

### 📊 Progress Indicators
- Instagram-style bars at top
- Show current + completed images
- Animated fills (white bars)

### 👆 Tap Navigation
- Left side → Previous image
- Right side → Next image
- Visual feedback on boundaries

### 📜 Draggable Sheet
- Bottom glassmorphic panel
- Drag up → Expand full content
- Drag down → Collapse or close
- Smooth spring animations

### 🎨 Typography
- **Media layer**: Bold White with drop-shadow
- **Content sheet**: Slate Gray (slate-700)
- **Background**: Frosted white with blur

---

## User Interactions

| Action | Result |
|--------|--------|
| **Tap left side** | Previous image (if not first) |
| **Tap right side** | Next image (if not last) |
| **Drag sheet up** | Expand to full screen |
| **Drag sheet down** | Close or collapse |
| **Tap X button** | Close detail view |
| **Tap CTA button** | Add to journey (not implemented) |

---

## Layout Zones

```
┌─────────────────────────────┐
│ ◯ Close  ▬▬▬▬▬           │ ← Close + Progress (z-30)
│                             │
│   [FULL IMAGE]              │ ← Media Background
│                             │
│   Bold White Title          │ ← Title (z-20)
│   Activity Chips            │
│                             │
│ ← Prev  │  Next →           │ ← Click Zones
│                             │
│ ┌─────────────────────────┐ │
│ │  Glassmorphic Sheet     │ │ ← Bottom Sheet (z-20)
│ │  ─                      │ │   Draggable
│ │  About...               │ │
│ └─────────────────────────┘ │
│                             │
│ [Add to My Journey]         │ ← CTA (z-30)
└─────────────────────────────┘
```

---

## Color System

| Element | Color Code | Usage |
|---------|-----------|-------|
| Title | `text-white` | Media overlay |
| Body | `text-slate-700` | Sheet content |
| Secondary | `text-slate-600` | Coordinates |
| Tertiary | `text-slate-500` | Preview |
| Sheet BG | `bg-white/95` | Glassmorphism |
| Button | `bg-slate-700` | Primary CTA |

---

## Code Structure

```tsx
// State
const [imageIndex, setImageIndex] = useState(0);
const [isExpanded, setIsExpanded] = useState(false);
const y = useMotionValue(0);

// Handlers
const handleLeftClick = () => {/* prev image */};
const handleRightClick = () => {/* next image */};
const handleDragEnd = (info) => {/* expand/collapse/close */};

// Render
<div className="fixed inset-0">
    {/* Background Image */}
    {/* Progress Bars */}
    {/* Click Zones */}
    {/* Title Overlay */}
    {/* Close Button */}
    {/* Draggable Sheet */}
    {/* CTA Button */}
</div>
```

---

## Animation States

### Sheet Positions

| State | Y Position | Height | Content |
|-------|-----------|--------|---------|
| **Collapsed** | `innerHeight - 280` | ~280px | Preview only |
| **Expanded** | `0` | Full - 200px | All content |

### Drag Thresholds

| Gesture | Threshold | Action |
|---------|-----------|--------|
| Drag up | > -100px | Expand |
| Drag down | > 100px | Close |
| Drag down | > 50px | Collapse |

---

## Performance Tips

### Optimized
✅ Key-based image rendering (no layout shift)  
✅ GPU-accelerated transforms  
✅ useMotionValue (no re-renders during drag)  
✅ Conditional content rendering

### To Watch
⚠️ Large images (compress for web)  
⚠️ Many images (consider lazy loading)  
⚠️ Complex gradients (may impact older devices)

---

## Accessibility

| Feature | Implementation |
|---------|----------------|
| **Keyboard** | Close button focusable |
| **Alt text** | All images have descriptive alt |
| **Touch targets** | 40px+ for all interactive elements |
| **Contrast** | White text on dark, slate on light |

---

## Customization

### Change Sheet Initial Height
```tsx
initial={{ y: window.innerHeight - 280 }} // Change 280
```

### Change Expand Threshold
```tsx
const shouldExpand = info.offset.y < -100; // Change -100
```

### Change Animation Speed
```tsx
transition={{ duration: 0.3 }} // Change 0.3s
```

### Change Progress Bar Color
```tsx
className="h-full bg-white rounded-full" // Change bg-white
```

---

## Common Issues

### Sheet doesn't drag
**Check**: `drag="y"` prop is set on motion.div  
**Fix**: Ensure dragConstraints are properly set

### Images don't transition
**Check**: Each image has unique `key` prop  
**Fix**: Use `key={imageIndex}` on motion.img

### Sheet opacity doesn't change
**Check**: `sheetOpacity` is connected to `style`  
**Fix**: Ensure `style={{ opacity: sheetOpacity }}`

### Close button not clickable
**Check**: z-index is higher than other layers  
**Fix**: Ensure `z-30` or higher

---

## Testing Checklist

### Visual
- [ ] Full-screen background displays
- [ ] Progress bars appear for galleries
- [ ] Title has visible drop-shadow
- [ ] Sheet has glass effect
- [ ] Text is Slate Gray in sheet

### Interaction
- [ ] Left/right taps navigate images
- [ ] Drag up expands sheet
- [ ] Drag down collapses/closes
- [ ] Close button works
- [ ] Boundaries prevent over-navigation

### Animation
- [ ] Image fades are smooth (300ms)
- [ ] Progress bars animate
- [ ] Sheet drag feels natural
- [ ] Button hovers work
- [ ] Exit animation is clean

---

## Quick Edits

### Make sheet taller when collapsed
```tsx
initial={{ y: window.innerHeight - 350 }} // Was 280
```

### Make images change faster
```tsx
transition={{ duration: 0.15 }} // Was 0.3
```

### Make title bigger
```tsx
className="text-6xl font-sans..." // Was text-5xl
```

### Remove gradient overlay
```tsx
// Delete or comment out:
<div className="absolute inset-0 bg-gradient-to-b..." />
```

---

## File Location

**Path**: `components/DestinationDetail.tsx`

**Dependencies**:
- `framer-motion` - Animations and drag
- `types.ts` - Stop interface

**Props**:
- `stop: Stop` - Destination data
- `onClose: () => void` - Close handler

---

## Status

✅ **Complete**
- All tasks implemented
- Build successful
- Ready for testing
- Documentation complete

---

## References

- Full docs: `FEATURE_INSTAGRAM_STORIES_DESTINATION_DETAIL.md`
- Instagram Stories pattern
- Framer Motion drag: https://www.framer.com/motion/gestures/
