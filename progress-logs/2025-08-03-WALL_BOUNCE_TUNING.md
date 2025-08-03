# Wall Bounce & Momentum Exchange Jump System - August 3, 2025

## Summary
Successfully implemented Icy Tower-style momentum exchange jump system after extensive experimentation with both wall bouncing approaches and jump mechanics. The key breakthrough was identifying that cascade jumping was bleeding momentum, masking the effectiveness of our momentum exchange calculations.

## Problem Statement
The original wall bounce system was completely broken - bounces were rejected with "speed: 0.0" because collision handlers run AFTER Phaser's physics resolution zeroes velocity. Additionally, the jump system preserved horizontal velocity instead of converting it to vertical height like in the original Icy Tower.

## Approaches Tried

### 1. "Proper" Phaser Collision Handlers (Failed)
**Attempt**: Use collision handlers directly as shown in Phaser documentation
**Result**: Failed because collision handlers actually run AFTER separation, not before
**Lesson**: Documentation can be misleading about execution timing

### 2. ProcessCallback Velocity Capture (Working)
**Approach**: Use processCallback (4th parameter) to capture velocity BEFORE collision resolution, then use cached values in collision handlers
**Result**: This worked! Wall bounces were detected and executed properly
**Implementation**: 
```typescript
// CRITICAL: processCallback captures velocity BEFORE separation,
// collideCallback uses captured velocity AFTER separation.
this.leftWallCollider = this.scene.physics.add.collider(
  this.player,
  this.wallManager.getLeftWalls(),
  (player, wall) => this.onCollideAfterSeparation(player as Player, wall, 'left'),
  (player, wall) => this.capturePreCollisionVelocity(player as Player, wall, 'left'),
  this.scene
);
```

### 3. Pure Physics Bouncing Experiment (Inconclusive)
**Attempt**: Use Phaser's built-in bounce properties instead of custom wall kick logic
**Approach**: Set `bounce.setTo()` on player and walls, let physics handle bouncing
**Problems Encountered**:
- Jitter loops: Player would bounce rapidly between walls
- Collision detection issues with high velocities
- Appeared to lose control over bounce behavior

**Branch**: `physics-bouncing-experiment` (stashed for reference)
**Status**: Inconclusive - the jitter issues we encountered here were the SAME cascade/repeated execution problems we later solved in our custom approach with jump cooldowns. The physics approach may actually work properly now that we understand the root cause of the jitter was rapid repeated collisions, not the physics approach itself.

**Future Investigation**: With our current understanding of collision timing and cooldown mechanisms, the pure physics approach deserves another attempt. What felt like "lost wall kick mechanics" may actually be properly working physics - especially now that we have momentum exchange jump system working well.

**Specific Steps for Physics Bouncing Retry**:
1. Start with collision cascade prevention (cooldown mechanisms)
2. Set appropriate bounce values: `player.body.bounce.setTo(0.8, 0)` (horizontal bounce only)
3. Set wall bounce values: `wall.body.bounce.setTo(1.0, 0)` 
4. Monitor for cascade symptoms (rapid collision logs, jitter)
5. Apply same velocity cap increases (vertical limit 10000+)
6. Test if momentum exchange + physics bouncing provides authentic feel
7. Compare to current custom wall kick system

### 4. Momentum Exchange Jump System (Successful)
**Goal**: Convert horizontal velocity to vertical height on jump, like original Icy Tower
**Challenge**: Implement non-linear scaling where building speed gives increasingly better jumps

## Major Gotchas That Made Us Think It Wasn't Working

### 1. Velocity Capping (Critical)
**Problem**: `setMaxVelocity(maxHorizontalSpeed, 1000)` was capping vertical velocity at 1000px/s
**Symptom**: Even with calculated V-speed of 6550, player only jumped with 1000 velocity
**Fix**: Increased vertical velocity cap to 10,000px/s
**Impact**: This was completely preventing high momentum jumps from working

### 2. Cascade Jumping (Critical) 
**Problem**: Jump buffer system was causing multiple jumps per button press
**Symptom**: Logs showed momentum bleeding: `H-speed 800 → 240 → 72 → 21 → 6`
**Root Cause**: Flawed jump buffer logic in `requestJump()` and `onLanding()`:
```typescript
// BAD: This allowed multiple jump attempts per button press
requestJump(): void {
  this.jumpBuffer = this.JUMP_BUFFER_TIME; // Reset buffer every call
  this.attemptJump(); // If successful, clears buffer...
}

// BAD: Auto-jump on landing if buffer > 0
private onLanding(): void {
  if (this.jumpBuffer > 0) {
    this.attemptJump(); // ...but next requestJump() sees buffer = 0 and allows another
  }
}

// BAD: Frame-by-frame jump attempts while buffer active
private updateJumpBuffer(deltaTime: number): void {
  if (this.jumpBuffer > 0 && this.canJump()) {
    this.attemptJump(); // Called every frame!
  }
}
```
**Fix**: Added 150ms jump cooldown separate from jump buffer
**Impact**: This was the biggest masking issue - momentum exchange WAS working, but immediately getting bled away
**Critical for Physics Approach**: The same cascade mechanism would affect physics bouncing - rapid repeated collisions causing jitter

### 3. Exponential Scaling Explosion
**Problem**: High exponential values (5.0, 1.8) created absurd velocities
**Symptom**: V-speed values of 15,000+ causing teleportation
**Fix**: Use progressive linear scaling instead of exponential
**Learning**: Exponential scaling is dangerous without careful bounds checking

## What We Eventually Did That Worked

### Jump Cooldown System
```typescript
private readonly JUMP_COOLDOWN = 150; // Prevent cascade jumping
private lastJumpTime: number = 0;

private attemptJump(): boolean {
  const timeSinceLastJump = Date.now() - this.lastJumpTime;
  if (timeSinceLastJump < this.JUMP_COOLDOWN) {
    return false; // Block rapid jumps
  }
  // ... rest of jump logic
}
```

### Progressive Momentum Exchange
```typescript
// Progressive momentum exchange: 1.0x at low speed → 1.25x at max speed
const speedMagnitude = Math.abs(horizontalSpeed);
const maxSpeed = this.config.physics.maxHorizontalSpeed;
const speedPercent = Math.min(speedMagnitude / maxSpeed, 1.0);

const minConversion = 1.0;  // 1.0x at 0% speed (no boost)
const maxConversion = 1.25; // 1.25x at 100% speed
const conversionRate = minConversion + (maxConversion - minConversion) * speedPercent;

const momentumBoost = speedMagnitude * conversionRate;
const verticalSpeed = baseJumpSpeed + momentumBoost;
const horizontalSpeedAfterJump = horizontalSpeed * 0.6; // Retain 60%
```

### Single Platform Generation
Fixed platform generation to create one platform per level (3-7 tiles wide) instead of 2-3 platforms, matching original Icy Tower design.

## Current Tuning Parameters

### Working Values
- **Base Jump Speed**: 200px/s (decent standing jump)
- **Momentum Conversion**: 1.0x → 1.25x progressive scaling
- **Horizontal Retention**: 60% (preserve momentum feel)
- **Jump Cooldown**: 150ms (prevent cascade jumping)
- **Vertical Velocity Cap**: 10,000px/s (allow high momentum jumps)

### Scaling Results
- **0% speed (0px/s)**: 200 vertical speed (base jump only)
- **50% speed (350px/s)**: ~594 vertical speed (1.125x conversion)
- **100% speed (700px/s)**: 1075 vertical speed (1.25x conversion)

## Future Tuning Opportunities

### 1. Momentum Exchange Curve Shape
**Current**: Linear progressive scaling from 1.0x to 1.25x
**Alternatives to explore**:
- Exponential curve with careful bounds (e.g., `Math.pow(speedPercent, 0.7)`)
- Sigmoid curve for smooth acceleration at mid-speeds
- Piecewise linear for different behavior zones

### 2. Horizontal Velocity Sacrifice
**Current**: Retain 60% of horizontal velocity on jump
**Considerations**:
- Higher retention (70-80%) for more momentum preservation
- Variable retention based on speed (sacrifice more at high speeds)
- Different retention for wall bounces vs normal jumps

### 3. Speed-Dependent Base Jump
**Current**: Fixed 200px/s base jump speed
**Alternative**: Reduce base jump as momentum contribution increases
```typescript
const dynamicBaseJump = baseJumpSpeed * (1 - speedPercent * 0.3);
```

### 4. Wall Bounce Integration
**Current**: Wall bounces and momentum jumps are separate systems
**Future**: Integrate wall bounce momentum into jump calculations for compound effects

### 5. Visual Feedback Tuning
- Particle effects that scale with momentum exchange
- Camera shake intensity based on momentum conversion
- Audio pitch/volume scaling with jump height

## Technical Lessons Learned

### 1. Phaser Collision System Timing (Critical Understanding)
- **processCallback (4th parameter)**: Runs BEFORE physics separation, velocity is intact
- **collideCallback (3rd parameter)**: Runs AFTER physics separation, velocity often zeroed
- **Documentation Issue**: Phaser docs suggest using collideCallback for velocity access, but this fails
- **Solution Pattern**: Use processCallback to capture velocity, store it, use in collideCallback

### 2. Collision Cascade Detection & Prevention
**Symptoms to watch for**:
- Rapid repeated collision logs (same collision type firing multiple times per second)
- Velocity values that decay in rapid succession: `800 → 240 → 72 → 21`
- Jittery player movement when touching walls/platforms
- Audio effects playing rapidly in succession

**Debug Tools**:
```typescript
// Add collision timing logs to detect cascades
console.log(`⚡ Collision at ${Date.now()}, last: ${this.lastCollisionTime}`);
if (Date.now() - this.lastCollisionTime < 50) {
  console.warn('🚨 COLLISION CASCADE DETECTED');
}
```

**Prevention Mechanisms**:
- Cooldown timers (150ms worked well for jumps)
- State tracking to prevent repeated state transitions
- Grace periods after successful actions

### 3. Physics Body Velocity Limits
- **Default Phaser limits**: Often much lower than needed for high-speed gameplay
- **Common gotcha**: `setMaxVelocity(x, y)` - Y limit often forgotten and too low
- **Debug approach**: Log calculated vs actual velocity after setting
- **For Icy Tower**: Vertical velocities need 5000-10000+ for momentum jumps

### 4. Input Buffer vs Cooldown Distinction
- **Input Buffer**: Stores player intent while action unavailable (good for responsiveness)
- **Cooldown Timer**: Prevents repeated execution of successful actions (prevents cascades)
- **Both needed**: Buffer for feel, cooldown for stability
- **Common mistake**: Using only buffer leads to cascade when conditions rapidly change

### 5. Exponential Scaling Bounds
- **Safe range**: Exponents 0.5-1.5 for game mechanics
- **Danger zone**: Exponents >2.0 create explosive growth at high values
- **Debug approach**: Test with extreme input values (max player speed)
- **Safety nets**: Always cap final calculated values regardless of formula

### 6. Debugging Methodology for Complex Physics
- **Log everything**: All intermediate calculations, not just final results
- **Time-based logging**: Add timestamps to detect rapid repeated execution
- **Value tracking**: Log how values change over consecutive frames/events
- **Isolation testing**: Test individual components (jumping, collision, etc.) separately

## Repository State
- **Working branch**: `debug-wall-bounce-visual`
- **Experimental branch**: `physics-bouncing-experiment` (stashed)
- **Core systems**: Momentum exchange working, wall bounces working, single platform generation fixed

## Next Steps
1. **Revisit Pure Physics Bouncing**: Now that we understand collision cascade issues and have cooldown solutions, re-investigate if Phaser's built-in physics bouncing can work properly. This might be simpler and more authentic than custom wall kick mechanics.
2. Fine-tune momentum exchange curve shape for optimal game feel
3. Balance horizontal velocity sacrifice vs momentum preservation  
4. Evaluate if wall bounce "bonus kicks" are necessary - with good momentum exchange, proper physics bouncing might provide the right feel naturally
5. Add visual and audio feedback that scales with momentum exchange intensity

## Key Insight for Future Development
The distinction between "game mechanics" and "physics simulation" may be artificial. What feels like specially coded mechanics might just be properly working physics. The Icy Tower feel might come from momentum exchange on jumps rather than artificial wall bounce bonuses.