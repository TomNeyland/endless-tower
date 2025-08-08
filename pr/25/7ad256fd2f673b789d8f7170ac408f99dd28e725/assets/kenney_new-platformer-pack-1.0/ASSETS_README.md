# Kenney New Platformer Pack 1.0 - Asset Reference

**License**: Creative Commons Zero (CC0) - Public Domain  
**Source**: kenney.nl  
**Total Assets**: 866 individual files across multiple formats

## Quick Reference

| Category | Default Size | Count | Use Case |
|----------|-------------|-------|----------|
| Backgrounds | 128x128 | 14 | Scene backgrounds, parallax layers |
| Characters | 128x128 | 45 | Player sprites (5 colors × 9 animations) |
| Enemies | 128x128 | 60 | AI opponents, moving obstacles |
| Tiles | 64x64 | 314 | Level geometry, platforms, collectibles |
| Sounds | OGG | 10 | Audio feedback for game actions |

## Directory Structure

```
kenney_new-platformer-pack-1.0/
├── License.txt                 # CC0 License
├── Preview (Backgrounds).png   # Visual preview of backgrounds
├── Preview (Characters).png    # Visual preview of characters  
├── Preview (Tiles).png         # Visual preview of tiles
├── Sample A.png               # Example scene composition
├── Sample B.png               # Example scene composition
├── Sounds/                    # Audio effects (10 OGG files)
├── Sprites/                   # Individual PNG images
│   ├── Backgrounds/
│   │   ├── Default/           # 128x128 background images
│   │   └── Double/            # 256x256 high-res versions
│   ├── Characters/
│   │   ├── Default/           # 128x128 character sprites
│   │   └── Double/            # 256x256 high-res versions
│   ├── Enemies/
│   │   ├── Default/           # 128x128 enemy sprites  
│   │   └── Double/            # 256x256 high-res versions
│   └── Tiles/
│       ├── Default/           # 64x64 tile sprites
│       └── Double/            # 128x128 high-res versions
├── Spritesheets/              # Texture atlases with XML metadata
└── Vector/                    # SVG versions of all sprites
    ├── Backgrounds/
    ├── Characters/
    ├── Enemies/
    └── Tiles/
```

## Audio Assets (/Sounds/)

**Format**: OGG Vorbis  
**File Size**: 5-10 KB each  
**Sample Rate**: 44.1 kHz

| Filename | Purpose | Usage |
|----------|---------|-------|
| `sfx_bump.ogg` | Impact/collision | Object collisions, wall hits |
| `sfx_coin.ogg` | Coin collection | Pickup sound for coins |
| `sfx_disappear.ogg` | Vanishing effect | Teleportation, item disappearing |
| `sfx_gem.ogg` | Gem collection | High-value collectible pickup |
| `sfx_hurt.ogg` | Damage taken | Player takes damage |
| `sfx_jump.ogg` | Standard jump | Basic jump action |
| `sfx_jump-high.ogg` | High jump | Power jump, long jump |
| `sfx_magic.ogg` | Magic effect | Special abilities, power-ups |
| `sfx_select.ogg` | UI selection | Menu navigation, button press |
| `sfx_throw.ogg` | Throwing action | Projectiles, throwing objects |

## Background Assets (/Sprites/Backgrounds/)

**Dimensions**: 128x128 (Default), 256x256 (Double)  
**Format**: PNG  
**Total**: 14 unique backgrounds

### Solid Color Backgrounds
- `background_solid_cloud.png` - Light blue cloud color
- `background_solid_dirt.png` - Brown earth tone
- `background_solid_grass.png` - Green nature color
- `background_solid_sand.png` - Tan desert color
- `background_solid_sky.png` - Blue sky color

### Environmental Scenes
| Theme | Color Variant | Fade Variant |
|-------|---------------|--------------|
| Desert | `background_color_desert.png` | `background_fade_desert.png` |
| Hills | `background_color_hills.png` | `background_fade_hills.png` |
| Mushrooms | `background_color_mushrooms.png` | `background_fade_mushrooms.png` |
| Trees | `background_color_trees.png` | `background_fade_trees.png` |

### Special Backgrounds
- `background_clouds.png` - Floating cloud formations

**Usage Notes**:
- Color variants: Full saturation, good for close backgrounds
- Fade variants: Reduced saturation, ideal for distant parallax layers
- Solid colors: Perfect for simple backgrounds or color overlays

## Character Assets (/Sprites/Characters/)

**Dimensions**: 128x128 (Default), 256x256 (Double)  
**Format**: PNG  
**Total**: 45 sprites (5 colors × 9 animation states)

### Color Variations
- `beige` - Light brown/tan character
- `green` - Green character  
- `pink` - Pink character
- `purple` - Purple character
- `yellow` - Yellow character

### Animation States (per color)
| Animation | Filename Pattern | Usage |
|-----------|------------------|-------|
| Idle | `character_{color}_idle.png` | Standing still |
| Walk A | `character_{color}_walk_a.png` | Walking frame 1 |
| Walk B | `character_{color}_walk_b.png` | Walking frame 2 |
| Jump | `character_{color}_jump.png` | In air, jumping |
| Duck | `character_{color}_duck.png` | Crouching, ducking |
| Climb A | `character_{color}_climb_a.png` | Climbing frame 1 |
| Climb B | `character_{color}_climb_b.png` | Climbing frame 2 |
| Hit | `character_{color}_hit.png` | Taking damage |
| Front | `character_{color}_front.png` | Front-facing view |

**Animation Guidelines**:
- Walk: Alternate between `walk_a` and `walk_b` for walking cycle
- Climb: Alternate between `climb_a` and `climb_b` for ladder climbing
- Use `idle` as default/rest state
- `front` good for character selection screens

## Enemy Assets (/Sprites/Enemies/)

**Dimensions**: 128x128 (Default), 256x256 (Double)  
**Format**: PNG  
**Total**: 60 sprites across 14 enemy types

### Flying Enemies
| Enemy | States | Behavior Pattern |
|-------|--------|------------------|
| **Bee** | `bee_a.png`, `bee_b.png`, `bee_rest.png` | Horizontal flight patterns |
| **Fly** | `fly_a.png`, `fly_b.png`, `fly_rest.png` | Erratic movement |
| **Ladybug** | `ladybug_fly.png`, `ladybug_rest.png`, `ladybug_walk_a.png`, `ladybug_walk_b.png` | Walk/fly hybrid |

### Ground Enemies  
| Enemy | States | Behavior Pattern |
|-------|--------|------------------|
| **Mouse** | `mouse_rest.png`, `mouse_walk_a.png`, `mouse_walk_b.png` | Simple ground patrol |
| **Snail** | `snail_rest.png`, `snail_shell.png`, `snail_walk_a.png`, `snail_walk_b.png` | Slow movement, shell protection |
| **Frog** | `frog_idle.png`, `frog_jump.png`, `frog_rest.png` | Jump-based movement |

### Water Enemies
| Enemy | States | Behavior Pattern |
|-------|--------|------------------|
| **Fish Blue** | `fish_blue_rest.png`, `fish_blue_swim_a.png`, `fish_blue_swim_b.png` | Horizontal swimming |
| **Fish Yellow** | `fish_yellow_rest.png`, `fish_yellow_swim_a.png`, `fish_yellow_swim_b.png` | Horizontal swimming |
| **Fish Purple** | `fish_purple_down.png`, `fish_purple_rest.png`, `fish_purple_up.png` | Vertical movement |

### Slime Enemies (4 variants × 4 states each)
| Variant | States Available |
|---------|------------------|
| **Block** | `slime_block_jump.png`, `slime_block_rest.png`, `slime_block_walk_a.png`, `slime_block_walk_b.png` |
| **Fire** | `slime_fire_flat.png`, `slime_fire_rest.png`, `slime_fire_walk_a.png`, `slime_fire_walk_b.png` |
| **Normal** | `slime_normal_flat.png`, `slime_normal_rest.png`, `slime_normal_walk_a.png`, `slime_normal_walk_b.png` |
| **Spike** | `slime_spike_flat.png`, `slime_spike_rest.png`, `slime_spike_walk_a.png`, `slime_spike_walk_b.png` |

### Mechanical/Trap Enemies
| Enemy | States | Usage |
|-------|--------|-------|
| **Saw** | `saw_a.png`, `saw_b.png`, `saw_rest.png` | Spinning blade trap |
| **Block** | `block_fall.png`, `block_idle.png`, `block_rest.png` | Falling block trap |
| **Barnacle** | `barnacle_attack_a.png`, `barnacle_attack_b.png`, `barnacle_attack_rest.png` | Ceiling-mounted trap |

### Worm Enemies
| Variant | States Available |
|---------|------------------|
| **Normal** | `worm_normal_move_a.png`, `worm_normal_move_b.png`, `worm_normal_rest.png` |
| **Ring** | `worm_ring_move_a.png`, `worm_ring_move_b.png`, `worm_ring_rest.png` |

## Tile Assets (/Sprites/Tiles/)

**Dimensions**: 64x64 (Default), 128x128 (Double)  
**Format**: PNG  
**Total**: 314 unique tiles

### Terrain Systems (Complete Tilesets)

Each terrain type includes a complete tileset with all edge pieces for seamless level construction:

#### Grass Terrain (28 tiles)
**Base Pattern**: `terrain_grass_*`
- **Block System**: Full 3×3 grid with corners and edges
- **Cloud Platforms**: Left, middle, right, background variants
- **Horizontal Platforms**: Standard and overhang varieties  
- **Vertical Walls**: Top, middle, bottom sections
- **Ramps**: Multiple angles (long_a, long_b, long_c, short_a, short_b)

#### Dirt Terrain (28 tiles)
**Base Pattern**: `terrain_dirt_*`
- Same complete tileset as grass, different texture
- Good for underground/cave levels

#### Purple Terrain (28 tiles)  
**Base Pattern**: `terrain_purple_*`
- Magical/fantasy variant of terrain system
- Same tileset structure as grass/dirt

### Platform Elements

#### Basic Blocks
| Type | Pattern | Usage |
|------|---------|-------|
| Colored Blocks | `block_{color}.png` | Blue, green, red, yellow solid blocks |
| Special Blocks | `block_{type}.png` | Coin, exclamation, empty, spikes |
| Strong Blocks | `block_strong_{type}.png` | Reinforced versions with active states |
| Material Blocks | `brick_{material}.png` | Brown/grey bricks, diagonal variants |

#### Bridges and Platforms
- `bridge.png`, `bridge_logs.png` - Spanning platforms
- `block_plank.png`, `block_planks.png` - Wooden platforms

### Interactive Elements

#### Collectibles
| Type | Variants | Pattern |
|------|----------|---------|
| **Coins** | Bronze, Silver, Gold | `coin_{metal}.png`, `coin_{metal}_side.png` |
| **Gems** | Blue, Green, Red, Yellow | `gem_{color}.png` |
| **Keys** | Blue, Green, Red, Yellow | `key_{color}.png` |
| **Hearts** | Health pickup | `heart.png` |
| **Stars** | Special collectible | `star.png` |

#### Mechanisms
| Element | States | Pattern |
|---------|--------|---------|
| **Switches** | 4 colors × 2 states | `switch_{color}.png`, `switch_{color}_pressed.png` |
| **Levers** | 3 positions | `lever.png`, `lever_left.png`, `lever_right.png` |
| **Doors** | Open/closed | `door_open.png`, `door_closed.png`, `*_top.png` variants |
| **Locks** | 4 colors | `lock_{color}.png` |

#### Movement Elements
- **Ladders**: `ladder_top.png`, `ladder_middle.png`, `ladder_bottom.png`
- **Springs**: `spring.png`, `spring_out.png` (compressed/extended)
- **Conveyor**: `conveyor.png` - Moving platform
- **Ropes**: `rope.png`, `rop_attached.png` - Climbing elements

### Hazards
- **Spikes**: `spikes.png` - Ground spikes
- **Lava**: `lava.png`, `lava_top.png`, `lava_top_low.png` - Liquid hazard
- **Bombs**: `bomb.png`, `bomb_active.png` - Explosive hazard
- **Saws**: `saw.png` - Blade hazard
- **Fireballs**: `fireball.png` - Projectile hazard

### Environment Decoration
| Category | Assets | Usage |
|----------|--------|-------|
| **Vegetation** | `grass.png`, `grass_purple.png`, `bush.png`, `cactus.png` | Natural decoration |
| **Terrain Features** | `hill.png`, `hill_top.png`, `hill_top_smile.png`, `rock.png` | Landscape elements |
| **Fungi** | `mushroom_brown.png`, `mushroom_red.png` | Forest decoration |
| **Weather** | `snow.png` - Snow overlay |

### HUD Elements
| Element | Pattern | Usage |
|---------|---------|-------|
| **Numbers** | `hud_character_{0-9}.png` | Score display, counters |
| **Symbols** | `hud_character_multiply.png`, `hud_character_percent.png` | Mathematical symbols |
| **Health** | `hud_heart.png`, `hud_heart_empty.png`, `hud_heart_half.png` | Health display |
| **Items** | `hud_coin.png`, `hud_key_{color}.png` | Inventory display |
| **Players** | `hud_player_{color}.png`, `hud_player_helmet_{color}.png` | Player indicators |

## Spritesheets (/Spritesheets/)

**Format**: PNG + XML metadata  
**Total**: 8 spritesheets (4 categories × 2 resolutions)

| Category | Default Size | Double Size | Atlas Dimensions |
|----------|-------------|-------------|------------------|
| Backgrounds | 1024×1024 | 2048×2048 | Fits all 14 backgrounds |
| Characters | 1024×1024 | 2048×2048 | Fits all 45 character sprites |
| Enemies | 512×512 | 1024×1024 | Fits all 60 enemy sprites |
| Tiles | 1152×1152 | 2304×2304 | Fits all 314 tile sprites |

### XML Metadata Format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<TextureAtlas imagePath="spritesheet-characters-default.png">
    <SubTexture name="character_beige_climb_a" x="0" y="0" width="128" height="128"/>
    <SubTexture name="character_beige_climb_b" x="128" y="0" width="128" height="128"/>
    <!-- ... more SubTexture entries ... -->
</TextureAtlas>
```

**Usage Benefits**:
- **Performance**: Single texture load vs. hundreds of individual files
- **Memory**: Optimized GPU texture usage
- **Batching**: Efficient sprite rendering
- **Loading**: Faster startup times

### Loading Examples (Phaser 3)
```javascript
// Load complete character spritesheet
this.load.atlas('characters', 
  'assets/kenney_new-platformer-pack-1.0/Spritesheets/spritesheet-characters-default.png',
  'assets/kenney_new-platformer-pack-1.0/Spritesheets/spritesheet-characters-default.xml'
);

// Use individual sprites from atlas
this.add.sprite(x, y, 'characters', 'character_beige_idle');
```

## Vector Assets (/Vector/)

**Format**: SVG  
**Total**: 433 files (matches PNG count exactly)  
**Advantage**: Infinite scalability, small file sizes

### Organization
- Mirror structure of `/Sprites/` directory
- Same filenames with `.svg` extension
- Perfect for UI elements that need multiple sizes
- Ideal for high-DPI displays

## File Naming Conventions

### Consistent Patterns
1. **Category_Type_Variant**: `terrain_grass_block_top_left`
2. **Category_Color_State**: `character_beige_walk_a` 
3. **Category_Variant_Action**: `slime_fire_walk_b`
4. **Element_Property**: `switch_blue_pressed`

### Special Suffixes
- `_a`, `_b`: Animation frames (usually 2-frame cycles)
- `_rest`: Idle/default state
- `_active`: Activated/triggered state  
- `_pressed`: Button/switch pressed state
- `_top`, `_middle`, `_bottom`: Vertical position variants
- `_left`, `_right`: Horizontal position variants

## Asset Selection Guide

### For Icy Tower Clone (Recommended Assets)
```
Characters:
  - character_beige_idle.png (standing)
  - character_beige_jump.png (jumping)
  - character_beige_walk_a.png (running frame 1)
  - character_beige_walk_b.png (running frame 2)

Platforms:
  - terrain_grass_cloud_left.png
  - terrain_grass_cloud_middle.png  
  - terrain_grass_cloud_right.png

Background:
  - background_solid_sky.png (simple blue)
  - background_clouds.png (with clouds)

Audio:
  - sfx_jump.ogg (jump sound)

UI:
  - hud_character_0.png through hud_character_9.png (score)
```

### Performance Optimization
1. **Use Spritesheets**: Load atlases instead of individual sprites
2. **Choose Resolution**: Default for pixel-perfect, Double for high-DPI
3. **Batch by Category**: Group related assets in single load operations
4. **Preload**: Load essential assets first, defer decorative elements

## Technical Specifications

### Image Properties
- **Color Depth**: 8-bit indexed color
- **Transparency**: Full alpha channel support
- **Compression**: Optimized PNG compression
- **Interlacing**: Non-interlaced for game performance

### Audio Properties  
- **Format**: OGG Vorbis
- **Sample Rate**: 44.1 kHz
- **Bit Depth**: 16-bit
- **Channels**: Mono
- **Compression**: Variable bitrate, optimized for size

### SVG Properties
- **Format**: SVG 1.1 compatible
- **Styling**: Inline styles, no external dependencies
- **Scalability**: Vector-based, infinite resolution
- **Compatibility**: Works with all modern browsers and engines

## License and Usage

**License**: Creative Commons Zero (CC0)  
**Rights**: Public Domain - No attribution required  
**Commercial Use**: Fully permitted  
**Modification**: Freely allowed  
**Distribution**: No restrictions

**Created by**: Kenney (kenney.nl)  
**Support**: Consider supporting on Patreon for more asset packs