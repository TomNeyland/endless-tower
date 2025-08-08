/**
 * PowerupManager.ts
 * 
 * Manages powerup spawning, lifecycle, and collection system
 * Integrates with platform generation to spawn powerups every 30 floors
 */

import { Scene } from 'phaser';
import { Player } from '../Player';
import { GameConfiguration } from '../GameConfiguration';
import { Powerup, PowerupEffectData } from './Powerup';
import { PowerupType, POWERUP_CONFIGS } from './PowerupType';
import { EventBus } from '../EventBus';

export class PowerupManager {
    private scene: Scene;
    private player: Player;
    private gameConfig: GameConfiguration;
    private activePowerups: Phaser.GameObjects.Group;
    private platformCount: number = 0;
    private readonly SPAWN_INTERVAL = 30; // Every 30 platforms
    private lastSpawnPlatform: number = 0;

    constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
        this.scene = scene;
        this.player = player;
        this.gameConfig = gameConfig;
        
        // Create group for managing powerup instances
        this.activePowerups = scene.add.group();
        
        this.setupEventListeners();
        
        console.log('💎 PowerupManager initialized');
    }

    private setupEventListeners(): void {
        // Listen for platform creation events to track spawning
        EventBus.on('platform-created', this.onPlatformCreated.bind(this));
        
        // Listen for game reset to clean up
        EventBus.on('game-fully-reset', this.onGameReset.bind(this));
    }

    private onPlatformCreated(platformData: any): void {
        this.platformCount++;
        
        // Check if it's time to spawn a powerup
        if (this.platformCount - this.lastSpawnPlatform >= this.SPAWN_INTERVAL) {
            this.spawnPowerupNearPlatform(platformData);
            this.lastSpawnPlatform = this.platformCount;
        }
    }

    private spawnPowerupNearPlatform(platformData: any): void {
        if (!platformData || !platformData.x || !platformData.y) {
            console.warn('⚠️ Invalid platform data for powerup spawn');
            return;
        }

        // Choose a random powerup type based on rarity weights
        const powerupType = this.selectRandomPowerupType();
        
        // Position powerup above the platform
        const powerupX = platformData.x + (Math.random() - 0.5) * 100; // Add some randomness
        const powerupY = platformData.y - 60; // Hover above platform
        
        // Create the powerup
        const powerup = new Powerup(this.scene, powerupX, powerupY, powerupType);
        this.activePowerups.add(powerup);
        
        console.log(`💎 Spawned ${POWERUP_CONFIGS[powerupType].name} at platform ${this.platformCount}`);
    }

    private selectRandomPowerupType(): PowerupType {
        // Create weighted array based on rarity (lower rarity = more common)
        const weightedTypes: PowerupType[] = [];
        
        Object.values(PowerupType).forEach(type => {
            const config = POWERUP_CONFIGS[type];
            const weight = 6 - config.rarity; // Invert rarity to weight (5 rarity = 1 weight, 1 rarity = 5 weight)
            
            for (let i = 0; i < weight; i++) {
                weightedTypes.push(type);
            }
        });
        
        // Select random type from weighted array
        const randomIndex = Math.floor(Math.random() * weightedTypes.length);
        return weightedTypes[randomIndex];
    }

    public update(): void {
        // Check for collisions with active powerups
        this.activePowerups.children.entries.forEach((child) => {
            const powerup = child as Powerup;
            
            if (!powerup.isCollected() && powerup.checkCollision(this.player)) {
                powerup.collect(this.player);
            } else {
                powerup.update();
            }
        });
        
        // Clean up collected powerups
        this.cleanupCollectedPowerups();
    }

    private cleanupCollectedPowerups(): void {
        const toRemove: Powerup[] = [];
        
        this.activePowerups.children.entries.forEach((child) => {
            const powerup = child as Powerup;
            if (powerup.isCollected()) {
                toRemove.push(powerup);
            }
        });
        
        toRemove.forEach((powerup) => {
            this.activePowerups.remove(powerup);
        });
    }

    private onGameReset(): void {
        this.reset();
    }

    public reset(): void {
        console.log('🔄 PowerupManager reset');
        
        // Clear all active powerups
        this.activePowerups.clear(true, true);
        
        // Reset counters
        this.platformCount = 0;
        this.lastSpawnPlatform = 0;
    }

    public getPowerupCount(): number {
        return this.activePowerups.children.size;
    }

    public getActivePowerups(): Phaser.GameObjects.Group {
        return this.activePowerups;
    }

    public destroy(): void {
        // Clean up event listeners
        EventBus.off('platform-created', this.onPlatformCreated.bind(this));
        EventBus.off('game-fully-reset', this.onGameReset.bind(this));
        
        // Destroy all powerups
        this.activePowerups.destroy(true);
        
        console.log('💎 PowerupManager destroyed');
    }
}