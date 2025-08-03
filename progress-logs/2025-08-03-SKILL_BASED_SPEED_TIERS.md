# Skill-Based Speed Tier System - August 3, 2025

## Summary
Implemented a skill-based speed progression system that creates dramatic performance differences between casual platform running and skilled wall bouncing techniques.

## Problem Statement
The original physics settings made wall bouncing feel similar to normal running - there wasn't enough incentive to master wall bounce techniques since the speed gains were minimal.

## Solution: Speed Tier System

### Physics Parameter Changes
- **Max Horizontal Speed**: 700 → 900 (+200 headroom)
- **Horizontal Acceleration**: 1200 → 600 (-50% slower buildup)
- **Horizontal Drag**: 300 (unchanged)

### Resulting Speed Tiers
1. **Casual Platform Running** (~300-400 speed): Limited by slow acceleration, drag, and platform space
2. **Basic Wall Bouncing** (~400-600 speed): Instant momentum redirects from existing speed
3. **Skilled Wall Bouncing** (~700-900 speed): Chaining bounces with optimal air acceleration timing

## Design Philosophy
The system creates a **speed ceiling** that can only be reached through skill:
- The 900 max speed is theoretically achievable but practically unreachable through normal running
- Wall bounces provide instant momentum redirects that become much more valuable with slower base acceleration
- Air time between bounces becomes crucial for building to higher speed tiers
- Skilled players can chain wall bounces while maximizing air acceleration to unlock the full 900 speed range

## Visual Feedback Improvements
Also refined wall bounce visual feedback:
- **Red particles**: Bad efficiency hits (< 0.8 efficiency)
- **Green particles**: Good efficiency hits (≥ 0.8 efficiency)  
- **Orange screen flash**: Low efficiency visual cue
- **Removed camera shake**: Smoother wall bouncing experience

## Impact on Momentum Exchange
Higher speeds from skilled wall bouncing dramatically improve momentum exchange jump performance:
- 300 speed → ~750 jump height
- 600 speed → ~1350 jump height  
- 900 speed → ~2000+ jump height

This creates a compelling skill progression where wall bounce mastery unlocks both higher speeds AND dramatically better jump heights.

## Future Considerations
- Monitor if the 50% acceleration reduction feels too slow for general movement
- Consider different acceleration values for ground vs air movement
- Potential for wall bounce combo multipliers at high speed tiers
- Audio pitch scaling with speed to provide audio feedback for speed tiers

## Technical Implementation
Simple parameter adjustments in `GameConfiguration.ts` created the desired skill gap without complex code changes. The beauty is in the emergent gameplay that results from the parameter relationships.