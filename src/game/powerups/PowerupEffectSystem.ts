/**
 * PowerupEffectSystem.ts
 * 
 * Manages active powerup effects, their durations, and interactions with game systems
 * Handles both temporary and permanent powerup effects
 */

import { Scene } from 'phaser';
import { Player } from '../Player';
import { PowerupType, PowerupConfig } from './PowerupType';
import { PowerupEffectData } from './Powerup';
import { EventBus } from '../EventBus';
import { MovementController } from '../MovementController';
import { ComboSystem } from '../ComboSystem';
import { ScoreSystem } from '../ScoreSystem';
import { WallCollision } from '../WallCollision';

interface ActiveEffect {
    type: PowerupType;
    config: PowerupConfig;
    startTime: number;
    endTime?: number; // undefined for permanent effects
    visualEffect?: Phaser.GameObjects.Graphics;
    applied: boolean;
}

export class PowerupEffectSystem {
    private scene: Scene;
    private player: Player;
    private activeEffects: Map<PowerupType, ActiveEffect> = new Map();
    private movementController?: MovementController;
    private comboSystem?: ComboSystem;
    private scoreSystem?: ScoreSystem;
    private wallCollision?: WallCollision;
    
    // Effect state tracking
    private originalMoveSpeed: number = 0;
    private originalJumpPower: number = 0;
    private doubleJumpAvailable: boolean = false;
    private originalWallBounceWindow: number = 0;
    
    // Bound function references for proper cleanup
    private boundOnPowerupCollected: (data: any) => void;
    private boundOnGameReset: () => void;

    constructor(scene: Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        
        // Store bound function references for proper cleanup
        this.boundOnPowerupCollected = this.onPowerupCollected.bind(this);
        this.boundOnGameReset = this.onGameReset.bind(this);
        
        this.setupEventListeners();
        console.log('✨ PowerupEffectSystem initialized');
    }

    private setupEventListeners(): void {
        EventBus.on('powerup-collected', this.boundOnPowerupCollected);
        EventBus.on('game-fully-reset', this.boundOnGameReset);
        
        // Listen for system references to apply effects
        EventBus.on('movement-controller-ready', (controller: MovementController) => {
            this.movementController = controller;
            console.log('🔧 PowerupEffectSystem: MovementController connected');
        });
        
        EventBus.on('combo-system-ready', (comboSystem: ComboSystem) => {
            this.comboSystem = comboSystem;
            console.log('🔧 PowerupEffectSystem: ComboSystem connected');
        });
        
        EventBus.on('score-system-ready', (scoreSystem: ScoreSystem) => {
            this.scoreSystem = scoreSystem;
            console.log('🔧 PowerupEffectSystem: ScoreSystem connected');
        });
        
        EventBus.on('wall-collision-ready', (wallCollision: WallCollision) => {
            this.wallCollision = wallCollision;
            console.log('🔧 PowerupEffectSystem: WallCollision connected');
        });
    }

    private onPowerupCollected(effectData: PowerupEffectData): void {
        console.log(`✨ Applying powerup effect: ${effectData.config.name}`);
        
        // Create active effect
        const activeEffect: ActiveEffect = {
            type: effectData.type,
            config: effectData.config,
            startTime: effectData.startTime,
            endTime: effectData.config.duration ? effectData.startTime + effectData.config.duration : undefined,
            applied: false
        };
        
        // Store effect (replace if same type already exists)
        this.activeEffects.set(effectData.type, activeEffect);
        
        // Apply the effect
        this.applyPowerupEffect(activeEffect);
        
        // Create visual effect if needed
        if (effectData.config.visualEffect) {
            this.createPlayerVisualEffect(activeEffect);
        }
        
        // Emit UI update
        EventBus.emit('powerup-effect-applied', {
            type: effectData.type,
            name: effectData.config.name,
            duration: effectData.config.duration
        });
    }

    private applyPowerupEffect(effect: ActiveEffect): void {
        if (effect.applied) return;
        
        switch (effect.type) {
            case PowerupType.SPEED_BOOST:
                this.applySpeedBoost();
                break;
                
            case PowerupType.JUMP_AMPLIFIER:
                this.applyJumpAmplifier();
                break;
                
            case PowerupType.COMBO_MULTIPLIER:
                this.applyComboMultiplier();
                break;
                
            case PowerupType.INVINCIBILITY:
                this.applyInvincibility();
                break;
                
            case PowerupType.DOUBLE_JUMP:
                this.applyDoubleJump();
                break;
                
            case PowerupType.WALL_MAGNETISM:
                this.applyWallMagnetism();
                break;
                
            case PowerupType.GOLDEN_TOUCH:
                this.applyGoldenTouch();
                break;
                
            case PowerupType.PLATFORM_SPRINGS:
                this.applyPlatformSprings();
                break;
                
            case PowerupType.MOMENTUM_KEEPER:
                this.applyMomentumKeeper();
                break;
                
            case PowerupType.HIGH_SCORE_MULTIPLIER:
                this.applyHighScoreMultiplier();
                break;
                
            default:
                console.warn(`Unknown powerup type: ${effect.type}`);
        }
        
        effect.applied = true;
    }

    private applySpeedBoost(): void {
        if (!this.movementController) {
            console.warn('⚠️ Speed boost failed: MovementController not ready');
            return;
        }
        
        // Apply 50% speed boost
        this.movementController.setSpeedMultiplier(1.5);
        console.log(`🏃 Speed boost applied: 1.5x multiplier`);
    }

    private applyJumpAmplifier(): void {
        if (!this.movementController) {
            console.warn('⚠️ Jump amplifier failed: MovementController not ready');
            return;
        }
        
        // Apply 250% jump amplifier
        this.movementController.setJumpMultiplier(3.5);
        console.log(`🦘 Jump amplifier applied: 3.5x multiplier`);
    }

    private applyComboMultiplier(): void {
        if (!this.comboSystem) {
            console.warn('⚠️ Combo multiplier failed: ComboSystem not ready');
            return;
        }
        
        // Apply 2x combo multiplier
        this.comboSystem.setComboMultiplierBonus(2.0);
        console.log('⛓️ Combo multiplier applied: 2x bonus');
    }

    private applyInvincibility(): void {
        console.log('🛡️ Invincibility applied: Death line immunity');
        // Emit event to notify DeathLine system to ignore collisions for this player
        EventBus.emit('player-invincibility-start', {
            duration: 10000, // 10 seconds from powerup config
            timestamp: Date.now()
        });
    }

    private applyDoubleJump(): void {
        if (!this.movementController) {
            console.warn('⚠️ Double jump failed: MovementController not ready');
            return;
        }
        
        this.movementController.setDoubleJumpEnabled(true);
        this.doubleJumpAvailable = true;
        console.log('🦅 Double jump applied: Additional jump available');
    }

    private applyWallMagnetism(): void {
        console.log('🧲 Wall magnetism applied: Extended wall bounce timing window');
        // Emit event to notify WallCollision system to extend timing windows
        EventBus.emit('wall-bounce-timing-extended', {
            multiplier: 2.0, // Double the timing window
            duration: 25000, // 25 seconds from powerup config
            timestamp: Date.now()
        });
    }

    private applyGoldenTouch(): void {
        if (!this.comboSystem) {
            console.warn('⚠️ Golden touch failed: ComboSystem not ready');
            return;
        }
        
        this.comboSystem.setGoldenTouchEnabled(true);
        console.log('💰 Golden touch applied: Double score for combos');
    }

    private applyPlatformSprings(): void {
        console.log('🌸 Platform springs applied: Bounce boost on landing');
        // Emit event to notify platform collision system to add bounce boost
        EventBus.emit('platform-springs-active', {
            boostMultiplier: 1.5, // 50% jump boost on platform landing
            duration: 18000, // 18 seconds from powerup config
            timestamp: Date.now()
        });
    }

    private applyMomentumKeeper(): void {
        if (!this.movementController) {
            console.warn('⚠️ Momentum keeper failed: MovementController not ready');
            return;
        }
        
        this.movementController.setMomentumKeepingEnabled(true);
        console.log('🎯 Momentum keeper applied: Horizontal momentum preserved');
    }

    private applyHighScoreMultiplier(): void {
        if (!this.scoreSystem) {
            console.warn('⚠️ High score multiplier failed: ScoreSystem not ready');
            return;
        }
        
        this.scoreSystem.setHeightScoreMultiplier(3.0);
        console.log('⭐ High score multiplier applied: 3x height points');
    }

    private createPlayerVisualEffect(effect: ActiveEffect): void {
        if (!effect.config.effectColor) return;
        
        // Create glowing outline around player
        const glowRadius = 40;
        const glowEffect = this.scene.add.graphics();
        glowEffect.setDepth(50); // Above player but below UI
        
        // Draw glow circle
        glowEffect.lineStyle(4, effect.config.effectColor, 0.6);
        glowEffect.strokeCircle(0, 0, glowRadius);
        
        // Animate pulsing effect
        this.scene.tweens.add({
            targets: glowEffect,
            alpha: { from: 0.3, to: 0.8 },
            scaleX: { from: 0.8, to: 1.2 },
            scaleY: { from: 0.8, to: 1.2 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        effect.visualEffect = glowEffect;
    }

    public update(delta: number): void {
        const currentTime = this.scene.time.now;
        const expiredEffects: PowerupType[] = [];
        
        // Update visual effects position and check for expiration
        this.activeEffects.forEach((effect, type) => {
            // Update visual effect position
            if (effect.visualEffect) {
                effect.visualEffect.setPosition(this.player.x, this.player.y);
            }
            
            // Check if effect has expired
            if (effect.endTime && currentTime >= effect.endTime) {
                expiredEffects.push(type);
            }
        });
        
        // Remove expired effects
        expiredEffects.forEach(type => {
            this.removeEffect(type);
        });
    }

    private removeEffect(type: PowerupType): void {
        const effect = this.activeEffects.get(type);
        if (!effect) return;
        
        console.log(`⏰ Powerup effect expired: ${effect.config.name}`);
        
        // Remove visual effect
        if (effect.visualEffect) {
            effect.visualEffect.destroy();
        }
        
        // Revert effect-specific changes
        this.revertPowerupEffect(type);
        
        // Remove from active effects
        this.activeEffects.delete(type);
        
        // Emit UI update
        EventBus.emit('powerup-effect-removed', { type });
    }

    private revertPowerupEffect(type: PowerupType): void {
        switch (type) {
            case PowerupType.SPEED_BOOST:
                if (this.movementController) {
                    this.movementController.setSpeedMultiplier(1.0);
                }
                break;
                
            case PowerupType.JUMP_AMPLIFIER:
                if (this.movementController) {
                    this.movementController.setJumpMultiplier(1.0);
                }
                break;
                
            case PowerupType.WALL_MAGNETISM:
                // Revert wall bounce timing (handled by WallCollision system)
                break;
                
            case PowerupType.COMBO_MULTIPLIER:
                if (this.comboSystem) {
                    this.comboSystem.setComboMultiplierBonus(1.0);
                }
                break;
                
            case PowerupType.HIGH_SCORE_MULTIPLIER:
                if (this.scoreSystem) {
                    this.scoreSystem.setHeightScoreMultiplier(1.0);
                }
                break;
                
            // Other temporary effects...
        }
    }

    public hasEffect(type: PowerupType): boolean {
        return this.activeEffects.has(type);
    }

    public getActiveEffects(): PowerupType[] {
        return Array.from(this.activeEffects.keys());
    }

    public getEffectTimeRemaining(type: PowerupType): number | null {
        const effect = this.activeEffects.get(type);
        if (!effect || !effect.endTime) return null;
        
        const remaining = effect.endTime - this.scene.time.now;
        return Math.max(0, remaining);
    }

    private onGameReset(): void {
        this.reset();
    }

    public reset(): void {
        console.log('🔄 PowerupEffectSystem reset');
        
        // Clear all visual effects
        this.activeEffects.forEach((effect) => {
            if (effect.visualEffect) {
                effect.visualEffect.destroy();
            }
        });
        
        // Clear all active effects
        this.activeEffects.clear();
        
        // Reset state tracking
        this.originalMoveSpeed = 0;
        this.originalJumpPower = 0;
        this.doubleJumpAvailable = false;
        this.originalWallBounceWindow = 0;
        
        // Reset all system powerup modifiers
        if (this.movementController) {
            this.movementController.setSpeedMultiplier(1.0);
            this.movementController.setJumpMultiplier(1.0);
            this.movementController.setDoubleJumpEnabled(false);
            this.movementController.setMomentumKeepingEnabled(false);
        }
        
        if (this.comboSystem) {
            this.comboSystem.setComboMultiplierBonus(1.0);
            this.comboSystem.setGoldenTouchEnabled(false);
        }
        
        if (this.scoreSystem) {
            this.scoreSystem.setHeightScoreMultiplier(1.0);
        }
    }

    public destroy(): void {
        // Clean up event listeners using stored bound functions
        EventBus.off('powerup-collected', this.boundOnPowerupCollected);
        EventBus.off('game-fully-reset', this.boundOnGameReset);
        
        this.reset();
        console.log('✨ PowerupEffectSystem destroyed');
    }
}