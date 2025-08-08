/**
 * ItemSystem.ts
 * 
 * Manages the player's active item inventory (Q and E slots)
 * Handles item acquisition, usage, and lifecycle
 */

import { Scene } from 'phaser';
import { ItemType, ItemConfig, ITEM_CONFIGS } from './ItemType';
import { EventBus } from './EventBus';

export interface Item {
    type: ItemType;
    config: ItemConfig;
    chargesRemaining?: number;
    lastUsed: number; // timestamp for cooldown tracking
    id: string; // unique identifier for this item instance
}

export interface InventorySlot {
    item: Item | null;
    key: 'Q' | 'E';
}

export class ItemSystem {
    private scene: Scene;
    private inventory: Map<'Q' | 'E', Item | null> = new Map();
    private nextItemId: number = 1;
    
    // Input keys
    private qKey: Phaser.Input.Keyboard.Key;
    private eKey: Phaser.Input.Keyboard.Key;
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Initialize empty inventory
        this.inventory.set('Q', null);
        this.inventory.set('E', null);
        
        this.setupInput();
        this.setupEventListeners();
    }
    
    private setupInput(): void {
        // Add Q and E keys for item usage
        const keyQ = this.scene.input.keyboard?.addKey('Q');
        const keyE = this.scene.input.keyboard?.addKey('E');
        
        if (keyQ && keyE) {
            this.qKey = keyQ;
            this.eKey = keyE;
            
            // Set up key press handlers
            this.qKey.on('down', () => this.useItem('Q'));
            this.eKey.on('down', () => this.useItem('E'));
        }
    }
    
    private setupEventListeners(): void {
        // Listen for item acquisition events
        EventBus.on('item-acquired', (data: { itemType: ItemType }) => {
            this.addItem(data.itemType);
        });
        
        // Listen for inventory requests from UI
        EventBus.on('get-inventory', () => {
            EventBus.emit('inventory-updated', this.getInventoryData());
        });
    }
    
    /**
     * Add an item to the inventory
     * Will place in Q slot first, then E slot, or replace oldest item
     */
    public addItem(itemType: ItemType): boolean {
        const config = ITEM_CONFIGS[itemType];
        if (!config) {
            console.warn(`Unknown item type: ${itemType}`);
            return false;
        }
        
        const newItem: Item = {
            type: itemType,
            config: config,
            chargesRemaining: config.charges,
            lastUsed: 0,
            id: `item_${this.nextItemId++}`
        };
        
        // Try to place in Q slot first
        if (!this.inventory.get('Q')) {
            this.inventory.set('Q', newItem);
            this.notifyInventoryChanged();
            return true;
        }
        
        // Try E slot
        if (!this.inventory.get('E')) {
            this.inventory.set('E', newItem);
            this.notifyInventoryChanged();
            return true;
        }
        
        // Both slots full - replace Q slot (FIFO)
        this.inventory.set('Q', newItem);
        this.notifyInventoryChanged();
        return true;
    }
    
    /**
     * Use an item from the specified slot
     */
    public useItem(slot: 'Q' | 'E'): boolean {
        const item = this.inventory.get(slot);
        if (!item) {
            console.log(`No item in ${slot} slot`);
            return false;
        }
        
        // Check cooldown
        const now = Date.now();
        const timeSinceLastUse = now - item.lastUsed;
        const cooldown = item.config.cooldown || 0;
        
        if (timeSinceLastUse < cooldown) {
            const remainingCooldown = Math.ceil((cooldown - timeSinceLastUse) / 1000);
            console.log(`Item on cooldown (${remainingCooldown}s remaining)`);
            return false;
        }
        
        // Check charges
        if (item.chargesRemaining !== undefined && item.chargesRemaining <= 0) {
            console.log('Item has no charges remaining');
            return false;
        }
        
        // Use the item
        const success = this.executeItem(item);
        
        if (success) {
            item.lastUsed = now;
            
            // Consume charge if applicable
            if (item.chargesRemaining !== undefined) {
                item.chargesRemaining--;
                
                // Remove item if no charges left
                if (item.chargesRemaining <= 0) {
                    this.inventory.set(slot, null);
                }
            }
            
            this.notifyInventoryChanged();
        }
        
        return success;
    }
    
    /**
     * Execute the item's effect based on its type
     */
    private executeItem(item: Item): boolean {
        switch (item.type) {
            case ItemType.PLATFORM_SPAWNER:
                return this.usePlatformSpawner();
            default:
                console.warn(`No handler for item type: ${item.type}`);
                return false;
        }
    }
    
    /**
     * Handle platform spawner item usage
     */
    private usePlatformSpawner(): boolean {
        // Request player position and emit platform spawn event
        EventBus.emit('get-player-position');
        
        // Listen for the response and then emit the spawn event
        EventBus.once('player-position-response', (playerPos: { x: number, y: number }) => {
            EventBus.emit('spawn-platform-at-player', playerPos);
        });
        
        // Play usage sound if configured
        const config = ITEM_CONFIGS[ItemType.PLATFORM_SPAWNER];
        if (config.audioKey) {
            // Try to play sound (may not exist yet)
            try {
                this.scene.sound.play(config.audioKey, { volume: 0.3 });
            } catch (e) {
                // Sound not loaded, skip
            }
        }
        
        console.log('🛠️ Platform spawner used!');
        return true;
    }
    
    /**
     * Get current inventory data for UI display
     */
    public getInventoryData(): InventorySlot[] {
        return [
            { item: this.inventory.get('Q') || null, key: 'Q' },
            { item: this.inventory.get('E') || null, key: 'E' }
        ];
    }
    
    /**
     * Notify systems that inventory has changed
     */
    private notifyInventoryChanged(): void {
        EventBus.emit('inventory-updated', this.getInventoryData());
    }
    
    /**
     * Clean up resources
     */
    public destroy(): void {
        EventBus.off('item-acquired');
        EventBus.off('get-inventory');
        
        if (this.qKey) {
            this.qKey.removeAllListeners();
        }
        if (this.eKey) {
            this.eKey.removeAllListeners();
        }
    }
}