/**
 * ItemUI.ts
 * 
 * Compact UI display for showing active items in Q/E slots
 * Positioned in bottom-right corner to complement main HUD
 */

import { Scene } from 'phaser';
import { EventBus } from './EventBus';
import { InventorySlot, Item } from './ItemSystem';

export class ItemUI {
    private scene: Scene;
    
    // UI Elements
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Graphics;
    private qSlotContainer: Phaser.GameObjects.Container;
    private eSlotContainer: Phaser.GameObjects.Container;
    private qKeyText: Phaser.GameObjects.Text;
    private eKeyText: Phaser.GameObjects.Text;
    private qItemSprite: Phaser.GameObjects.Image | null = null;
    private eItemSprite: Phaser.GameObjects.Image | null = null;
    private qChargeText: Phaser.GameObjects.Text;
    private eChargeText: Phaser.GameObjects.Text;
    
    // UI Constants
    private readonly SLOT_SIZE = 48;
    private readonly SLOT_SPACING = 8;
    private readonly UI_PADDING = 12;
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        this.createUI();
        this.setupEventListeners();
        
        // Request initial inventory state
        EventBus.emit('get-inventory');
    }
    
    private createUI(): void {
        const screenWidth = this.scene.scale.width;
        const screenHeight = this.scene.scale.height;
        
        // Position in bottom-right corner
        const containerX = screenWidth - 140;
        const containerY = screenHeight - 80;
        
        // Create main container
        this.container = this.scene.add.container(containerX, containerY);
        this.container.setDepth(100); // Above most game elements
        
        // Create background
        this.background = this.scene.add.graphics();
        this.background.fillStyle(0x001133, 0.9);
        this.background.lineStyle(2, 0x0066CC, 0.9);
        this.background.fillRoundedRect(0, 0, 120, 60, 8);
        this.background.strokeRoundedRect(0, 0, 120, 60, 8);
        this.container.add(this.background);
        
        // Create Q slot
        this.qSlotContainer = this.scene.add.container(this.UI_PADDING, this.UI_PADDING);
        this.createSlot('Q', this.qSlotContainer);
        this.container.add(this.qSlotContainer);
        
        // Create E slot  
        this.eSlotContainer = this.scene.add.container(
            this.UI_PADDING + this.SLOT_SIZE + this.SLOT_SPACING, 
            this.UI_PADDING
        );
        this.createSlot('E', this.eSlotContainer);
        this.container.add(this.eSlotContainer);
    }
    
    private createSlot(key: 'Q' | 'E', container: Phaser.GameObjects.Container): void {
        // Slot background
        const slotBg = this.scene.add.graphics();
        slotBg.fillStyle(0x002244, 0.8);
        slotBg.lineStyle(1, 0x4488CC, 0.8);
        slotBg.fillRoundedRect(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        slotBg.strokeRoundedRect(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        container.add(slotBg);
        
        // Key label
        const keyText = this.scene.add.text(
            this.SLOT_SIZE / 2,
            this.SLOT_SIZE - 8,
            key,
            {
                fontSize: '12px',
                color: '#CCCCCC',
                fontFamily: 'monospace',
                fontStyle: 'bold'
            }
        );
        keyText.setOrigin(0.5, 1);
        container.add(keyText);
        
        // Charge text (hidden by default)
        const chargeText = this.scene.add.text(
            this.SLOT_SIZE - 2,
            2,
            '',
            {
                fontSize: '10px',
                color: '#FFFF00',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 1
            }
        );
        chargeText.setOrigin(1, 0);
        chargeText.setVisible(false);
        container.add(chargeText);
        
        // Store references
        if (key === 'Q') {
            this.qKeyText = keyText;
            this.qChargeText = chargeText;
        } else {
            this.eKeyText = keyText;
            this.eChargeText = chargeText;
        }
    }
    
    private setupEventListeners(): void {
        EventBus.on('inventory-updated', this.updateInventoryDisplay.bind(this));
    }
    
    private updateInventoryDisplay(inventory: InventorySlot[]): void {
        // Update each slot
        inventory.forEach(slot => {
            if (slot.key === 'Q') {
                this.updateSlot('Q', slot.item, this.qSlotContainer);
            } else if (slot.key === 'E') {
                this.updateSlot('E', slot.item, this.eSlotContainer);
            }
        });
    }
    
    private updateSlot(key: 'Q' | 'E', item: Item | null, container: Phaser.GameObjects.Container): void {
        // Remove existing item sprite
        if (key === 'Q' && this.qItemSprite) {
            this.qItemSprite.destroy();
            this.qItemSprite = null;
        } else if (key === 'E' && this.eItemSprite) {
            this.eItemSprite.destroy();
            this.eItemSprite = null;
        }
        
        if (item) {
            // Create item sprite
            let itemSprite: Phaser.GameObjects.Image;
            
            try {
                itemSprite = this.scene.add.image(
                    this.SLOT_SIZE / 2,
                    this.SLOT_SIZE / 2 - 4,
                    item.config.assetKey
                );
                itemSprite.setScale(0.6); // Scale down to fit in slot
                itemSprite.setOrigin(0.5);
                container.add(itemSprite);
                
                // Store reference
                if (key === 'Q') {
                    this.qItemSprite = itemSprite;
                } else {
                    this.eItemSprite = itemSprite;
                }
            } catch (e) {
                // Asset not loaded yet, create placeholder
                const placeholder = this.scene.add.graphics();
                placeholder.fillStyle(0x666666, 0.8);
                placeholder.fillCircle(this.SLOT_SIZE / 2, this.SLOT_SIZE / 2 - 4, 8);
                container.add(placeholder);
                
                console.warn(`Item asset not found: ${item.config.assetKey}`);
            }
            
            // Update charge display
            const chargeText = key === 'Q' ? this.qChargeText : this.eChargeText;
            if (item.chargesRemaining !== undefined) {
                chargeText.setText(`${item.chargesRemaining}`);
                chargeText.setVisible(true);
                
                // Color code based on charges
                if (item.chargesRemaining === 0) {
                    chargeText.setColor('#FF4444'); // Red for empty
                } else if (item.chargesRemaining === 1) {
                    chargeText.setColor('#FFAA44'); // Orange for low
                } else {
                    chargeText.setColor('#44FF44'); // Green for good
                }
            } else {
                chargeText.setVisible(false);
            }
        } else {
            // Empty slot - hide charge text
            const chargeText = key === 'Q' ? this.qChargeText : this.eChargeText;
            chargeText.setVisible(false);
        }
    }
    
    /**
     * Clean up resources
     */
    public destroy(): void {
        EventBus.off('inventory-updated');
        
        if (this.container) {
            this.container.destroy();
        }
    }
}