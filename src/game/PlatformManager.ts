import { Scene, Physics } from 'phaser';
import { GameConfiguration, PlatformConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

interface PlatformData {
    group: Physics.Arcade.StaticGroup;
    id: string;
    y: number;
    width: number;
    created: number;
    isCheckpoint: boolean;
}

export class PlatformManager {
    private scene: Scene;
    private platforms: Physics.Arcade.StaticGroup;
    private config: PlatformConfig;
    
    // Infinite generation tracking
    private generatedPlatforms: Map<string, PlatformData> = new Map();
    private highestGeneratedY: number = 0;
    private nextPlatformY: number = 0;
    private platformIdCounter: number = 0;
    private platformCount: number = 0; // Track platform count for checkpoint generation
    
    // Checkpoint tracking
    private checkpoints: PlatformData[] = [];
    private readonly CHECKPOINT_INTERVAL = 100; // Every 100 platforms
    
    // Generation parameters
    private readonly GENERATION_DISTANCE = 1500; // Generate platforms this far ahead of camera
    private readonly CLEANUP_DISTANCE = 1000;    // Clean up platforms this far behind camera

    constructor(scene: Scene, gameConfig: GameConfiguration) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.config = gameConfig.platforms;
        
        this.setupEventListeners();
    }

    createPlatform(x: number, y: number, width: number): { group: Physics.Arcade.StaticGroup, platformId: string } {
        // Add safety check for physics system
        if (!this.scene.physics || !this.scene.physics.add) {
            console.warn('PlatformManager: Physics system not ready during createPlatform');
            // Return a minimal valid result to prevent crashes
            return { 
                group: null as any, 
                platformId: `platform_${Date.now()}` 
            };
        }

        // Additional safety check for main platforms group
        if (!this.platforms || !this.platforms.children) {
            console.warn('PlatformManager: Main platforms group corrupted, reinitializing');
            this.platforms = this.scene.physics.add.staticGroup();
        }

        const tileWidth = 64;
        const numMiddleTiles = Math.max(1, Math.floor((width - 2 * tileWidth) / tileWidth));
        const actualWidth = (numMiddleTiles + 2) * tileWidth;
        
        const startX = x - actualWidth / 2;
        
        const platformGroup = this.scene.physics.add.staticGroup();

        // Check if platformGroup was created successfully
        if (!platformGroup || !platformGroup.children) {
            console.error('PlatformManager: Failed to create platform group');
            return { 
                group: null as any, 
                platformId: `platform_${Date.now()}` 
            };
        }

        platformGroup.create(startX, y, 'tiles', 'terrain_grass_cloud_left')
            .setOrigin(0, 0.5)
            .refreshBody();

        for (let i = 0; i < numMiddleTiles; i++) {
            platformGroup.create(startX + tileWidth + (i * tileWidth), y, 'tiles', 'terrain_grass_cloud_middle')
                .setOrigin(0, 0.5)
                .refreshBody();
        }

        platformGroup.create(startX + tileWidth + (numMiddleTiles * tileWidth), y, 'tiles', 'terrain_grass_cloud_right')
            .setOrigin(0, 0.5)
            .refreshBody();

        // Safely add to main platforms group with additional checks
        try {
            if (this.platforms.children && platformGroup.children) {
                this.platforms.addMultiple(platformGroup.children.entries);
            } else {
                console.warn('PlatformManager: Cannot add platform children - children property undefined');
            }
        } catch (error) {
            console.error('PlatformManager: Error adding platform to main group:', error);
        }
        
        EventBus.emit('platform-created', platformGroup, actualWidth, tileWidth);
        
        return { group: platformGroup, platformId: `platform_${Date.now()}` };
    }

    createGroundPlatform(): { group: Physics.Arcade.StaticGroup, platformId: string } {
        const groundY = this.scene.scale.height - 100;
        const groundWidth = this.scene.scale.width; // Wall-to-wall solid platform
        const groundX = this.scene.scale.width / 2;
        
        // Initialize the next platform position
        this.highestGeneratedY = groundY;
        this.nextPlatformY = groundY - this.config.verticalSpacing.min;
        
        const result = this.createPlatform(groundX, groundY, groundWidth);
        
        // Track the ground platform as checkpoint
        this.trackPlatform(result.group, result.platformId, groundY, groundWidth, true);
        
        return result;
    }

    getPlatforms(): Physics.Arcade.StaticGroup {
        return this.platforms;
    }

    destroyPlatform(platform: any): void {
        platform.destroy();
    }

    clear(): void {
        this.platforms.clear(true, true);
        this.generatedPlatforms.clear();
    }

    private setupEventListeners(): void {
        EventBus.on('camera-state-updated', this.onCameraStateUpdated.bind(this));
    }

    private onCameraStateUpdated(cameraState: any): void {
        this.updateInfinitePlatforms(cameraState.scrollY);
    }

    private updateInfinitePlatforms(cameraY: number): void {
        this.generatePlatformsAhead(cameraY);
        this.cleanupPlatformsBehind(cameraY);
    }

    private generatePlatformsAhead(cameraY: number): void {
        const targetY = cameraY - this.GENERATION_DISTANCE;
        
        while (this.nextPlatformY > targetY) {
            this.generateNextPlatform();
        }
    }

    private generateNextPlatform(): void {
        this.platformCount++;
        
        // Check if this should be a checkpoint platform
        const isCheckpoint = this.platformCount % this.CHECKPOINT_INTERVAL === 0;
        
        if (isCheckpoint) {
            // Checkpoint platforms are single wall-to-wall platforms
            this.generateSinglePlatform(this.scene.scale.width, this.scene.scale.width / 2, true);
        } else {
            // Regular platforms - generate a level with 2-3 platforms
            this.generatePlatformLevel();
        }
        
        // Update next platform position for the next level
        this.highestGeneratedY = this.nextPlatformY;
        this.nextPlatformY -= this.generateVerticalSpacing();
    }

    private generatePlatformLevel(): void {
        // Generate 2-3 platforms at the same Y level
        const platformCount = Phaser.Math.Between(2, 3);
        const levelY = this.nextPlatformY;
        
        // Calculate platform distribution across the screen width
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 150; // Stay away from walls
        const usableWidth = screenWidth - (2 * wallBuffer);
        
        // Generate platform positions ensuring they don't overlap and are reachable
        const platforms = this.generatePlatformPositions(platformCount, usableWidth, wallBuffer);
        
        // Create each platform in the level
        platforms.forEach((platform, index) => {
            const result = this.createPlatform(platform.x, levelY, platform.width);
            this.trackPlatform(result.group, result.platformId, levelY, platform.width, false);
            
            // Emit event for each platform
            if (result.group) {
                EventBus.emit('platform-generated', {
                    id: result.platformId,
                    x: platform.x,
                    y: levelY,
                    width: platform.width,
                    group: result.group,
                    levelIndex: index,
                    levelTotal: platformCount
                });
            }
        });
    }

    private generateSinglePlatform(width: number, x: number, isCheckpoint: boolean): void {
        const result = this.createPlatform(x, this.nextPlatformY, width);
        this.trackPlatform(result.group, result.platformId, this.nextPlatformY, width, isCheckpoint);
        
        // Only emit if we have a valid group
        if (result.group) {
            EventBus.emit('platform-generated', {
                id: result.platformId,
                x: x,
                y: this.nextPlatformY,
                width: width,
                group: result.group,
                isCheckpoint: isCheckpoint
            });
        }
    }

    private generatePlatformPositions(count: number, usableWidth: number, wallBuffer: number): Array<{x: number, width: number}> {
        const platforms: Array<{x: number, width: number}> = [];
        const minPlatformWidth = this.config.platformWidth * 0.7;
        const maxPlatformWidth = this.config.platformWidth * 1.1;
        const minGap = 80; // Minimum gap between platforms for jumping
        const maxGap = 180; // Maximum gap to ensure reachability
        
        if (count === 2) {
            // Two platforms: left and right sides
            const leftWidth = Phaser.Math.Between(minPlatformWidth, maxPlatformWidth);
            const rightWidth = Phaser.Math.Between(minPlatformWidth, maxPlatformWidth);
            
            const leftX = wallBuffer + (leftWidth / 2);
            const rightX = this.scene.scale.width - wallBuffer - (rightWidth / 2);
            
            platforms.push({ x: leftX, width: leftWidth });
            platforms.push({ x: rightX, width: rightWidth });
            
        } else if (count === 3) {
            // Three platforms: left, center, right
            const platformWidth = Phaser.Math.Between(minPlatformWidth, Math.min(maxPlatformWidth, usableWidth / 4));
            
            // Calculate positions with even spacing
            const spacing = (usableWidth - (3 * platformWidth)) / 2;
            const leftX = wallBuffer + (platformWidth / 2);
            const centerX = leftX + platformWidth + spacing + (platformWidth / 2);
            const rightX = centerX + platformWidth + spacing + (platformWidth / 2);
            
            platforms.push({ x: leftX, width: platformWidth });
            platforms.push({ x: centerX, width: platformWidth });
            platforms.push({ x: rightX, width: platformWidth });
        }
        
        return platforms;
    }

    private generatePlatformWidth(): number {
        // Vary platform width based on configuration
        const minWidth = this.config.platformWidth * 0.7;
        const maxWidth = this.config.platformWidth * 1.3;
        return Phaser.Math.Between(minWidth, maxWidth);
    }

    private generatePlatformX(platformWidth: number): number {
        // Generate platform X position with some randomness but keep them reachable
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 150; // Stay away from walls
        const platformHalfWidth = platformWidth / 2;
        
        const minX = wallBuffer + platformHalfWidth;
        const maxX = screenWidth - wallBuffer - platformHalfWidth;
        
        return Phaser.Math.Between(minX, maxX);
    }

    private generateVerticalSpacing(): number {
        return Phaser.Math.Between(this.config.verticalSpacing.min, this.config.verticalSpacing.max);
    }

    private cleanupPlatformsBehind(cameraY: number): void {
        // Find the highest checkpoint that's off-screen and has been passed
        const cleanupY = cameraY + this.CLEANUP_DISTANCE;
        let cleanupCheckpoint: PlatformData | null = null;
        
        for (const checkpoint of this.checkpoints) {
            if (checkpoint.y > cleanupY) {
                cleanupCheckpoint = checkpoint;
                break; // Take the highest (most recent) off-screen checkpoint
            }
        }
        
        if (!cleanupCheckpoint) {
            return; // Don't cleanup anything if no checkpoint has been passed
        }
        
        const platformsToRemove: string[] = [];
        
        this.generatedPlatforms.forEach((platformData, id) => {
            // Only clean up platforms below the passed checkpoint (higher Y values in Phaser)
            if (platformData.y > cleanupCheckpoint!.y) {
                platformsToRemove.push(id);
            }
        });
        
        platformsToRemove.forEach(id => {
            const platformData = this.generatedPlatforms.get(id);
            if (platformData) {
                // Emit cleanup event BEFORE destroying the group
                EventBus.emit('platform-cleaned-up', { 
                    id, 
                    y: platformData.y,
                    group: platformData.group  // Include group for collision cleanup
                });
                
                // Remove from physics group
                platformData.group.children.entries.forEach(child => {
                    this.platforms.remove(child, true, true);
                });
                platformData.group.destroy();
                
                this.generatedPlatforms.delete(id);
                
                // Remove from checkpoints array if it was a checkpoint
                if (platformData.isCheckpoint) {
                    const checkpointIndex = this.checkpoints.findIndex(cp => cp.id === id);
                    if (checkpointIndex !== -1) {
                        this.checkpoints.splice(checkpointIndex, 1);
                        console.log(`🧹 Checkpoint cleaned up at height ${Math.abs(platformData.y).toFixed(0)}m`);
                    }
                }
            }
        });
    }

    private trackPlatform(group: Physics.Arcade.StaticGroup, id: string, y: number, width: number, isCheckpoint: boolean = false): void {
        const platformData: PlatformData = {
            group,
            id,
            y,
            width,
            created: Date.now(),
            isCheckpoint
        };
        
        this.generatedPlatforms.set(id, platformData);
        
        if (isCheckpoint) {
            this.checkpoints.push(platformData);
            console.log(`🏁 Checkpoint created at height ${Math.abs(y).toFixed(0)}m`);
        }
    }

    updateConfiguration(newConfig: GameConfiguration): void {
        this.config = newConfig.platforms;
    }

    getPlatformCount(): number {
        return this.generatedPlatforms.size;
    }

    getHighestPlatformY(): number {
        return this.highestGeneratedY;
    }

    destroy(): void {
        EventBus.off('camera-state-updated', this.onCameraStateUpdated.bind(this));
        
        // Safely destroy all generated platforms first
        this.generatedPlatforms.forEach((platformData, id) => {
            try {
                if (platformData.group && platformData.group.children) {
                    // Remove children from main platforms group first
                    platformData.group.children.entries.forEach(child => {
                        if (this.platforms && this.platforms.children) {
                            this.platforms.remove(child, true, true);
                        }
                    });
                    
                    // Then destroy the platform group
                    platformData.group.destroy();
                }
            } catch (error) {
                console.warn(`Failed to destroy platform ${id}:`, error);
            }
        });
        
        // Clear tracking maps
        this.generatedPlatforms.clear();
        this.checkpoints.length = 0;
        
        // Finally clear and destroy the main platforms group
        if (this.platforms && this.platforms.children) {
            this.platforms.clear(true, true);
        }
    }
}