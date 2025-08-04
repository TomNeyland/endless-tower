# Miscellaneous TODO Items

This document tracks major enhancements, fixes, and new features needed to evolve the Icy Tower MVP into a production-quality game. Items are organized by category and priority.

## 🔴 Critical Issues Requiring Immediate Attention

### Wall Bounce System
- [x] **Wall bounce mechanics are fundamentally broken** - requires research to determine intended behavior
- [x] Current timing-based system needs complete rework
- [x] Collision detection with walls may have core issues
- [x] Momentum preservation calculations need verification
- [x] Input timing windows may be incorrectly implemented

### Core System Stability
- [ ] **Value tuning across all systems** - physics parameters, scoring, timing windows all need balancing
- [ ] Configuration values were set during development and haven't been properly tuned for gameplay

## 🟡 Major Feature Gaps

### Audio System
- [ ] **Background music system** - need dynamic music that adapts to gameplay intensity
- [ ] **Enhanced sound effects library** - current sounds are basic placeholder effects
- [ ] **Spatial audio** - sound positioning and effects based on player movement and speed
- [ ] **Audio mixing and mastering** - proper volume balancing and audio processing

### Visual Effects & Polish
- [ ] **Particle systems** - effects for jumps, landings, wall bounces, speed bursts
- [x] **Player visual effects** - spinning animation and sparkle emissions when moving at high speed
- [ ] **Dynamic color coding not working for particles** - spinning particle trail colors need to change based on rotation intensity
- [ ] **Screen effects** - enhanced camera shake, screen flash, post-processing effects
- [ ] **Visual feedback systems** - better indication of successful combos, perfect timing, etc.

### Animation System
- [ ] **Enhanced player animations** - current system is basic and lacks polish
- [ ] **Smooth animation transitions** - better blending between movement states
- [ ] **Dynamic animations** - speed-based animation variations, impact animations
- [ ] **Environmental animations** - animated backgrounds, platform effects, ambient movement

### Platform Variety & Biome System
- [ ] **Biome changes every 100 levels** - different visual themes at checkpoint intervals
- [ ] **Platform type variety** - different platform materials, sizes, and behaviors
- [ ] **Smart difficulty scaling** - platforms become smaller, sparser, and more vertically spread at higher levels
- [ ] **Environmental hazards** - moving platforms, breakable platforms, boost platforms

## 🟢 Enhancement & Polish

### User Interface
- [ ] **Combo UI improvements** - current combo display needs significant enhancement
- [ ] **Main menu system** - proper game start, settings, and navigation
- [ ] **Pause/resume functionality** - in-game pause menu with options
- [ ] **Game over screen** - proper restart and score display
- [ ] **Settings menu** - audio, video, control customization
- [ ] **HUD polish** - better visual design for score, height, and combo displays

### Gameplay Systems
- [ ] **Enhanced combo system** - current implementation is rudimentary and needs expansion
- [ ] **Achievement system** - unlock conditions, progression tracking, visual rewards
- [ ] **Leaderboard/high score system** - persistent score tracking and comparison
- [ ] **Multiple difficulty modes** - preset configurations for different skill levels
- [ ] **Tutorial system** - guided introduction to game mechanics

### Technical Improvements
- [ ] **Performance profiling** - identify and optimize bottlenecks
- [ ] **Memory management** - optimize object pooling and garbage collection
- [ ] **Loading screens** - proper asset loading with progress indication
- [ ] **Error handling** - graceful handling of edge cases and errors
- [ ] **Save system** - persistent settings and progress storage
- [ ] **Scale-agnostic player scaling system** - current scaling system has hardcoded offsets tuned for 0.7 scale only; changing scale factor breaks sprite/hitbox alignment and requires manual re-tuning. See `progress-logs/2025-08-04-PLAYER_SCALING_SYSTEM.md` for detailed analysis and potential solutions.
- [ ] **Remove redundant ScoreSystem combo logic** - ScoreSystem contains old combo/multiplier code that duplicates ComboSystem functionality. See `progress-logs/2025-08-04-UI_MULTIPLIER_FIX.md` for context.

### Platform Generation Intelligence
- [ ] **Procedural difficulty curves** - smart algorithms for platform placement based on height
- [ ] **Skill-based generation** - platform layouts that encourage and reward skill development
- [ ] **Jump distance calculations** - ensure platforms are always reachable with proper momentum
- [ ] **Variety algorithms** - prevent repetitive patterns in platform generation

### Input & Accessibility
- [ ] **Gamepad support** - console controller integration
- [ ] **Mobile/touch controls** - responsive touch input for mobile devices
- [ ] **Accessibility features** - colorblind support, audio cues, customizable controls
- [ ] **Input rebinding** - customizable key mapping

### Advanced Visual Features
- [ ] **Dynamic lighting** - atmospheric lighting effects based on height/biome
- [ ] **Parallax backgrounds** - multi-layer background scrolling for depth
- [ ] **Weather effects** - environmental ambiance (rain, snow, wind)
- [ ] **Post-processing pipeline** - bloom, depth of field, color grading

## 🔵 Future Considerations

### Content Expansion
- [ ] **Multiple characters** - different player characters with unique abilities
- [ ] **Power-up system** - temporary abilities and enhancements
- [ ] **Seasonal events** - time-limited content and challenges
- [ ] **Community features** - screenshot sharing, replay system

### Technical Architecture
- [ ] **Multiplayer foundation** - networking infrastructure for future multiplayer modes
- [ ] **Analytics integration** - player behavior tracking and gameplay metrics
- [ ] **A/B testing framework** - system for testing different configurations
- [ ] **Localization support** - multi-language text and audio support

### Platform Considerations
- [ ] **Mobile optimization** - performance tuning for mobile devices
- [ ] **Console adaptation** - potential console release preparation
- [ ] **Web optimization** - browser compatibility and performance
- [ ] **Progressive Web App** - offline capabilities and app-like experience

## Priority Guidelines

- **🔴 Critical**: Must be fixed/implemented before any production release
- **🟡 Major**: Significantly impacts game quality and player experience
- **🟢 Enhancement**: Improves polish and completeness
- **🔵 Future**: Nice-to-have features for potential future releases

## Notes

This list represents the gap between the current MVP state and a production-ready game. While the core mechanics are functional, substantial work remains across all aspects of the game - visual, audio, gameplay, and technical polish.

The current codebase provides a solid foundation with good architecture, but each system needs refinement, tuning, and enhancement to deliver a compelling player experience matching the quality expectations of modern indie games.