/**
 * MagneticPlatform.ts
 * 
 * Electromagnetic platform system that creates magnetic attraction/repulsion effects
 * and spectacular chain lightning visuals when jumping between magnetic platforms
 */

import { Scene, GameObjects } from 'phaser';
import { Player } from './Player';
import { EventBus } from './EventBus';

export enum MagneticPolarity {
  ATTRACT = 'attract',
  REPEL = 'repel'
}

export interface MagneticFieldData {
  platform: MagneticPlatform;
  polarity: MagneticPolarity;
  strength: number;
  position: { x: number; y: number };
}

export class MagneticPlatform extends GameObjects.Sprite {
  private polarity: MagneticPolarity;
  private fieldStrength: number;
  private fieldRadius: number;
  private isActive: boolean;
  private chargeLevel: number; // 0-100, builds up as part of chains
  
  // Visual effects
  private fieldGlow: GameObjects.Sprite | null = null;
  private electricParticles: GameObjects.Particles.ParticleEmitter | null = null;
  private pulseEffect: Phaser.Tweens.Tween | null = null;
  
  // Chain lightning properties
  private lastChainConnection: number = 0; // timestamp
  private readonly CHAIN_WINDOW = 2000; // 2 seconds to maintain chain
  
  constructor(
    scene: Scene, 
    x: number, 
    y: number, 
    polarity: MagneticPolarity = MagneticPolarity.ATTRACT,
    fieldStrength: number = 150,
    fieldRadius: number = 120
  ) {
    // Use existing platform sprite with magnetic tint
    super(scene, x, y, 'tiles', 'terrain_purple_cloud_middle');
    
    this.polarity = polarity;
    this.fieldStrength = fieldStrength;
    this.fieldRadius = fieldRadius;
    this.isActive = true;
    this.chargeLevel = 0;
    
    // Configure visual appearance based on polarity
    this.setupVisualEffects();
    
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body
    
    // Set depth to be above regular platforms but below player
    this.setDepth(1);
    
    console.log(`⚡ Created magnetic platform at (${x}, ${y}) - ${polarity} field`);
  }

  private setupVisualEffects(): void {
    // Set base color based on polarity
    const polarityColor = this.polarity === MagneticPolarity.ATTRACT ? 0x4488ff : 0xff4488;
    this.setTint(polarityColor);
    
    // Create subtle glow effect
    this.fieldGlow = this.scene.add.sprite(this.x, this.y, 'tiles', 'terrain_purple_cloud_middle');
    this.fieldGlow.setDepth(this.depth - 1);
    this.fieldGlow.setTint(polarityColor);
    this.fieldGlow.setScale(1.3);
    this.fieldGlow.setAlpha(0.3);
    this.fieldGlow.setBlendMode(Phaser.BlendModes.ADD);
    
    // Create pulsing animation
    this.pulseEffect = this.scene.tweens.add({
      targets: [this.fieldGlow, this],
      scaleX: this.polarity === MagneticPolarity.ATTRACT ? 1.05 : 0.95,
      scaleY: this.polarity === MagneticPolarity.ATTRACT ? 1.05 : 0.95,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Create electric particle effect if star texture exists
    if (this.scene.textures.exists('star')) {
      this.createElectricParticles(polarityColor);
    }
  }

  private createElectricParticles(color: number): void {
    try {
      // Create subtle electric particles around the platform
      const particles = this.scene.add.particles(this.x, this.y, 'star', {
        speed: { min: 20, max: 40 },
        lifespan: 1500,
        frequency: 200,
        quantity: 1,
        scale: { start: 0.1, end: 0.05 },
        tint: color,
        blendMode: Phaser.BlendModes.ADD,
        alpha: { start: 0.8, end: 0.1 },
        emitZone: {
          type: 'edge',
          source: new Phaser.Geom.Circle(0, 0, this.fieldRadius * 0.7),
          quantity: 1
        }
      });
      
      particles.setDepth(this.depth + 0.5);
      this.electricParticles = particles;
    } catch (error) {
      console.warn('Failed to create electric particles for magnetic platform:', error);
    }
  }

  /**
   * Calculate magnetic force on a player at given position
   */
  calculateMagneticForce(playerX: number, playerY: number): { x: number; y: number; inField: boolean } {
    if (!this.isActive) {
      return { x: 0, y: 0, inField: false };
    }
    
    const dx = this.x - playerX;
    const dy = this.y - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if player is within magnetic field
    if (distance > this.fieldRadius) {
      return { x: 0, y: 0, inField: false };
    }
    
    // Calculate force strength based on distance (inverse square law)
    const forceStrength = this.fieldStrength * (1 - Math.pow(distance / this.fieldRadius, 2));
    
    // Normalize direction vector
    const normalizedX = distance > 0 ? dx / distance : 0;
    const normalizedY = distance > 0 ? dy / distance : 0;
    
    // Apply polarity - attract pulls toward platform, repel pushes away
    const polarityMultiplier = this.polarity === MagneticPolarity.ATTRACT ? 1 : -1;
    
    return {
      x: normalizedX * forceStrength * polarityMultiplier,
      y: normalizedY * forceStrength * polarityMultiplier,
      inField: true
    };
  }

  /**
   * Activate magnetic platform when player lands or enters field
   */
  activate(): void {
    if (!this.isActive) {
      this.isActive = true;
      this.alpha = 1.0;
      
      if (this.pulseEffect) {
        this.pulseEffect.resume();
      }
      
      if (this.electricParticles) {
        this.electricParticles.start();
      }
      
      console.log(`⚡ Magnetic platform activated`);
    }
  }

  /**
   * Deactivate magnetic platform (temporarily or permanently)
   */
  deactivate(temporary: boolean = true): void {
    this.isActive = false;
    
    if (temporary) {
      this.alpha = 0.5;
      
      // Reactivate after a delay
      this.scene.time.delayedCall(3000, () => {
        this.activate();
      });
    } else {
      this.alpha = 0.3;
      
      if (this.pulseEffect) {
        this.pulseEffect.pause();
      }
      
      if (this.electricParticles) {
        this.electricParticles.stop();
      }
    }
  }

  /**
   * Build up charge level for chain lightning effects
   */
  addCharge(amount: number): void {
    this.chargeLevel = Math.min(100, this.chargeLevel + amount);
    this.lastChainConnection = Date.now();
    
    // Enhance visual effects based on charge level
    if (this.chargeLevel > 50 && this.fieldGlow) {
      this.fieldGlow.setScale(1.3 + (this.chargeLevel / 100) * 0.5);
      this.fieldGlow.setAlpha(0.3 + (this.chargeLevel / 100) * 0.4);
    }
    
    console.log(`⚡ Platform charge: ${this.chargeLevel}%`);
  }

  /**
   * Check if platform can chain with another (within time window)
   */
  canChainWith(otherPlatform: MagneticPlatform): boolean {
    const now = Date.now();
    const timeSinceChain = now - this.lastChainConnection;
    const otherTimeSinceChain = now - otherPlatform.lastChainConnection;
    
    return timeSinceChain <= this.CHAIN_WINDOW || otherTimeSinceChain <= this.CHAIN_WINDOW;
  }

  /**
   * Discharge all accumulated charge with spectacular visual effect
   */
  discharge(): number {
    const dischargedCharge = this.chargeLevel;
    this.chargeLevel = 0;
    
    if (dischargedCharge > 0) {
      // Create discharge effect
      this.createDischargeEffect(dischargedCharge);
      
      // Reset visual effects
      if (this.fieldGlow) {
        this.fieldGlow.setScale(1.3);
        this.fieldGlow.setAlpha(0.3);
      }
    }
    
    return dischargedCharge;
  }

  private createDischargeEffect(chargeLevel: number): void {
    // Screen flash effect
    const flash = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xffffff,
      0.3 + (chargeLevel / 100) * 0.4
    );
    flash.setDepth(1000);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
    
    // Camera shake based on charge level
    const shakeIntensity = 2 + (chargeLevel / 100) * 8;
    this.scene.cameras.main.shake(200, shakeIntensity);
    
    console.log(`⚡ Platform discharged ${chargeLevel}% charge!`);
  }

  // Getters
  getPolarity(): MagneticPolarity { return this.polarity; }
  getFieldStrength(): number { return this.fieldStrength; }
  getFieldRadius(): number { return this.fieldRadius; }
  getChargeLevel(): number { return this.chargeLevel; }
  isActiveField(): boolean { return this.isActive; }

  // Override destroy to clean up effects
  override destroy(fromScene?: boolean): void {
    if (this.fieldGlow) {
      this.fieldGlow.destroy();
    }
    
    if (this.electricParticles) {
      this.electricParticles.destroy();
    }
    
    if (this.pulseEffect) {
      this.pulseEffect.destroy();
    }
    
    super.destroy(fromScene);
  }
}