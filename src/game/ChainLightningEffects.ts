/**
 * ChainLightningEffects.ts
 * 
 * Creates spectacular chain lightning visual effects between magnetic platforms
 * and manages electromagnetic particle systems for the magnetic platform feature
 */

import { Scene, GameObjects } from 'phaser';
import { MagneticPlatform } from './MagneticPlatform';
import { EventBus } from './EventBus';

interface LightningBolt {
  line: GameObjects.Graphics;
  particles: GameObjects.Particles.ParticleEmitter;
  startTime: number;
  duration: number;
  intensity: number;
}

export class ChainLightningEffects {
  private scene: Scene;
  private activeBolts: LightningBolt[] = [];
  private lightningLayer: GameObjects.Group;
  
  // Lightning visual parameters
  private readonly BOLT_DURATION = 800; // How long each bolt persists
  private readonly MAX_SEGMENTS = 8; // Lightning bolt complexity
  private readonly JAGGEDNESS = 0.3; // How jagged the lightning appears
  private readonly BOLT_WIDTH = 3; // Base lightning width
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.lightningLayer = scene.add.group();
    
    this.setupEventListeners();
    console.log('⚡ ChainLightningEffects initialized');
  }

  private setupEventListeners(): void {
    EventBus.on('magnetic-chain-created', this.onChainCreated.bind(this));
    EventBus.on('magnetic-platform-activated', this.onPlatformActivated.bind(this));
  }

  private onChainCreated(data: any): void {
    const { startPlatform, endPlatform, chainLength, totalCharge } = data;
    this.createChainLightning(startPlatform, endPlatform, chainLength, totalCharge);
  }

  private onPlatformActivated(data: any): void {
    const { platform, intensity } = data;
    this.createActivationSpark(platform, intensity);
  }

  /**
   * Create chain lightning effect between two magnetic platforms
   */
  createChainLightning(
    startPlatform: MagneticPlatform, 
    endPlatform: MagneticPlatform,
    chainLength: number,
    totalCharge: number
  ): void {
    // Calculate intensity based on chain length and charge
    const intensity = Math.min(1.0, (chainLength * 0.2) + (totalCharge / 200));
    
    // Create main lightning bolt
    const bolt = this.createLightningBolt(
      startPlatform.x, startPlatform.y,
      endPlatform.x, endPlatform.y,
      intensity
    );
    
    // Create branching bolts for higher intensity
    if (intensity > 0.5) {
      this.createBranchingBolts(startPlatform, endPlatform, intensity);
    }
    
    // Create particle explosion at connection points
    this.createConnectionExplosion(startPlatform.x, startPlatform.y, intensity);
    this.createConnectionExplosion(endPlatform.x, endPlatform.y, intensity);
    
    // Screen effects for high-intensity chains
    if (intensity > 0.7) {
      this.createScreenEffects(intensity);
    }
    
    console.log(`⚡ Chain lightning: ${chainLength} links, ${intensity.toFixed(2)} intensity`);
  }

  /**
   * Create a single lightning bolt between two points
   */
  private createLightningBolt(
    startX: number, startY: number,
    endX: number, endY: number,
    intensity: number
  ): LightningBolt {
    // Create graphics object for drawing lightning
    const graphics = this.scene.add.graphics();
    graphics.setDepth(100); // Above most other elements
    
    // Calculate lightning path with jaggedness
    const points = this.calculateLightningPath(startX, startY, endX, endY);
    
    // Draw lightning with varying thickness and glow
    const boltWidth = this.BOLT_WIDTH * (0.5 + intensity * 1.5);
    const boltColor = this.getLightningColor(intensity);
    
    // Draw main bolt
    graphics.lineStyle(boltWidth, boltColor, 0.9);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.strokePath();
    
    // Add glow effect
    graphics.lineStyle(boltWidth * 3, boltColor, 0.3);
    graphics.strokePath();
    
    // Create particle trail along the bolt
    const particles = this.createBoltParticles(points, intensity);
    
    const bolt: LightningBolt = {
      line: graphics,
      particles,
      startTime: Date.now(),
      duration: this.BOLT_DURATION,
      intensity
    };
    
    this.activeBolts.push(bolt);
    this.lightningLayer.add(graphics);
    
    // Schedule cleanup
    this.scene.time.delayedCall(this.BOLT_DURATION, () => {
      this.cleanupBolt(bolt);
    });
    
    return bolt;
  }

  /**
   * Calculate jagged lightning path between two points
   */
  private calculateLightningPath(
    startX: number, startY: number,
    endX: number, endY: number
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    
    // Add start point
    points.push({ x: startX, y: startY });
    
    // Calculate intermediate points with random displacement
    const segments = this.MAX_SEGMENTS;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      
      // Linear interpolation between start and end
      let x = startX + t * (endX - startX);
      let y = startY + t * (endY - startY);
      
      // Add random jaggedness perpendicular to the line
      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      const maxDisplacement = distance * this.JAGGEDNESS;
      
      // Calculate perpendicular direction
      const dx = endX - startX;
      const dy = endY - startY;
      const perpX = -dy / distance;
      const perpY = dx / distance;
      
      // Apply random displacement
      const displacement = (Math.random() - 0.5) * maxDisplacement;
      x += perpX * displacement;
      y += perpY * displacement;
      
      points.push({ x, y });
    }
    
    // Add end point
    points.push({ x: endX, y: endY });
    
    return points;
  }

  /**
   * Create particle effects along lightning bolt
   */
  private createBoltParticles(points: { x: number; y: number }[], intensity: number): GameObjects.Particles.ParticleEmitter {
    if (!this.scene.textures.exists('star')) {
      return null as any;
    }
    
    const midPoint = points[Math.floor(points.length / 2)];
    const particles = this.scene.add.particles(midPoint.x, midPoint.y, 'star', {
      speed: { min: 50, max: 150 },
      lifespan: 500,
      quantity: Math.floor(2 + intensity * 8),
      scale: { start: 0.1 + intensity * 0.15, end: 0.02 },
      tint: this.getLightningColor(intensity),
      blendMode: Phaser.BlendModes.ADD,
      alpha: { start: 0.8, end: 0 }
    });
    
    particles.setDepth(101);
    particles.explode();
    
    // Auto-cleanup
    this.scene.time.delayedCall(1000, () => {
      if (particles && particles.active) {
        particles.destroy();
      }
    });
    
    return particles;
  }

  /**
   * Create branching lightning bolts for high-intensity chains
   */
  private createBranchingBolts(
    startPlatform: MagneticPlatform,
    endPlatform: MagneticPlatform,
    intensity: number
  ): void {
    const branches = Math.floor(intensity * 3); // 0-3 branches
    
    for (let i = 0; i < branches; i++) {
      // Create branch from random point along main bolt
      const t = 0.2 + Math.random() * 0.6; // Branch from middle section
      const branchStartX = startPlatform.x + t * (endPlatform.x - startPlatform.x);
      const branchStartY = startPlatform.y + t * (endPlatform.y - startPlatform.y);
      
      // Branch extends in random direction
      const angle = Math.random() * Math.PI * 2;
      const branchLength = 40 + Math.random() * 60;
      const branchEndX = branchStartX + Math.cos(angle) * branchLength;
      const branchEndY = branchStartY + Math.sin(angle) * branchLength;
      
      this.createLightningBolt(
        branchStartX, branchStartY,
        branchEndX, branchEndY,
        intensity * 0.6 // Branches are less intense
      );
    }
  }

  /**
   * Create explosion effect at platform connection points
   */
  private createConnectionExplosion(x: number, y: number, intensity: number): void {
    if (!this.scene.textures.exists('star')) {
      return;
    }
    
    const particles = this.scene.add.particles(x, y, 'star', {
      speed: { min: 100, max: 200 },
      lifespan: 800,
      quantity: Math.floor(5 + intensity * 15),
      scale: { start: 0.2, end: 0.05 },
      tint: this.getLightningColor(intensity),
      blendMode: Phaser.BlendModes.ADD,
      alpha: { start: 1.0, end: 0 }
    });
    
    particles.setDepth(102);
    particles.explode();
    
    // Auto-cleanup
    this.scene.time.delayedCall(1200, () => {
      if (particles && particles.active) {
        particles.destroy();
      }
    });
  }

  /**
   * Create activation spark when platform is first activated
   */
  private createActivationSpark(platform: MagneticPlatform, intensity: number): void {
    if (!this.scene.textures.exists('star')) {
      return;
    }
    
    const particles = this.scene.add.particles(platform.x, platform.y, 'star', {
      speed: { min: 30, max: 80 },
      lifespan: 600,
      quantity: Math.floor(3 + intensity * 7),
      scale: { start: 0.15, end: 0.03 },
      tint: platform.getPolarity() === 'attract' ? 0x4488ff : 0xff4488,
      blendMode: Phaser.BlendModes.ADD,
      alpha: { start: 0.8, end: 0 }
    });
    
    particles.setDepth(50);
    particles.explode();
    
    // Auto-cleanup
    this.scene.time.delayedCall(800, () => {
      if (particles && particles.active) {
        particles.destroy();
      }
    });
  }

  /**
   * Create screen-wide effects for high-intensity chain lightning
   */
  private createScreenEffects(intensity: number): void {
    // Screen flash
    const flash = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xaaccff,
      0.2 + intensity * 0.3
    );
    flash.setDepth(200);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });
    
    // Camera shake
    const shakeIntensity = intensity * 10;
    this.scene.cameras.main.shake(300, shakeIntensity);
  }

  /**
   * Get lightning color based on intensity
   */
  private getLightningColor(intensity: number): number {
    if (intensity > 0.8) return 0xffffff; // Pure white for max intensity
    if (intensity > 0.6) return 0xaaccff; // Light blue
    if (intensity > 0.4) return 0x4488ff; // Blue
    if (intensity > 0.2) return 0x6644ff; // Purple-blue
    return 0x8844ff; // Purple
  }

  /**
   * Clean up expired lightning bolt
   */
  private cleanupBolt(bolt: LightningBolt): void {
    if (bolt.line && bolt.line.active) {
      bolt.line.destroy();
    }
    
    if (bolt.particles && bolt.particles.active) {
      bolt.particles.destroy();
    }
    
    // Remove from active bolts array
    const index = this.activeBolts.indexOf(bolt);
    if (index > -1) {
      this.activeBolts.splice(index, 1);
    }
  }

  /**
   * Update method to clean up expired bolts
   */
  update(deltaTime: number): void {
    const now = Date.now();
    const expiredBolts: LightningBolt[] = [];
    
    for (const bolt of this.activeBolts) {
      if (now - bolt.startTime > bolt.duration) {
        expiredBolts.push(bolt);
      }
    }
    
    for (const bolt of expiredBolts) {
      this.cleanupBolt(bolt);
    }
  }

  /**
   * Clean up all effects
   */
  destroy(): void {
    // Clean up all active bolts
    for (const bolt of this.activeBolts) {
      this.cleanupBolt(bolt);
    }
    this.activeBolts = [];
    
    // Clean up event listeners
    EventBus.off('magnetic-chain-created', this.onChainCreated.bind(this));
    EventBus.off('magnetic-platform-activated', this.onPlatformActivated.bind(this));
    
    // Destroy lightning layer
    if (this.lightningLayer) {
      this.lightningLayer.destroy(true);
    }
    
    console.log('⚡ ChainLightningEffects destroyed');
  }
}