/**
 * ItemType.ts
 * 
 * Defines active items that can be held and used by the player
 * These are distinct from passive powerups - items require active use
 */

export enum ItemType {
    PLATFORM_SPAWNER = 'platform_spawner'
    // Future items can be added here (e.g., GRAPPLING_HOOK, TELEPORT, etc.)
}

export interface ItemConfig {
    type: ItemType;
    name: string;
    description: string;
    assetKey: string;
    audioKey?: string;
    charges?: number; // undefined = unlimited uses
    cooldown?: number; // milliseconds between uses
    rarity: number; // 1 = common, 5 = legendary
}

export const ITEM_CONFIGS: Record<ItemType, ItemConfig> = {
    [ItemType.PLATFORM_SPAWNER]: {
        type: ItemType.PLATFORM_SPAWNER,
        name: "Platform Spawner",
        description: "Spawns a 3-tile platform at your location",
        assetKey: "gem_yellow", // Use existing asset for now
        audioKey: "sfx_select",
        charges: 1, // Single use item
        cooldown: 1000, // 1 second cooldown
        rarity: 2
    }
};