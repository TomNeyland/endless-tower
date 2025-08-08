/**
 * Item.ts
 * 
 * Represents an individual item instance that can be held in inventory
 */

import { ItemType, ItemConfig, ITEM_CONFIGS } from './ItemType';

export class Item {
    private type: ItemType;
    private config: ItemConfig;
    private remainingUses: number;
    private id: string;

    constructor(type: ItemType, id?: string) {
        this.type = type;
        this.config = ITEM_CONFIGS[type];
        this.remainingUses = this.config.maxUses || Infinity;
        this.id = id || `item_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public getType(): ItemType {
        return this.type;
    }

    public getConfig(): ItemConfig {
        return this.config;
    }

    public getId(): string {
        return this.id;
    }

    public getRemainingUses(): number {
        return this.remainingUses;
    }

    public canUse(): boolean {
        return this.remainingUses > 0;
    }

    public use(): boolean {
        if (!this.canUse()) {
            return false;
        }

        if (this.remainingUses !== Infinity) {
            this.remainingUses--;
        }

        console.log(`🔧 Used ${this.config.name}, ${this.remainingUses} uses remaining`);
        return true;
    }

    public isConsumed(): boolean {
        return this.remainingUses <= 0;
    }

    public clone(): Item {
        const cloned = new Item(this.type);
        cloned.remainingUses = this.remainingUses;
        return cloned;
    }
}