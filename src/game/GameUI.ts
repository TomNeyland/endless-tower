import { Scene } from 'phaser';
import { ScoreSystem, ScoreData } from './ScoreSystem';
import { ComboSystem } from './ComboSystem';
import { EventBus } from './EventBus';

export class GameUI {
  private scene: Scene;
  private scoreSystem: ScoreSystem;
  private comboSystem: ComboSystem;
  
  // UI Elements
  private scoreText: Phaser.GameObjects.Text;
  private heightText: Phaser.GameObjects.Text;
  private comboContainer: Phaser.GameObjects.Container;
  private comboText: Phaser.GameObjects.Text;
  private comboTimerBar: Phaser.GameObjects.Graphics;
  private comboBackground: Phaser.GameObjects.Graphics;
  
  // UI State
  private currentScore: ScoreData;
  private comboVisible: boolean = false;
  private comboFadeOut: Phaser.Tweens.Tween | null = null;

  constructor(scene: Scene, scoreSystem: ScoreSystem, comboSystem: ComboSystem) {
    this.scene = scene;
    this.scoreSystem = scoreSystem;
    this.comboSystem = comboSystem;
    
    this.setupUI();
    this.setupEventListeners();
    
    // Delay initial update to ensure text objects are ready
    this.scene.time.delayedCall(50, () => {
      this.updateDisplay();
    });
  }

  private setupUI(): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    // Score display (top left)
    this.scoreText = this.scene.add.text(20, 20, '', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(1100);
    
    // Height display (top right, upper section)
    this.heightText = this.scene.add.text(screenWidth - 20, 20, '', {
      fontSize: '18px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.heightText.setOrigin(1, 0);
    this.heightText.setScrollFactor(0);
    this.heightText.setDepth(1100);
    
    // Combo display (center, slightly above middle)
    this.setupComboDisplay();
  }

  private setupComboDisplay(): void {
    const screenWidth = this.scene.scale.width;
    const comboX = screenWidth - 20;
    const comboY = 120; // Below height display
    
    // Combo container (positioned at top right)
    this.comboContainer = this.scene.add.container(comboX, comboY);
    this.comboContainer.setScrollFactor(0);
    this.comboContainer.setDepth(1200);
    this.comboContainer.setVisible(true); // Always visible for placeholder
    
    // Combo background (smaller, top-right friendly)
    this.comboBackground = this.scene.add.graphics();
    this.comboBackground.fillStyle(0x000000, 0.8);
    this.comboBackground.fillRoundedRect(-150, -35, 150, 70, 8);
    this.comboBackground.lineStyle(2, 0xffaa00, 1);
    this.comboBackground.strokeRoundedRect(-150, -35, 150, 70, 8);
    this.comboContainer.add(this.comboBackground);
    
    // Combo text (right-aligned)
    this.comboText = this.scene.add.text(-10, -10, 'COMBO\n0x (1.0x)', {
      fontSize: '18px',
      color: '#ffaa00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'right'
    });
    this.comboText.setOrigin(1, 0.5);
    this.comboContainer.add(this.comboText);
    
    // Combo timer bar
    this.comboTimerBar = this.scene.add.graphics();
    this.comboContainer.add(this.comboTimerBar);
  }

  private setupEventListeners(): void {
    // Score events
    EventBus.on('score-height-gained', this.onScoreUpdate.bind(this));
    EventBus.on('height-milestone-reached', this.onHeightMilestone.bind(this));
    
    // Combo events
    EventBus.on('combo-event-added', this.onComboEventAdded.bind(this));
    EventBus.on('combo-completed', this.onComboCompleted.bind(this));
    EventBus.on('combo-broken', this.onComboBroken.bind(this));
    
    // Camera updates for score recalculation
    EventBus.on('camera-state-updated', this.onCameraUpdate.bind(this));
  }

  private onScoreUpdate(): void {
    this.updateDisplay();
  }

  private onHeightMilestone(data: any): void {
    this.showMilestoneNotification(data.milestone, data.bonusPoints);
    this.updateDisplay();
  }

  private onComboEventAdded(data: any): void {
    this.showComboDisplay();
    this.updateComboDisplay();
  }

  private onComboCompleted(comboChain: any): void {
    this.showComboCompletedEffect(comboChain);
    this.hideComboDisplay();
  }

  private onComboBroken(data: any): void {
    this.showComboBrokenEffect();
    this.hideComboDisplay();
  }

  private onCameraUpdate(): void {
    this.updateDisplay();
  }

  private updateDisplay(): void {
    // Add null safety checks for text objects and score system
    if (!this.scoreSystem || !this.scoreText || !this.heightText) {
      return;
    }

    // Additional check to ensure text objects have valid texture data
    try {
      this.currentScore = this.scoreSystem.getScoreData();
    
      // Update score text
      this.scoreText.setText(
        `Score: ${this.currentScore.totalScore.toLocaleString()}\n` +
        `Height: ${Math.round(this.currentScore.heightScore).toLocaleString()}\n` +
        `Combo: ${Math.round(this.currentScore.comboScore).toLocaleString()}`
      );
      
      // Update height text
      this.heightText.setText(
        `Height: ${Math.round(this.currentScore.currentHeight)}m\n` +
        `Best: ${Math.round(this.currentScore.highestHeight)}m\n` +
        `Mult: ${this.currentScore.multiplier.toFixed(1)}x`
      );
      
      // Always update combo display
      this.updateComboDisplay();
    } catch (error) {
      console.warn('GameUI updateDisplay failed, text objects not ready yet:', error);
    }
  }

  private showComboDisplay(): void {
    if (!this.comboVisible) {
      this.comboVisible = true;
      this.comboContainer.setVisible(true);
      
      // Cancel any existing fade out
      if (this.comboFadeOut) {
        this.comboFadeOut.destroy();
        this.comboFadeOut = null;
      }
      
      // Animate in
      this.comboContainer.setAlpha(0);
      this.comboContainer.setScale(0.5);
      this.scene.tweens.add({
        targets: this.comboContainer,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.out'
      });
    }
  }

  private hideComboDisplay(): void {
    if (this.comboVisible) {
      this.comboFadeOut = this.scene.tweens.add({
        targets: this.comboContainer,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 300,
        ease: 'Power2.out',
        onComplete: () => {
          this.comboContainer.setVisible(false);
          this.comboVisible = false;
          this.comboFadeOut = null;
        }
      });
    }
  }

  private updateComboDisplay(): void {
    // Add null safety checks
    if (!this.comboSystem || !this.comboText || !this.comboTimerBar) {
      return;
    }

    try {
      const comboLength = this.comboSystem.getCurrentComboLength();
      const multiplier = this.comboSystem.getCurrentMultiplier();
      const timeRemaining = this.comboSystem.getComboTimeRemaining();
      const isActive = this.comboSystem.isComboActive();
      
      // Update combo text
      if (isActive) {
        this.comboText.setText(`COMBO\n${comboLength}x (${multiplier.toFixed(1)}x)`);
        this.comboText.setColor('#ffaa00');
      } else {
        this.comboText.setText('COMBO\n0x (1.0x)');
        this.comboText.setColor('#666666');
      }
      
      // Update timer bar
      this.comboTimerBar.clear();
      
      if (isActive) {
        const barWidth = 140;
        const barHeight = 4;
        const barX = -barWidth - 5; // Right-aligned
        const barY = 20;
        
        // Background bar
        this.comboTimerBar.fillStyle(0x333333, 0.8);
        this.comboTimerBar.fillRect(barX, barY, barWidth, barHeight);
        
        // Timer bar
        const timePercent = timeRemaining / 2500; // 2500ms combo timeout
        const timerWidth = barWidth * timePercent;
        
        let barColor = 0x00ff00; // Green
        if (timePercent < 0.3) {
          barColor = 0xff0000; // Red
        } else if (timePercent < 0.6) {
          barColor = 0xff8800; // Orange
        }
        
        this.comboTimerBar.fillStyle(barColor, 1);
        this.comboTimerBar.fillRect(barX, barY, timerWidth, barHeight);
      }
    } catch (error) {
      console.warn('GameUI updateComboDisplay failed, combo objects not ready yet:', error);
    }
  }

  private showMilestoneNotification(milestone: number, bonusPoints: number): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    
    const notification = this.scene.add.text(centerX, centerY, 
      `HEIGHT MILESTONE!\n${milestone}m reached!\n+${bonusPoints} bonus points!`, {
      fontSize: '40px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    });
    notification.setOrigin(0.5, 0.5);
    notification.setScrollFactor(0);
    notification.setDepth(1300);
    notification.setAlpha(0);
    
    // Animate milestone notification
    this.scene.tweens.add({
      targets: notification,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.out',
      yoyo: true,
      hold: 1000,
      onComplete: () => {
        notification.destroy();
      }
    });
  }

  private showComboCompletedEffect(comboChain: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    
    const effectText = this.scene.add.text(centerX, centerY,
      `COMBO COMPLETE!\n${comboChain.chain} hits\n+${comboChain.totalPoints} points!`, {
      fontSize: '36px',
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    });
    effectText.setOrigin(0.5, 0.5);
    effectText.setScrollFactor(0);
    effectText.setDepth(1300);
    
    // Animate effect
    this.scene.tweens.add({
      targets: effectText,
      y: centerY - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Power2.out',
      onComplete: () => {
        effectText.destroy();
      }
    });
  }

  private showComboBrokenEffect(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    
    const effectText = this.scene.add.text(centerX, centerY, 'COMBO BROKEN!', {
      fontSize: '32px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    effectText.setOrigin(0.5, 0.5);
    effectText.setScrollFactor(0);
    effectText.setDepth(1300);
    
    // Animate effect
    this.scene.tweens.add({
      targets: effectText,
      y: centerY + 30,
      alpha: 0,
      duration: 1500,
      ease: 'Power2.out',
      onComplete: () => {
        effectText.destroy();
      }
    });
  }

  update(deltaTime: number): void {
    // Always update combo display to show current state
    this.updateComboDisplay();
  }

  destroy(): void {
    EventBus.off('score-height-gained', this.onScoreUpdate.bind(this));
    EventBus.off('height-milestone-reached', this.onHeightMilestone.bind(this));
    EventBus.off('combo-event-added', this.onComboEventAdded.bind(this));
    EventBus.off('combo-completed', this.onComboCompleted.bind(this));
    EventBus.off('combo-broken', this.onComboBroken.bind(this));
    EventBus.off('camera-state-updated', this.onCameraUpdate.bind(this));
    
    if (this.comboFadeOut) {
      this.comboFadeOut.destroy();
    }
    
    this.scoreText?.destroy();
    this.heightText?.destroy();
    this.comboContainer?.destroy();
  }
}