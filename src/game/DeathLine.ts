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
  
  // State
  private deathLineY: number = 0;
  private gameStartTime: number = 0;
  private isGameOver: boolean = false;
  private deathLineActive: boolean = false;
  private highestPlayerY: number = 0;
  private initialPlayerY: number = 0;
  
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

  private setupEventListeners(): void {
    // Death line no longer depends on camera events
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
    // Death line rises independently at its own speed
    const riseAmount = this.config.riseSpeed * (deltaTime / 1000);
    this.deathLineY -= riseAmount; // Negative Y = upward movement
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
    const blockHeight = 100; // Height of the translucent block
    
    // Pulsing effect for the opacity
    const pulseAlpha = this.config.visualOpacity + (Math.sin(this.pulseIntensity) * 0.2);
    
    // Draw translucent full-width rising block
    this.deathLineGraphics.fillStyle(0xff0000, Math.max(0.3, Math.min(1.0, pulseAlpha)));
    this.deathLineGraphics.fillRect(0, this.deathLineY - blockHeight, screenWidth, blockHeight);
    
    // Add animated danger border at the top
    const borderPulse = Math.sin(this.pulseIntensity * 2) * 3;
    this.deathLineGraphics.lineStyle(4 + borderPulse, 0xff4444, 0.9);
    this.deathLineGraphics.beginPath();
    this.deathLineGraphics.moveTo(0, this.deathLineY - blockHeight);
    this.deathLineGraphics.lineTo(screenWidth, this.deathLineY - blockHeight);
    this.deathLineGraphics.strokePath();
    
    // Add animated flame-like effects at the top (preparation for fire graphics)
    this.deathLineGraphics.lineStyle(2, 0xffaa00, 0.7);
    for (let x = 0; x < screenWidth; x += 30) {
      const flameHeight = 15 + Math.sin(this.pulseIntensity + x * 0.01) * 8;
      this.deathLineGraphics.beginPath();
      this.deathLineGraphics.moveTo(x, this.deathLineY - blockHeight);
      this.deathLineGraphics.lineTo(x + 10, this.deathLineY - blockHeight - flameHeight);
      this.deathLineGraphics.lineTo(x + 20, this.deathLineY - blockHeight);
      this.deathLineGraphics.strokePath();
    }
  }

  private drawWarningZone(): void {
    const screenWidth = this.scene.scale.width;
    const warningZoneTop = this.deathLineY - this.config.warningDistance;
    const warningHeight = this.config.warningDistance;
    
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
    const showWarning = distanceToDeathLine <= this.config.warningDistance && distanceToDeathLine > 0;
    
    if (showWarning) {
      this.warningText.setVisible(true);
      
      // Pulse warning text
      const pulse = Math.sin(this.pulseIntensity * 2) * 0.3 + 0.7;
      this.warningText.setAlpha(pulse);
      
      // Vary text based on urgency
      const urgency = 1 - (distanceToDeathLine / this.config.warningDistance);
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
    
    // Reset visual effects
    this.pulseIntensity = 0;
    this.lastWarningTime = 0;
    
    // Hide and clear all visuals
    this.warningText.setVisible(false);
    this.deathLineGraphics.clear();
    this.warningZone.clear();
    
    console.log(`✅ DeathLine: Reset complete - death line deactivated, player at Y: ${this.player.y}, deathLine at Y: ${this.deathLineY}`);
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.config = newConfig.deathLine;
  }

  destroy(): void {
    // No event listeners to clean up anymore
    
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