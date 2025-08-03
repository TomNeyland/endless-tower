# Dynamic Rotation Effect System - August 3, 2025

## Summary
Implemented Icy Tower-style spinning effects that trigger on both momentum exchange jumps and wall bounces, providing satisfying visual feedback for skilled play. The system captures initial momentum and maintains rotation throughout air time.

## Implementation Overview

### Dual Momentum Triggers
**Jump-Based Rotation**: Uses initial vertical speed from momentum exchange jumps
**Wall Bounce Rotation**: Uses redirected horizontal speed from wall bounces

Both events can trigger or retrigger spinning, creating dynamic visual feedback that scales with momentum.

### Technical Architecture
```typescript
// Capture momentum events via EventBus
EventBus.on('player-jumped', this.onJump.bind(this));
EventBus.on('player-wall-bounce', this.onWallBounce.bind(this));

// Store initial momentum for entire air time
private lastJumpVerticalSpeed: number = 0;

// Rotation calculation with exponential scaling
const speedRatio = (speed - threshold) / (maxSpeed - threshold);
const exponentialRatio = Math.pow(speedRatio, 1.5); // Gentle at low end, dramatic at high end
const rotationSpeed = exponentialRatio * 35.0; // Max ~5.6 rotations/second
```

### Rotation Characteristics
- **Threshold**: 400 speed (accessible to most momentum events)
- **Scaling**: Exponential curve (1.5 exponent) - gentle initially, dramatic at high speeds
- **Direction**: Follows player facing direction (predictable, controlled by input)
- **Duration**: Maintains throughout entire air time (not affected by gravity decay)
- **Max Speed**: 35 rad/sec (~5.6 rotations/second at peak momentum

## Key Design Decisions

### 1. Initial Momentum Capture
**Problem**: Using current velocity causes rotation to stop immediately due to gravity
**Solution**: Capture initial jump/bounce momentum and use it throughout air time

### 2. Facing Direction vs Movement Direction
**Choice**: Rotation direction based on player facing, not movement direction
**Rationale**: More predictable and controllable - player determines spin direction through input

### 3. Exponential Scaling Curve
**Tested**: Linear (too weak at low end), square root (too strong initially), exponential 1.5 (perfect)
**Result**: Gentle spinning at low speeds builds to dramatic cartwheels at high momentum

### 4. Dual Trigger System
**Jump Triggers**: Big momentum exchange jumps create sustained spinning
**Wall Bounce Triggers**: High-speed redirects can retrigger or modify spinning mid-air

## Gameplay Impact

### Visual Feedback for Skill
- **Casual play**: Little to no spinning (normal jumps, low speeds)
- **Intermediate**: Occasional spinning on good momentum jumps
- **Advanced**: Regular spinning from wall bounce chains and momentum building
- **Expert**: Dramatic sustained spinning from high-speed momentum exchange sequences

### Psychological Effect
The spinning provides immediate, satisfying feedback for:
- Successfully building high speeds through wall bouncing
- Executing big momentum exchange jumps
- Chaining momentum events (wall bounce → jump, jump → wall bounce)

### Integration with Other Systems
- **Momentum Exchange**: Higher jump speeds create more dramatic spinning
- **Wall Bounces**: Redirected speed can trigger spinning even without jumping
- **Skill Progression**: Visual complexity scales with player skill development

## Technical Lessons

### 1. Event-Driven Momentum Capture
Using EventBus to capture initial momentum at the moment of generation (jump/bounce) rather than sampling current velocity provides consistent behavior throughout air time.

### 2. Exponential Curve Tuning
Small changes in exponent dramatically affect feel:
- 0.3 exponent: Too strong initially
- 0.5 exponent: Still too aggressive at low speeds  
- 1.5 exponent: Perfect balance of gentle start, dramatic scaling

### 3. State Management
Proper cleanup and reset when landing prevents state pollution between air sequences.

## Future Enhancements

### 1. Momentum Combination
Currently jump and wall bounce events overwrite each other. Could implement:
- Additive momentum (combine jump + bounce speeds)
- Momentum decay over time
- Different rotation effects for different momentum sources

### 2. Visual Polish
- Particle trails that scale with rotation speed
- Screen effects for extremely high rotation speeds
- Audio pitch changes based on rotation intensity

### 3. Gameplay Integration
- Combo multipliers for sustained high-speed rotation
- Landing bonuses based on rotation accumulated during air time
- Special effects for rotation speed milestones

## Performance Considerations
The rotation calculation is lightweight (simple math per frame) and only active during air time. EventBus communication adds minimal overhead for momentum capture events.

## Player Reception Indicators
Based on development testing, the system successfully provides:
- **Immediate satisfaction**: Spinning starts quickly when momentum is achieved
- **Skill expression**: Advanced techniques produce visually impressive effects  
- **Intuitive control**: Facing direction makes spin direction predictable
- **Authentic feel**: Matches the satisfying Icy Tower aesthetic

The rotation system enhances the momentum-building gameplay loop without adding complexity to the core mechanics.