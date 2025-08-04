import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export class SpinningParticleEffects {
  private scene: Scene;
  
  // GPU-based spinning particle trail system (like the mouse example)
  private particleLayer: Phaser.GameObjects.Group | null = null;
  private particles: Phaser.GameObjects.Sprite[] = [];
  private currentlySpinning: boolean = false;
  private lastPlayerPosition = new Phaser.Math.Vector2();
  private currentParticleIndex: number = 0;
  
  // Trail parameters
  private readonly MAX_PARTICLES = 800; // Much bigger pool for longer trails
  private readonly PARTICLES_PER_FRAME = 3; // Reduced spawn rate (was 6)
  private readonly LIFESPAN = 8000; // 8 seconds for much longer trails
  
  // Store bound function references for proper EventBus cleanup
  private boundOnPlayerSpinning: (data: any) => void;
  private boundOnPlayerSpinningStop: () => void;
  
  constructor(scene: Scene) {
    this.scene = scene;
    
    // Bind event handlers once and store references
    this.boundOnPlayerSpinning = this.onPlayerSpinning.bind(this);
    this.boundOnPlayerSpinningStop = this.onPlayerSpinningStop.bind(this);
    
    this.setupParticleEffects();
    this.setupEventListeners();
  }

  private setupParticleEffects(): void {
    this.initializeParticlePool();
  }

  private initializeParticlePool(): void {
    // Check for star texture availability - fallback to character if needed
    const textureKey = this.scene.textures.exists('star') ? 'star' : 'character';
    const frameKey = textureKey === 'character' ? 'character_beige_idle' : undefined;
    
    if (!this.scene.textures.exists(textureKey)) {
      console.warn('SpinningParticleEffects: Required texture not ready, deferring particle creation');
      return;
    }

    try {
      // Create a group to manage particles
      this.particleLayer = this.scene.add.group();
      
      // Pre-create particle pool (all invisible initially)
      for (let i = 0; i < this.MAX_PARTICLES; i++) {
        const particle = this.scene.add.sprite(0, 0, textureKey, frameKey);
        particle.setDepth(-10); // Well behind player (player is typically at depth 0 or positive)
        particle.setVisible(false);
        particle.setScale(0.1);
        particle.setBlendMode(Phaser.BlendModes.ADD);
        this.particles.push(particle);
        this.particleLayer.add(particle);
      }
      
      console.log(`✨ Created GPU particle pool with ${this.MAX_PARTICLES} particles`);
    } catch (error) {
      console.warn('SpinningParticleEffects: Failed to create particle pool:', error);
      this.particleLayer = null;
    }
  }

  private setupEventListeners(): void {
    // Listen for spinning events from player
    EventBus.on('player-spinning', this.boundOnPlayerSpinning);
    EventBus.on('player-spinning-stop', this.boundOnPlayerSpinningStop);
  }

  private onPlayerSpinning(data: any): void {
    if (!this.particleLayer || !this.particles.length) {
      this.initializeParticlePool();
      return;
    }

    this.currentlySpinning = true;
    
    // Update current position for trail creation
    const currentPosition = new Phaser.Math.Vector2(data.playerPosition.x, data.playerPosition.y);
    
    // Create trail particles between last position and current position (like the mouse example)
    this.createTrailParticles(this.lastPlayerPosition, currentPosition, data.rotationSpeed);
    
    // Update last position
    this.lastPlayerPosition.copy(currentPosition);
  }

  private createTrailParticles(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2, rotationSpeed: number): void {
    // Calculate intensity based on rotation speed
    const intensity = Math.min(rotationSpeed / 35.0, 1.0);
    
    // Determine particle color based on intensity
    let particleColor = 0xffdd00; // Yellow default
    if (intensity > 0.8) {
      particleColor = 0xff3300; // Bright red for high speed
    } else if (intensity > 0.5) {
      particleColor = 0xff6600; // Orange for medium speed  
    } else if (intensity > 0.2) {
      particleColor = 0xffaa00; // Yellow-orange for low-medium speed
    } else {
      particleColor = 0x88ddff; // Light blue for very low speed
    }
    
    // Create particles along the trail with smooth scaling from trickle to flood
    // Use probability-based emission for very low intensities, then scale up smoothly
    let particlesToEmit = 0;
    
    if (intensity <= 0.15) {
      // Very low intensity: very sparse trickle (0-7.5% chance of 1 particle)
      const trickleChance = intensity * 0.5; // Much lower chance: 0-7.5% based on intensity
      if (Math.random() < trickleChance) {
        particlesToEmit = 1;
      }
    } else {
      // Higher intensity: smooth curve from 1 to max particles
      const minParticles = 1;
      const maxParticles = this.PARTICLES_PER_FRAME * 2.5;  // Up to ~7-8 particles
      const normalizedIntensity = (intensity - 0.15) / 0.85; // Normalize 0.15-1.0 to 0-1
      const curve = Math.pow(normalizedIntensity, 0.6);  // Smooth curve
      particlesToEmit = Math.ceil(minParticles + curve * (maxParticles - minParticles));
    }
    
    for (let i = 0; i < particlesToEmit; i++) {
      // Get next particle from pool (wrap around)
      this.currentParticleIndex = (this.currentParticleIndex + 1) % this.MAX_PARTICLES;
      const particle = this.particles[this.currentParticleIndex];
      
      // IMPORTANT: Kill any existing tweens on this particle to prevent weird behavior
      this.scene.tweens.killTweensOf(particle);
      
      // Position particle along the trail
      const t = i / particlesToEmit;
      const pos = Phaser.Math.LinearXY(from, to, t);
      
      // Spawn particles from a tighter area around player center (reduced from full 80x100 bounding box)
      const spawnAreaWidth = 30;   // Tighter horizontal spawn area
      const spawnAreaHeight = 40;  // Tighter vertical spawn area
      pos.x += (Math.random() - 0.5) * spawnAreaWidth;   // Random within tighter width
      pos.y += (Math.random() - 0.5) * spawnAreaHeight;  // Random within tighter height
      
      // RESET particle properties completely (no inheritance)
      particle.setPosition(pos.x, pos.y);
      particle.setTint(particleColor);
      particle.setScale(0.15 + intensity * 0.1); // Bigger particles for higher intensity
      particle.setRotation(0); // Reset rotation
      particle.setVisible(true);
      particle.setAlpha(0.8);
      
      // Store initial position for scattering calculation
      const startX = particle.x;
      const startY = particle.y;
      
      // Animate particle with random scattering motion over 4 seconds
      const randomVelX = (Math.random() - 0.5) * 120; // Random horizontal drift
      const randomVelY = (Math.random() - 0.5) * 120; // Random vertical drift
      
      this.scene.tweens.add({
        targets: particle,
        alpha: 0,
        scaleX: 0.05,
        scaleY: 0.05,
        x: startX + randomVelX, // Scatter from initial position (not current which might be mid-tween)
        y: startY + randomVelY + 60, // Scatter from initial position with slight upward bias
        duration: this.LIFESPAN,
        ease: 'Power2',
        onComplete: () => {
          particle.setVisible(false);
          // Double-check particle is reset
          particle.setAlpha(1);
          particle.setScale(0.1);
        }
      });
    }
    
    console.log(`✨ Trail particles: intensity=${intensity.toFixed(2)}, color=${particleColor.toString(16)}, particles=${particlesToEmit}`);
  }

  private onPlayerSpinningStop(): void {
    this.currentlySpinning = false;
    console.log(`🛑 Stopped spinning particle trail`);
  }

  destroy(): void {
    // Properly remove EventBus listeners using stored bound function references
    EventBus.off('player-spinning', this.boundOnPlayerSpinning);
    EventBus.off('player-spinning-stop', this.boundOnPlayerSpinningStop);

    // Clean up particle pool
    if (this.particleLayer) {
      this.particleLayer.destroy(true); // Destroy all children too
      this.particleLayer = null;
    }
    
    this.particles = [];
    this.currentlySpinning = false;
  }
}