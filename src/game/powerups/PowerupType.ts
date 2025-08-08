/**
 * PowerupType.ts
 * 
 * Defines all available powerup types with their properties and behaviors
 * for the roguelite Icy Tower system
 */

export enum PowerupType {
    SPEED_BOOST = 'speed_boost',
    JUMP_AMPLIFIER = 'jump_amplifier', 
    COMBO_MULTIPLIER = 'combo_multiplier',
    INVINCIBILITY = 'invincibility',
    DOUBLE_JUMP = 'double_jump',
    WALL_MAGNETISM = 'wall_magnetism',
    GOLDEN_TOUCH = 'golden_touch',
    PLATFORM_SPRINGS = 'platform_springs',
    MOMENTUM_KEEPER = 'momentum_keeper',
    HIGH_SCORE_MULTIPLIER = 'high_score_multiplier'
}

export interface PowerupConfig {
    type: PowerupType;
    name: string;
    description: string;
    assetKey: string;
    audioKey: string;
    duration?: number; // undefined = permanent until death
    rarity: number; // 1 = common, 5 = legendary
    visualEffect: boolean;
    effectColor?: number; // hex color for visual effects
    glowIntensity?: number; // 0.0 - 1.0
}

export const POWERUP_CONFIGS: Record<PowerupType, PowerupConfig> = {
    [PowerupType.SPEED_BOOST]: {
        type: PowerupType.SPEED_BOOST,
        name: "Velocity Gem",
        description: "Increases movement speed by 50%",
        assetKey: "gem_blue",
        audioKey: "sfx_gem",
        duration: 15000, // 15 seconds
        rarity: 2,
        visualEffect: true,
        effectColor: 0x4488ff,
        glowIntensity: 0.7
    },
    
    [PowerupType.JUMP_AMPLIFIER]: {
        type: PowerupType.JUMP_AMPLIFIER,
        name: "Super Spring",
        description: "Jump power increased by 40%",
        assetKey: "gem_green",
        audioKey: "sfx_jump-high", 
        duration: 20000, // 20 seconds
        rarity: 2,
        visualEffect: true,
        effectColor: 0x44ff44,
        glowIntensity: 0.6
    },
    
    [PowerupType.COMBO_MULTIPLIER]: {
        type: PowerupType.COMBO_MULTIPLIER,
        name: "Chain Master",
        description: "Combo multiplier increased by 2x",
        assetKey: "star",
        audioKey: "sfx_magic",
        duration: 30000, // 30 seconds
        rarity: 4,
        visualEffect: true,
        effectColor: 0xffaa00,
        glowIntensity: 0.9
    },
    
    [PowerupType.INVINCIBILITY]: {
        type: PowerupType.INVINCIBILITY,
        name: "Guardian Shield",
        description: "Immunity to death line for 10 seconds",
        assetKey: "heart",
        audioKey: "sfx_magic",
        duration: 10000, // 10 seconds
        rarity: 5,
        visualEffect: true,
        effectColor: 0xff4444,
        glowIntensity: 1.0
    },
    
    [PowerupType.DOUBLE_JUMP]: {
        type: PowerupType.DOUBLE_JUMP,
        name: "Air Walker",
        description: "Grants double jump ability",
        assetKey: "key_yellow",
        audioKey: "sfx_jump",
        // Permanent until death
        rarity: 3,
        visualEffect: false
    },
    
    [PowerupType.WALL_MAGNETISM]: {
        type: PowerupType.WALL_MAGNETISM,
        name: "Wall Grip",
        description: "Perfect wall bounce timing window doubled",
        assetKey: "key_blue",
        audioKey: "sfx_coin",
        duration: 25000, // 25 seconds
        rarity: 3,
        visualEffect: true,
        effectColor: 0x0088ff,
        glowIntensity: 0.5
    },
    
    [PowerupType.GOLDEN_TOUCH]: {
        type: PowerupType.GOLDEN_TOUCH,
        name: "Midas Touch",
        description: "All combos give double score points",
        assetKey: "coin_gold",
        audioKey: "sfx_coin",
        // Permanent until death
        rarity: 4,
        visualEffect: false
    },
    
    [PowerupType.PLATFORM_SPRINGS]: {
        type: PowerupType.PLATFORM_SPRINGS,
        name: "Bouncy Platforms",
        description: "All platform landings boost jump height",
        assetKey: "gem_red",
        audioKey: "sfx_jump-high",
        duration: 18000, // 18 seconds
        rarity: 2,
        visualEffect: true,
        effectColor: 0xff4488,
        glowIntensity: 0.6
    },
    
    [PowerupType.MOMENTUM_KEEPER]: {
        type: PowerupType.MOMENTUM_KEEPER,
        name: "Momentum Lock",
        description: "Horizontal momentum never decreases",
        assetKey: "key_green",
        audioKey: "sfx_magic",
        // Permanent until death
        rarity: 5,
        visualEffect: false
    },
    
    [PowerupType.HIGH_SCORE_MULTIPLIER]: {
        type: PowerupType.HIGH_SCORE_MULTIPLIER,
        name: "Score Storm",
        description: "All height gains worth 3x points",
        assetKey: "coin_silver",
        audioKey: "sfx_select",
        duration: 12000, // 12 seconds
        rarity: 4,
        visualEffect: true,
        effectColor: 0xcccccc,
        glowIntensity: 0.8
    }
};