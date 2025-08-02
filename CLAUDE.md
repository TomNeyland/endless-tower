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

## Project Overview

This is an Angular 19 + Phaser 3 game template project that demonstrates communication between Angular components and Phaser game scenes. It's based on the official Phaser Angular template and is being developed into an Icy Tower clone using Kenney's platformer assets.

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

### Project Structure
```
src/
├── app/                    # Angular components
│   ├── app.component.ts    # Root component with Phaser integration example
│   └── phaser-game.component.ts  # Phaser bridge component
├── game/                   # Phaser game code
│   ├── main.ts            # Game configuration
│   ├── EventBus.ts        # Angular-Phaser communication
│   └── scenes/            # Phaser scenes
│       └── Game.ts        # Main game scene
public/assets/              # Game assets (images, audio, etc.)
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