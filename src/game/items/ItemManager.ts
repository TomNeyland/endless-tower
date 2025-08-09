/**
 * ItemManager.ts
 * 
 * Coordinates between inventory system and item execution systems
 * Handles item acquisition and delegates usage to appropriate handlers
 */

import { Scene } from 'phaser';
import { InventorySystem, Item } from './InventorySystem';
import { ItemType } from './ItemType';
import { EventBus } from '../EventBus';

export class ItemManager {
    private scene: Scene;
    private inventorySystem: InventorySystem;
    
    constructor(scene: Scene, inventorySystem: InventorySystem) {
        this.scene = scene;
        this.inventorySystem = inventorySystem;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for item acquisition events
        EventBus.on('item-acquired', (data: { itemType: ItemType }) => {
            this.givePlayerItem(data.itemType);
        });
        
        // Listen for item usage events from InventorySystem
        EventBus.on('item-used', (data: { item: Item, slot: 'Q' | 'E' }) => {
            this.handleItemUsage(data.item, data.slot);
        });
    }
    
    /**
     * Give a player an item - adds to inventory
     */
    public givePlayerItem(itemType: ItemType): boolean {
        return this.inventorySystem.addItem(itemType);
    }
    
    /**
     * Handle the execution of an item's effects
     */
    private handleItemUsage(item: Item, slot: 'Q' | 'E'): void {
        switch (item.type) {
            case ItemType.PLATFORM_SPAWNER:
                this.handlePlatformSpawner();
                break;
            default:
                console.warn(`No handler for item type: ${item.type}`);
        }
        
        // Play usage sound if configured
        if (item.config.audioKey) {
            try {
                this.scene.sound.play(item.config.audioKey, { volume: 0.3 });
            } catch (e) {
                // Sound not loaded, skip
            }
        }
    }
    
    /**
     * Handle platform spawner item usage
     */
    private handlePlatformSpawner(): void {
        console.log('🛠️ Platform spawner used! Delegating to PlatformSpawner...');
        EventBus.emit('platform-spawner-used');
    }
    
    /**
     * Reset manager state
     */
    public reset(): void {
        // ItemManager doesn't have persistent state to reset
        // The inventory system handles its own reset
    }
    
    /**
     * Clean up resources
     */
    public destroy(): void {
        EventBus.off('item-acquired');
        EventBus.off('item-used');
    }
}