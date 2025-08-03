import { Scene, GameObjects } from 'phaser';
import { Player } from './Player';
import { GameConfiguration, CameraConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

export class DeathLine {
  private scene: Scene;
  private player: Player;
  private config: CameraConfig;
  
  // Visual elements
  private deathLineGraphics: GameObjects.Graphics;
  private warningZone: GameObjects.Graphics;
  private warningText: GameObjects.Text;
  
  // State
  private deathLineY: number = 0;
  private gameStartTime: number = 0;
  private isGameOver: boolean = false;
  private deathLineActive: boolean = false;
  private highestPlayerY: number = 0;
  
  // Visual effects
  private pulseIntensity: number = 0;
  private lastWarningTime: number = 0;
  
  private readonly WARNING_DISTANCE = 300; // Show warning when player is this close
  private readonly PULSE_SPEED = 3; // Speed of death line pulsing effect

  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.config = gameConfig.camera;
    
    this.gameStartTime = Date.now();
    this.highestPlayerY = player.y;
    this.setupVisuals();
    this.setupEventListeners();
  }

  private setupVisuals(): void {
    // Create death line graphics
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

  private setupEventListeners(): void {
    EventBus.on('camera-state-updated', this.onCameraStateUpdated.bind(this));
  }

  private onCameraStateUpdated(cameraState: any): void {
    this.deathLineY = cameraState.deathLineY;
  }

  update(deltaTime: number): void {
    if (this.isGameOver) return;
    
    this.updateDeathLineActivation();
    
    if (this.deathLineActive) {
      this.updateDeathLinePosition(deltaTime);
      this.updateVisuals();
      this.checkPlayerCollision();
      this.updateWarningSystem();
    } else {
      // Clear visuals when inactive
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
    const heightClimbed = Math.abs(this.player.y - this.highestPlayerY); // Start Y minus current Y
    
    // Activate death line if either condition is met
    const timeConditionMet = timeElapsed >= this.config.deathLineStartDelay;
    const heightConditionMet = heightClimbed >= this.config.deathLineMinHeight;
    
    if (timeConditionMet || heightConditionMet) {
      this.deathLineActive = true;
      console.log(`💀 Death line activated! Time: ${(timeElapsed/1000).toFixed(1)}s, Height: ${heightClimbed.toFixed(0)}px`);
      EventBus.emit('death-line-activated');
    }
  }

  private updateDeathLinePosition(deltaTime: number): void {
    // Death line rises automatically based on auto scroll speed
    if (this.config.autoScrollSpeed > 0) {
      const camera = this.scene.cameras.main;
      const cameraBottom = camera.scrollY + this.scene.scale.height;
      this.deathLineY = cameraBottom + this.config.deathLineOffset;
    }
  }

  private updateVisuals(): void {
    const camera = this.scene.cameras.main;
    const screenBottom = camera.scrollY + this.scene.scale.height;
    const screenTop = camera.scrollY;
    
    // Clear previous graphics
    this.deathLineGraphics.clear();
    this.warningZone.clear();
    
    // Only draw if death line is visible on screen
    if (this.deathLineY >= screenTop && this.deathLineY <= screenBottom + 100) {
      this.drawDeathLine();
      this.drawWarningZone();
    }
    
    // Update pulse effect
    this.pulseIntensity += this.PULSE_SPEED * (1 / 60); // 60fps normalized
    if (this.pulseIntensity > Math.PI * 2) {
      this.pulseIntensity -= Math.PI * 2;
    }
  }

  private drawDeathLine(): void {
    const screenWidth = this.scene.scale.width;
    const pulseOffset = Math.sin(this.pulseIntensity) * 3;
    const baseAlpha = 0.8;
    const pulseAlpha = baseAlpha + (Math.sin(this.pulseIntensity) * 0.2);
    
    // Main death line (thick red line)
    this.deathLineGraphics.lineStyle(8 + pulseOffset, 0xff0000, pulseAlpha);
    this.deathLineGraphics.beginPath();
    this.deathLineGraphics.moveTo(0, this.deathLineY);
    this.deathLineGraphics.lineTo(screenWidth, this.deathLineY);
    this.deathLineGraphics.strokePath();
    
    // Add danger pattern above the line
    this.deathLineGraphics.lineStyle(2, 0xff4444, 0.6);
    for (let x = 0; x < screenWidth; x += 40) {
      this.deathLineGraphics.beginPath();
      this.deathLineGraphics.moveTo(x, this.deathLineY - 20);
      this.deathLineGraphics.lineTo(x + 20, this.deathLineY);
      this.deathLineGraphics.lineTo(x + 40, this.deathLineY - 20);
      this.deathLineGraphics.strokePath();
    }
  }

  private drawWarningZone(): void {
    const screenWidth = this.scene.scale.width;
    const warningZoneTop = this.deathLineY - this.WARNING_DISTANCE;
    const warningHeight = this.WARNING_DISTANCE;
    
    // Gradient warning zone
    const gradient = this.scene.add.graphics();
    gradient.fillGradientStyle(0xff0000, 0xff0000, 0xff0000, 0xff0000, 0, 0.1, 0.3, 0);
    gradient.fillRect(0, warningZoneTop, screenWidth, warningHeight);
    gradient.setDepth(650);
    
    // Clean up gradient after one frame
    this.scene.time.delayedCall(16, () => gradient.destroy());
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
    const showWarning = distanceToDeathLine <= this.WARNING_DISTANCE && distanceToDeathLine > 0;
    
    if (showWarning) {
      this.warningText.setVisible(true);
      
      // Pulse warning text
      const pulse = Math.sin(this.pulseIntensity * 2) * 0.3 + 0.7;
      this.warningText.setAlpha(pulse);
      
      // Vary text based on urgency
      const urgency = 1 - (distanceToDeathLine / this.WARNING_DISTANCE);
      if (urgency > 0.8) {
        this.warningText.setText('CRITICAL! CLIMB NOW!');
        this.warningText.setColor('#ff0000');
      } else if (urgency > 0.5) {
        this.warningText.setText('DANGER! CLIMB HIGHER!');
        this.warningText.setColor('#ff4400');
      } else {
        this.warningText.setText('Warning: Death line approaching');
        this.warningText.setColor('#ff8800');
      }
      
      // Play warning sound occasionally
      const now = Date.now();
      if (now - this.lastWarningTime > 2000) { // Every 2 seconds
        this.lastWarningTime = now;
        EventBus.emit('death-line-warning', {
          distance: distanceToDeathLine,
          urgency,
          playerPosition: { x: this.player.x, y: this.player.y }
        });
      }
    } else {
      this.warningText.setVisible(false);
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
    return this.getPlayerDistanceFromDeathLine() <= this.WARNING_DISTANCE;
  }

  isPlayerDead(): boolean {
    return this.isGameOver;
  }

  reset(): void {
    this.isGameOver = false;
    this.gameStartTime = Date.now();
    this.warningText.setVisible(false);
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.config = newConfig.camera;
  }

  destroy(): void {
    EventBus.off('camera-state-updated', this.onCameraStateUpdated.bind(this));
    
    if (this.deathLineGraphics) {
      this.deathLineGraphics.destroy();
    }
    if (this.warningZone) {
      this.warningZone.destroy();
    }
    if (this.warningText) {
      this.warningText.destroy();
    }
  }
}