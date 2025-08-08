/**
 * Powerup.ts
 * 
 * Base powerup class that handles rendering, animation, collision detection,
 * and effect application for individual powerup instances
 */

import { Scene } from 'phaser';
import { Player } from '../Player';
import { PowerupType, PowerupConfig, POWERUP_CONFIGS } from './PowerupType';
import { EventBus } from '../EventBus';

export interface PowerupEffectData {
    type: PowerupType;
    config: PowerupConfig;
    startTime: number;
    player: Player;
}

export class Powerup extends Phaser.GameObjects.Sprite {
    private config: PowerupConfig;
    private collected: boolean = false;
    private floatTween?: Phaser.Tweens.Tween;
    private glowEffect?: Phaser.GameObjects.Graphics;
    private baseY: number; // Store the original Y position for animation reference
    private lastGlowX: number = 0;
    private lastGlowY: number = 0;

    constructor(scene: Scene, x: number, y: number, type: PowerupType) {
        const config = POWERUP_CONFIGS[type];
        super(scene, x, y, config.assetKey);
        
        this.config = config;
        this.baseY = y; // Store original Y position
        
        // Add to scene
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set up physics body - disable collision to prevent jittering
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setSize(this.width * 0.8, this.height * 0.8);
        body.setImmovable(true);
        body.setGravityY(0);
        body.checkCollision.none = true; // Disable physics collision detection
        
        // Set depth to appear above platforms but below UI
        this.setDepth(100);
        
        // Initialize visual effects
        this.setupVisualEffects();
        this.startFloatingAnimation();
        
        console.log(`💎 Powerup created: ${config.name} at (${x}, ${y})`);
    }

    private setupVisualEffects(): void {
        // Create glow effect for powerups with visual effects
        if (this.config.visualEffect && this.config.effectColor && this.config.glowIntensity) {
            this.glowEffect = this.scene.add.graphics();
            this.glowEffect.setDepth(this.depth - 1);
            this.glowEffect.setPosition(this.x, this.y);
            
            // Create a subtle glow circle relative to graphics origin (0,0)
            const glowRadius = Math.max(this.width, this.height) * 0.8;
            this.glowEffect.fillStyle(this.config.effectColor, this.config.glowIntensity * 0.3);
            this.glowEffect.fillCircle(0, 0, glowRadius); // Draw at origin, not absolute position
            
            // Cache initial position
            this.lastGlowX = this.x;
            this.lastGlowY = this.y;
            
            // Animate glow pulsing
            this.scene.tweens.add({
                targets: this.glowEffect,
                alpha: { from: 0.3, to: 0.8 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Scale up powerup slightly for better visibility
        this.setScale(1.2);
    }

    private startFloatingAnimation(): void {
        // Gentle floating animation using baseY as reference
        this.floatTween = this.scene.tweens.add({
            targets: this,
            y: this.baseY - 8,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public checkCollision(player: Player): boolean {
        if (this.collected) return false;

        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            player.x, player.y
        );

        const collisionRadius = (this.width + this.height) / 4;
        return distance < collisionRadius;
    }

    public collect(player: Player): void {
        if (this.collected) return;
        
        this.collected = true;
        console.log(`✨ Powerup collected: ${this.config.name}`);
        
        // Play collection sound
        this.scene.sound.play(this.config.audioKey, { volume: 0.6 });
        
        // Emit collection event
        const effectData: PowerupEffectData = {
            type: this.config.type,
            config: this.config,
            startTime: this.scene.time.now,
            player: player
        };
        
        EventBus.emit('powerup-collected', effectData);
        
        // Collection animation
        this.playCollectionAnimation();
    }

    private playCollectionAnimation(): void {
        // Stop floating animation
        if (this.floatTween) {
            this.floatTween.destroy();
        }
        
        // Collection effect: scale up and fade out
        this.scene.tweens.add({
            targets: this,
            scaleX: 2.0,
            scaleY: 2.0,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.destroy();
            }
        });
        
        // Sparkle effect
        this.createSparkleEffect();
    }

    private createSparkleEffect(): void {
        const sparkleCount = 8;
        const sparkles: Phaser.GameObjects.Graphics[] = [];
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkle = this.scene.add.graphics();
            sparkle.fillStyle(this.config.effectColor || 0xffffff, 0.8);
            sparkle.fillCircle(0, 0, 3);
            sparkle.setPosition(this.x, this.y);
            sparkle.setDepth(this.depth + 10);
            
            const angle = (i / sparkleCount) * Math.PI * 2;
            const distance = 40;
            
            this.scene.tweens.add({
                targets: sparkle,
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 500,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    sparkle.destroy();
                }
            });
            
            sparkles.push(sparkle);
        }
    }

    public getType(): PowerupType {
        return this.config.type;
    }

    public getConfig(): PowerupConfig {
        return this.config;
    }

    public isCollected(): boolean {
        return this.collected;
    }

    public override update(): void {
        // Update glow effect position smoothly with the powerup animation
        if (this.glowEffect && !this.collected) {
            // Use threshold-based position checking to avoid unnecessary updates
            const positionThreshold = 0.1; // Small threshold for smooth movement
            const xChanged = Math.abs(this.x - this.lastGlowX) > positionThreshold;
            const yChanged = Math.abs(this.y - this.lastGlowY) > positionThreshold;
            
            if (xChanged || yChanged) {
                // Move the graphics object to follow the powerup smoothly
                this.glowEffect.setPosition(this.x, this.y);
                
                // Update cached position
                this.lastGlowX = this.x;
                this.lastGlowY = this.y;
            }
        }
    }

    public override destroy(): void {
        if (this.floatTween) {
            this.floatTween.destroy();
        }
        
        if (this.glowEffect) {
            this.glowEffect.destroy();
        }
        
        super.destroy();
    }
}