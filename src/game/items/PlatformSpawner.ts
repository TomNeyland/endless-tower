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
        // Get player position at feet
        const playerX = this.player.x;
        const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        const playerFeetY = this.player.y + (playerBody.height / 2) + this.SPAWN_OFFSET_Y;
        
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
        
        console.log(`🏗️ Spawning platform at player feet (${spawnX.toFixed(0)}, ${playerFeetY.toFixed(0)})`);
        
        try {
            // Use the platform manager to create the platform
            const result = this.platformManager.createPlatform(spawnX, playerFeetY, this.PLATFORM_WIDTH);
            
            if (result && result.group) {
                // CRITICAL: Emit 'platform-generated' event so OneWayPlatform collision system picks it up
                EventBus.emit('platform-generated', {
                    group: result.group
                });
                
                // Play sound effect
                this.scene.sound.play('sfx_select', { volume: 0.5 });
                
                // Emit event for any visual effects
                EventBus.emit('platform-spawned', {
                    x: spawnX,
                    y: playerFeetY,
                    width: this.PLATFORM_WIDTH,
                    platformId: result.platformId
                });
                
                console.log(`✅ Platform spawned successfully at feet: ${result.platformId}`);
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