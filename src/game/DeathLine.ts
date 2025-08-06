import { Scene, GameObjects } from 'phaser';
import { Player } from './Player';
import { GameConfiguration, DeathLineConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

export class DeathLine {
  private scene: Scene;
  private player: Player;
  private config: DeathLineConfig;
  
  // Visual elements
  private deathLineGraphics: GameObjects.Graphics;
  private warningZone: GameObjects.Graphics;
  private warningText: GameObjects.Text;
  
  // Particle systems
  private emberParticles: GameObjects.Particles.ParticleEmitter | null = null;
  private sparkParticles: GameObjects.Particles.ParticleEmitter | null = null;
  private smokeParticles: GameObjects.Particles.ParticleEmitter | null = null;
  
  // State
  private deathLineY: number = 0;
  private gameStartTime: number = 0;
  private isGameOver: boolean = false;
  private deathLineActive: boolean = false;
  private highestPlayerY: number = 0;
  private initialPlayerY: number = 0;
  private demoMode: boolean = false;
  
  // Catch-up system state
  private currentRiseSpeed: number = 0;
  private catchUpActive: boolean = false;
  
  // Visual effects
  private pulseIntensity: number = 0;
  private lastWarningTime: number = 0;
  
  // Warning distance now comes from config
  private readonly PULSE_SPEED = 3; // Speed of death line pulsing effect

  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.config = gameConfig.deathLine;
    
    this.gameStartTime = Date.now();
    this.initialPlayerY = player.y;
    this.highestPlayerY = player.y;
    this.currentRiseSpeed = this.config.riseSpeed;
    this.setupVisuals();
    this.setupParticleSystem();
    this.setupEventListeners();
  }

  private setupVisuals(): void {
    // Create death line graphics (translucent full-width block)
    this.deathLineGraphics = this.scene.add.graphics();
    this.deathLineGraphics.setDepth(800); // Above most game elements but below UI
    
    // Create warning zone graphics  
    this.warningZone = this.scene.add.graphics();
    this.warningZone.setDepth(700);
    this.warningZone.setAlpha(0.3);
    
    // Create warning text
    this.warningText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height * 0.8,
      'DANGER! CLIMB HIGHER!',
      {
        fontSize: '32px',
        color: '#ff0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.warningText.setOrigin(0.5, 0.5);
    this.warningText.setDepth(900);
    this.warningText.setVisible(false);
    this.warningText.setScrollFactor(0); // Stay fixed on screen
  }

  private setupParticleSystem(): void {
    // Create particle textures procedurally
    this.createParticleTextures();
    
    // Initialize particle emitters (but don't start them yet)
    this.createParticleEmitters();
  }

  private createParticleTextures(): void {
    // Create ember texture (orange/red circle)
    const emberGraphics = this.scene.add.graphics();
    emberGraphics.fillStyle(0xff4400, 1);
    emberGraphics.fillCircle(4, 4, 4);
    emberGraphics.generateTexture('ember-particle', 8, 8);
    emberGraphics.destroy();
    
    // Create spark texture (small bright yellow circle)
    const sparkGraphics = this.scene.add.graphics();
    sparkGraphics.fillStyle(0xffff00, 1);
    sparkGraphics.fillCircle(2, 2, 2);
    sparkGraphics.generateTexture('spark-particle', 4, 4);
    sparkGraphics.destroy();
    
    // Create smoke texture (dark gray circle)
    const smokeGraphics = this.scene.add.graphics();
    smokeGraphics.fillStyle(0x444444, 0.6);
    smokeGraphics.fillCircle(6, 6, 6);
    smokeGraphics.generateTexture('smoke-particle', 12, 12);
    smokeGraphics.destroy();
  }

  private createParticleEmitters(): void {
    // Ember particles - float upward slowly
    this.emberParticles = this.scene.add.particles(0, 0, 'ember-particle', {
      x: { min: 0, max: this.scene.scale.width },
      y: 0, // Will be set dynamically
      speedX: { min: -20, max: 20 },
      speedY: { min: -80, max: -120 },
      scale: { start: 0.5, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 3000,
      frequency: 100,
      quantity: 2
    }).setDepth(750).stop(); // Chain methods for cleaner code
    
    // Spark particles - quick bright flashes
    this.sparkParticles = this.scene.add.particles(0, 0, 'spark-particle', {
      x: { min: 0, max: this.scene.scale.width },
      y: 0, // Will be set dynamically
      speedX: { min: -60, max: 60 },
      speedY: { min: -200, max: -300 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      frequency: 200,
      quantity: 1
    }).setDepth(760).stop(); // Chain methods for cleaner code
    
    // Smoke particles - rise and expand slowly
    this.smokeParticles = this.scene.add.particles(0, 0, 'smoke-particle', {
      x: { min: 0, max: this.scene.scale.width },
      y: 0, // Will be set dynamically
      speedX: { min: -10, max: 10 },
      speedY: { min: -30, max: -60 },
      scale: { start: 0.3, end: 0.8 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 4000,
      frequency: 150,
      quantity: 1
    }).setDepth(740).stop(); // Chain methods for cleaner code
  }

  private setupEventListeners(): void {
    // Death line no longer depends on camera events
  }

  update(deltaTime: number): void {
    if (this.isGameOver) return;
    
    // Don't activate death line in demo mode
    if (!this.demoMode) {
      this.updateDeathLineActivation();
    }
    
    if (this.deathLineActive && !this.demoMode) {
      this.updateDeathLinePosition(deltaTime);
      this.updateVisuals();
      this.checkPlayerCollision();
      this.updateWarningSystem();
    } else {
      // Clear visuals when inactive or in demo mode
      this.deathLineGraphics.clear();
      this.warningZone.clear();
      this.warningText.setVisible(false);
    }
  }

  private updateDeathLineActivation(): void {
    if (this.deathLineActive) return; // Already active
    
    // Track player's highest point
    if (this.player.y < this.highestPlayerY) {
      this.highestPlayerY = this.player.y;
    }
    
    const timeElapsed = Date.now() - this.gameStartTime;
    // Height climbed should be the difference from initial position to highest reached
    // Since Y decreases as you go up, we need (initialY - highestY)
    const heightClimbed = Math.max(0, this.initialPlayerY - this.highestPlayerY);
    
    // Activate death line if either condition is met
    const timeConditionMet = timeElapsed >= this.config.startDelay;
    const heightConditionMet = heightClimbed >= this.config.minHeight;
    
    if (timeConditionMet || heightConditionMet) {
      this.deathLineActive = true;
      // Initialize death line position below the initial player position
      this.deathLineY = this.initialPlayerY + 200; // Start 200px below initial position
      console.log(`💀 Death line activated! Time: ${(timeElapsed/1000).toFixed(1)}s, Height: ${heightClimbed.toFixed(0)}px`);
      EventBus.emit('death-line-activated');
    }
  }

  private updateDeathLinePosition(deltaTime: number): void {
    // Calculate current base speed with floor-based progression
    const baseSpeed = this.calculateProgressiveSpeed();
    
    // Calculate distance from player to death line
    const distanceToPlayer = this.deathLineY - this.player.y;
    
    // Apply catch-up system
    this.updateCatchUpSystem(distanceToPlayer, baseSpeed, deltaTime);
    
    // Death line rises using current calculated speed
    const riseAmount = this.currentRiseSpeed * (deltaTime / 1000);
    this.deathLineY -= riseAmount; // Negative Y = upward movement
  }

  private calculateProgressiveSpeed(): number {
    // Calculate height climbed to determine floors reached
    const heightClimbed = Math.max(0, this.initialPlayerY - this.highestPlayerY);
    const floorsClimbed = Math.floor(heightClimbed / this.config.floorHeight);
    
    // Calculate speed increases every N floors
    const speedIncreaseIntervals = Math.floor(floorsClimbed / this.config.speedIncreaseInterval);
    const totalSpeedIncrease = speedIncreaseIntervals * this.config.speedIncreasePerFloor * this.config.speedIncreaseInterval;
    
    // Apply cap to prevent overwhelming difficulty
    const progressiveSpeed = Math.min(
      this.config.riseSpeed + totalSpeedIncrease,
      this.config.maxBaseSpeed
    );
    
    return progressiveSpeed;
  }

  private updateCatchUpSystem(distanceToPlayer: number, baseSpeed: number, deltaTime: number): void {
    const targetSpeed = this.calculateTargetSpeed(distanceToPlayer, baseSpeed);
    
    // Smooth acceleration/deceleration to target speed
    const speedDifference = targetSpeed - this.currentRiseSpeed;
    const maxSpeedChange = this.config.catchUpAcceleration * (deltaTime / 1000);
    
    if (Math.abs(speedDifference) <= maxSpeedChange) {
      this.currentRiseSpeed = targetSpeed;
    } else {
      this.currentRiseSpeed += Math.sign(speedDifference) * maxSpeedChange;
    }
    
    // Update catch-up active status for visual indicators
    this.catchUpActive = this.currentRiseSpeed > baseSpeed * 1.1; // 10% threshold for catch-up indication
  }

  private calculateTargetSpeed(distanceToPlayer: number, baseSpeed: number): number {
    // Emergency catch-up: teleport if player gets too far ahead
    if (distanceToPlayer > this.config.maxPlayerDistance) {
      // Teleport death line closer to player
      this.deathLineY = this.player.y + this.config.catchUpThreshold;
      return baseSpeed;
    }
    
    // Normal catch-up when player exceeds threshold
    if (distanceToPlayer > this.config.catchUpThreshold) {
      // Calculate catch-up intensity (0.0 to 1.0)
      const excessDistance = distanceToPlayer - this.config.catchUpThreshold;
      const maxExcess = this.config.maxPlayerDistance - this.config.catchUpThreshold;
      const catchUpIntensity = Math.min(excessDistance / maxExcess, 1.0);
      
      // Interpolate between base speed and max catch-up speed
      return baseSpeed + (this.config.maxCatchUpSpeed - baseSpeed) * catchUpIntensity;
    }
    
    // Within threshold: use base progressive speed
    return baseSpeed;
  }

  private updateVisuals(): void {
    const camera = this.scene.cameras.main;
    const screenBottom = camera.scrollY + this.scene.scale.height;
    const screenTop = camera.scrollY;
    
    // Clear previous graphics
    this.deathLineGraphics.clear();
    this.warningZone.clear();
    
    // Always render death line when active - fix broken visibility logic
    // Death line should be visible when it's approaching, not just when on screen
    if (this.deathLineActive) {
      this.drawFireWall(camera);
      this.drawWarningEffects(camera);
    }
    
    // Update pulse effect
    this.pulseIntensity += this.PULSE_SPEED * (1 / 60); // 60fps normalized
    if (this.pulseIntensity > Math.PI * 2) {
      this.pulseIntensity -= Math.PI * 2;
    }
  }

  private drawFireWall(camera: Phaser.Cameras.Scene2D.Camera): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const screenBottom = camera.scrollY + screenHeight;
    
    // Calculate distance from player to death line for proximity effects
    const distanceToPlayer = this.deathLineY - this.player.y;
    const proximityFactor = Math.max(0, Math.min(1, (1000 - distanceToPlayer) / 1000)); // 0-1 based on closeness
    
    // Fire wall height based on proximity - taller when closer
    const fireWallHeight = 80 + (proximityFactor * 120); // 80px base, up to 200px when close
    
    // Calculate render position - always render at bottom of screen when close
    let renderY: number;
    if (distanceToPlayer < 300) {
      // When close, render at bottom of screen for maximum visibility
      renderY = screenBottom - fireWallHeight;
    } else {
      // When far, render at actual world position
      renderY = Math.max(screenBottom - fireWallHeight, this.deathLineY - fireWallHeight);
    }
    
    // Base fire colors that get more intense with proximity
    const baseRed = Math.floor(200 + (proximityFactor * 55)); // 200-255
    const baseGreen = Math.floor(50 + (proximityFactor * 50)); // 50-100  
    const baseBlue = 0;
    const baseColor = (baseRed << 16) | (baseGreen << 8) | baseBlue;
    
    // Pulsing effect for the fire intensity
    const pulseAlpha = 0.7 + (Math.sin(this.pulseIntensity * 1.5) * 0.3) + (proximityFactor * 0.3);
    
    // Draw main fire wall base
    this.deathLineGraphics.fillStyle(baseColor, pulseAlpha);
    this.deathLineGraphics.fillRect(0, renderY, screenWidth, fireWallHeight);
    
    // Draw animated flame tongues at the top
    this.drawFireFlames(renderY, screenWidth, proximityFactor);
    
    // Draw fire border/edge effect
    this.drawFireBorder(renderY, screenWidth, proximityFactor);
    
    // Update particle systems based on proximity
    this.updateParticleEffects(renderY, proximityFactor);
  }

  private drawFireFlames(fireTop: number, screenWidth: number, intensity: number): void {
    const flameCount = Math.floor(screenWidth / 25); // Flame every 25px
    const maxFlameHeight = 30 + (intensity * 40); // Taller flames when closer
    
    this.deathLineGraphics.lineStyle(3, 0xff6600, 0.8 + (intensity * 0.2));
    
    for (let i = 0; i < flameCount; i++) {
      const x = (i * 25) + (Math.sin(this.pulseIntensity + i) * 3); // Slight horizontal movement
      const flameHeight = (maxFlameHeight * 0.5) + Math.sin(this.pulseIntensity * 2 + i * 0.5) * (maxFlameHeight * 0.5);
      
      // Draw flame shape
      this.deathLineGraphics.beginPath();
      this.deathLineGraphics.moveTo(x, fireTop);
      this.deathLineGraphics.lineTo(x + 8, fireTop - flameHeight * 0.7);
      this.deathLineGraphics.lineTo(x + 12, fireTop - flameHeight);
      this.deathLineGraphics.lineTo(x + 16, fireTop - flameHeight * 0.8);
      this.deathLineGraphics.lineTo(x + 20, fireTop);
      this.deathLineGraphics.strokePath();
      
      // Add flame core (brighter color)
      if (intensity > 0.3) {
        this.deathLineGraphics.lineStyle(1, 0xffff00, intensity);
        this.deathLineGraphics.beginPath();
        this.deathLineGraphics.moveTo(x + 4, fireTop);
        this.deathLineGraphics.lineTo(x + 10, fireTop - flameHeight * 0.8);
        this.deathLineGraphics.lineTo(x + 16, fireTop);
        this.deathLineGraphics.strokePath();
      }
    }
  }

  private drawFireBorder(fireTop: number, screenWidth: number, intensity: number): void {
    // Animated border that pulses with intensity
    const borderThickness = 3 + (intensity * 4);
    const borderPulse = Math.sin(this.pulseIntensity * 3) * (1 + intensity);
    
    this.deathLineGraphics.lineStyle(borderThickness + borderPulse, 0xff3300, 0.9);
    this.deathLineGraphics.beginPath();
    this.deathLineGraphics.moveTo(0, fireTop);
    this.deathLineGraphics.lineTo(screenWidth, fireTop);
    this.deathLineGraphics.strokePath();
  }

  private updateParticleEffects(fireTop: number, intensity: number): void {
    if (!this.emberParticles || !this.sparkParticles || !this.smokeParticles) return;
    
    // Start particles when fire is somewhat close (intensity > 0.1)
    if (intensity > 0.1) {
      // Position emitters at the fire top
      this.emberParticles.setPosition(0, fireTop);
      this.sparkParticles.setPosition(0, fireTop);
      this.smokeParticles.setPosition(0, fireTop);
      
      // Scale particle intensity based on proximity
      this.updateEmberParticles(intensity);
      this.updateSparkParticles(intensity);
      this.updateSmokeParticles(intensity);
      
      // Start emitters if not already running
      if (!this.emberParticles.emitting) this.emberParticles.start();
      if (!this.sparkParticles.emitting) this.sparkParticles.start();
      if (!this.smokeParticles.emitting) this.smokeParticles.start();
      
    } else {
      // Stop particles when fire is far away
      if (this.emberParticles.emitting) this.emberParticles.stop();
      if (this.sparkParticles.emitting) this.sparkParticles.stop();
      if (this.smokeParticles.emitting) this.smokeParticles.stop();
    }
  }

  private updateEmberParticles(intensity: number): void {
    if (!this.emberParticles) return;
    
    // More embers when closer
    const frequency = Math.max(50, 200 - (intensity * 150)); // 200ms down to 50ms
    const quantity = Math.floor(1 + (intensity * 3)); // 1-4 particles per emit
    
    this.emberParticles.setFrequency(frequency);
    this.emberParticles.setQuantity(quantity);
  }

  private updateSparkParticles(intensity: number): void {
    if (!this.sparkParticles) return;
    
    // More frequent sparks when very close
    if (intensity > 0.5) {
      const frequency = Math.max(80, 300 - (intensity * 220)); // More frequent when close
      const quantity = Math.floor(1 + (intensity * 2)); // 1-3 particles
      
      this.sparkParticles.setFrequency(frequency);
      this.sparkParticles.setQuantity(quantity);
    } else {
      // Reduce sparks when not very close
      this.sparkParticles.setFrequency(400);
      this.sparkParticles.setQuantity(1);
    }
  }

  private updateSmokeParticles(intensity: number): void {
    if (!this.smokeParticles) return;
    
    // Smoke becomes denser when closer
    const frequency = Math.max(100, 250 - (intensity * 100)); // Denser smoke when close
    const quantity = Math.floor(1 + (intensity * 2)); // 1-3 particles
    
    this.smokeParticles.setFrequency(frequency);
    this.smokeParticles.setQuantity(quantity);
  }

  private drawWarningEffects(camera: Phaser.Cameras.Scene2D.Camera): void {
    const distanceToPlayer = this.deathLineY - this.player.y;
    const proximityFactor = Math.max(0, Math.min(1, (1000 - distanceToPlayer) / 1000));
    
    // Don't draw warning effects if too far away
    if (distanceToPlayer > 1000) return;
    
    // Screen tint effect that gets stronger when closer
    if (proximityFactor > 0.1) {
      this.drawScreenTint(camera, proximityFactor);
    }
    
    // Heat shimmer effect when very close
    if (proximityFactor > 0.5) {
      this.drawHeatShimmer(camera, proximityFactor);
    }
  }

  private drawScreenTint(camera: Phaser.Cameras.Scene2D.Camera, intensity: number): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    // Red tint that gets stronger with proximity
    const tintAlpha = intensity * 0.3; // Max 30% tint
    const tintColor = 0xff3300;
    
    // Create a full-screen tint overlay
    this.warningZone.fillStyle(tintColor, tintAlpha);
    this.warningZone.fillRect(camera.scrollX, camera.scrollY, screenWidth, screenHeight);
  }

  private drawHeatShimmer(camera: Phaser.Cameras.Scene2D.Camera, intensity: number): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const shimmerHeight = screenHeight * 0.3; // Bottom 30% of screen
    
    // Create heat shimmer effect with wavy lines
    this.warningZone.lineStyle(1, 0xff6600, intensity * 0.4);
    
    const waveCount = 15;
    for (let i = 0; i < waveCount; i++) {
      const y = camera.scrollY + screenHeight - (shimmerHeight * (i / waveCount));
      this.warningZone.beginPath();
      
      for (let x = 0; x < screenWidth; x += 5) {
        const waveOffset = Math.sin((this.pulseIntensity * 3) + (x * 0.02) + (i * 0.3)) * (2 + intensity * 3);
        const actualY = y + waveOffset;
        
        if (x === 0) {
          this.warningZone.moveTo(camera.scrollX + x, actualY);
        } else {
          this.warningZone.lineTo(camera.scrollX + x, actualY);
        }
      }
      this.warningZone.strokePath();
    }
  }

  private checkPlayerCollision(): void {
    if (this.isGameOver) return;
    
    const playerBottom = this.player.y + (this.player.body as any).height;
    
    if (playerBottom >= this.deathLineY) {
      this.triggerGameOver();
    }
  }

  private updateWarningSystem(): void {
    const distanceToDeathLine = this.deathLineY - this.player.y;
    const proximityFactor = Math.max(0, Math.min(1, (1000 - distanceToDeathLine) / 1000));
    
    // Calculate progression info
    const heightClimbed = Math.max(0, this.initialPlayerY - this.highestPlayerY);
    const floorsClimbed = Math.floor(heightClimbed / this.config.floorHeight);
    const currentBaseSpeed = this.calculateProgressiveSpeed();
    
    // Define threat levels based on distance
    let threatLevel: 'safe' | 'aware' | 'caution' | 'danger' | 'critical';
    let warningText: string;
    let warningColor: string;
    
    if (distanceToDeathLine > 800) {
      threatLevel = 'safe';
      this.warningText.setVisible(false);
      return;
    } else if (distanceToDeathLine > 400) {
      threatLevel = 'aware';
      const speedIndicator = this.catchUpActive ? ' ⚡' : '';
      warningText = `Fire Rising - Floor ${floorsClimbed} (${Math.floor(currentBaseSpeed)}px/s)${speedIndicator}`;
      warningColor = '#ffaa00';
    } else if (distanceToDeathLine > 200) {
      threatLevel = 'caution';
      const speedIndicator = this.catchUpActive ? ' ⚡⚡' : '';
      warningText = `CAUTION - Fire Accelerating!${speedIndicator}`;
      warningColor = '#ff6600';
    } else if (distanceToDeathLine > 100) {
      threatLevel = 'danger';
      const speedIndicator = this.catchUpActive ? ' ⚡⚡⚡' : '';
      warningText = `DANGER - CLIMB NOW!${speedIndicator}`;
      warningColor = '#ff3300';
    } else {
      threatLevel = 'critical';
      const speedIndicator = this.catchUpActive ? ' ⚡⚡⚡⚡' : '';
      warningText = `🔥 CRITICAL - ESCAPE!${speedIndicator} 🔥`;
      warningColor = '#ff0000';
    }
    
    // Show warning text
    this.warningText.setVisible(true);
    this.warningText.setText(warningText);
    this.warningText.setColor(warningColor);
    
    // Pulse intensity based on threat level
    let pulseSpeed = 1;
    if (threatLevel === 'critical') pulseSpeed = 4;
    else if (threatLevel === 'danger') pulseSpeed = 2.5;
    else if (threatLevel === 'caution') pulseSpeed = 1.5;
    
    const pulse = Math.sin(this.pulseIntensity * pulseSpeed) * 0.4 + 0.6;
    this.warningText.setAlpha(pulse);
    
    // Scale text size based on urgency
    let textScale = 1;
    if (threatLevel === 'critical') textScale = 1.5;
    else if (threatLevel === 'danger') textScale = 1.3;
    else if (threatLevel === 'caution') textScale = 1.1;
    
    this.warningText.setScale(textScale);
    
    // Emit warning events for audio system
    const now = Date.now();
    if (now - this.lastWarningTime > 2000) { // Every 2 seconds
      this.lastWarningTime = now;
      EventBus.emit('death-line-warning', {
        distance: distanceToDeathLine,
        threatLevel,
        proximityFactor,
        playerPosition: { x: this.player.x, y: this.player.y }
      });
    }
    
    // Trigger screen shake for critical situations
    if (threatLevel === 'critical' && now - this.lastWarningTime > 1000) {
      EventBus.emit('camera-shake', { intensity: 2, duration: 200 });
    }
  }

  private triggerGameOver(): void {
    if (this.isGameOver) return;
    
    this.isGameOver = true;
    
    // Stop all movement and effects
    this.player.setVelocity(0, 0);
    
    // Emit game over event first
    EventBus.emit('game-over', {
      cause: 'death-line',
      survivalTime: Date.now() - this.gameStartTime,
      finalHeight: this.getPlayerDistanceFromDeathLine(),
      playerPosition: { x: this.player.x, y: this.player.y },
      timestamp: Date.now()
    });
    
    // Then request comprehensive game stats from other systems
    this.scene.time.delayedCall(16, () => {
      EventBus.emit('request-game-stats');
    });
    
    // Visual feedback (no more camera fade - let GameOverScreen handle it)
    this.scene.cameras.main.shake(300, 0.01);
  }

  getDeathLineY(): number {
    return this.deathLineY;
  }

  getPlayerDistanceFromDeathLine(): number {
    return Math.max(0, this.deathLineY - this.player.y);
  }

  isPlayerInDanger(): boolean {
    return this.getPlayerDistanceFromDeathLine() <= this.config.warningDistance;
  }

  isPlayerDead(): boolean {
    return this.isGameOver;
  }

  reset(): void {
    console.log('🔄 DeathLine: Resetting death line system');
    
    // Reset all death line state
    this.isGameOver = false;
    this.deathLineActive = false;
    this.gameStartTime = Date.now();
    
    // CRITICAL: Reset position tracking to current player position
    // This prevents immediate reactivation due to height calculation
    this.initialPlayerY = this.player.y;
    this.highestPlayerY = this.player.y;
    
    // Reset death line position to be well below player (will be set properly when activated)
    this.deathLineY = this.player.y + 500; // Start 500px below player
    
    // Reset speed and catch-up system
    this.currentRiseSpeed = this.config.riseSpeed;
    this.catchUpActive = false;
    
    // Reset visual effects
    this.pulseIntensity = 0;
    this.lastWarningTime = 0;
    
    // Stop and reset particle systems
    if (this.emberParticles && this.emberParticles.emitting) this.emberParticles.stop();
    if (this.sparkParticles && this.sparkParticles.emitting) this.sparkParticles.stop();
    if (this.smokeParticles && this.smokeParticles.emitting) this.smokeParticles.stop();
    
    // Hide and clear all visuals
    this.warningText.setVisible(false);
    this.deathLineGraphics.clear();
    this.warningZone.clear();
    
    console.log(`✅ DeathLine: Reset complete - death line deactivated, player at Y: ${this.player.y}, deathLine at Y: ${this.deathLineY}`);
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.config = newConfig.deathLine;
  }

  setDemoMode(enabled: boolean): void {
    this.demoMode = enabled;
    console.log(`🤖 DeathLine demo mode ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      // In demo mode, ensure death line is inactive and visuals are cleared
      this.deathLineActive = false;
      this.deathLineGraphics.clear();
      this.warningZone.clear();
      this.warningText.setVisible(false);
      
      // Stop particles
      if (this.emberParticles && this.emberParticles.emitting) this.emberParticles.stop();
      if (this.sparkParticles && this.sparkParticles.emitting) this.sparkParticles.stop();
      if (this.smokeParticles && this.smokeParticles.emitting) this.smokeParticles.stop();
    }
  }

  destroy(): void {
    // No event listeners to clean up anymore
    
    // Clean up graphics
    if (this.deathLineGraphics) {
      this.deathLineGraphics.destroy();
    }
    if (this.warningZone) {
      this.warningZone.destroy();
    }
    if (this.warningText) {
      this.warningText.destroy();
    }
    
    // Clean up particle systems
    if (this.emberParticles) {
      this.emberParticles.destroy();
      this.emberParticles = null;
    }
    if (this.sparkParticles) {
      this.sparkParticles.destroy();
      this.sparkParticles = null;
    }
    if (this.smokeParticles) {
      this.smokeParticles.destroy();
      this.smokeParticles = null;
    }
  }
}