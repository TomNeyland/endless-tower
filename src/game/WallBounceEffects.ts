import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export class WallBounceEffects {
  private scene: Scene;
  
  // Visual effects
  private timingWindowOverlay: Phaser.GameObjects.Rectangle | null = null;
  private flashEffect: Phaser.GameObjects.Rectangle | null = null;
  private wallContactEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private successEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  
  // Audio
  private wallContactSound: Phaser.Sound.BaseSound | null = null;
  private successSound: Phaser.Sound.BaseSound | null = null;
  private missedSound: Phaser.Sound.BaseSound | null = null;
  
  // Timing window visual state
  private timingWindowTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupVisualEffects();
    this.setupAudioEffects();
    this.setupEventListeners();
  }

  private setupVisualEffects(): void {
    // Create timing window overlay (screen border effect)
    this.timingWindowOverlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xffffff,
      0
    );
    this.timingWindowOverlay.setDepth(500);
    this.timingWindowOverlay.setStrokeStyle(8, 0x00ffff, 0);
    this.timingWindowOverlay.setVisible(false);

    // Create flash effect rectangle
    this.flashEffect = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xffffff,
      0
    );
    this.flashEffect.setDepth(600);
    this.flashEffect.setVisible(false);

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

  private setupAudioEffects(): void {
    // Use existing jump sound as placeholder for now
    // In a real game, these would be distinct sound effects
    this.wallContactSound = this.scene.sound.add('jump-sound', { volume: 0.2, rate: 0.8 });
    this.successSound = this.scene.sound.add('jump-sound', { volume: 0.4, rate: 1.2 });
    this.missedSound = this.scene.sound.add('jump-sound', { volume: 0.1, rate: 0.5 });
  }

  private setupEventListeners(): void {
    EventBus.on('wall-bounce-window-started', this.onTimingWindowStarted.bind(this));
    EventBus.on('wall-bounce-window-missed', this.onTimingWindowMissed.bind(this));
    EventBus.on('player-wall-bounce', this.onSuccessfulBounce.bind(this));
    EventBus.on('wall-contact-effects', this.onWallContact.bind(this));
  }

  private onTimingWindowStarted(data: any): void {
    if (!this.timingWindowOverlay) return;

    // Show timing window border
    this.timingWindowOverlay.setVisible(true);
    this.timingWindowOverlay.setStrokeStyle(8, 0x00ffff, 1);

    // Animate border intensity
    this.timingWindowTween = this.scene.tweens.add({
      targets: this.timingWindowOverlay,
      alpha: 0.3,
      duration: 100,
      ease: 'Power2',
      yoyo: true,
      repeat: -1
    });

    // Play wall contact sound
    if (this.wallContactSound) {
      this.wallContactSound.play();
    }

    // Hide after window duration
    this.scene.time.delayedCall(data.windowDuration, () => {
      this.hideTimingWindow();
    });
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
    this.hideTimingWindow();

    // Success flash effect based on timing quality
    let flashColor = 0x00ff00; // Green for good timing
    let flashIntensity = 0.3;

    if (data.timingQuality === 'perfect') {
      flashColor = 0xffd700; // Gold for perfect timing
      flashIntensity = 0.5;
    } else if (data.timingQuality === 'late') {
      flashColor = 0xff6600; // Orange for late timing
      flashIntensity = 0.2;
    }

    // Flash effect
    if (this.flashEffect) {
      this.flashEffect.setVisible(true);
      this.flashEffect.setFillStyle(flashColor, flashIntensity);
      
      this.scene.tweens.add({
        targets: this.flashEffect,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          this.flashEffect?.setVisible(false);
          this.flashEffect?.setAlpha(1);
        }
      });
    }

    // Success particles
    if (this.successEmitter) {
      try {
        // Additional safety check for particle emitter internal state
        if (this.successEmitter.active && this.successEmitter.explode) {
          let particleColor = 0x00ff00;
          if (data.timingQuality === 'perfect') {
            particleColor = 0xffd700;
          }

          // Update particle color by recreating with new tint
          this.successEmitter.setConfig({ tint: particleColor });
          this.successEmitter.setPosition(data.position.x, data.position.y);
          this.successEmitter.explode(15);
        } else {
          console.warn('WallBounceEffects: Success emitter not ready or corrupted, reinitializing...');
          this.initializeParticleEmitters();
        }
      } catch (error) {
        console.warn('WallBounceEffects: Error in success particles:', error);
        // Reinitialize particle emitters if they're corrupted
        this.initializeParticleEmitters();
      }
    } else {
      // Try to initialize if emitters are null
      this.initializeParticleEmitters();
    }

    // Success sound
    if (this.successSound) {
      // Vary pitch based on timing quality
      const rate = data.timingQuality === 'perfect' ? 1.4 : 
                   data.timingQuality === 'good' ? 1.2 : 1.0;
      this.successSound.play({ rate });
    }

    // Camera shake for successful bounces
    EventBus.emit('camera-shake', {
      intensity: data.timingQuality === 'perfect' ? 8 : 5,
      duration: 100
    });
  }

  private onTimingWindowMissed(data: any): void {
    this.hideTimingWindow();

    // Missed flash (red, subtle)
    if (this.flashEffect) {
      this.flashEffect.setVisible(true);
      this.flashEffect.setFillStyle(0xff0000, 0.1);
      
      this.scene.tweens.add({
        targets: this.flashEffect,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.flashEffect?.setVisible(false);
          this.flashEffect?.setAlpha(1);
        }
      });
    }

    // Missed sound
    if (this.missedSound) {
      this.missedSound.play();
    }
  }

  private hideTimingWindow(): void {
    if (this.timingWindowOverlay) {
      this.timingWindowOverlay.setVisible(false);
      this.timingWindowOverlay.setStrokeStyle(8, 0x00ffff, 0);
    }

    if (this.timingWindowTween) {
      this.timingWindowTween.destroy();
      this.timingWindowTween = null;
    }
  }

  destroy(): void {
    EventBus.off('wall-bounce-window-started', this.onTimingWindowStarted.bind(this));
    EventBus.off('wall-bounce-window-missed', this.onTimingWindowMissed.bind(this));
    EventBus.off('player-wall-bounce', this.onSuccessfulBounce.bind(this));
    EventBus.off('wall-contact-effects', this.onWallContact.bind(this));

    if (this.timingWindowTween) {
      this.timingWindowTween.destroy();
      this.timingWindowTween = null;
    }

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

    if (this.timingWindowOverlay) {
      this.timingWindowOverlay.destroy();
      this.timingWindowOverlay = null;
    }

    if (this.flashEffect) {
      this.flashEffect.destroy();
      this.flashEffect = null;
    }

    // Clean up audio references
    this.wallContactSound = null;
    this.successSound = null;
    this.missedSound = null;
  }
}