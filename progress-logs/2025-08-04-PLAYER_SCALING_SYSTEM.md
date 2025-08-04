# Player Scaling System Implementation

**Date:** 2025-08-04  
**Status:** Implemented (with known limitations)  
**Goal:** Add configurable player scaling to make arena feel bigger

## Summary

Successfully implemented a player scaling system that allows configurable character size via `GameConfiguration.player.scale`. The system works well at the target scale (0.7 = 30% smaller) but has hardcoded offset limitations that prevent it from being truly scale-agnostic.

## Implementation Details

### Configuration Structure
```typescript
export interface PlayerConfig {
  scale: number;           // Player scale factor (1.0 = normal, 0.7 = 30% smaller)
  baseBodyWidth: number;   // Base body width before scaling
  baseBodyHeight: number;  // Base body height before scaling
  baseOffsetX: number;     // Base offset X before scaling  
  baseOffsetY: number;     // Base offset Y before scaling
}
```

### Current Settings (Tuned for 0.7 scale)
```typescript
player: {
  scale: 0.7,              // 30% smaller for bigger arena feel  
  baseBodyWidth: 108,      // Tuned for good fit
  baseBodyHeight: 128,     // Tuned for good fit
  baseOffsetX: 10,         // Tuned for 0.7 scale (hardcoded)
  baseOffsetY: 14          // Tuned for 0.7 scale (hardcoded)
}
```

### Physics Implementation
The scaling system applies to both visual sprite and physics body:

1. **Visual Sprite**: Scaled using Phaser's `setScale(playerConfig.scale)`
2. **Physics Body Size**: Calculated as `baseSize * scale`
3. **Physics Body Offset**: Compensated for sprite scaling using:
   ```typescript
   const offsetX = baseOffsetX + (baseBodyWidth * (1 - scale)) / 2;
   const offsetY = baseOffsetY + (baseBodyHeight * (1 - scale)) / 2;
   ```

## Technical Challenges & Solutions

### Challenge 1: Sprite vs Hitbox Misalignment
**Problem:** When scaling a sprite visually, the physics body and visual sprite become misaligned.
**Solution:** Developed offset compensation formula that accounts for how sprite scaling affects positioning.

### Challenge 2: Hardcoded Offset Values
**Problem:** The base offset values (`baseOffsetX: 10, baseOffsetY: 14`) are specifically tuned for 0.7 scale.
**Root Cause:** Don't know the exact dimensions and padding of the character sprite within the texture atlas.
**Impact:** Changing the scale factor breaks the alignment and requires re-tuning offsets.

### Challenge 3: Failed Scale-Agnostic Attempt
**Attempted Solution:** Tried to calculate offsets dynamically based on sprite texture dimensions:
```typescript
// FAILED APPROACH - Wrong sprite dimensions
spriteWidthInTexture: 128,   // Guessed wrong
spriteHeightInTexture: 128,  // Guessed wrong
hitboxWidthRatio: 0.85,      // Resulted in major misalignment
```
**Outcome:** Complete failure - character was 50% outside hitbox again.

## Current Status

### ✅ What Works
- **Perfect alignment at 0.7 scale** (within 1-2 pixels)
- **Configurable scaling** via GameConfiguration
- **Runtime updates** via `updateConfiguration()`
- **Both visual and physics scaling** properly coordinated
- **Maintains all game mechanics** (jumping, collision, etc.)

### ❌ Known Limitations
- **Not scale-agnostic** - hardcoded for 0.7 scale specifically
- **Changing scale breaks alignment** - would need manual re-tuning
- **No understanding of actual sprite dimensions** in texture atlas

## Lessons Learned

### Key Insights
1. **Sprite texture padding matters** - The character sprite has built-in padding/margins that affect offset calculations
2. **Phaser's setScale() vs physics offset interaction** is complex and needs careful compensation
3. **Hardcoded solutions can be pragmatic** - Perfect scale-agnostic system not worth the complexity for single-use case

### Development Gotchas
1. **Don't scale offsets proportionally** - This creates double-scaling effects
2. **Visual scaling ≠ physics scaling** - They interact in non-obvious ways
3. **Guessing sprite dimensions fails badly** - Need actual texture analysis

### Working Pattern
```typescript
// Physics body scales
const scaledWidth = baseBodyWidth * scale;
const scaledHeight = baseBodyHeight * scale;

// Visual sprite scales  
this.setScale(scale);

// Offset compensates for visual scaling
const offsetX = baseOffsetX + (baseBodyWidth * (1 - scale)) / 2;
const offsetY = baseOffsetY + (baseBodyHeight * (1 - scale)) / 2;
```

## Future Improvements

### To Make Truly Scale-Agnostic
1. **Analyze actual sprite texture** - Determine exact character dimensions and padding
2. **Calculate texture-relative offsets** - Base calculations on actual sprite bounds
3. **Implement dynamic offset calculation** - Remove hardcoded values

### Alternative Approaches
1. **Use sprite bounds detection** - Runtime analysis of sprite texture
2. **Separate hitbox configuration** - Independent of sprite texture dimensions
3. **Multiple pre-tuned scale presets** - Avoid dynamic calculation complexity

## References

**Files Modified:**
- `src/game/GameConfiguration.ts` - Added PlayerConfig interface and default values
- `src/game/Player.ts` - Implemented scaling logic in setupPhysics() and updateConfiguration()

**Related Issues:**
- See MISC_TODO.md for scale-agnostic system improvement task