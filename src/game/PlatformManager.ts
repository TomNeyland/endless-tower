import { Scene, Physics } from 'phaser';
import { GameConfiguration, PlatformConfig } from './GameConfiguration';
import { EventBus } from './EventBus';
import { BiomeTheme } from './BiomeManager';

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
    private currentBiome: BiomeTheme | null = null;
    
    // Debug toggle for platform generation
    private platformGenerationEnabled: boolean = true;
    
    // Infinite generation tracking
    private generatedPlatforms: Map<string, PlatformData> = new Map();
    private highestGeneratedY: number = 0;
    private nextPlatformY: number = 0;
    private platformIdCounter: number = 0;
    private platformCount: number = 0; // Track platform count for checkpoint generation
    
    // Checkpoint tracking
    private checkpoints: PlatformData[] = [];
    private readonly CHECKPOINT_INTERVAL = 100; // Every 100 platforms
    private readonly PRE_CHECKPOINT_DIFFICULTY_ZONE = 10; // Last 10 platforms before checkpoint get harder
    
    // Generation parameters
    private readonly GENERATION_DISTANCE = 1500; // Generate platforms this far ahead of camera
    private readonly CLEANUP_DISTANCE = 1000;    // Clean up platforms this far behind camera
    
    // Store bound function references for proper EventBus cleanup
    private boundTogglePlatformGeneration: () => void;
    private boundOnCameraStateUpdated: (cameraState: any) => void;
    private boundOnBiomeChanged: (data: any) => void;
    private boundOnSpawnPlatformAtPlayer: (playerPos: { x: number, y: number }) => void;

    constructor(scene: Scene, gameConfig: GameConfiguration) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.config = gameConfig.platforms;
        
        // Bind event handlers once and store references
        this.boundTogglePlatformGeneration = this.togglePlatformGeneration.bind(this);
        this.boundOnCameraStateUpdated = this.onCameraStateUpdated.bind(this);
        this.boundOnBiomeChanged = this.onBiomeChanged.bind(this);
        this.boundOnSpawnPlatformAtPlayer = (playerPos: { x: number, y: number }) => this.spawnPlatformAtPlayer(playerPos);
        
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        EventBus.on('debug-toggle-platforms', this.boundTogglePlatformGeneration);
        EventBus.on('camera-state-updated', this.boundOnCameraStateUpdated);
        EventBus.on('biome-changed', this.boundOnBiomeChanged);
        EventBus.on('spawn-platform-at-player', this.boundOnSpawnPlatformAtPlayer);
    }

    private togglePlatformGeneration(): void {
        this.platformGenerationEnabled = !this.platformGenerationEnabled;
        
        if (!this.platformGenerationEnabled) {
            // Hide existing platforms (except ground)
            this.generatedPlatforms.forEach((platformData, id) => {
                if (!platformData.isCheckpoint) { // Keep ground platform
                    platformData.group.setVisible(false);
                }
            });
            console.log('🚫 Platform generation DISABLED - wall bounce testing mode');
        } else {
            // Show platforms again
            this.generatedPlatforms.forEach((platformData, id) => {
                platformData.group.setVisible(true);
            });
            console.log('✅ Platform generation ENABLED - normal gameplay mode');
        }
    }

    createPlatform(x: number, y: number, width: number): { group: Physics.Arcade.StaticGroup, platformId: string } {
        console.log(`🏭 createPlatform called: (${x}, ${y}) width=${width}`);
        
        // Add safety check for physics system
        if (!this.scene.physics || !this.scene.physics.add) {
            console.error('❌ Physics system not ready during createPlatform');
            // Return a minimal valid result to prevent crashes
            return { 
                group: null as any, 
                platformId: `platform_${Date.now()}` 
            };
        }

        // Additional safety check for main platforms group
        if (!this.platforms || !this.platforms.children) {
            console.warn('⚠️ Main platforms group corrupted, reinitializing');
            this.platforms = this.scene.physics.add.staticGroup();
        }

        const tileWidth = 64;
        const numMiddleTiles = Math.max(1, Math.floor((width - 2 * tileWidth) / tileWidth));
        const actualWidth = (numMiddleTiles + 2) * tileWidth;
        
        const startX = x - actualWidth / 2;
        
        console.log(`🧮 Platform calculations: numMiddleTiles=${numMiddleTiles}, actualWidth=${actualWidth}, startX=${startX}`);
        
        const platformGroup = this.scene.physics.add.staticGroup();

        // Check if platformGroup was created successfully
        if (!platformGroup || !platformGroup.children) {
            console.error('❌ Failed to create platform group');
            return { 
                group: null as any, 
                platformId: `platform_${Date.now()}` 
            };
        }

        console.log('✅ Platform group created successfully');

        // Get current biome platform textures
        const platformTextures = this.getCurrentPlatformTextures();
        console.log('🎨 Platform textures:', platformTextures);

        console.log('🔧 Creating platform tiles...');
        
        try {
            const leftTile = platformGroup.create(startX, y, 'tiles', platformTextures.left)
                .setOrigin(0, 0.5)
                .refreshBody();
            console.log('✅ Left tile created at:', startX, y);

            for (let i = 0; i < numMiddleTiles; i++) {
                const middleTile = platformGroup.create(startX + tileWidth + (i * tileWidth), y, 'tiles', platformTextures.middle)
                    .setOrigin(0, 0.5)
                    .refreshBody();
                console.log(`✅ Middle tile ${i} created at:`, startX + tileWidth + (i * tileWidth), y);
            }

            const rightTile = platformGroup.create(startX + tileWidth + (numMiddleTiles * tileWidth), y, 'tiles', platformTextures.right)
                .setOrigin(0, 0.5)
                .refreshBody();
            console.log('✅ Right tile created at:', startX + tileWidth + (numMiddleTiles * tileWidth), y);
            
            console.log(`🏗️ All ${numMiddleTiles + 2} tiles created successfully`);
        } catch (error) {
            console.error('❌ Error creating platform tiles:', error);
            return { 
                group: null as any, 
                platformId: `platform_${Date.now()}` 
            };
        }

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
        
        // Emit platform-created event with position data for powerup spawning
        EventBus.emit('platform-created', {
            group: platformGroup,
            x: x,
            y: y,
            width: actualWidth,
            tileWidth: tileWidth
        });
        
        return { group: platformGroup, platformId: `platform_${Date.now()}` };
    }

    createGroundPlatform(): { group: Physics.Arcade.StaticGroup, platformId: string } {
        const groundY = this.scene.scale.height - 32; // Position flush with bottom (32px is half tile height)
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
        
        // CRITICAL: Reset all internal state counters to prevent double generation
        this.highestGeneratedY = 0;
        this.nextPlatformY = 0;
        this.platformIdCounter = 0;
        this.platformCount = 0;
        this.checkpoints = [];
        
        console.log('🔄 PlatformManager: Cleared platforms and reset all internal state');
    }

    reset(): void {
        // Complete reset method for explicit resets (like R key)
        console.log('🔄 PlatformManager: Full reset initiated');
        this.clear();
        console.log('✅ PlatformManager: Reset complete');
    }


    private onCameraStateUpdated(cameraState: any): void {
        this.updateInfinitePlatforms(cameraState.scrollY);
    }

    private onBiomeChanged(biomeData: any): void {
        this.currentBiome = biomeData.currentBiome;
        console.log(`🏗️ PlatformManager: Biome changed to ${this.currentBiome?.name}`);
    }

    private spawnPlatformAtPlayer(playerPos?: { x: number, y: number }): void {
        console.log(`🏗️ PlatformManager received spawn-platform-at-player event with position:`, playerPos);
        
        if (!playerPos) {
            console.warn('⚠️ No player position provided for platform spawning');
            return;
        }
        
        // Create a 3-tile wide platform slightly below player to avoid trapping them
        const platformWidth = 3 * 64; // 3 tiles × 64 pixels per tile
        const spawnY = playerPos.y + 80; // Spawn 80 pixels below player (enough clearance)
        
        console.log(`🎯 Creating platform: width=${platformWidth}px at (${Math.round(playerPos.x)}, ${Math.round(spawnY)})`);
        
        const result = this.createPlatform(playerPos.x, spawnY, platformWidth);
        
        console.log(`🔧 Platform creation result:`, result);
        
        if (result.group) {
            // Add the spawned platform to our tracking system
            const platformData: PlatformData = {
                group: result.group,
                id: result.platformId,
                y: spawnY,
                width: platformWidth,
                created: Date.now(),
                isCheckpoint: false
            };
            
            this.generatedPlatforms.set(result.platformId, platformData);
            console.log(`✅ Platform successfully spawned and tracked (${Math.round(playerPos.x)}, ${Math.round(spawnY)})`);
            console.log(`📊 Total platforms in tracking: ${this.generatedPlatforms.size}`);
        } else {
            console.error('❌ Failed to spawn platform at player location - createPlatform returned null group');
        }
    }

    private getCurrentPlatformTextures(): { left: string, middle: string, right: string } {
        // Use current biome textures if available, otherwise fallback to grass
        if (this.currentBiome) {
            return this.currentBiome.platformTextures;
        }
        
        // Fallback to grass textures (default)
        return {
            left: 'terrain_grass_cloud_left',
            middle: 'terrain_grass_cloud_middle',
            right: 'terrain_grass_cloud_right'
        };
    }

    private updateInfinitePlatforms(cameraY: number): void {
        this.generatePlatformsAhead(cameraY);
        this.cleanupPlatformsBehind(cameraY);
    }

    private generatePlatformsAhead(cameraY: number): void {
        // Skip generation if disabled
        if (!this.platformGenerationEnabled) {
            return;
        }
        const targetY = cameraY - this.GENERATION_DISTANCE;
        
        while (this.nextPlatformY > targetY) {
            this.generateNextPlatform();
        }
    }

    private generateNextPlatform(): void {
        this.platformCount++;
        
        // Check if this should be a checkpoint platform
        const isCheckpoint = this.platformCount % this.CHECKPOINT_INTERVAL === 0;
        
        // Calculate distance to next checkpoint for difficulty scaling
        const platformsUntilCheckpoint = this.CHECKPOINT_INTERVAL - (this.platformCount % this.CHECKPOINT_INTERVAL);
        const isInDifficultyZone = platformsUntilCheckpoint <= this.PRE_CHECKPOINT_DIFFICULTY_ZONE && platformsUntilCheckpoint > 0;
        
        if (isCheckpoint) {
            // Checkpoint platforms are single wall-to-wall platforms (safe haven)
            this.generateSinglePlatform(this.scene.scale.width, this.scene.scale.width / 2, true);
            console.log(`🏁 Generated checkpoint platform #${this.platformCount}`);
        } else if (isInDifficultyZone) {
            // Pre-checkpoint difficulty spike: smaller platforms, occasional gaps
            this.generatePreCheckpointPlatform(platformsUntilCheckpoint);
        } else {
            // Regular platforms - generate a single platform with varying width
            this.generateSingleRegularPlatform();
        }
        
        // Update next platform position for the next level
        this.highestGeneratedY = this.nextPlatformY;
        this.nextPlatformY -= this.generateVerticalSpacing();
    }

    private generatePreCheckpointPlatform(platformsUntilCheckpoint: number): void {
        // Difficulty scaling based on proximity to checkpoint
        // Closer to checkpoint = harder (lower platformsUntilCheckpoint = higher difficulty)
        const difficultyPercent = 1 - (platformsUntilCheckpoint / this.PRE_CHECKPOINT_DIFFICULTY_ZONE); // 0.0 to 1.0
        
        // Chance to skip platform entirely (create a gap)
        const gapChance = difficultyPercent * 0.3; // Up to 30% chance at maximum difficulty
        const shouldSkip = Math.random() < gapChance;
        
        if (shouldSkip) {
            console.log(`💀 Skipped platform #${this.platformCount} (gap challenge), ${platformsUntilCheckpoint} until checkpoint`);
            // Don't create a platform, but still track the empty space
            EventBus.emit('platform-skipped', {
                platformNumber: this.platformCount,
                y: this.nextPlatformY,
                platformsUntilCheckpoint,
                difficultyPercent
            });
            return;
        }
        
        // Create smaller platforms based on difficulty
        const tileWidth = 64;
        const baseMinTiles = 3;
        const baseMaxTiles = 7;
        
        // Scale down platform size as we get closer to checkpoint
        const sizeReduction = Math.floor(difficultyPercent * 3); // Up to 3 tiles smaller
        const minTiles = Math.max(1, baseMinTiles - sizeReduction); // Never smaller than 1 tile
        const maxTiles = Math.max(minTiles, baseMaxTiles - sizeReduction);
        
        const numTiles = Phaser.Math.Between(minTiles, maxTiles);
        const platformWidth = numTiles * tileWidth;
        
        // Generate random X position ensuring platform stays within screen bounds
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 100; // Stay away from walls
        const platformHalfWidth = platformWidth / 2;
        
        const minX = wallBuffer + platformHalfWidth;
        const maxX = screenWidth - wallBuffer - platformHalfWidth;
        const platformX = Phaser.Math.Between(minX, maxX);
        
        // Create the platform
        const result = this.createPlatform(platformX, this.nextPlatformY, platformWidth);
        this.trackPlatform(result.group, result.platformId, this.nextPlatformY, platformWidth, false);
        
        console.log(`⚠️ Generated pre-checkpoint platform #${this.platformCount}: ${numTiles} tiles, ${platformsUntilCheckpoint} until checkpoint`);
        
        // Emit event for the platform
        if (result.group) {
            EventBus.emit('platform-generated', {
                id: result.platformId,
                x: platformX,
                y: this.nextPlatformY,
                width: platformWidth,
                group: result.group,
                tiles: numTiles,
                isPreCheckpoint: true,
                difficultyPercent,
                platformsUntilCheckpoint
            });
        }
    }

    private generateSingleRegularPlatform(): void {
        // Generate one platform per level with varying width (min 3 tiles, max 7 tiles)
        const tileWidth = 64;
        const minTiles = 3;
        const maxTiles = 7;
        const numTiles = Phaser.Math.Between(minTiles, maxTiles);
        const platformWidth = numTiles * tileWidth;
        
        // Generate random X position ensuring platform stays within screen bounds
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 100; // Stay away from walls
        const platformHalfWidth = platformWidth / 2;
        
        const minX = wallBuffer + platformHalfWidth;
        const maxX = screenWidth - wallBuffer - platformHalfWidth;
        const platformX = Phaser.Math.Between(minX, maxX);
        
        // Create the platform
        const result = this.createPlatform(platformX, this.nextPlatformY, platformWidth);
        this.trackPlatform(result.group, result.platformId, this.nextPlatformY, platformWidth, false);
        
        // Emit event for the platform
        if (result.group) {
            EventBus.emit('platform-generated', {
                id: result.platformId,
                x: platformX,
                y: this.nextPlatformY,
                width: platformWidth,
                group: result.group,
                tiles: numTiles
            });
        }
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
        // Properly remove EventBus listeners using stored bound function references
        EventBus.off('camera-state-updated', this.boundOnCameraStateUpdated);
        EventBus.off('debug-toggle-platforms', this.boundTogglePlatformGeneration);
        EventBus.off('biome-changed', this.boundOnBiomeChanged);
        
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