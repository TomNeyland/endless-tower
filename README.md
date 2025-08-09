# 🏗️ Endless Tower

**An addictive Icy Tower clone that will test your precision, timing, and strategic thinking!**

Endless Tower is a fast-paced vertical platformer built with Angular 19 + Phaser 3, featuring momentum-based physics, wall bouncing mechanics, and an innovative combo system. Climb as high as you can while the deadly line rises below you!

## 🎮 Game Features

- **🎯 Momentum-Based Physics**: Master the art of building and maintaining speed for massive jumps
- **🧱 Wall Bouncing**: Ricochet off walls with perfect timing to reach incredible heights  
- **⚡ Combo System**: Chain moves together for massive score multipliers
- **🏃‍♂️ Death Line**: Stay ahead of the rising danger zone that forces constant upward movement
- **🎁 Power-up System**: Collect game-changing abilities like Super Spring, Wall Grip, and Momentum Lock
- **🌍 Dynamic Biomes**: Experience different visual themes as you climb higher
- **♾️ Infinite Generation**: Procedurally generated platforms ensure every run is unique

## 📸 Screenshots

### Main Menu
![Menu Screen](https://github.com/user-attachments/assets/6784e881-5f80-4a6f-b40d-291a11612091)

### Gameplay
![Gameplay](https://github.com/user-attachments/assets/1fa9aa20-1859-4ed4-b6cf-42fe5adb6e43)

## 🎯 How to Play

### Core Strategy

**The secret to Endless Tower is building and maintaining horizontal momentum:**

1. **Build Speed First**: Use the bottom platforms to gain horizontal velocity
2. **Time Your Jumps**: Jump at the peak of your horizontal speed for maximum height
3. **Master Wall Bouncing**: Hit walls at the right angle and timing to redirect your momentum upward
4. **Chain Combos**: Link wall bounces, platform jumps, and air time for score multipliers
5. **Stay Above the Death Line**: The orange line rises constantly - keep climbing!

### Advanced Techniques

- **Momentum Exchange**: Higher horizontal speed = higher jumps due to the physics system
- **Wall Bounce Timing**: Perfect timing gives better efficiency and vertical boost
- **Combo Chaining**: Chain multiple moves within 2.5 seconds to maintain your combo multiplier
- **Power-up Strategy**: Save powerful power-ups like "Momentum Lock" for crucial moments

## 🎮 Controls

| Input | Action |
|-------|--------|
| **Arrow Keys** or **WASD** | Move left/right |
| **Space** or **Up Arrow** | Jump |
| **Any Key** | Start game from menu |

## 🎁 Power-ups

Master these game-changing abilities:

- **🔷 Velocity Gem**: +50% movement speed
- **🌿 Super Spring**: +250% jump power  
- **⭐ Chain Master**: 2x combo multiplier
- **❤️ Guardian Shield**: Death line immunity
- **🗝️ Air Walker**: Grants double jump
- **🔑 Wall Grip**: Perfect wall bounce timing window
- **💰 Midas Touch**: Double score from combos
- **💎 Bouncy Platforms**: All landings boost jump height
- **🔒 Momentum Lock**: Horizontal momentum never decreases
- **🥈 Score Storm**: 3x points from height gains

## 🚀 Quick Start

### Playing the Game

1. **[Play Online]** - [Coming Soon - Link to deployed version]
2. **Run Locally**:
   ```bash
   npm install
   npm run dev-nolog
   ```
   Open http://localhost:4200 and start climbing!

### Development Setup

**Requirements:**
- [Node.js](https://nodejs.org) (for dependencies and build tools)
- [Angular CLI](https://angular.io/cli): `npm install -g @angular/cli`

**Available Commands:**

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies |
| `npm run dev-nolog` | Launch development server (Recommended) |
| `npm run build-nolog` | Create production build |
| `npm run dev` | Development server with analytics |
| `npm run build` | Production build with analytics |

The development server runs on `http://localhost:4200` with hot reload enabled.

## 🛠️ Technical Details

### Architecture

Endless Tower uses a modern Angular + Phaser hybrid architecture:

- **Frontend**: Angular 19.2.0 with standalone components
- **Game Engine**: Phaser 3.90.0 for physics and rendering  
- **Language**: TypeScript 5.7.2 for type safety
- **Communication**: EventBus system for Angular ↔ Phaser integration

### Project Structure

| Path | Description |
|------|-------------|
| `src/game/` | Core game systems (physics, platforms, combos) |
| `src/app/` | Angular components and UI |
| `public/assets/` | Game sprites and audio (Kenney asset pack) |
| `src/game/scenes/` | Phaser game scenes |
| `src/game/EventBus.ts` | Angular ↔ Phaser communication bridge |

### Key Game Systems

- **MovementController**: Momentum-based physics engine
- **PlatformManager**: Infinite procedural platform generation  
- **ComboSystem**: Chaining system with multipliers
- **PowerupManager**: Collectible abilities system
- **BiomeManager**: Dynamic visual themes
- **WallManager**: Wall bounce mechanics

## 🤝 Contributing

Interested in contributing? Great! Here are some areas where help is welcomed:

- 🎮 **New Power-ups**: Design and implement unique abilities
- 🌍 **Additional Biomes**: Create new visual themes and environments  
- 🎵 **Audio**: Sound effects and background music
- 🎨 **Visual Effects**: Particle systems and animations
- 🏆 **Features**: Leaderboards, achievements, game modes

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Ready to climb?** Start your ascent and see how high you can reach! 🏗️⬆️
