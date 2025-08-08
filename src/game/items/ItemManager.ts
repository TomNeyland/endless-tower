/**
 * ItemManager.ts
 * 
 * Coordinates between inventory system and item effects
 */

import { Scene } from 'phaser';
import { InventorySystem } from './InventorySystem';
import { Item } from './Item';
import { ItemType } from './ItemType';
import { EventBus } from '../EventBus';

export class ItemManager {
    private scene: Scene;
    private inventorySystem: InventorySystem;

    constructor(scene: Scene, inventorySystem: InventorySystem) {
        this.scene = scene;
        this.inventorySystem = inventorySystem;
        
        this.setupEventListeners();
        console.log('🎮 ItemManager initialized');
    }

    private setupEventListeners(): void {
        EventBus.on('player-use-item', this.onPlayerUseItem.bind(this));
        EventBus.on('game-fully-reset', this.onGameReset.bind(this));
    }

    private onPlayerUseItem(data: { slotKey: string }): void {
        const success = this.inventorySystem.useItem(data.slotKey);
        if (!success) {
            console.log(`🎮 No item to use in slot ${data.slotKey}`);
        }
    }

    public givePlayerItem(itemType: ItemType): boolean {
        const item = new Item(itemType);
        return this.inventorySystem.addItem(item);
    }

    public getInventorySystem(): InventorySystem {
        return this.inventorySystem;
    }

    private onGameReset(): void {
        // Reset handled by inventory system
    }

    public destroy(): void {
        EventBus.off('player-use-item', this.onPlayerUseItem.bind(this));
        EventBus.off('game-fully-reset', this.onGameReset.bind(this));
        console.log('🎮 ItemManager destroyed');
    }
}