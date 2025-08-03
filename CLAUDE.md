# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Game Concept: Icy Tower Clone

This project aims to implement a clone of **Icy Tower**, a classic endless platformer game. The core gameplay mechanics include:

- **Endless Vertical Climbing**: Player jumps up an infinitely tall tower made of platforms
- **Momentum-Based Physics**: Horizontal movement speed affects jump distance and height
- **Combo System**: Chaining jumps without touching the ground increases score multipliers
- **Rising Floor**: The bottom of the screen gradually rises, forcing continuous upward movement
- **Physics-Driven Movement**: Jump height and distance depend on horizontal velocity when jumping
- **Score System**: Points awarded for height reached and combo multipliers

The original Icy Tower featured simple but addictive mechanics where building momentum through left/right movement allows for spectacular multi-floor jumps, creating a satisfying risk/reward dynamic.

## Progress Logs

Development progress, experiments, and technical insights are documented in `progress-logs/` directory. These logs capture institutional knowledge about what was tried, what worked, what didn't, and why.

**Naming Convention**: `YYYY-MM-DD-DESCRIPTIVE_TITLE.md`
**Content Guidelines**: 
- Document both successful and failed approaches with technical details
- Include code examples of problematic patterns and their solutions  
- Explain gotchas that made approaches seem broken when they weren't
- Provide specific retry steps for inconclusive experiments
- Focus on technical lessons that help future developers avoid the same pitfalls

## Project Overview

This is an **MVP-complete Icy Tower clone** built with Angular 19 + Phaser 3. The project has evolved from a basic template into a functional platformer game with core mechanics implemented. While the fundamental game systems are working, significant polish, content expansion, and system refinement work remains to achieve a production-quality experience.

**Current Status**: Playable MVP with core mechanics functional but requiring substantial enhancement and polish.

## Essential Commands

```bash
# Install dependencies
npm install

# Development server (includes anonymous usage logging)
npm run dev

# Development server (no logging)
npm run dev-nolog

# Production build (includes anonymous usage logging)
npm run build

# Production build (no logging)
npm run build-nolog

# Run tests
ng test
```

**Note:** The `dev` and `build` commands include a `log.js` script that sends anonymous usage data to Phaser Studio. Use the `-nolog` variants to disable this.

## Architecture

### Angular-Phaser Integration
- **Bridge Component**: `src/app/phaser-game.component.ts` - Creates and manages the Phaser game instance
- **Event System**: `src/game/EventBus.ts` - Singleton EventEmitter for bidirectional Angular ↔ Phaser communication
- **Game Entry Point**: `src/game/main.ts` - Phaser game configuration and initialization

### Key Integration Patterns
1. **Scene Ready Events**: Phaser scenes must emit `'current-scene-ready'` via EventBus when initialized
2. **Component References**: Use Angular's `viewChild.required(PhaserGame)` to access game/scene instances
3. **Asset Loading**: Static assets go in `public/assets/` and are referenced as `'assets/filename.ext'`

### Current Project Structure
```
src/
├── app/                         # Angular components
│   ├── app.component.ts         # Root component with Phaser integration
│   └── phaser-game.component.ts # Phaser bridge component
├── game/                        # Phaser game code (fully implemented)
│   ├── main.ts                  # Game configuration and initialization
│   ├── EventBus.ts             # Angular-Phaser communication system
│   ├── GameConfiguration.ts     # Centralized configuration management
│   ├── Player.ts               # Player character with physics and animation
│   ├── MovementController.ts    # Advanced movement physics and controls
│   ├── PlatformManager.ts       # Infinite platform generation and lifecycle
│   ├── WallManager.ts          # Infinite wall generation system
│   ├── WallCollision.ts        # Wall collision detection and effects
│   ├── CameraManager.ts        # Sophisticated camera control system
│   ├── DeathLine.ts            # Rising death line with delayed activation
│   ├── ScoreSystem.ts          # Height-based scoring with milestones
│   ├── ComboSystem.ts          # Multi-type combo detection and chaining
│   ├── WallBounceEffects.ts    # Wall bounce mechanics with timing
│   ├── OneWayPlatform.ts       # One-way platform collision system
│   ├── GameUI.ts               # Real-time game UI and HUD
│   ├── DebugUI.ts              # Comprehensive debug overlay
│   └── scenes/                 # Phaser scenes
│       └── Game.ts             # Main game scene orchestrator
public/assets/                   # Game assets
└── kenney_new-platformer-pack-1.0/  # Kenney's platformer asset pack
```

## Development Guidelines

### Adding New Phaser Scenes
1. Create scene class extending `Phaser.Scene`
2. Emit `EventBus.emit('current-scene-ready', this)` when scene is ready
3. Add scene to the scenes array in `src/game/main.ts`

### Angular-Phaser Communication
```typescript
// From Angular to Phaser
EventBus.emit('event-name', data);

// From Phaser to Angular
EventBus.on('event-name', (data) => {
    // Handle event
});
```

### TypeScript Configuration
- Strict mode enabled with Angular compiler optimizations
- Target: ES2022 with bundler module resolution
- Phaser dependency allowed as CommonJS in Angular build config

## Build Configuration

The project uses Angular CLI with custom configuration:
- Bundle size limits: 5MB max (5000kb warning)
- Static assets automatically copied from `public/` to `dist/browser/assets/`
- Development server runs on default Angular port (4200)
- Production builds output to `dist/template-angular/`

## Kenney New Platformer Pack 1.0

The project uses **Kenney's New Platformer Pack 1.0**, a comprehensive 2D platformer asset collection located at `public/assets/kenney_new-platformer-pack-1.0/`. This pack provides all the visual and audio assets needed for the Icy Tower clone.

### Asset Organization

The asset pack is organized into multiple formats and resolutions:

#### Main Categories
- **Sprites/**: Individual PNG images organized by category
  - **Backgrounds/**: Scrolling backgrounds (clouds, desert, hills, mushrooms, trees, solid colors)
  - **Characters/**: Player character sprites in 5 colors (beige, green, pink, purple, yellow)
    - Animation states: idle, walk (a/b), jump, duck, climb (a/b), hit, front
  - **Tiles/**: Platform and environment elements
    - Terrain: grass, dirt, purple block systems with all edge pieces
    - Platforms: various block types, bridges, planks
    - UI: HUD elements, numbers, player indicators

#### Alternative Formats
- **Spritesheets/**: Atlas textures with XML metadata for efficient loading
  - Available for all categories in default and double resolution
- **Vector/**: SVG versions of all sprites for scalability
- **Sounds/**: OGG audio files for common platformer actions
  - Jump sounds (normal and high), basic game audio effects

### Asset Path Reference
Assets are loaded using the path pattern: `'assets/kenney_new-platformer-pack-1.0/[category]/[resolution]/[filename]'`

Examples:
```typescript
// Character sprites
this.load.image('player-idle', 'assets/kenney_new-platformer-pack-1.0/Sprites/Characters/Default/character_beige_idle.png');

// Platform tiles  
this.load.image('platform', 'assets/kenney_new-platformer-pack-1.0/Sprites/Tiles/Default/terrain_grass_cloud_middle.png');

// Audio
this.load.audio('jump', 'assets/kenney_new-platformer-pack-1.0/Sounds/sfx_jump.ogg');

// Spritesheets (recommended for animations)
this.load.atlas('characters', 
  'assets/kenney_new-platformer-pack-1.0/Spritesheets/spritesheet-characters-default.png',
  'assets/kenney_new-platformer-pack-1.0/Spritesheets/spritesheet-characters-default.xml'
);
```

### Recommended Assets for Icy Tower
For the Icy Tower clone implementation, focus on:
- **Player**: `character_*_idle.png`, `character_*_jump.png`, `character_*_walk_*.png`
- **Platforms**: `terrain_grass_cloud_*.png` series for floating platforms
- **Background**: `background_solid_sky.png` or `background_clouds.png`
- **Audio**: `sfx_jump.ogg` for jump feedback
- **UI**: `hud_character_*.png` for score display

## Kenney Asset Management Reminders

- **ASSETS_README.md**: Refer to this file often when working with game assets to understand their structure and usage

## Current Game Systems Implementation

The Icy Tower clone has **core MVP systems implemented** with fundamental mechanics working but requiring significant enhancement:

### Core Game Systems

#### 1. Configuration Management (`GameConfiguration.ts`)
- **Centralized configuration system** with TypeScript interfaces for type safety
- Modular configuration sections: Physics, Platforms, Combos, Camera, Walls
- Runtime configuration updates with live parameter tuning
- Advanced physics calculations including jump metrics and gap reachability analysis
- Default configuration optimized for Icy Tower gameplay mechanics

#### 2. Player System (`Player.ts`)
- **Phaser Arcade Physics-based player** with custom physics body configuration
- Complete sprite animation system with idle, walk, and jump states
- Audio integration with jump sound effects
- Dual input support: Arrow keys and WASD controls
- Advanced movement state management with grounding detection

#### 3. Advanced Movement Physics (`MovementController.ts`)
- **Momentum-based jumping system**: Jump height increases with horizontal speed
- Configurable momentum coupling factor (v_y = v_y0 + k * |v_x|)
- Realistic acceleration/deceleration with drag simulation
- Jump buffering and coyote time mechanics for responsive controls
- **Wall bounce system** with precise timing windows and momentum preservation

#### 4. Infinite Platform Generation (`PlatformManager.ts`)
- **Procedural infinite platform generation** triggered by camera position
- Performance-optimized cleanup system with distance-based management
- **Checkpoint platform system**: Wall-to-wall safe platforms every 100 platforms
- Dynamic platform width and positioning variation for gameplay variety
- Event-driven platform lifecycle with proper collision cleanup

#### 5. Wall System (`WallManager.ts`, `WallCollision.ts`)
- **Infinite wall generation** matching camera position for seamless experience
- Segmented wall architecture with tile-based rendering for performance
- Wall collision detection with speed thresholds and timing mechanics
- **Timing-based wall bounce system**:
  - Perfect timing (50ms): 110% momentum preservation + vertical boost
  - Good timing: 90% momentum preservation
  - Late timing: 80% momentum preservation

#### 6. Advanced Camera System (`CameraManager.ts`)
- **Multi-mode camera control** with smooth transitions:
  - Built-in Phaser following during initial climbing phase
  - Custom auto-scroll system after death line activation
  - Player deadzone management for smooth movement without jarring
- Height tracking with personal record keeping
- **Unified camera control** preventing snap/discontinuity issues during descent

#### 7. Death Line System (`DeathLine.ts`)
- **Smart delayed activation** based on time (30 seconds) OR height (300px)
- Rising death line with comprehensive visual warning system
- Proximity-based warning messages with escalating urgency levels
- Visual effects including pulsing death line, warning zones, and screen effects
- Game over detection with camera shake and fade effects

#### 8. Scoring System (`ScoreSystem.ts`)
- **Height-based scoring** with milestone bonus rewards
- Multiplier system integration with combo bonuses
- Achievement milestones: 100m, 250m, 500m, 1km, 2km, 5km, 10km
- Event-driven score updates with real-time UI synchronization

#### 9. Comprehensive Combo System (`ComboSystem.ts`)
- **Multi-type combo detection** with sophisticated chaining:
  - Wall bounces (regular and perfect timing variants)
  - Multi-platform jumps (2+ platforms without touching ground)
  - Air time combos (sustained flight time of 1+ seconds)
  - Speed bonuses for high-velocity climbing
- **Combo chaining** with timeout windows (2.5 seconds between events)
- Exponential scoring with multipliers up to 5.0x
- Visual feedback system with combo display and completion effects

#### 10. User Interface Systems (`GameUI.ts`, `DebugUI.ts`)
- **Real-time game HUD** with score display (height, combo, total)
- **Dynamic height tracking** showing current and best height achieved
- **Live combo display** with visual timer bar and multiplier indication
- **Comprehensive debug overlay** with performance metrics and physics tuning
- Real-time configuration adjustment with keyboard shortcuts
- Physics preset system for different gameplay styles

### Technical Implementation Highlights

#### Physics Architecture
- **Momentum-coupled jumping mechanics** with configurable coupling factors
- Realistic acceleration/deceleration simulation with drag coefficients
- **Fixed 60Hz physics timestep** decoupled from render framerate
- Advanced collision detection with velocity-based filtering

#### Performance Optimizations
- **Distance-based generation/cleanup** for platforms and walls
- Object pooling through Phaser's group system for memory efficiency
- Event-driven architecture minimizing expensive polling operations
- Efficient collision detection with directional velocity filtering

#### Game State Management
- **EventBus architecture** for clean Angular-Phaser communication
- Decoupled system communication preventing tight coupling
- Real-time state synchronization across all game systems
- Comprehensive event system for gameplay mechanics

### Current MVP Status

🟡 **Endless Vertical Climbing**: Core infinite platform generation working (needs biome variety and smart difficulty scaling)  
🟡 **Momentum-Based Physics**: Basic momentum coupling implemented (needs tuning and refinement)  
🟢 **Wall Bounce System**: Working timing-based system with momentum preservation and visual effects  
🟡 **Combo System**: Basic detection working (rudimentary implementation, needs significant enhancement)  
🟡 **Rising Death Line**: Core delayed activation working (needs visual polish and effects)  
🟡 **Score System**: Basic height-based scoring functional (needs value tuning and balancing)  
🟡 **Camera Control**: Core smooth following working (minor issues resolved)  
🟡 **Performance**: Basic optimization in place (adequate for MVP, room for improvement)  

### Development Status

The codebase represents a **functional MVP** with:
- Core game mechanics implemented and working
- Basic physics simulation with momentum coupling foundation
- Fundamental UI and debug systems for development
- Basic infinite generation systems
- Rudimentary combo and scoring mechanics as starting point
- Solid code organization with TypeScript interfaces and modular architecture

**Significant work remains** to achieve production quality, including visual polish, content variety, system refinement, audio implementation, advanced effects, and extensive gameplay tuning.

### Outstanding Work

This project has substantial development work remaining. See `MISC_TODO.md` in the repository root for a comprehensive list of enhancements, fixes, and new features needed to reach production quality.