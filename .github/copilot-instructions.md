# Endless Tower - Icy Tower Clone

Endless Tower is an Angular 19 + Phaser 3 game implementing an Icy Tower clone with momentum-based physics, combo systems, and infinite procedural generation. The project is a **playable MVP** with core mechanics functional but requiring substantial enhancement and polish.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Bootstrap & Build Commands

**CRITICAL: All builds complete successfully. NEVER CANCEL long-running commands.**

### Essential Setup Commands
```bash
# Install dependencies (takes ~2 minutes)
npm install
# NEVER CANCEL: Takes 1-2 minutes. Wait for completion.

# Development server (with Phaser Studio logging)
npm run dev
# Development server (no logging) - RECOMMENDED
npm run dev-nolog
# NEVER CANCEL: Server starts in ~12 seconds, runs on http://localhost:4200

# Production build (with logging)  
npm run build
# Production build (no logging) - RECOMMENDED
npm run build-nolog
# NEVER CANCEL: Takes ~17 seconds. Set timeout to 60+ seconds minimum.
```

### Build Timing Expectations
- **Dependencies (`npm install`)**: 1-2 minutes - NEVER CANCEL
- **Production Build**: ~17 seconds - NEVER CANCEL  
- **Development Server**: ~12 seconds to start - NEVER CANCEL
- **Development Build**: ~12 seconds initial + hot reload - NEVER CANCEL

### Output Locations
- **Development**: http://localhost:4200 (with hot reload)
- **Production Build**: `dist/endless-tower/browser/` (2.49 MB total)
- **Static Assets**: Served from `public/assets/` → `dist/endless-tower/browser/assets/`

## Testing & Validation

### Test Status
- **Test Infrastructure**: Angular/Karma configured, no test files exist
- **Test Command**: NOT available (`npm test` missing from package.json)
- **Angular Test**: `npx ng test --no-watch --browsers=ChromeHeadless` fails due to no test files
- **Linting**: Not configured (`ng add angular-eslint` to add ESLint)

### Manual Validation Requirements
**ALWAYS validate your changes using these complete user scenarios:**

1. **Fresh Application Load**:
   ```bash
   npm run dev-nolog
   # Navigate to http://localhost:4200
   # Verify: Game loads to menu screen with title, powerups preview, controls info
   ```

2. **Menu → Game Transition**:
   ```bash
   # Press Space or any key in menu
   # Verify: Smooth transition to game scene, player spawns, game systems initialize
   ```

3. **Player Controls**:
   ```bash
   # Use Arrow Keys or WASD for movement
   # Use Space/Up for jumping
   # Verify: Player responds to input, momentum-based physics work
   ```

4. **Game Mechanics**:
   ```bash
   # Test jumping between platforms
   # Test wall bouncing mechanics  
   # Verify: Scoring system, combo system, platform generation all functional
   # Check browser console - game has extensive logging (momentum, combos, wall bounces, etc.)
   ```

### Validation Commands
```bash
# Start development server and test manually
npm run dev-nolog

# Build and serve production version for testing  
npm run build-nolog
cd dist/endless-tower/browser
python3 -m http.server 8080
# Navigate to http://localhost:8080
```

## Project Architecture

### Angular-Phaser Integration
- **Bridge Component**: `src/app/phaser-game.component.ts` - Creates Phaser game instance
- **Event System**: `src/game/EventBus.ts` - Bidirectional Angular ↔ Phaser communication
- **Game Entry**: `src/game/main.ts` - Phaser game configuration

### Key Directories
```
src/
├── app/                         # Angular components
│   ├── app.component.ts         # Root component with Phaser integration
│   └── phaser-game.component.ts # Phaser bridge component
├── game/                        # Phaser game code (fully implemented)
│   ├── main.ts                  # Game configuration
│   ├── EventBus.ts             # Angular-Phaser communication
│   ├── Player.ts               # Player character with physics
│   ├── MovementController.ts    # Movement physics and controls
│   ├── PlatformManager.ts       # Infinite platform generation
│   ├── WallManager.ts          # Wall generation system
│   ├── CameraManager.ts        # Camera control system
│   ├── ScoreSystem.ts          # Height-based scoring
│   ├── ComboSystem.ts          # Combo detection and chaining
│   └── scenes/Game.ts          # Main game scene
public/assets/                   # Game assets (Kenney pack)
```

### Important Files to Know
- **Game Configuration**: `src/game/GameConfiguration.ts` - Central config for all systems
- **Assets**: `public/assets/kenney_new-platformer-pack-1.0/` - Complete asset pack
- **Build Config**: `angular.json` - Bundle size limits (5MB max)
- **Project Dependencies**: `package.json` - Angular 19 + Phaser 3 + TypeScript

## Development Workflow

### Making Changes
1. **Always run the working validation steps before making changes**
2. **Make minimal changes** - this is a working game, preserve functionality
3. **Build and test frequently**:
   ```bash
   npm run build-nolog  # Verify builds successfully
   npm run dev-nolog    # Test changes manually in browser
   ```
4. **Check console logs** - game has extensive logging for debugging:
   - Physics: "🚀 Momentum exchange jump", "🌪️ Jump-based rotation"  
   - Wall Bounces: "🚀 WALL BOUNCE EXECUTED", "⚡ Calculated efficiency"
   - Combos: "🔥 COMBO EVENT ADDED", "✅ COMBO COMPLETED"
   - Platforms: "🗑️ Deleted platform", "🏁 Checkpoint created"
   - Biomes: "🌍 Biome transition", "🎨 Biome changed"

### Common Development Tasks
```bash
# Start development with hot reload
npm run dev-nolog

# Add new Phaser scenes (remember to emit EventBus events)
# Edit src/game/scenes/ and add to src/game/main.ts

# Modify game mechanics
# Edit relevant system files in src/game/

# Change assets 
# Add to public/assets/ (automatically copied to dist/)

# Update UI/Angular components
# Edit src/app/ files
```

### Angular-Phaser Communication Pattern
```typescript
// From Angular to Phaser
EventBus.emit('event-name', data);

// From Phaser to Angular - emit when scene is ready
EventBus.emit('current-scene-ready', this);

// Handle in Angular component
EventBus.on('event-name', (data) => {
    // Handle event
});
```

## Known Issues & Limitations

### Current State
- **Core Game**: ✅ Fully functional MVP
- **Test Suite**: ❌ Not implemented (infrastructure exists)
- **Linting**: ❌ Not configured
- **Production Polish**: ⚠️ Basic but functional

### Console Warnings (Non-Critical)
- **OneWayPlatform errors**: Platform group children undefined (doesn't break gameplay)
- **CommonJS warnings**: eventemitter3 dependency (build optimization warning)
- **Deprecation warnings**: rimraf, inflight, glob (npm dependency warnings)

### What Works Perfectly
- **Build System**: All commands work reliably
- **Game Mechanics**: Complete Icy Tower gameplay implemented
- **Physics**: Momentum-based jumping and wall bouncing
- **Infinite Generation**: Platforms, walls, and biome systems
- **Scoring & Combos**: Real-time scoring with multipliers
- **User Input**: Responsive keyboard controls (Arrow keys/WASD/Space)
- **Asset Loading**: Kenney platformer pack fully integrated

## Asset Management

### Kenney New Platformer Pack 1.0
Located at: `public/assets/kenney_new-platformer-pack-1.0/`

**Asset Structure**:
- **Sprites/**: Individual PNG images by category
- **Spritesheets/**: Atlas textures with XML metadata
- **Vector/**: SVG versions  
- **Sounds/**: OGG audio files

**Loading Pattern**:
```typescript
// Individual sprites
this.load.image('player-idle', 'assets/kenney_new-platformer-pack-1.0/Sprites/Characters/Default/character_beige_idle.png');

// Spritesheets (recommended for animations)
this.load.atlas('characters', 
  'assets/kenney_new-platformer-pack-1.0/Spritesheets/spritesheet-characters-default.png',
  'assets/kenney_new-platformer-pack-1.0/Spritesheets/spritesheet-characters-default.xml'
);
```

## Emergency Troubleshooting

### Build Failures
```bash
# Clean install if build fails
rm -rf node_modules package-lock.json
npm install
npm run build-nolog
```

### Development Server Issues  
```bash
# Kill existing servers and restart
pkill -f "ng serve"
npm run dev-nolog
```

### Game Not Loading
1. Check browser console for errors
2. Verify assets loading (Network tab)
3. Check EventBus communication in console logs
4. Ensure Phaser scenes emit 'current-scene-ready' events

### Asset Loading Issues
- Assets must be in `public/assets/` to be served
- Use relative paths like `'assets/filename.ext'` in Phaser loaders
- Check browser Network tab for 404s

Remember: This is a **working game**. When in doubt, validate your changes work by playing through the complete user scenario (menu → game → controls → mechanics).