import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export class WallBounceEffects {
  private scene: Scene;
  
  // Visual effects for physics-based wall bounces
  private wallContactEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private successEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  
  // Audio

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupVisualEffects();
    this.setupEventListeners();
  }

  private setupVisualEffects(): void {
    // Initialize particle emitters with safety checks
    this.initializeParticleEmitters();
  }

  private initializeParticleEmitters(): void {
    // Add safety check for texture availability
    if (!this.scene.textures.exists('character')) {
      console.warn('WallBounceEffects: Character texture not ready, deferring particle emitter creation');
      return;
    }

    try {
      // Wall contact particles (sparks)
      this.wallContactEmitter = this.scene.add.particles(0, 0, 'character', {
        frame: 'character_beige_idle',
        scale: { start: 0.05, end: 0 },
        speed: { min: 100, max: 200 },
        lifespan: 200,
        quantity: 8,
        tint: 0xffaa00,
        emitting: false
      });
      this.wallContactEmitter.setDepth(400);

      // Success particles (burst)
      this.successEmitter = this.scene.add.particles(0, 0, 'character', {
        frame: 'character_beige_idle',
        scale: { start: 0.08, end: 0 },
        speed: { min: 150, max: 300 },
        lifespan: 400,
        quantity: 15,
        tint: 0x00ff00,
        emitting: false
      });
      this.successEmitter.setDepth(400);
    } catch (error) {
      console.warn('WallBounceEffects: Failed to create particle emitters:', error);
      this.wallContactEmitter = null;
      this.successEmitter = null;
    }
  }


  private setupEventListeners(): void {
    // Physics-based wall bounce events
    EventBus.on('player-wall-bounce', this.onSuccessfulBounce.bind(this));
    EventBus.on('wall-contact-effects', this.onWallContact.bind(this));
  }


  private onWallContact(data: any): void {
    // Emit contact particles at player position
    if (this.wallContactEmitter) {
      try {
        // Additional safety check for particle emitter internal state
        if (this.wallContactEmitter.active && this.wallContactEmitter.explode) {
          this.wallContactEmitter.setPosition(data.playerPosition.x, data.playerPosition.y);
          this.wallContactEmitter.explode(8);
        } else {
          console.warn('WallBounceEffects: Wall contact emitter not ready or corrupted, reinitializing...');
          this.initializeParticleEmitters();
        }
      } catch (error) {
        console.warn('WallBounceEffects: Error in wall contact particles:', error);
        // Reinitialize particle emitters if they're corrupted
        this.initializeParticleEmitters();
      }
    } else {
      // Try to initialize if emitters are null
      this.initializeParticleEmitters();
    }
  }

  private onSuccessfulBounce(data: any): void {
    // Success particles based on bounce efficiency
    const efficiency = data.efficiency || 0.8;

    console.log(`🎨 Wall bounce visual effect: efficiency=${efficiency.toFixed(2)}`);

    // Success particles
    if (this.successEmitter) {
      try {
        if (this.successEmitter.active && this.successEmitter.explode) {
          let particleColor = 0x00ff00; // Green for normal efficiency
          
          if (efficiency > 1.0) {
            particleColor = 0xffd700; // Gold for high efficiency
          } else if (efficiency < 0.8) {
            particleColor = 0xff0000; // Red for low efficiency (bad hits)
          }

          console.log(`🎨 Using particle color: ${efficiency < 0.8 ? 'RED' : efficiency > 1.0 ? 'GOLD' : 'GREEN'} (efficiency: ${efficiency.toFixed(2)})`);

          this.successEmitter.setConfig({ tint: particleColor });
          this.successEmitter.setPosition(data.position.x, data.position.y);
          this.successEmitter.explode(15);
        } else {
          console.warn('WallBounceEffects: Success emitter not ready or corrupted, reinitializing...');
          this.initializeParticleEmitters();
        }
      } catch (error) {
        console.warn('WallBounceEffects: Error in success particles:', error);
        this.initializeParticleEmitters();
      }
    } else {
      this.initializeParticleEmitters();
    }

    // Audio is now handled by AudioManager via 'player-wall-bounce' event

    // No camera shake for wall bounces - keep it smooth
  }



  destroy(): void {
    EventBus.off('player-wall-bounce', this.onSuccessfulBounce.bind(this));
    EventBus.off('wall-contact-effects', this.onWallContact.bind(this));

    // Safe particle emitter cleanup
    if (this.wallContactEmitter) {
      try {
        this.wallContactEmitter.destroy();
      } catch (error) {
        console.warn('WallBounceEffects: Error destroying wall contact emitter:', error);
      }
      this.wallContactEmitter = null;
    }

    if (this.successEmitter) {
      try {
        this.successEmitter.destroy();
      } catch (error) {
        console.warn('WallBounceEffects: Error destroying success emitter:', error);
      }
      this.successEmitter = null;
    }


    // Audio cleanup no longer needed - handled by AudioManager
  }
}