import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export interface BiomeTheme {
  id: string;
  name: string;
  backgroundTexture: string;
  platformTextures: {
    left: string;
    middle: string;
    right: string;
  };
  wallTextures: {
    top: string;
    middle: string;
    bottom: string;
  };
  colors: {
    primary: string;
    secondary: string;
  };
}

export class BiomeManager {
  private scene: Scene;
  private currentBiomeIndex: number = 0;
  private currentBiome: BiomeTheme;
  private platformCount: number = 0;
  
  // Biome transition settings - progressive intervals
  // 25 → 50 → 75 → 100 → then every 50 after that
  private readonly BIOME_TRANSITION_POINTS = [25, 50, 75, 100];
  
  // All available biome themes
  private readonly BIOME_THEMES: BiomeTheme[] = [
    {
      id: 'grassland',
      name: 'Grassland Plains',
      backgroundTexture: 'background-grass',
      platformTextures: {
        left: 'terrain_grass_cloud_left',
        middle: 'terrain_grass_cloud_middle',
        right: 'terrain_grass_cloud_right'
      },
      wallTextures: {
        top: 'terrain_grass_vertical_top',
        middle: 'terrain_grass_vertical_middle',
        bottom: 'terrain_grass_vertical_bottom'
      },
      colors: {
        primary: '#4a7c59',   // Forest green
        secondary: '#8fbc8f'  // Light green
      }
    },
    {
      id: 'desert',
      name: 'Desert Dunes',
      backgroundTexture: 'background-sand',
      platformTextures: {
        left: 'terrain_sand_cloud_left',
        middle: 'terrain_sand_cloud_middle',
        right: 'terrain_sand_cloud_right'
      },
      wallTextures: {
        top: 'terrain_sand_vertical_top',
        middle: 'terrain_sand_vertical_middle',
        bottom: 'terrain_sand_vertical_bottom'
      },
      colors: {
        primary: '#c4a484',   // Sandy brown
        secondary: '#f4e4bc'  // Light sand
      }
    },
    {
      id: 'underground',
      name: 'Underground Caverns',
      backgroundTexture: 'background-dirt',
      platformTextures: {
        left: 'terrain_dirt_cloud_left',
        middle: 'terrain_dirt_cloud_middle',
        right: 'terrain_dirt_cloud_right'
      },
      wallTextures: {
        top: 'terrain_dirt_vertical_top',
        middle: 'terrain_dirt_vertical_middle',
        bottom: 'terrain_dirt_vertical_bottom'
      },
      colors: {
        primary: '#654321',   // Dark brown
        secondary: '#8b6914'  // Dirt brown
      }
    },
    {
      id: 'mystical',
      name: 'Mystical Mushroom Forest',
      backgroundTexture: 'background-mushrooms',
      platformTextures: {
        left: 'terrain_purple_cloud_left',
        middle: 'terrain_purple_cloud_middle',
        right: 'terrain_purple_cloud_right'
      },
      wallTextures: {
        top: 'terrain_purple_vertical_top',
        middle: 'terrain_purple_vertical_middle',
        bottom: 'terrain_purple_vertical_bottom'
      },
      colors: {
        primary: '#8a2be2',   // Blue violet
        secondary: '#dda0dd'  // Plum
      }
    },
    {
      id: 'winter',
      name: 'Frozen Peaks',
      backgroundTexture: 'background-cloud',
      platformTextures: {
        left: 'terrain_snow_cloud_left',
        middle: 'terrain_snow_cloud_middle',
        right: 'terrain_snow_cloud_right'
      },
      wallTextures: {
        top: 'terrain_snow_vertical_top',
        middle: 'terrain_snow_vertical_middle',
        bottom: 'terrain_snow_vertical_bottom'
      },
      colors: {
        primary: '#b0e0e6',   // Powder blue
        secondary: '#f0f8ff'  // Alice blue
      }
    },
    {
      id: 'fortress',
      name: 'Stone Fortress',
      backgroundTexture: 'background-sky',
      platformTextures: {
        left: 'terrain_stone_cloud_left',
        middle: 'terrain_stone_cloud_middle',
        right: 'terrain_stone_cloud_right'
      },
      wallTextures: {
        top: 'terrain_stone_vertical_top',
        middle: 'terrain_stone_vertical_middle',
        bottom: 'terrain_stone_vertical_bottom'
      },
      colors: {
        primary: '#696969',   // Dim gray
        secondary: '#a9a9a9'  // Dark gray
      }
    }
  ];

  constructor(scene: Scene) {
    this.scene = scene;
    this.currentBiome = this.BIOME_THEMES[0]; // Start with grassland
    this.setupEventListeners();
    
    console.log(`🌍 BiomeManager initialized - Starting biome: ${this.currentBiome.name}`);
    this.emitBiomeChanged();
  }

  private setupEventListeners(): void {
    EventBus.on('platform-generated', this.onPlatformGenerated.bind(this));
    EventBus.on('game-fully-reset', this.onGameReset.bind(this));
  }

  private onPlatformGenerated(): void {
    this.platformCount++;
    
    // Check if we should transition to next biome using progressive intervals
    if (this.shouldTransitionAtCurrentCount()) {
      this.transitionToNextBiome();
    }
  }

  private shouldTransitionAtCurrentCount(): boolean {
    // Check if we hit one of the initial transition points (25, 50, 75, 100)
    if (this.BIOME_TRANSITION_POINTS.includes(this.platformCount)) {
      return true;
    }
    
    // After platform 100, transition every 50 platforms
    if (this.platformCount > 100 && (this.platformCount - 100) % 50 === 0) {
      return true;
    }
    
    return false;
  }

  private onGameReset(): void {
    this.platformCount = 0;
    this.currentBiomeIndex = 0;
    this.currentBiome = this.BIOME_THEMES[0];
    console.log('🌍 BiomeManager reset to starting biome');
    this.emitBiomeChanged();
  }

  private transitionToNextBiome(): void {
    const previousBiome = this.currentBiome;
    
    // Cycle to next biome (infinite loop through all biomes)
    this.currentBiomeIndex = (this.currentBiomeIndex + 1) % this.BIOME_THEMES.length;
    this.currentBiome = this.BIOME_THEMES[this.currentBiomeIndex];
    
    console.log(`🌍 Biome transition: ${previousBiome.name} → ${this.currentBiome.name} (Platform ${this.platformCount})`);
    
    this.emitBiomeChanged();
  }

  private emitBiomeChanged(): void {
    EventBus.emit('biome-changed', {
      previousBiome: this.currentBiomeIndex > 0 ? this.BIOME_THEMES[this.currentBiomeIndex - 1] : null,
      currentBiome: this.currentBiome,
      platformCount: this.platformCount,
      biomeIndex: this.currentBiomeIndex
    });
  }

  // Public API methods

  getCurrentBiome(): BiomeTheme {
    return { ...this.currentBiome }; // Return copy to prevent external modification
  }

  getBiomeByIndex(index: number): BiomeTheme {
    const safeIndex = index % this.BIOME_THEMES.length;
    return { ...this.BIOME_THEMES[safeIndex] };
  }

  getBiomeForPlatformCount(platformCount: number): BiomeTheme {
    const biomeIndex = this.calculateBiomeIndexForPlatformCount(platformCount);
    return { ...this.BIOME_THEMES[biomeIndex] };
  }

  getCurrentBiomeIndex(): number {
    return this.currentBiomeIndex;
  }

  getPlatformCount(): number {
    return this.platformCount;
  }

  getPlatformsUntilNextBiome(): number {
    // Check if we're in the initial phase (before platform 100)
    if (this.platformCount < 100) {
      for (const transitionPoint of this.BIOME_TRANSITION_POINTS) {
        if (this.platformCount < transitionPoint) {
          return transitionPoint - this.platformCount;
        }
      }
    }
    
    // After platform 100, calculate next 50-platform interval
    const nextInterval = Math.ceil((this.platformCount - 100) / 50) * 50 + 100;
    return nextInterval - this.platformCount;
  }

  getAllBiomes(): BiomeTheme[] {
    return this.BIOME_THEMES.map(biome => ({ ...biome })); // Return copies
  }

  // Debug methods

  forceBiomeTransition(biomeIndex?: number): void {
    if (biomeIndex !== undefined) {
      this.currentBiomeIndex = Math.max(0, biomeIndex % this.BIOME_THEMES.length);
    } else {
      this.currentBiomeIndex = (this.currentBiomeIndex + 1) % this.BIOME_THEMES.length;
    }
    
    this.currentBiome = this.BIOME_THEMES[this.currentBiomeIndex];
    console.log(`🌍 [DEBUG] Force biome transition to: ${this.currentBiome.name}`);
    this.emitBiomeChanged();
  }

  setPlatformCount(count: number): void {
    this.platformCount = Math.max(0, count);
    const newBiomeIndex = this.calculateBiomeIndexForPlatformCount(count);
    
    if (newBiomeIndex !== this.currentBiomeIndex) {
      this.currentBiomeIndex = newBiomeIndex;
      this.currentBiome = this.BIOME_THEMES[this.currentBiomeIndex];
      console.log(`🌍 [DEBUG] Platform count set to ${count}, biome: ${this.currentBiome.name}`);
      this.emitBiomeChanged();
    }
  }

  private calculateBiomeIndexForPlatformCount(count: number): number {
    let transitionCount = 0;
    
    // Count transitions within the initial phase (25, 50, 75, 100)
    for (const transitionPoint of this.BIOME_TRANSITION_POINTS) {
      if (count >= transitionPoint) {
        transitionCount++;
      } else {
        break;
      }
    }
    
    // If we're past platform 100, add transitions for every 50 platforms after
    if (count > 100) {
      const additionalTransitions = Math.floor((count - 100) / 50);
      transitionCount += additionalTransitions;
    }
    
    return transitionCount % this.BIOME_THEMES.length;
  }

  getDebugInfo(): any {
    return {
      currentBiome: this.currentBiome.name,
      biomeIndex: this.currentBiomeIndex,
      platformCount: this.platformCount,
      platformsUntilNext: this.getPlatformsUntilNextBiome(),
      totalBiomes: this.BIOME_THEMES.length
    };
  }

  destroy(): void {
    EventBus.off('platform-generated', this.onPlatformGenerated.bind(this));
    EventBus.off('game-fully-reset', this.onGameReset.bind(this));
  }
}