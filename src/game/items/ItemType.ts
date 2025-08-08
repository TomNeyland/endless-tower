/**
 * ItemType.ts
 * 
 * Defines active items that players can use via Q/E keys
 * These are distinct from powerups which provide passive effects
 */

export enum ItemType {
    PLATFORM_SPAWNER = 'platform_spawner'
}

export interface ItemConfig {
    type: ItemType;
    name: string;
    description: string;
    assetKey: string;
    maxUses?: number; // undefined = unlimited uses
    rarity: number; // 1 = common, 5 = legendary
    soundKey?: string;
}

export const ITEM_CONFIGS: Record<ItemType, ItemConfig> = {
    [ItemType.PLATFORM_SPAWNER]: {
        type: ItemType.PLATFORM_SPAWNER,
        name: "Platform Kit",
        description: "Spawn a 3-tile platform at your location",
        assetKey: "key_yellow", // Reuse existing key asset for now
        maxUses: 1, // Single use item
        rarity: 2,
        soundKey: "sfx_select"
    }
};