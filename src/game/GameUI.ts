import { Scene } from 'phaser';
import { ScoreSystem, ScoreData } from './ScoreSystem';
import { ComboSystem } from './ComboSystem';
import { EventBus } from './EventBus';

// RexUI type declaration for the plugin
declare global {
  namespace Phaser {
    interface Scene {
      rexUI: any;
    }
  }
}

export class GameUI {
  private scene: Scene;
  private scoreSystem: ScoreSystem;
  private comboSystem: ComboSystem;
  
  // UI Elements - RexUI components
  private scoreLabel: any; // RexUI Label
  private heightLabel: any; // RexUI Label
  private comboSizer: any; // RexUI Sizer container
  private comboLabel: any; // RexUI Label
  private comboProgressBar: any; // RexUI Progress bar
  
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
    
    // Score display (top left) - RexUI Label with background
    this.scoreLabel = this.scene.rexUI.add.label({
      x: 20,
      y: 20,
      width: 280,
      height: 100,
      orientation: 'horizontal',
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 10, 0x000000, 0.8),
      text: this.scene.add.text(0, 0, '', {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }),
      space: {
        left: 15,
        right: 15,
        top: 10,
        bottom: 10
      },
      anchor: {
        left: 'left',
        top: 'top'
      }
    }).setDepth(1100).setScrollFactor(0);
    
    // Height display (top right, upper section) - RexUI Label with background
    this.heightLabel = this.scene.rexUI.add.label({
      x: screenWidth - 20,
      y: 20,
      width: 200,
      height: 80,
      orientation: 'horizontal',
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 8, 0x333333, 0.9),
      text: this.scene.add.text(0, 0, '', {
        fontSize: '16px',
        color: '#ffff00',
        fontStyle: 'bold'
      }),
      space: {
        left: 12,
        right: 12,
        top: 8,
        bottom: 8
      },
      anchor: {
        right: 'right',
        top: 'top'
      }
    }).setDepth(1100).setScrollFactor(0);
    
    // Combo display (center, slightly above middle)
    this.setupComboDisplay();
  }

  private setupComboDisplay(): void {
    const screenWidth = this.scene.scale.width;
    const comboX = screenWidth - 20;
    const comboY = 120; // Below height display
    
    // Create combo label with styled background
    this.comboLabel = this.scene.rexUI.add.label({
      width: 180,
      height: 60,
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 8, 0x000000, 0.9)
        .setStrokeStyle(2, 0xffaa00, 1),
      text: this.scene.add.text(0, 0, 'COMBO\n0x (1.0x)', {
        fontSize: '16px',
        color: '#ffaa00',
        fontStyle: 'bold',
        align: 'center'
      }),
      space: {
        left: 12,
        right: 12,
        top: 8,
        bottom: 8
      }
    }).setDepth(1200).setScrollFactor(0);
    
    // Create progress bar for combo timer
    this.comboProgressBar = this.scene.rexUI.add.circularProgress({
      x: 0,
      y: 0,
      radius: 8,
      barColor: 0x00ff00,
      trackColor: 0x333333,
      centerColor: 0x000000,
      thickness: 0.2,
      startAngle: Phaser.Math.DegToRad(270), // Start from top
      anticlockwise: false
    }).setDepth(1210).setScrollFactor(0);
    
    // Create sizer to organize combo display components
    this.comboSizer = this.scene.rexUI.add.sizer({
      x: comboX,
      y: comboY,
      orientation: 'vertical',
      space: { item: 5 },
      anchor: {
        right: 'right'
      }
    })
    .add(this.comboLabel, { align: 'right' })
    .add(this.comboProgressBar, { align: 'right' })
    .setDepth(1200)
    .setScrollFactor(0)
    .setVisible(true)
    .layout();
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
    // Add null safety checks for RexUI labels and score system
    if (!this.scoreSystem || !this.scoreLabel || !this.heightLabel) {
      return;
    }

    // Additional check to ensure UI objects are ready
    try {
      this.currentScore = this.scoreSystem.getScoreData();
    
      // Update score label text
      const scoreText = 
        `Score: ${this.currentScore.totalScore.toLocaleString()}\n` +
        `Height: ${Math.round(this.currentScore.heightScore).toLocaleString()}\n` +
        `Combo: ${Math.round(this.currentScore.comboScore).toLocaleString()}`;
      this.scoreLabel.getElement('text').setText(scoreText);
      
      // Update height label text
      const heightText =
        `Height: ${Math.round(this.currentScore.currentHeight)}m\n` +
        `Best: ${Math.round(this.currentScore.highestHeight)}m\n` +
        `Mult: ${this.currentScore.multiplier.toFixed(1)}x`;
      this.heightLabel.getElement('text').setText(heightText);
      
      // Layout the labels to adjust to new text size
      this.scoreLabel.layout();
      this.heightLabel.layout();
      
      // Always update combo display
      this.updateComboDisplay();
    } catch (error) {
      console.warn('GameUI updateDisplay failed, RexUI objects not ready yet:', error);
    }
  }

  private showComboDisplay(): void {
    if (!this.comboVisible) {
      this.comboVisible = true;
      this.comboSizer.setVisible(true);
      
      // Cancel any existing fade out
      if (this.comboFadeOut) {
        this.comboFadeOut.destroy();
        this.comboFadeOut = null;
      }
      
      // Animate in
      this.comboSizer.setAlpha(0);
      this.comboSizer.setScale(0.5);
      this.scene.tweens.add({
        targets: this.comboSizer,
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
        targets: this.comboSizer,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 300,
        ease: 'Power2.out',
        onComplete: () => {
          this.comboSizer.setVisible(false);
          this.comboVisible = false;
          this.comboFadeOut = null;
        }
      });
    }
  }

  private updateComboDisplay(): void {
    // Add null safety checks
    if (!this.comboSystem || !this.comboLabel || !this.comboProgressBar) {
      return;
    }

    try {
      const comboLength = this.comboSystem.getCurrentComboLength();
      const multiplier = this.comboSystem.getCurrentMultiplier();
      const timeRemaining = this.comboSystem.getComboTimeRemaining();
      const isActive = this.comboSystem.isComboActive();
      
      // Update combo label text and color
      const comboText = isActive ? `COMBO\n${comboLength}x (${multiplier.toFixed(1)}x)` : 'COMBO\n0x (1.0x)';
      const textColor = isActive ? '#ffaa00' : '#666666';
      
      this.comboLabel.getElement('text').setText(comboText);
      this.comboLabel.getElement('text').setColor(textColor);
      this.comboLabel.layout();
      
      // Update progress bar
      if (isActive) {
        const timePercent = Math.max(0, timeRemaining / 2500); // 2500ms combo timeout
        
        // Color based on time remaining
        let barColor = 0x00ff00; // Green
        if (timePercent < 0.3) {
          barColor = 0xff0000; // Red
        } else if (timePercent < 0.6) {
          barColor = 0xff8800; // Orange
        }
        
        this.comboProgressBar.setBarColor(barColor);
        this.comboProgressBar.setValue(timePercent);
        this.comboProgressBar.setVisible(true);
      } else {
        this.comboProgressBar.setVisible(false);
      }
      
      // Layout the entire sizer
      this.comboSizer.layout();
    } catch (error) {
      console.warn('GameUI updateComboDisplay failed, RexUI combo objects not ready yet:', error);
    }
  }

  private showMilestoneNotification(milestone: number, bonusPoints: number): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.3;
    
    // Create RexUI Toast for milestone notification
    const milestoneToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, 0x000000, 0.9)
        .setStrokeStyle(3, 0xffaa00, 1),
      
      text: this.scene.add.text(0, 0, `🎯 HEIGHT MILESTONE!\n${milestone}m reached!\n+${bonusPoints} bonus points!`, {
        fontSize: '28px',
        color: '#ffff00',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 8
      }),
      
      space: {
        left: 25,
        right: 25,
        top: 20,
        bottom: 20
      },
      
      // Toast animation configuration
      duration: {
        in: 300,
        hold: 2000,
        out: 400
      },
      
      transitIn: 'popup',
      transitOut: 'scaleDown',
      
      // Destroy after animation
      destroy: true
    })
    .setDepth(1300)
    .setScrollFactor(0)
    .showMessage();
  }

  private showComboCompletedEffect(comboChain: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    
    // Create RexUI Toast for combo completion
    const comboToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 12, 0x003300, 0.95)
        .setStrokeStyle(2, 0x00ff00, 1),
      
      text: this.scene.add.text(0, 0, `🔥 COMBO COMPLETE!\n${comboChain.chain} hits\n+${comboChain.totalPoints} points!`, {
        fontSize: '24px',
        color: '#00ff00',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 6
      }),
      
      space: {
        left: 20,
        right: 20,
        top: 15,
        bottom: 15
      },
      
      duration: {
        in: 200,
        hold: 1500,
        out: 300
      },
      
      transitIn: 'popup',
      transitOut: 'fadeOut',
      destroy: true
    })
    .setDepth(1300)
    .setScrollFactor(0)
    .showMessage();
  }

  private showComboBrokenEffect(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    
    // Create RexUI Toast for combo broken
    const brokenToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 10, 0x330000, 0.9)
        .setStrokeStyle(2, 0xff4444, 1),
      
      text: this.scene.add.text(0, 0, '💥 COMBO BROKEN!', {
        fontSize: '22px',
        color: '#ff4444',
        fontStyle: 'bold',
        align: 'center'
      }),
      
      space: {
        left: 18,
        right: 18,
        top: 12,
        bottom: 12
      },
      
      duration: {
        in: 150,
        hold: 1000,
        out: 250
      },
      
      transitIn: 'popup',
      transitOut: 'scaleDown',
      destroy: true
    })
    .setDepth(1300)
    .setScrollFactor(0)
    .showMessage();
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
    
    this.scoreLabel?.destroy();
    this.heightLabel?.destroy();
    this.comboSizer?.destroy();
  }
}