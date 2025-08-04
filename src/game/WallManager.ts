import { Scene, Physics, GameObjects } from 'phaser';
import { GameConfiguration, WallConfig } from './GameConfiguration';
import { EventBus } from './EventBus';
import { BiomeTheme } from './BiomeManager';

export interface WallSegment {
  id: string;
  group: Physics.Arcade.StaticGroup;
  topY: number;
  bottomY: number;
  side: 'left' | 'right';
}

export class WallManager {
  private scene: Scene;
  private config: WallConfig;
  private gameConfig: GameConfiguration;
  private currentBiome: BiomeTheme | null = null;
  
  private leftWalls: Physics.Arcade.StaticGroup;
  private rightWalls: Physics.Arcade.StaticGroup;
  private wallSegments: Map<string, WallSegment> = new Map();
  
  private segmentIdCounter = 0;
  private lastCameraY = 0;
  
  private readonly TILE_WIDTH = 64;

  constructor(scene: Scene, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.gameConfig = gameConfig;
    this.config = gameConfig.walls;
    
    this.setupWallGroups();
    this.setupEventListeners();
    this.generateInitialWalls();
  }

  private setupWallGroups(): void {
    this.leftWalls = this.scene.physics.add.staticGroup();
    this.rightWalls = this.scene.physics.add.staticGroup();
  }

  private setupEventListeners(): void {
    EventBus.on('biome-changed', this.onBiomeChanged.bind(this));
    EventBus.on('platform-cleaned-up', this.onPlatformCleanedUp.bind(this));
  }

  private onBiomeChanged(biomeData: any): void {
    this.currentBiome = biomeData.currentBiome;
    console.log(`🧱 WallManager: Biome changed to ${this.currentBiome?.name}`);
  }

  private onPlatformCleanedUp(data: { id: string, y: number, group: any }): void {
    // When checkpoint platforms are cleaned up, clean up walls below that level
    // This is safe because players can't fall below checkpoint platforms
    this.cleanupWallsBelowY(data.y);
  }

  private enforceWallCountLimit(): void {
    const MAX_WALLS = 100;
    
    if (this.wallSegments.size > MAX_WALLS) {
      // Find oldest wall segments (highest bottomY = lowest on screen = oldest)
      const sortedSegments = Array.from(this.wallSegments.entries())
        .sort(([, a], [, b]) => b.bottomY - a.bottomY); // Sort by bottomY descending (oldest first)
      
      const wallsToRemove = sortedSegments.slice(0, this.wallSegments.size - MAX_WALLS);
      
      console.log(`🧹 WallManager: Wall count limit exceeded (${this.wallSegments.size}), removing ${wallsToRemove.length} oldest segments`);
      
      wallsToRemove.forEach(([id]) => {
        this.removeWallSegment(id);
      });
      
      console.log(`📊 Wall count after cleanup: ${this.wallSegments.size}`);
      EventBus.emit('walls-updated');
    }
  }

  private cleanupWallsBelowY(checkpointY: number): void {
    const wallsToRemove: string[] = [];
    const totalWallsBefore = this.wallSegments.size;
    
    // Find all wall segments below the checkpoint level
    this.wallSegments.forEach((segment, id) => {
      if (segment.bottomY > checkpointY) { // In Phaser, higher Y = lower on screen
        wallsToRemove.push(id);
      }
    });
    
    if (wallsToRemove.length > 0) {
      console.log(`🧹 WallManager: Cleaning up ${wallsToRemove.length} wall segments below checkpoint at Y=${checkpointY.toFixed(0)}`);
      console.log(`📊 Wall count before cleanup: ${totalWallsBefore}`);
      
      wallsToRemove.forEach(id => {
        this.removeWallSegment(id);
      });
      
      console.log(`📊 Wall count after cleanup: ${this.wallSegments.size}`);
      EventBus.emit('walls-updated');
    } else {
      console.log(`🧹 WallManager: No walls to cleanup below Y=${checkpointY.toFixed(0)} (Total walls: ${totalWallsBefore})`);
    }
  }

  private getCurrentWallTextures(): { top: string, middle: string, bottom: string } {
    // Use current biome textures if available, otherwise fallback to grass
    if (this.currentBiome) {
      return this.currentBiome.wallTextures;
    }
    
    // Fallback to grass textures (default)
    return {
      top: 'terrain_grass_vertical_top',
      middle: 'terrain_grass_vertical_middle',
      bottom: 'terrain_grass_vertical_bottom'
    };
  }

  private generateInitialWalls(): void {
    const screenHeight = this.scene.scale.height;
    const startY = screenHeight - 32; // Start walls at same Y as floor platform
    const endY = -this.config.generateDistance;
    
    console.log(`🏗️ Generating initial walls from Y=${startY} to Y=${endY}`);
    console.log(`🏗️ Screen width: ${this.scene.scale.width}, tile width: ${this.TILE_WIDTH}`);
    
    this.generateWallSegments('left', 0, startY, endY);
    this.generateWallSegments('right', this.scene.scale.width - this.TILE_WIDTH, startY, endY);
    
    console.log(`🏗️ Wall generation complete. Left walls: ${this.leftWalls.children.size}, Right walls: ${this.rightWalls.children.size}`);
  }

  private generateWallSegments(side: 'left' | 'right', x: number, startY: number, endY: number): void {
    let currentY = startY;
    
    while (currentY > endY) {
      const segmentBottomY = currentY;
      const segmentTopY = currentY - this.config.segmentHeight;
      
      const segment = this.createWallSegment(side, x, segmentTopY, segmentBottomY);
      this.wallSegments.set(segment.id, segment);
      
      currentY = segmentTopY;
    }
  }

  private createWallSegment(side: 'left' | 'right', x: number, topY: number, bottomY: number): WallSegment {
    const id = `wall_${side}_${this.segmentIdCounter++}`;
    const group = this.scene.physics.add.staticGroup();
    
    const segmentHeight = bottomY - topY;
    const tilesInSegment = Math.ceil(segmentHeight / this.config.tileHeight);
    
    // Get current biome wall textures
    const wallTextures = this.getCurrentWallTextures();
    
    // Create wall tiles from top to bottom
    for (let i = 0; i < tilesInSegment; i++) {
      const tileY = topY + (i * this.config.tileHeight);
      let frame: string;
      
      // Choose appropriate tile frame based on current biome
      if (i === 0) {
        frame = wallTextures.top;
      } else if (i === tilesInSegment - 1) {
        frame = wallTextures.bottom;
      } else {
        frame = wallTextures.middle;
      }
      
      const tile = group.create(x, tileY, 'tiles', frame) as Physics.Arcade.Sprite;
      tile.setOrigin(0, 0);
      tile.refreshBody();
      
      // Add to appropriate wall group for collision detection
      if (side === 'left') {
        this.leftWalls.add(tile);
      } else {
        this.rightWalls.add(tile);
      }
    }
    
    const segment: WallSegment = {
      id,
      group,
      topY,
      bottomY,
      side
    };
    
    EventBus.emit('wall-segment-created', segment);
    
    return segment;
  }

  update(cameraY: number): void {
    // Safety check: ensure scene is still active and physics world exists
    if (!this.scene || !this.scene.scene?.isActive() || !this.scene.physics?.world) {
      console.warn('🚧 WallManager: Scene or physics world not available, skipping update');
      return;
    }

    if (Math.abs(cameraY - this.lastCameraY) < 50) return; // Only update when camera moves significantly
    
    // Only generate walls upward - no more bidirectional complexity
    const wallsGeneratedAbove = this.generateWallsAbove(cameraY);
    
    // Notify collision system if walls changed
    if (wallsGeneratedAbove) {
      console.log('🔄 WallManager: Walls generated above, updating collision system');
      EventBus.emit('walls-updated');
    }
    
    this.lastCameraY = cameraY;
  }

  private generateWallsAbove(cameraY: number): boolean {
    let wallsGenerated = false;
    const generateThreshold = cameraY - this.config.generateDistance;
    const totalWallsBefore = this.wallSegments.size;
    
    // Find the highest wall segment for each side
    const leftHighest = this.getHighestWallSegment('left');
    const rightHighest = this.getHighestWallSegment('right');
    
    // Generate new segments above if needed
    if (!leftHighest || leftHighest.topY > generateThreshold) {
      const startY = leftHighest ? leftHighest.topY : cameraY;
      this.generateWallSegments('left', 0, startY, generateThreshold);
      wallsGenerated = true;
    }
    
    if (!rightHighest || rightHighest.topY > generateThreshold) {
      const startY = rightHighest ? rightHighest.topY : cameraY;
      this.generateWallSegments('right', this.scene.scale.width - this.TILE_WIDTH, startY, generateThreshold);
      wallsGenerated = true;
    }
    
    if (wallsGenerated) {
      console.log(`🏗️ WallManager: Generated walls above camera. Total walls: ${totalWallsBefore} → ${this.wallSegments.size}`);
      
      // Simple wall count management - cleanup oldest when over 100
      this.enforceWallCountLimit();
    }
    
    return wallsGenerated;
  }


  private getHighestWallSegment(side: 'left' | 'right'): WallSegment | null {
    let highest: WallSegment | null = null;
    
    this.wallSegments.forEach(segment => {
      if (segment.side === side) {
        if (!highest || segment.topY < highest.topY) {
          highest = segment;
        }
      }
    });
    
    return highest;
  }


  private removeWallSegment(id: string): void {
    const segment = this.wallSegments.get(id);
    if (segment) {
      // Remove all tiles from collision groups
      segment.group.children.entries.forEach(tile => {
        if (segment.side === 'left') {
          this.leftWalls.remove(tile);
        } else {
          this.rightWalls.remove(tile);
        }
      });
      
      // Destroy the segment group
      segment.group.clear(true, true);
      
      this.wallSegments.delete(id);
      
      EventBus.emit('wall-segment-removed', segment);
    }
  }

  getLeftWalls(): Physics.Arcade.StaticGroup {
    return this.leftWalls;
  }

  getRightWalls(): Physics.Arcade.StaticGroup {
    return this.rightWalls;
  }

  getWallConfig(): WallConfig {
    return this.config;
  }

  getAllWalls(): Physics.Arcade.StaticGroup {
    // Create a combined group for convenience
    const combined = this.scene.physics.add.staticGroup();
    
    this.leftWalls.children.entries.forEach(wall => combined.add(wall));
    this.rightWalls.children.entries.forEach(wall => combined.add(wall));
    
    return combined;
  }

  getWallSegments(): WallSegment[] {
    return Array.from(this.wallSegments.values());
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.gameConfig = newConfig;
    this.config = newConfig.walls;
  }

  reset(): void {
    console.log('🔄 WallManager: Resetting wall system');
    
    // Clear all existing walls
    this.clear();
    
    // Reset tracking variables
    this.segmentIdCounter = 0;
    this.lastCameraY = 0;
    
    // Recreate wall groups in case they got corrupted
    this.setupWallGroups();
    
    // Generate fresh walls around player starting position
    this.generateInitialWalls();
    
    console.log('✅ WallManager: Reset complete - walls regenerated');
  }

  clear(): void {
    this.wallSegments.forEach((segment, id) => {
      this.removeWallSegment(id);
    });
    
    this.leftWalls.clear(true, true);
    this.rightWalls.clear(true, true);
    this.wallSegments.clear();
  }

  destroy(): void {
    EventBus.off('biome-changed', this.onBiomeChanged.bind(this));
    EventBus.off('platform-cleaned-up', this.onPlatformCleanedUp.bind(this));
    this.clear();
  }
}