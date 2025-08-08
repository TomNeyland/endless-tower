/**
 * InventoryUI.ts
 * 
 * Displays the Q and E inventory slots in a compact UI
 */

import { Scene } from 'phaser';
import { InventorySystem } from './InventorySystem';
import { Item } from './Item';
import { EventBus } from '../EventBus';

export class InventoryUI {
    private scene: Scene;
    private inventorySystem: InventorySystem;
    private container: Phaser.GameObjects.Container;
    private slotContainers: Map<string, Phaser.GameObjects.Container> = new Map();
    private readonly UI_DEPTH = 1000;
    private readonly SLOT_SIZE = 50;
    private readonly SLOT_SPACING = 60;

    constructor(scene: Scene, inventorySystem: InventorySystem) {
        this.scene = scene;
        this.inventorySystem = inventorySystem;
        
        this.setupUI();
        this.setupEventListeners();
        
        console.log('🎨 InventoryUI initialized');
    }

    private setupEventListeners(): void {
        EventBus.on('inventory-slot-changed', this.onSlotChanged.bind(this));
        EventBus.on('game-fully-reset', this.onGameReset.bind(this));
    }

    private setupUI(): void {
        // Create main container positioned in bottom-left corner
        const x = 20;
        const y = this.scene.scale.height - 80;
        
        this.container = this.scene.add.container(x, y);
        this.container.setDepth(this.UI_DEPTH);
        this.container.setScrollFactor(0, 0); // Keep UI fixed to screen
        
        // Create slots for Q and E
        this.createSlot('Q', 0);
        this.createSlot('E', this.SLOT_SPACING);
    }

    private createSlot(key: string, offsetX: number): void {
        const slotContainer = this.scene.add.container(offsetX, 0);
        
        // Background for slot
        const background = this.scene.add.graphics();
        background.fillStyle(0x333333, 0.8);
        background.fillRoundedRect(-this.SLOT_SIZE/2, -this.SLOT_SIZE/2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
        background.lineStyle(2, 0x666666, 1);
        background.strokeRoundedRect(-this.SLOT_SIZE/2, -this.SLOT_SIZE/2, this.SLOT_SIZE, this.SLOT_SIZE, 8);
        
        // Key label
        const keyText = this.scene.add.text(0, this.SLOT_SIZE/2 + 10, key, {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'monospace'
        });
        keyText.setOrigin(0.5, 0);
        
        // Empty slot indicator
        const emptyText = this.scene.add.text(0, -2, '?', {
            fontSize: '24px',
            color: '#666666',
            fontStyle: 'bold'
        });
        emptyText.setOrigin(0.5, 0.5);
        
        slotContainer.add([background, keyText, emptyText]);
        this.container.add(slotContainer);
        this.slotContainers.set(key, slotContainer);
    }

    private onSlotChanged(data: { slotKey: string; item: Item | null; isEmpty: boolean }): void {
        this.updateSlotDisplay(data.slotKey, data.item);
    }

    private updateSlotDisplay(slotKey: string, item: Item | null): void {
        const slotContainer = this.slotContainers.get(slotKey);
        if (!slotContainer) return;

        // Clear existing item display (keep background and key label)
        const children = slotContainer.getAll();
        const background = children[0];
        const keyText = children[1];
        
        // Remove old item elements but keep background and key label
        slotContainer.removeAll();
        slotContainer.add([background, keyText]);

        if (item) {
            // Add item icon
            const itemIcon = this.scene.add.sprite(0, -2, item.getConfig().assetKey);
            itemIcon.setScale(0.7);
            itemIcon.setOrigin(0.5, 0.5);
            
            // Add uses indicator if item has limited uses
            const maxUses = item.getConfig().maxUses;
            if (maxUses && maxUses > 1) {
                const usesText = this.scene.add.text(18, -18, item.getRemainingUses().toString(), {
                    fontSize: '12px',
                    color: '#ffff00',
                    fontStyle: 'bold',
                    backgroundColor: '#000000',
                    padding: { x: 3, y: 1 }
                });
                usesText.setOrigin(0.5, 0.5);
                slotContainer.add(usesText);
            }
            
            slotContainer.add(itemIcon);
        } else {
            // Add empty slot indicator
            const emptyText = this.scene.add.text(0, -2, '?', {
                fontSize: '24px',
                color: '#666666',
                fontStyle: 'bold'
            });
            emptyText.setOrigin(0.5, 0.5);
            slotContainer.add(emptyText);
        }
    }

    private onGameReset(): void {
        this.reset();
    }

    public reset(): void {
        console.log('🔄 InventoryUI reset');
        
        // Reset all slot displays
        for (const [key, _] of this.slotContainers) {
            this.updateSlotDisplay(key, null);
        }
    }

    public destroy(): void {
        EventBus.off('inventory-slot-changed', this.onSlotChanged.bind(this));
        EventBus.off('game-fully-reset', this.onGameReset.bind(this));
        
        if (this.container) {
            this.container.destroy();
        }
        
        console.log('🎨 InventoryUI destroyed');
    }
}