/**
 * PlatformSpawner.ts
 * 
 * Handles spawning platforms at player location when platform spawner item is used
 */

import { Scene } from 'phaser';
import { Player } from '../Player';
import { PlatformManager } from '../PlatformManager';
import { EventBus } from '../EventBus';
import { ItemType } from './ItemType';

export class PlatformSpawner {
    private scene: Scene;
    private player: Player;
    private platformManager: PlatformManager;
    
    // Platform spawning configuration
    private readonly PLATFORM_WIDTH = 192; // 3 tiles * 64px each = 192px
    private readonly SPAWN_OFFSET_Y = 10; // Spawn slightly below player feet

    constructor(scene: Scene, player: Player, platformManager: PlatformManager) {
        this.scene = scene;
        this.player = player;
        this.platformManager = platformManager;
        
        this.setupEventListeners();
        console.log('🏗️ PlatformSpawner initialized');
    }

    private setupEventListeners(): void {
        EventBus.on('item-used', this.onItemUsed.bind(this));
    }

    private onItemUsed(data: { slotKey: string; itemType: ItemType; item: any }): void {
        if (data.itemType === ItemType.PLATFORM_SPAWNER) {
            this.spawnPlatformAtPlayer();
        }
    }

    private spawnPlatformAtPlayer(): void {
        // Get player position
        const playerX = this.player.x;
        const playerY = this.player.y + this.SPAWN_OFFSET_Y;
        
        // Ensure platform doesn't go outside screen bounds
        const screenWidth = this.scene.scale.width;
        const halfPlatformWidth = this.PLATFORM_WIDTH / 2;
        
        let spawnX = playerX;
        
        // Clamp platform position to stay within screen bounds
        if (spawnX - halfPlatformWidth < 0) {
            spawnX = halfPlatformWidth;
        } else if (spawnX + halfPlatformWidth > screenWidth) {
            spawnX = screenWidth - halfPlatformWidth;
        }
        
        console.log(`🏗️ Spawning platform at (${spawnX.toFixed(0)}, ${playerY.toFixed(0)})`);
        
        try {
            // Use the platform manager to create the platform
            const result = this.platformManager.createPlatform(spawnX, playerY, this.PLATFORM_WIDTH);
            
            if (result && result.group) {
                // Play sound effect
                this.scene.sound.play('sfx_select', { volume: 0.5 });
                
                // Emit event for any visual effects
                EventBus.emit('platform-spawned', {
                    x: spawnX,
                    y: playerY,
                    width: this.PLATFORM_WIDTH,
                    platformId: result.platformId
                });
                
                console.log(`✅ Platform spawned successfully: ${result.platformId}`);
            } else {
                console.error('❌ Failed to spawn platform - invalid result from PlatformManager');
            }
        } catch (error) {
            console.error('❌ Error spawning platform:', error);
        }
    }

    public destroy(): void {
        EventBus.off('item-used', this.onItemUsed.bind(this));
        console.log('🏗️ PlatformSpawner destroyed');
    }
}