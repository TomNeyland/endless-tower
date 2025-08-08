import { Scene, Physics } from 'phaser';
import { GameConfiguration, PlatformConfig } from './GameConfiguration';
import { EventBus } from './EventBus';
import { BiomeTheme } from './BiomeManager';

// Platform generation modes
export type PlatformGenerationMode = 'tight' | 'snake' | 'scattered' | 'staircase';

interface PlatformGenerationRequest {
    y: number;
    height: number; // Current height for difficulty scaling
    mode: PlatformGenerationMode;
    platformCount: number;
    isCheckpoint: boolean;
    isInDifficultyZone: boolean;
    platformsUntilCheckpoint?: number;
}

interface GeneratedPlatform {
    x: number;
    y: number;
    width: number;
    shouldGenerate: boolean; // Can be cancelled by post-processors
    metadata?: any;
}

// Post-processor interface for layered platform modification
interface PlatformProcessor {
    name: string;
    priority: number; // Lower numbers process first
    process(platforms: GeneratedPlatform[], request: PlatformGenerationRequest): GeneratedPlatform[];
}

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
    
    // Platform generation mode system
    private currentMode: PlatformGenerationMode = 'tight';
    private modeCounter: number = 0;
    private modeSwitchInterval: number; // Switch modes every N platforms
    private modeDirection: number = 1; // For snake mode direction tracking
    
    // Post-processing system
    private processors: PlatformProcessor[] = [];
    
    // Generation parameters
    private readonly GENERATION_DISTANCE = 1500; // Generate platforms this far ahead of camera
    private readonly CLEANUP_DISTANCE = 1000;    // Clean up platforms this far behind camera
    
    // Store bound function references for proper EventBus cleanup
    private boundTogglePlatformGeneration: () => void;
    private boundOnCameraStateUpdated: (cameraState: any) => void;
    private boundOnBiomeChanged: (data: any) => void;

    constructor(scene: Scene, gameConfig: GameConfiguration) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.config = gameConfig.platforms;
        
        // Bind event handlers once and store references
        this.boundTogglePlatformGeneration = this.togglePlatformGeneration.bind(this);
        this.boundOnCameraStateUpdated = this.onCameraStateUpdated.bind(this);
        this.boundOnBiomeChanged = this.onBiomeChanged.bind(this);
        
        // Initialize platform generation system
        this.initializePlatformGenerationSystem();
        
        this.setupEventListeners();
    }
    
    private initializePlatformGenerationSystem(): void {
        // Initialize configuration-based values
        this.modeSwitchInterval = this.config.generation.modeSwitchInterval;
        
        // Initialize with a random mode
        const modes: PlatformGenerationMode[] = ['tight', 'snake', 'scattered', 'staircase'];
        this.currentMode = modes[Math.floor(Math.random() * modes.length)];
        
        // Register post-processors in priority order
        this.registerProcessor({
            name: 'PlatformDeletionProcessor',
            priority: 100,
            process: this.processPlatformDeletion.bind(this)
        });
        
        console.log(`🎮 Platform generation initialized with mode: ${this.currentMode}, switching every ${this.modeSwitchInterval} platforms`);
    }
    
    private registerProcessor(processor: PlatformProcessor): void {
        this.processors.push(processor);
        this.processors.sort((a, b) => a.priority - b.priority);
    }

    private setupEventListeners(): void {
        EventBus.on('debug-toggle-platforms', this.boundTogglePlatformGeneration);
        EventBus.on('camera-state-updated', this.boundOnCameraStateUpdated);
        EventBus.on('biome-changed', this.boundOnBiomeChanged);
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

        // Get current biome platform textures
        const platformTextures = this.getCurrentPlatformTextures();

        platformGroup.create(startX, y, 'tiles', platformTextures.left)
            .setOrigin(0, 0.5)
            .refreshBody();

        for (let i = 0; i < numMiddleTiles; i++) {
            platformGroup.create(startX + tileWidth + (i * tileWidth), y, 'tiles', platformTextures.middle)
                .setOrigin(0, 0.5)
                .refreshBody();
        }

        platformGroup.create(startX + tileWidth + (numMiddleTiles * tileWidth), y, 'tiles', platformTextures.right)
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
        
        // Reset generation mode system
        this.modeCounter = 0;
        this.modeDirection = 1;
        this.processors.length = 0; // Clear processors
        const modes: PlatformGenerationMode[] = ['tight', 'snake', 'scattered', 'staircase'];
        this.currentMode = modes[Math.floor(Math.random() * modes.length)];
        
        // Re-initialize the platform generation system
        this.initializePlatformGenerationSystem();
        
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
        this.modeCounter++;
        
        // Switch generation mode periodically
        if (this.modeCounter >= this.modeSwitchInterval) {
            this.switchGenerationMode();
            this.modeCounter = 0;
        }
        
        // Check if this should be a checkpoint platform
        const isCheckpoint = this.platformCount % this.CHECKPOINT_INTERVAL === 0;
        
        // Calculate distance to next checkpoint for difficulty scaling
        const platformsUntilCheckpoint = this.CHECKPOINT_INTERVAL - (this.platformCount % this.CHECKPOINT_INTERVAL);
        const isInDifficultyZone = platformsUntilCheckpoint <= this.PRE_CHECKPOINT_DIFFICULTY_ZONE && platformsUntilCheckpoint > 0;
        
        if (isCheckpoint) {
            // Checkpoint platforms are single wall-to-wall platforms (safe haven)
            this.generateSinglePlatform(this.scene.scale.width, this.scene.scale.width / 2, true);
            console.log(`🏁 Generated checkpoint platform #${this.platformCount}`);
        } else {
            // Use new mode-based generation system
            this.generatePlatformsWithMode(isInDifficultyZone, platformsUntilCheckpoint);
        }
        
        // Update next platform position for the next level
        this.highestGeneratedY = this.nextPlatformY;
        this.nextPlatformY -= this.generateVerticalSpacing();
    }

    private switchGenerationMode(): void {
        const modes: PlatformGenerationMode[] = ['tight', 'snake', 'scattered', 'staircase'];
        const currentIndex = modes.indexOf(this.currentMode);
        
        // Pick a different random mode
        let newMode: PlatformGenerationMode;
        do {
            newMode = modes[Math.floor(Math.random() * modes.length)];
        } while (newMode === this.currentMode && modes.length > 1);
        
        this.currentMode = newMode;
        this.modeDirection = Math.random() < 0.5 ? -1 : 1; // Reset direction for snake mode
        
        console.log(`🔄 Switched to ${this.currentMode} generation mode`);
        
        EventBus.emit('generation-mode-changed', {
            newMode: this.currentMode,
            platformCount: this.platformCount,
            height: Math.abs(this.nextPlatformY)
        });
    }
    
    private generatePlatformsWithMode(isInDifficultyZone: boolean, platformsUntilCheckpoint?: number): void {
        const currentHeight = Math.abs(this.nextPlatformY);
        
        const request: PlatformGenerationRequest = {
            y: this.nextPlatformY,
            height: currentHeight,
            mode: this.currentMode,
            platformCount: this.platformCount,
            isCheckpoint: false,
            isInDifficultyZone,
            platformsUntilCheckpoint
        };
        
        // Generate platforms based on current mode
        let platforms: GeneratedPlatform[] = [];
        
        switch (this.currentMode) {
            case 'tight':
                platforms = this.generateTightMode(request);
                break;
            case 'snake':
                platforms = this.generateSnakeMode(request);
                break;
            case 'scattered':
                platforms = this.generateScatteredMode(request);
                break;
            case 'staircase':
                platforms = this.generateStaircaseMode(request);
                break;
        }
        
        // Apply post-processors in priority order
        for (const processor of this.processors) {
            platforms = processor.process(platforms, request);
        }
        
        // Create the final platforms
        this.createPlatformsFromGenerated(platforms);
    }

    private generateTightMode(request: PlatformGenerationRequest): GeneratedPlatform[] {
        const heightMultiplier = this.getHeightDifficultyMultiplier(request.height);
        const tileWidth = 64;
        
        // Get tighter as we go higher
        const baseTiles = request.isInDifficultyZone ? 1 : 2;
        const maxTiles = Math.max(1, Math.floor(4 - heightMultiplier));
        const numTiles = Phaser.Math.Between(baseTiles, Math.max(baseTiles, maxTiles));
        
        const platformWidth = numTiles * tileWidth;
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 100;
        
        // Closer horizontal spacing at higher altitudes
        const baseSpacing = 150;
        const minSpacing = Math.max(80, baseSpacing - (heightMultiplier * 40));
        
        const platforms: GeneratedPlatform[] = [];
        
        // Generate 1-2 tight platforms close together
        const numPlatforms = Math.random() < 0.6 ? 1 : 2;
        
        for (let i = 0; i < numPlatforms; i++) {
            const platformHalfWidth = platformWidth / 2;
            const minX = wallBuffer + platformHalfWidth;
            const maxX = screenWidth - wallBuffer - platformHalfWidth;
            
            let platformX: number;
            if (numPlatforms === 1) {
                platformX = Phaser.Math.Between(minX, maxX);
            } else {
                // Place platforms close together horizontally
                const centerX = screenWidth / 2;
                const offset = (i === 0 ? -1 : 1) * (minSpacing / 2);
                platformX = Math.max(minX, Math.min(maxX, centerX + offset));
            }
            
            platforms.push({
                x: platformX,
                y: request.y,
                width: platformWidth,
                shouldGenerate: true,
                metadata: { tiles: numTiles, mode: 'tight', platformIndex: i }
            });
        }
        
        return platforms;
    }
    
    private generateSnakeMode(request: PlatformGenerationRequest): GeneratedPlatform[] {
        const heightMultiplier = this.getHeightDifficultyMultiplier(request.height);
        const tileWidth = 64;
        
        const numTiles = request.isInDifficultyZone ? 
            Phaser.Math.Between(1, 3) : 
            Phaser.Math.Between(3, Math.max(3, 6 - Math.floor(heightMultiplier)));
        
        const platformWidth = numTiles * tileWidth;
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 100;
        const platformHalfWidth = platformWidth / 2;
        
        // Snake pattern: alternate between left and right sides
        const sideWidth = (screenWidth - 2 * wallBuffer) / 2;
        const leftCenter = wallBuffer + sideWidth / 2;
        const rightCenter = screenWidth - wallBuffer - sideWidth / 2;
        
        // Switch direction based on mode counter for zigzag effect
        const isLeftSide = (this.modeCounter % 2 === 0) === (this.modeDirection === 1);
        const targetCenter = isLeftSide ? leftCenter : rightCenter;
        
        // Add some randomness within the side
        const variance = Math.min(50, sideWidth / 4);
        const platformX = targetCenter + Phaser.Math.Between(-variance, variance);
        
        return [{
            x: Math.max(wallBuffer + platformHalfWidth, Math.min(screenWidth - wallBuffer - platformHalfWidth, platformX)),
            y: request.y,
            width: platformWidth,
            shouldGenerate: true,
            metadata: { tiles: numTiles, mode: 'snake', side: isLeftSide ? 'left' : 'right' }
        }];
    }
    
    private generateScatteredMode(request: PlatformGenerationRequest): GeneratedPlatform[] {
        const heightMultiplier = this.getHeightDifficultyMultiplier(request.height);
        const tileWidth = 64;
        
        // Larger platforms but more spread out
        const baseTiles = request.isInDifficultyZone ? 2 : 4;
        const maxTiles = Math.max(baseTiles, Math.floor(8 - heightMultiplier));
        const numTiles = Phaser.Math.Between(baseTiles, maxTiles);
        
        const platformWidth = numTiles * tileWidth;
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 120; // Larger buffer for scattered mode
        
        const platformHalfWidth = platformWidth / 2;
        const minX = wallBuffer + platformHalfWidth;
        const maxX = screenWidth - wallBuffer - platformHalfWidth;
        
        // Position randomly but ensure it's challenging to reach
        const platformX = Phaser.Math.Between(minX, maxX);
        
        return [{
            x: platformX,
            y: request.y,
            width: platformWidth,
            shouldGenerate: true,
            metadata: { tiles: numTiles, mode: 'scattered', requiresMomentum: true }
        }];
    }
    
    private generateStaircaseMode(request: PlatformGenerationRequest): GeneratedPlatform[] {
        const heightMultiplier = this.getHeightDifficultyMultiplier(request.height);
        const tileWidth = 64;
        
        const numTiles = request.isInDifficultyZone ? 
            Phaser.Math.Between(1, 2) : 
            Phaser.Math.Between(2, Math.max(2, 5 - Math.floor(heightMultiplier)));
        
        const platformWidth = numTiles * tileWidth;
        const screenWidth = this.scene.scale.width;
        const wallBuffer = 100;
        
        // Create step pattern - alternating ascending/descending
        const isAscending = (this.modeCounter % 4) < 2; // 2 platforms up, 2 platforms down
        const stepDirection = isAscending ? this.modeDirection : -this.modeDirection;
        
        const centerX = screenWidth / 2;
        const maxOffset = (screenWidth / 2) - wallBuffer - (platformWidth / 2);
        const stepSize = Math.min(maxOffset / 3, 80); // Smaller steps at higher difficulty
        
        const stepPosition = (this.modeCounter % 4) * stepDirection;
        const platformX = centerX + (stepPosition * stepSize);
        
        return [{
            x: Math.max(wallBuffer + platformWidth/2, Math.min(screenWidth - wallBuffer - platformWidth/2, platformX)),
            y: request.y,
            width: platformWidth,
            shouldGenerate: true,
            metadata: { tiles: numTiles, mode: 'staircase', step: stepPosition, ascending: isAscending }
        }];
    }
    
    private getHeightDifficultyMultiplier(height: number): number {
        // Progressive difficulty scaling: 0 at ground level, increases with height
        // Apply configuration-based scaling
        const baseScaling = height / 1000; // 1.0x per 1000px
        const configScaling = baseScaling * this.config.generation.heightDifficultyScaling;
        return Math.min(3.0, configScaling); // Cap at 3.0x multiplier
    }

    private processPlatformDeletion(platforms: GeneratedPlatform[], request: PlatformGenerationRequest): GeneratedPlatform[] {
        // Progressive platform deletion based on height and configuration
        const config = this.config.generation;
        
        let deletionChance = 0;
        if (request.height > config.deletionStartHeight) {
            // Scale deletion chance based on height above start threshold
            const heightProgress = (request.height - config.deletionStartHeight) / 2500; // Scale over 2500px
            deletionChance = Math.min(config.maxDeletionChance, heightProgress * config.maxDeletionChance);
            
            // Apply difficulty scaling multiplier
            deletionChance *= config.heightDifficultyScaling;
            
            // Reduce deletion chance in difficulty zones to avoid making it impossible
            if (request.isInDifficultyZone) {
                deletionChance *= 0.5;
            }
        }
        
        // Apply deletion but ensure at least one platform always remains
        const processedPlatforms = platforms.map(platform => {
            if (Math.random() < deletionChance) {
                console.log(`🗑️ Deleted platform at height ${Math.abs(request.y).toFixed(0)}m (${(deletionChance * 100).toFixed(1)}% chance)`);
                return { ...platform, shouldGenerate: false };
            }
            return platform;
        });
        
        const remainingPlatforms = processedPlatforms.filter(platform => platform.shouldGenerate);
        
        // CRITICAL: Ensure at least one platform survives to prevent gaps
        if (remainingPlatforms.length === 0 && platforms.length > 0) {
            // Pick a random platform to force-keep alive
            const survivorIndex = Math.floor(Math.random() * processedPlatforms.length);
            processedPlatforms[survivorIndex].shouldGenerate = true;
            console.log(`🛡️ Force-preserved platform at height ${Math.abs(request.y).toFixed(0)}m to prevent gap`);
            return processedPlatforms.filter(platform => platform.shouldGenerate);
        }
        
        return remainingPlatforms;
    }
    
    private createPlatformsFromGenerated(platforms: GeneratedPlatform[]): void {
        platforms.forEach(platform => {
            if (platform.shouldGenerate) {
                const result = this.createPlatform(platform.x, platform.y, platform.width);
                this.trackPlatform(result.group, result.platformId, platform.y, platform.width, false);
                
                if (result.group) {
                    EventBus.emit('platform-generated', {
                        id: result.platformId,
                        x: platform.x,
                        y: platform.y,
                        width: platform.width,
                        group: result.group,
                        mode: platform.metadata?.mode,
                        metadata: platform.metadata
                    });
                }
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
        this.modeSwitchInterval = this.config.generation.modeSwitchInterval;
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
        
        // Clear tracking maps and reset generation state
        this.generatedPlatforms.clear();
        this.checkpoints.length = 0;
        this.modeCounter = 0;
        this.modeDirection = 1;
        this.processors.length = 0;
        
        // Finally clear and destroy the main platforms group
        if (this.platforms && this.platforms.children) {
            this.platforms.clear(true, true);
        }
    }
}