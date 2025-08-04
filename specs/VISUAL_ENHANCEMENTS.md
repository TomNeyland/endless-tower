# Visual Enhancements Specification

## Wall Positioning & Parallax Ideas

This document captures ideas for enhancing the visual feel of the wall system to make walls feel closer and more immersive to the player.

---

## Current Wall System

**Current Implementation:**
- Left walls: `x = 0` (far left screen edge)
- Right walls: `x = screenWidth - tileWidth` (far right screen edge)
- Walls feel distant and disconnected from player
- Static positioning relative to world coordinates

**Generation System:**
- Procedural infinite generation upward only
- Wall segments managed with 100-segment cap
- Cleanup removes oldest segments (highest Y values)
- Works perfectly with current collision system

---

## Enhancement Option 1: Closer Wall Positioning ⭐ **RECOMMENDED**

### Concept
Move walls inward from screen edges to feel more present around the player.

### Implementation
```typescript
// Instead of:
const leftX = 0;
const rightX = screenWidth - tileWidth;

// Use:
const edgeBuffer = screenWidth * 0.15; // 15-20% from edges
const leftX = edgeBuffer;
const rightX = screenWidth - tileWidth - edgeBuffer;
```

### Benefits
- ✅ **Simple**: Change 2 coordinate values
- ✅ **Zero risk**: No impact on collision system
- ✅ **Immediate**: Instant visual improvement
- ✅ **Compatible**: Works with all existing systems

### Considerations
- Slightly smaller play area (may actually improve gameplay focus)
- Wall bounce distances will be shorter (potentially better game feel)

---

## Enhancement Option 2: True Parallax Scrolling ⚠️ **COMPLEX**

### Concept
Apply parallax movement factor to walls relative to camera movement.

### Implementation Approach
```typescript
// Pseudo-code concept:
const parallaxFactor = 1.2; // Walls move slightly faster than camera
const wallOffsetY = (cameraY - initialCameraY) * parallaxFactor;
// Apply offset to all wall tiles during generation/update
```

### Benefits
- Dynamic tunnel-like effect
- Enhanced sense of speed and movement
- More immersive climbing experience

### Major Risks & Challenges
- ❌ **Collision precision**: Wall bounce system relies on exact positioning
- ❌ **Timing accuracy**: Perfect/good/late bounce windows need pixel-perfect walls
- ❌ **Procedural complexity**: Generation logic becomes position-dependent
- ❌ **Performance**: Continuous position updates for all wall segments
- ❌ **Synchronization**: Camera movement must stay perfectly in sync

### Technical Blockers
The wall bounce system (`WallCollision.ts`) uses precise timing windows based on exact wall positions:
- Perfect timing: 50ms window with exact collision detection
- Speed thresholds and momentum calculations
- Grace period positioning relative to walls

Any parallax movement would break this precision.

---

## Enhancement Option 3: Fake Parallax Effects ✅ **GOOD COMPROMISE**

### Concept
Create visual movement without affecting collision positioning.

### Implementation Ideas

#### A. Tile Offset Animation
```typescript
// Apply subtle visual offset without changing physics bodies
wallTile.setDisplayOrigin(0.5 + Math.sin(time * 0.001) * 0.1, 0.5);
```

#### B. Gentle Swaying Effect
```typescript
// Slight horizontal movement based on height/time
const sway = Math.sin(wallTile.y * 0.01 + time * 0.002) * 2;
wallTile.setPosition(baseX + sway, wallTile.y);
// Keep physics body at baseX for collision
```

#### C. Breathing Wall Effect
```typescript
// Subtle scale pulsing
const breathe = 1 + Math.sin(time * 0.003) * 0.02;
wallTile.setScale(breathe, 1);
```

### Benefits
- ✅ **Safe**: Collision system unaffected
- ✅ **Dynamic**: Adds visual interest
- ✅ **Lightweight**: Minimal performance impact
- ✅ **Adjustable**: Easy to tune or disable

---

## Implementation Priority

### Phase 1: **Closer Positioning** (High Impact, Low Risk)
- Move walls 15-20% inward from screen edges
- Test wall bounce feel with new distances
- Immediate visual improvement

### Phase 2: **Subtle Visual Effects** (Medium Impact, Low Risk)
- Add gentle tile animation or swaying
- Keep collision bodies static for precision
- Enhance dynamism without breaking mechanics

### Phase 3: **Skip True Parallax** (High Risk, Complex)
- Wall bounce system too sensitive for major position changes
- Risk/reward ratio unfavorable
- Consider only after other systems are complete

---

## Technical Notes

### Wall Bounce Compatibility
The precision timing system in `WallCollision.ts` requires:
- Exact wall positions for collision detection
- Consistent physics body locations
- Reliable distance calculations for grace periods

Any visual enhancement must preserve these requirements.

### Performance Considerations
- Current system manages 100 wall segments efficiently
- Visual effects should use minimal CPU per frame
- Consider batching animation updates
- GPU-based effects preferred over CPU calculations

### Future Compatibility
- Enhancement should work with biome system
- Must not interfere with procedural generation
- Should scale with any future wall mechanics

---

## Decision Matrix

| Option | Visual Impact | Implementation | Risk | Compatibility |
|--------|---------------|----------------|------|---------------|
| Closer Walls | High | Trivial | None | Perfect |
| True Parallax | Very High | Complex | High | Poor |
| Fake Effects | Medium | Easy | Low | Good |

**Recommendation**: Start with **Closer Positioning** for immediate improvement, then explore **Fake Effects** for additional polish.

---

## Notes

- Documented 2025-08-04 during development session
- Current wall system working well, enhancements are polish-only
- Wall bounce precision is critical game mechanic to preserve
- Procedural generation system should remain unchanged