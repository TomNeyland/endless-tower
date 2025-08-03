import { Scene, Physics } from 'phaser';
import { GameConfiguration, PlatformConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

interface PlatformData {
    group: Physics.Arcade.StaticGroup;
    id: string;
    y: number;
    width: number;
    created: number;
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
        const tileWidth = 64;
        const numMiddleTiles = Math.max(1, Math.floor((width - 2 * tileWidth) / tileWidth));
        const actualWidth = (numMiddleTiles + 2) * tileWidth;
        
        const startX = x - actualWidth / 2;
        
        const platformGroup = this.scene.physics.add.staticGroup();

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

        this.platforms.addMultiple(platformGroup.children.entries);
        
        EventBus.emit('platform-created', platformGroup, actualWidth, tileWidth);
        
        return { group: platformGroup, platformId: `platform_${Date.now()}` };
    }

    createGroundPlatform(): { group: Physics.Arcade.StaticGroup, platformId: string } {
        const groundY = this.scene.scale.height - 100;
        const groundWidth = this.scene.scale.width * 0.8;
        const groundX = this.scene.scale.width / 2;
        
        // Initialize the next platform position
        this.highestGeneratedY = groundY;
        this.nextPlatformY = groundY - this.config.verticalSpacing.min;
        
        const result = this.createPlatform(groundX, groundY, groundWidth);
        
        // Track the ground platform
        this.trackPlatform(result.group, result.platformId, groundY, groundWidth);
        
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
        const platformWidth = this.generatePlatformWidth();
        const platformX = this.generatePlatformX(platformWidth);
        
        const result = this.createPlatform(platformX, this.nextPlatformY, platformWidth);
        this.trackPlatform(result.group, result.platformId, this.nextPlatformY, platformWidth);
        
        // Update next platform position
        this.highestGeneratedY = this.nextPlatformY;
        this.nextPlatformY -= this.generateVerticalSpacing();
        
        EventBus.emit('platform-generated', {
            id: result.platformId,
            x: platformX,
            y: this.highestGeneratedY,
            width: platformWidth,
            group: result.group  // Include the group for collision system
        });
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

    private trackPlatform(group: Physics.Arcade.StaticGroup, id: string, y: number, width: number): void {
        this.generatedPlatforms.set(id, {
            group,
            id,
            y,
            width,
            created: Date.now()
        });
    }

    private cleanupPlatformsBehind(cameraY: number): void {
        const cleanupY = cameraY + this.CLEANUP_DISTANCE;
        const platformsToRemove: string[] = [];
        
        this.generatedPlatforms.forEach((platformData, id) => {
            if (platformData.y > cleanupY) {
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
            }
        });
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
        this.clear();
    }
}