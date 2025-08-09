/**
 * InventorySystem.ts
 * 
 * Manages the player's inventory with Q and E slots for active items
 */

import { Scene } from 'phaser';
import { Item } from './Item';
import { ItemType } from './ItemType';
import { EventBus } from '../EventBus';

export interface InventorySlot {
    item: Item | null;
    key: string; // 'Q' or 'E'
}

export class InventorySystem {
    private scene: Scene;
    private slots: Map<string, InventorySlot> = new Map();
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Initialize Q and E slots
        this.slots.set('Q', { item: null, key: 'Q' });
        this.slots.set('E', { item: null, key: 'E' });
        
        this.setupEventListeners();
        console.log('🎒 InventorySystem initialized with Q and E slots');
    }

    private setupEventListeners(): void {
        EventBus.on('game-fully-reset', this.onGameReset.bind(this));
        EventBus.on('player-use-item', this.onPlayerUseItem.bind(this));
    }

    private onPlayerUseItem(data: { slotKey: string }): void {
        console.log(`🎒 Received request to use item in slot ${data.slotKey}`);
        this.useItem(data.slotKey);
    }

    public addItem(item: Item): boolean {
        // Try to add to first empty slot
        for (const [key, slot] of this.slots) {
            if (slot.item === null) {
                slot.item = item;
                console.log(`🎒 Added ${item.getConfig().name} to slot ${key}`);
                
                EventBus.emit('inventory-slot-changed', {
                    slotKey: key,
                    item: item,
                    isEmpty: false
                });
                
                return true;
            }
        }
        
        console.warn('🎒 Inventory full, cannot add item');
        return false;
    }

    public useItem(slotKey: string): boolean {
        const slot = this.slots.get(slotKey);
        if (!slot || !slot.item) {
            console.warn(`🎒 No item in slot ${slotKey}`);
            return false;
        }

        const item = slot.item;
        const itemType = item.getType();
        
        if (!item.canUse()) {
            console.warn(`🎒 Item ${item.getConfig().name} cannot be used`);
            return false;
        }

        // Use the item
        const used = item.use();
        if (used) {
            console.log(`🎒 Used item ${item.getConfig().name} from slot ${slotKey}`);
            
            // Emit item use event
            EventBus.emit('item-used', {
                slotKey: slotKey,
                itemType: itemType,
                item: item
            });
            
            // Remove if consumed
            if (item.isConsumed()) {
                this.removeItemFromSlot(slotKey);
            } else {
                // Update UI for changed item state
                EventBus.emit('inventory-slot-changed', {
                    slotKey: slotKey,
                    item: item,
                    isEmpty: false
                });
            }
        }
        
        return used;
    }

    public removeItemFromSlot(slotKey: string): boolean {
        const slot = this.slots.get(slotKey);
        if (!slot || !slot.item) {
            return false;
        }

        console.log(`🎒 Removed ${slot.item.getConfig().name} from slot ${slotKey}`);
        slot.item = null;
        
        EventBus.emit('inventory-slot-changed', {
            slotKey: slotKey,
            item: null,
            isEmpty: true
        });
        
        return true;
    }

    public getItem(slotKey: string): Item | null {
        const slot = this.slots.get(slotKey);
        return slot ? slot.item : null;
    }

    public getSlots(): Map<string, InventorySlot> {
        return new Map(this.slots);
    }

    public hasSpace(): boolean {
        return Array.from(this.slots.values()).some(slot => slot.item === null);
    }

    public getEmptySlotKeys(): string[] {
        return Array.from(this.slots.entries())
            .filter(([key, slot]) => slot.item === null)
            .map(([key, slot]) => key);
    }

    public isSlotEmpty(slotKey: string): boolean {
        const slot = this.slots.get(slotKey);
        return slot ? slot.item === null : true;
    }

    private onGameReset(): void {
        this.reset();
    }

    public reset(): void {
        console.log('🔄 InventorySystem reset');
        
        // Clear all slots
        for (const [key, slot] of this.slots) {
            if (slot.item) {
                slot.item = null;
                EventBus.emit('inventory-slot-changed', {
                    slotKey: key,
                    item: null,
                    isEmpty: true
                });
            }
        }
        
        // Give player a starter platform spawner item
        const starterItem = new Item(ItemType.PLATFORM_SPAWNER);
        this.addItem(starterItem);
        console.log('🎒 Given starter platform spawner item after reset');
    }

    public destroy(): void {
        EventBus.off('game-fully-reset', this.onGameReset.bind(this));
        console.log('🎒 InventorySystem destroyed');
    }
}