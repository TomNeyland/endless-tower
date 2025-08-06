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
  
  // No more dynamic catch-up state - just basic speed
  
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
      this.updateVisuals(deltaTime);
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
      // No catch-up system initialization needed
      console.log(`💀 Death line activated! Time: ${(timeElapsed/1000).toFixed(1)}s, Height: ${heightClimbed.toFixed(0)}px`);
      EventBus.emit('death-line-activated');
    }
  }

  private updateDeathLinePosition(deltaTime: number): void {
    // Simple rise at constant speed
    const riseAmount = this.config.riseSpeed * (deltaTime / 1000);
    this.deathLineY -= riseAmount; // Negative Y = upward movement
    
    // Check for instant catch-up if player gets too far ahead
    this.checkInstantCatchUp();
  }
  
  private checkInstantCatchUp(): void {
    const playerDistance = this.getPlayerDistanceFromDeathLine();
    
    // Instant teleport catch-up if player gets too far ahead
    if (playerDistance > this.config.maxPlayerDistance) {
      const teleportAmount = playerDistance - (this.config.maxPlayerDistance * 0.8); // Teleport to 80% of max distance
      this.deathLineY -= teleportAmount;
      console.log(`⚡ Death line instant catch-up! Teleported ${teleportAmount.toFixed(0)}px`);
    }
  }
  

  private updateVisuals(deltaTime: number): void {
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
    
    // Update pulse effect (fix frame rate dependency)
    this.pulseIntensity += this.PULSE_SPEED * (deltaTime / 1000);
    if (this.pulseIntensity > Math.PI * 2) {
      this.pulseIntensity -= Math.PI * 2;
    }
  }

  private drawFireWall(camera: Phaser.Cameras.Scene2D.Camera): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const screenBottom = camera.scrollY + screenHeight;
    const screenTop = camera.scrollY;
    
    // Use consistent distance calculation (from player bottom to firewall)
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBottom = this.player.y + body.height + body.offset.y;
    const distanceToPlayer = this.deathLineY - playerBottom;
    const proximityFactor = Math.max(0, Math.min(1, (1000 - distanceToPlayer) / 1000));
    
    // Always render firewall extending to bottom of screen when visible
    let fireWallTop: number;
    let fireWallHeight: number;
    
    if (this.deathLineY > screenTop && this.deathLineY < screenBottom + 200) {
      // Firewall is on or near screen - render at actual position extending down
      fireWallTop = Math.max(screenTop, this.deathLineY);
      fireWallHeight = screenBottom - fireWallTop;
    } else if (this.deathLineY <= screenTop) {
      // Firewall has passed above screen - fill entire screen with fire
      fireWallTop = screenTop;
      fireWallHeight = screenHeight;
    } else {
      // Firewall is below screen - don't render
      return;
    }
    
    // Ensure minimum height for visibility
    if (fireWallHeight < 50) {
      fireWallHeight = 50;
      fireWallTop = screenBottom - fireWallHeight;
    }
    
    // Enhanced fire colors with better intensity scaling
    const baseRed = Math.floor(180 + (proximityFactor * 75)); // 180-255
    const baseGreen = Math.floor(20 + (proximityFactor * 80)); // 20-100  
    const baseBlue = Math.floor(0 + (proximityFactor * 20)); // 0-20
    const baseColor = (baseRed << 16) | (baseGreen << 8) | baseBlue;
    
    // Dynamic pulsing based on proximity and time
    const pulseSpeed = 1.5 + (proximityFactor * 2); // Faster pulse when close
    const pulseAlpha = 0.6 + (Math.sin(this.pulseIntensity * pulseSpeed) * 0.2) + (proximityFactor * 0.2);
    
    // Draw main fire wall base extending to screen bottom
    this.deathLineGraphics.fillStyle(baseColor, pulseAlpha);
    this.deathLineGraphics.fillRect(0, fireWallTop, screenWidth, fireWallHeight);
    
    // Add gradient effect - darker at bottom
    const gradientSteps = Math.min(10, Math.floor(fireWallHeight / 20));
    for (let i = 0; i < gradientSteps; i++) {
      const stepHeight = fireWallHeight / gradientSteps;
      const stepY = fireWallTop + (i * stepHeight);
      const darkerFactor = 0.8 - (i * 0.1); // Get darker towards bottom
      const stepAlpha = pulseAlpha * darkerFactor;
      
      this.deathLineGraphics.fillStyle(baseColor, stepAlpha);
      this.deathLineGraphics.fillRect(0, stepY, screenWidth, stepHeight);
    }
    
    // Draw animated flame tongues at the top
    this.drawFireFlames(fireWallTop, screenWidth, proximityFactor);
    
    // Draw fire border/edge effect
    this.drawFireBorder(fireWallTop, screenWidth, proximityFactor);
    
    // Update particle systems based on proximity
    this.updateParticleEffects(fireWallTop, proximityFactor);
  }

  private drawFireFlames(fireTop: number, screenWidth: number, intensity: number): void {
    const flameCount = Math.floor(screenWidth / 15); // More flames, denser effect
    const maxFlameHeight = 40 + (intensity * 80); // Much taller flames when close
    
    // Multiple flame layers for richer effect
    this.drawFlameLayer(fireTop, screenWidth, flameCount, maxFlameHeight, intensity, 0xff3300, 3, 0); // Base red layer
    this.drawFlameLayer(fireTop, screenWidth, flameCount * 0.7, maxFlameHeight * 0.8, intensity, 0xff6600, 2, 0.3); // Orange layer
    this.drawFlameLayer(fireTop, screenWidth, flameCount * 0.5, maxFlameHeight * 0.6, intensity, 0xffaa00, 1, 0.6); // Yellow layer
    
    // Add white-hot core flames when very intense
    if (intensity > 0.6) {
      this.drawFlameLayer(fireTop, screenWidth, flameCount * 0.3, maxFlameHeight * 0.4, intensity, 0xffffff, 1, 0.9); // White core
    }
  }

  private drawFlameLayer(fireTop: number, screenWidth: number, flameCount: number, maxFlameHeight: number, intensity: number, color: number, lineWidth: number, timeOffset: number): void {
    this.deathLineGraphics.lineStyle(lineWidth, color, 0.6 + (intensity * 0.4));
    
    for (let i = 0; i < flameCount; i++) {
      const spacing = screenWidth / flameCount;
      const x = (i * spacing) + (Math.sin(this.pulseIntensity + i + timeOffset) * 5); // More horizontal movement
      const flameHeight = (maxFlameHeight * 0.3) + Math.sin(this.pulseIntensity * 3 + i * 0.3 + timeOffset) * (maxFlameHeight * 0.7);
      
      // More organic flame shape with curves
      this.deathLineGraphics.beginPath();
      this.deathLineGraphics.moveTo(x, fireTop);
      
      // Create curved flame shape
      const segments = 6;
      for (let s = 1; s <= segments; s++) {
        const progress = s / segments;
        const segmentX = x + (Math.sin(progress * Math.PI + this.pulseIntensity + timeOffset) * 8);
        const segmentY = fireTop - (flameHeight * progress) + (Math.sin(progress * Math.PI * 3 + this.pulseIntensity * 2 + timeOffset) * 3);
        
        if (s === 1) {
          this.deathLineGraphics.lineTo(segmentX, segmentY);
        } else {
          // Use quadratic curves for smoother flames
          const prevProgress = (s - 1) / segments;
          const controlX = x + (Math.sin(prevProgress * Math.PI + this.pulseIntensity + timeOffset) * 4);
          const controlY = fireTop - (flameHeight * (prevProgress + progress) / 2);
          this.deathLineGraphics.quadraticCurveTo(controlX, controlY, segmentX, segmentY);
        }
      }
      
      this.deathLineGraphics.strokePath();
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
    
    // Much more dramatic ember effects
    const frequency = Math.max(20, 150 - (intensity * 130)); // 150ms down to 20ms (much faster)
    const quantity = Math.floor(2 + (intensity * 8)); // 2-10 particles per emit (much more)
    
    this.emberParticles.setFrequency(frequency);
    this.emberParticles.setQuantity(quantity);
    
    // Adjust ember properties based on intensity
    this.emberParticles.setSpeedX({ min: -40 * (1 + intensity), max: 40 * (1 + intensity) });
    this.emberParticles.setSpeedY({ min: -100 * (1 + intensity), max: -180 * (1 + intensity) });
    this.emberParticles.setScale({ start: 0.3 + (intensity * 0.5), end: 0.05 });
  }

  private updateSparkParticles(intensity: number): void {
    if (!this.sparkParticles) return;
    
    // More explosive sparks with high intensity
    const frequency = Math.max(30, 200 - (intensity * 170)); // Much more frequent
    const quantity = Math.floor(1 + (intensity * 5)); // 1-6 particles (more dramatic)
    
    this.sparkParticles.setFrequency(frequency);
    this.sparkParticles.setQuantity(quantity);
    
    // More explosive spark behavior when intense
    this.sparkParticles.setSpeedX({ min: -100 * (1 + intensity), max: 100 * (1 + intensity) });
    this.sparkParticles.setSpeedY({ min: -250 * (1 + intensity), max: -400 * (1 + intensity) });
    this.sparkParticles.setScale({ start: 0.8 + (intensity * 0.5), end: 0 });
  }

  private updateSmokeParticles(intensity: number): void {
    if (!this.smokeParticles) return;
    
    // Much denser, more dramatic smoke
    const frequency = Math.max(40, 180 - (intensity * 140)); // Denser smoke when close
    const quantity = Math.floor(2 + (intensity * 6)); // 2-8 particles (much denser)
    
    this.smokeParticles.setFrequency(frequency);
    this.smokeParticles.setQuantity(quantity);
    
    // More dramatic smoke behavior
    this.smokeParticles.setSpeedX({ min: -20 * (1 + intensity), max: 20 * (1 + intensity) });
    this.smokeParticles.setSpeedY({ min: -40 * (1 + intensity), max: -80 * (1 + intensity) });
    this.smokeParticles.setScale({ start: 0.2 + (intensity * 0.3), end: 1.0 + (intensity * 0.5) });
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
    
    // Use proper Arcade Physics body for accurate collision detection
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBottom = this.player.y + body.height + body.offset.y;
    
    // Add small buffer to prevent jittery collision detection
    const collisionBuffer = 5;
    
    if (playerBottom >= (this.deathLineY - collisionBuffer)) {
      this.triggerGameOver();
    }
  }

  private updateWarningSystem(): void {
    // Use same collision detection logic as checkPlayerCollision for consistency
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBottom = this.player.y + body.height + body.offset.y;
    const distanceToDeathLine = this.deathLineY - playerBottom;
    
    // Show firewall distance indicator when it's far away
    if (distanceToDeathLine > 400) {
      this.showDistanceIndicator(Math.floor(distanceToDeathLine));
      return;
    }
    
    // Define threat levels based on distance from player bottom to firewall
    let threatLevel: 'safe' | 'aware' | 'caution' | 'danger' | 'critical';
    let warningText: string;
    let warningColor: string;
    
    if (distanceToDeathLine > 200) {
      threatLevel = 'safe';
      this.warningText.setVisible(false);
      return;
    } else if (distanceToDeathLine > 150) {
      threatLevel = 'aware';
      warningText = `🔥 Fire Rising - ${Math.floor(distanceToDeathLine)}px below`;
      warningColor = '#ffaa00';
    } else if (distanceToDeathLine > 100) {
      threatLevel = 'caution';
      warningText = '🔥 CAUTION - Fire Close!';
      warningColor = '#ff7700';
    } else if (distanceToDeathLine > 50) {
      threatLevel = 'danger';
      warningText = '🔥 DANGER - CLIMB NOW!';
      warningColor = '#ff3300';
    } else {
      threatLevel = 'critical';
      warningText = '🔥🔥 CRITICAL - ESCAPE! 🔥🔥';
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
        proximityFactor: Math.max(0, Math.min(1, (400 - distanceToDeathLine) / 400)),
        playerPosition: { x: this.player.x, y: this.player.y }
      });
    }
    
    // Trigger screen shake for critical situations
    if (threatLevel === 'critical' && now - this.lastWarningTime > 1000) {
      EventBus.emit('camera-shake', { intensity: 2, duration: 200 });
    }
  }

  private showDistanceIndicator(distance: number): void {
    // Show a subtle distance indicator when firewall is far away
    this.warningText.setVisible(true);
    this.warningText.setText(`Fire Wall: ${distance}px below`);
    this.warningText.setColor('#888888');
    this.warningText.setAlpha(0.7);
    this.warningText.setScale(0.8);
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
    // Use consistent collision detection logic
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const playerBottom = this.player.y + body.height + body.offset.y;
    return Math.max(0, this.deathLineY - playerBottom);
  }

  isPlayerInDanger(): boolean {
    return this.getPlayerDistanceFromDeathLine() <= this.config.warningDistance;
  }

  isPlayerDead(): boolean {
    return this.isGameOver;
  }
  
  getCatchUpStatus(): { isCatchingUp: boolean; currentSpeed: number; normalSpeed: number } {
    return {
      isCatchingUp: false, // No more dynamic catch-up
      currentSpeed: this.config.riseSpeed,
      normalSpeed: this.config.riseSpeed
    };
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
    
    // Reset visual effects
    this.pulseIntensity = 0;
    this.lastWarningTime = 0;
    
    // No catch-up mechanism to reset
    
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