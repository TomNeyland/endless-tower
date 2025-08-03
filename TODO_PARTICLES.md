# TODO: High-Speed Spinning Particle Effects

## Feature Requirements
Add particle effects that spawn at the player's location when the player is moving fast AND spinning. Particle spawn rate should scale with spin rate, lasting ~1 second each.

## Key Investigation Points

### 1. Rotation System Integration
**File**: `src/game/Player.ts`  
**Method**: `updateRotationEffect(deltaTime: number)`

This method already tracks:
- `initialJumpSpeed`: The momentum value used for rotation calculations
- `rotationSpeed`: Current calculated rotation speed (0-35 rad/sec)
- `exponentialRatio`: The scaling factor (0-1) based on momentum
- Rotation trigger conditions: `!state.isGrounded && initialJumpSpeed > speedThreshold`

**Key Values Available**:
- `speedThreshold = 400`: Minimum speed to trigger rotation
- `maxRotationSpeed = 1200`: Speed for maximum rotation effect
- `rotationSpeed`: Current rotation speed in rad/sec
- `state.horizontalSpeed`: Current horizontal movement speed

### 2. Existing Particle System Architecture
**File**: `src/game/WallBounceEffects.ts`

Study this file to understand:
- How particle emitters are created and managed in this codebase
- Pattern: `this.scene.add.particles(x, y, texture, config)`
- Particle lifecycle management and cleanup
- Integration with EventBus system
- Safety checks for texture availability and emitter state

**Key Methods to Reference**:
- `initializeParticleEmitters()`: Shows particle creation pattern
- `onSuccessfulBounce()`: Shows how to trigger particle bursts
- Event listener setup in `setupEventListeners()`

### 3. EventBus Communication Pattern
**File**: `src/game/EventBus.ts`

The rotation system could emit events when spinning conditions are met, similar to how wall bounces emit `'player-wall-bounce'` events.

**Current Event Examples**:
- `'player-jumped'`: Emitted on jumps with momentum data
- `'player-wall-bounce'`: Emitted on wall bounces with speed data
- `'wall-contact-effects'`: Emitted for visual feedback

### 4. Trigger Condition Logic
**Requirements**: Fast movement AND spinning

**Available Data Sources**:
- **Horizontal Speed**: `state.horizontalSpeed` from `MovementController.getMovementState()`
- **Rotation Speed**: `rotationSpeed` calculated in `updateRotationEffect()`
- **Airborne State**: `!state.isGrounded`

**Suggested Thresholds**:
- Minimum horizontal speed: ~300-400 (medium-fast movement)
- Minimum rotation speed: ~10-15 rad/sec (visible spinning)
- Both conditions must be true simultaneously

### 5. Particle Spawn Rate Scaling
**Scaling Factor**: Rotation speed (0-35 rad/sec) should map to particle spawn rate

**Consider**:
- Low rotation (10-15 rad/sec): Few particles, sparse
- Medium rotation (15-25 rad/sec): Moderate particle trail
- High rotation (25-35 rad/sec): Dense particle effect

**Timing**: Particles should spawn continuously while conditions are met, not just on trigger events

### 6. Particle Positioning
**Player Location Access**: `this.x` and `this.y` in `Player.ts`

**Movement Consideration**: Player is moving fast, so particles should spawn at current position but may need slight offset or velocity to create trail effect

### 7. Asset Requirements
**Texture Source**: Check existing particle textures in `WallBounceEffects.ts` - currently uses `'character'` texture with frame `'character_beige_idle'`

**Alternative Textures**: May want dedicated particle texture or different character frames for spinning effect

## Implementation Approach Suggestions

### Option A: Direct Integration in Player.ts
Add particle logic directly to `updateRotationEffect()` method where rotation calculations already exist.

**Pros**: Direct access to all rotation data, no event overhead
**Cons**: Couples visual effects with player logic

### Option B: EventBus + Separate Particle System
Create new particle effect class similar to `WallBounceEffects.ts`, listen for rotation events from Player.

**Pros**: Cleaner separation, follows existing architecture pattern
**Cons**: Need to design event payload with rotation data

### Option C: Hybrid Approach
Emit events from `updateRotationEffect()` when spinning conditions are met, handle particles in Player.ts or dedicated system.

## Technical Considerations

### Performance
- Particle systems can be expensive with many particles
- Consider particle limits and cleanup
- Only spawn when both speed AND rotation conditions are met

### Visual Design
- Particle color/tint based on speed tier?
- Particle direction relative to movement/rotation?
- Trail effect vs burst effect?

### Integration Points
- Ensure particles stop when player lands or slows down
- Consider interaction with existing wall bounce particles
- Particle depth/layering relative to player sprite

## Files to Examine
1. `src/game/Player.ts` - Rotation system and player state
2. `src/game/WallBounceEffects.ts` - Particle system architecture 
3. `src/game/MovementController.ts` - Movement state data
4. `src/game/EventBus.ts` - Communication patterns

## Success Criteria
- Particles appear when player is both moving fast AND spinning
- Particle density scales smoothly with rotation speed
- Particles last ~1 second and clean up properly
- Performance remains stable during high particle counts
- Visual effect enhances the sensation of high-speed spinning without overwhelming other effects