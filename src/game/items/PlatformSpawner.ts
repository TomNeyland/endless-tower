/**
 * PlatformSpawner.ts
 * 
 * Handles the platform spawning functionality
 * Spawns platforms at player location when platform spawner items are used
 */

import { Scene } from 'phaser';
import { Player } from '../Player';
import { PlatformManager } from '../PlatformManager';
import { EventBus } from '../EventBus';

export class PlatformSpawner {
    private scene: Scene;
    private player: Player;
    private platformManager: PlatformManager;
    
    constructor(scene: Scene, player: Player, platformManager: PlatformManager) {
        this.scene = scene;
        this.player = player;
        this.platformManager = platformManager;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for platform spawner usage events
        EventBus.on('platform-spawner-used', this.spawnPlatformAtPlayer.bind(this));
        
        // Backwards compatibility - listen for old event format
        EventBus.on('spawn-platform-at-player', (playerPos: { x: number, y: number }) => {
            this.spawnPlatformAtPosition(playerPos.x, playerPos.y);
        });
        
        // Handle player position requests (for backwards compatibility)
        EventBus.on('get-player-position', () => {
            const playerPos = { x: this.player.x, y: this.player.y };
            EventBus.emit('player-position-response', playerPos);
        });
    }
    
    /**
     * Spawn a platform at the player's current position
     */
    private spawnPlatformAtPlayer(): void {
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        console.log(`🏗️ Spawning platform at player position: (${playerX}, ${playerY})`);
        
        this.spawnPlatformAtPosition(playerX, playerY);
    }
    
    /**
     * Spawn a platform at a specific position
     */
    private spawnPlatformAtPosition(x: number, y: number): void {
        // Use the PlatformManager to create a spawned platform
        // Adjust Y position to be slightly below player (so they can land on it)
        const platformY = y + 50; // Spawn 50 pixels below player
        
        // Create a 3-tile wide platform (similar to normal platforms)
        const platformWidth = 150; // 3 tiles wide
        this.platformManager.createPlatform(x, platformY, platformWidth);
        
        console.log(`✅ Platform spawned at (${x}, ${platformY})`);
    }
    
    /**
     * Clean up resources
     */
    public destroy(): void {
        EventBus.off('platform-spawner-used');
        EventBus.off('spawn-platform-at-player');
        EventBus.off('get-player-position');
    }
}