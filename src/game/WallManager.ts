import { Scene, Physics, GameObjects } from 'phaser';
import { GameConfiguration, WallConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

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
    this.generateInitialWalls();
  }

  private setupWallGroups(): void {
    this.leftWalls = this.scene.physics.add.staticGroup();
    this.rightWalls = this.scene.physics.add.staticGroup();
  }

  private generateInitialWalls(): void {
    const screenHeight = this.scene.scale.height;
    const startY = screenHeight;
    const endY = -this.config.generateDistance;
    
    this.generateWallSegments('left', 0, startY, endY);
    this.generateWallSegments('right', this.scene.scale.width - this.TILE_WIDTH, startY, endY);
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
    
    // Create wall tiles from top to bottom
    for (let i = 0; i < tilesInSegment; i++) {
      const tileY = topY + (i * this.config.tileHeight);
      let frame: string;
      
      // Choose appropriate tile frame
      if (i === 0) {
        frame = 'terrain_grass_vertical_top';
      } else if (i === tilesInSegment - 1) {
        frame = 'terrain_grass_vertical_bottom';
      } else {
        frame = 'terrain_grass_vertical_middle';
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
    if (Math.abs(cameraY - this.lastCameraY) < 50) return; // Only update when camera moves significantly
    
    this.generateWallsAbove(cameraY);
    this.removeWallsBelow(cameraY);
    
    this.lastCameraY = cameraY;
  }

  private generateWallsAbove(cameraY: number): void {
    const generateThreshold = cameraY - this.config.generateDistance;
    
    // Find the highest wall segment for each side
    const leftHighest = this.getHighestWallSegment('left');
    const rightHighest = this.getHighestWallSegment('right');
    
    // Generate new segments above if needed
    if (!leftHighest || leftHighest.topY > generateThreshold) {
      const startY = leftHighest ? leftHighest.topY : cameraY;
      this.generateWallSegments('left', 0, startY, generateThreshold);
    }
    
    if (!rightHighest || rightHighest.topY > generateThreshold) {
      const startY = rightHighest ? rightHighest.topY : cameraY;
      this.generateWallSegments('right', this.scene.scale.width - this.TILE_WIDTH, startY, generateThreshold);
    }
  }

  private removeWallsBelow(cameraY: number): void {
    const cleanupThreshold = cameraY + this.config.cleanupDistance;
    
    const segmentsToRemove: string[] = [];
    
    this.wallSegments.forEach((segment, id) => {
      if (segment.bottomY > cleanupThreshold) {
        segmentsToRemove.push(id);
      }
    });
    
    segmentsToRemove.forEach(id => {
      this.removeWallSegment(id);
    });
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
    this.clear();
  }
}