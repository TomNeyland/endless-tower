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
  private mainHUD: any; // RexUI Sizer - Unified main display
  private heightText: any; // Current height display
  private scoreText: any; // Total score display  
  private multiplierText: any; // Current multiplier display
  private comboToast: any; // Dynamic combo celebration
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
    
    this.setupMainHUD();
    this.setupComboDisplay();
  }

  private setupMainHUD(): void {
    // Create unified HUD in top-left corner - ice/mountain themed
    const hudX = 20;
    const hudY = 20;
    
    // Current height display (primary metric - largest)
    this.heightText = this.scene.add.text(0, 0, '🏔️ 0m', {
      fontSize: '28px',
      color: '#00FFFF', // Bright cyan for current height
      fontStyle: 'bold',
      fontFamily: 'monospace', // Pixel-like font
      stroke: '#003366',
      strokeThickness: 2
    });
    
    // Total score display (secondary metric)
    this.scoreText = this.scene.add.text(0, 0, '💰 0pts', {
      fontSize: '20px',
      color: '#FFD700', // Gold for score
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#664400',
      strokeThickness: 1
    });
    
    // Multiplier display (secondary metric - dynamic color)
    this.multiplierText = this.scene.add.text(0, 0, '⚡ 1.0x', {
      fontSize: '20px',
      color: '#FFFFFF', // White for base, will change dynamically
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#333333',
      strokeThickness: 1
    });
    
    // Create main HUD container with ice-themed background
    this.mainHUD = this.scene.rexUI.add.sizer({
      x: hudX,
      y: hudY,
      orientation: 'vertical',
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 12, 0x001133, 0.85)
        .setStrokeStyle(2, 0x0066CC, 0.9), // Ice blue border
      space: {
        left: 16,
        right: 16,
        top: 12,
        bottom: 12,
        item: 6
      },
      anchor: {
        left: 'left',
        top: 'top'
      }
    })
    .add(this.heightText, { align: 'left' })
    .add(this.scoreText, { align: 'left' })
    .add(this.multiplierText, { align: 'left' })
    .setDepth(1100)
    .setScrollFactor(0)
    .layout();
  }

  private setupComboDisplay(): void {
    // Combo system will now be dynamic toasts only during active combos
    // Progress bar will be created when combo toast is created
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
    // Add null safety checks for score system and new HUD elements
    if (!this.scoreSystem || !this.mainHUD || !this.heightText || !this.scoreText || !this.multiplierText) {
      return;
    }

    // Additional check to ensure UI objects are ready
    try {
      this.currentScore = this.scoreSystem.getScoreData();
    
      // Update current height (primary metric) - convert pixels to meters
      // Player is 89.6 pixels tall (128 * 0.7 scale) = 6 feet = 1.83 meters
      // So 1 meter = 49 pixels (89.6 pixels ÷ 1.83 meters)
      const pixelsPerMeter = 49;
      const currentHeightMeters = Math.round(this.currentScore.currentHeight / pixelsPerMeter);
      this.heightText.setText(`🏔️ ${currentHeightMeters}m`);
      
      // Update total score
      const totalScore = this.currentScore.totalScore;
      this.scoreText.setText(`💰 ${totalScore.toLocaleString()}pts`);
      
      // Update multiplier with dynamic color - use ComboSystem multiplier instead of ScoreSystem
      const multiplier = this.comboSystem.getCurrentMultiplier();
      this.multiplierText.setText(`⚡ ${multiplier.toFixed(1)}x`);
      
      // Dynamic multiplier color based on value
      if (multiplier >= 2.0) {
        this.multiplierText.setColor('#FF6600'); // Fire orange for high multipliers
        this.multiplierText.setStroke('#662200', 2);
      } else if (multiplier > 1.0) {
        this.multiplierText.setColor('#FFD700'); // Gold for active multipliers
        this.multiplierText.setStroke('#664400', 1);
      } else {
        this.multiplierText.setColor('#FFFFFF'); // White for base multiplier
        this.multiplierText.setStroke('#333333', 1);
      }
      
      // Layout the main HUD to adjust to new text sizes
      this.mainHUD.layout();
      
      // Update combo display (now only during active combos)
      this.updateComboDisplay();
    } catch (error) {
      console.warn('GameUI updateDisplay failed, HUD objects not ready yet:', error);
    }
  }

  private showComboDisplay(): void {
    // Create dynamic combo toast for active combos
    if (!this.comboVisible && this.comboSystem.isComboActive()) {
      this.comboVisible = true;
      
      const centerX = this.scene.scale.width / 2;
      const centerY = this.scene.scale.height * 0.75; // Bottom center
      
      const comboLength = this.comboSystem.getCurrentComboLength();
      const multiplier = this.comboSystem.getCurrentMultiplier();
      
      // Ensure any existing progress bar is cleaned up first
      if (this.comboProgressBar) {
        this.comboProgressBar.destroy();
        this.comboProgressBar = null;
      }
      
      // Create fresh progress bar for this combo display
      this.comboProgressBar = this.scene.rexUI.add.circularProgress({
        radius: 12,
        barColor: 0xFF6600, // Fire orange
        trackColor: 0x330000,
        centerColor: 0x000000,
        thickness: 0.3,
        startAngle: Phaser.Math.DegToRad(270), // Start from top
        anticlockwise: false
      }).setScrollFactor(0);
      
      // Create dynamic combo celebration toast
      this.comboToast = this.scene.rexUI.add.sizer({
        x: centerX,
        y: centerY,
        orientation: 'vertical',
        background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, 0x330000, 0.95)
          .setStrokeStyle(3, 0xFF6600, 1), // Fire orange border
        space: {
          left: 20,
          right: 20,
          top: 15,
          bottom: 15,
          item: 8
        }
      })
      .add(
        this.scene.add.text(0, 0, `🔥 ${comboLength}-HIT COMBO! 🔥`, {
          fontSize: '24px',
          color: '#FF6600',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          align: 'center'
        }).setScrollFactor(0), { align: 'center' }
      )
      .add(
        this.scene.add.text(0, 0, `${multiplier.toFixed(1)}x MULTIPLIER`, {
          fontSize: '20px',
          color: '#FFD700',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          align: 'center'
        }).setScrollFactor(0), { align: 'center' }
      )
      .add(this.comboProgressBar, { align: 'center' })
      .setDepth(1300)
      .setScrollFactor(0) // Ensure entire toast is screen-fixed
      .layout();
      
      // Animate in with bounce effect
      this.comboToast.setAlpha(0).setScale(0.5);
      this.scene.tweens.add({
        targets: this.comboToast,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.out'
      });
    }
  }

  private hideComboDisplay(): void {
    if (this.comboVisible && this.comboToast) {
      this.comboFadeOut = this.scene.tweens.add({
        targets: this.comboToast,
        alpha: 0,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 400,
        ease: 'Power2.out',
        onComplete: () => {
          this.comboToast?.destroy();
          this.comboToast = null;
          this.comboVisible = false;
          this.comboFadeOut = null;
          // Explicitly destroy progress bar to ensure cleanup
          if (this.comboProgressBar) {
            this.comboProgressBar.destroy();
            this.comboProgressBar = null;
          }
        }
      });
    }
  }

  private updateComboDisplay(): void {
    // Add null safety checks
    if (!this.comboSystem || !this.comboProgressBar) {
      return;
    }

    try {
      const isActive = this.comboSystem.isComboActive();
      const timeRemaining = this.comboSystem.getComboTimeRemaining();
      
      // Show/hide combo display based on active state
      if (isActive && !this.comboVisible) {
        this.showComboDisplay();
      } else if (!isActive && this.comboVisible) {
        this.hideComboDisplay();
      }
      
      // Update progress bar during active combos
      if (isActive && this.comboToast && this.comboProgressBar) {
        const timePercent = Math.max(0, timeRemaining / 2500); // 2500ms combo timeout
        
        // Color based on time remaining - fire theme
        let barColor = 0x00FF00; // Green for safe
        if (timePercent < 0.3) {
          barColor = 0xFF0000; // Red for danger
        } else if (timePercent < 0.6) {
          barColor = 0xFF6600; // Fire orange for warning
        }
        
        this.comboProgressBar.setBarColor(barColor);
        this.comboProgressBar.setValue(timePercent);
        
        // Update combo text if toast is active
        const comboLength = this.comboSystem.getCurrentComboLength();
        const multiplier = this.comboSystem.getCurrentMultiplier();
        
        // Update the combo text elements within the toast
        const comboText = this.comboToast.getElement('items')[0];
        const multiplierText = this.comboToast.getElement('items')[1];
        
        if (comboText) {
          comboText.setText(`🔥 ${comboLength}-HIT COMBO! 🔥`);
        }
        if (multiplierText) {
          multiplierText.setText(`${multiplier.toFixed(1)}x MULTIPLIER`);
        }
        
        this.comboToast.layout();
      }
    } catch (error) {
      console.warn('GameUI updateComboDisplay failed, combo objects not ready yet:', error);
    }
  }

  private showMilestoneNotification(milestone: number, bonusPoints: number): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.3;
    
    // Create enhanced milestone toast with ice/mountain theme
    const milestoneToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 18, 0x001133, 0.95)
        .setStrokeStyle(4, 0x00FFFF, 1), // Ice cyan border
      
      text: this.scene.add.text(0, 0, `🎯 HEIGHT MILESTONE! 🎯\n🏔️ ${milestone}m REACHED! 🏔️\n+${bonusPoints.toLocaleString()} bonus points!`, {
        fontSize: '32px',
        color: '#00FFFF', // Ice cyan
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 12,
        stroke: '#003366',
        strokeThickness: 2
      }),
      
      space: {
        left: 30,
        right: 30,
        top: 25,
        bottom: 25
      },
      
      // Toast animation configuration - more impactful
      duration: {
        in: 400,
        hold: 2500,
        out: 500
      },
      
      transitIn: 'popup',
      transitOut: 'scaleDown',
      
      // Destroy after animation
      destroy: true
    })
    .setDepth(1400)
    .setScrollFactor(0)
    .showMessage();
    
    // Screen shake removed - was distracting with new background effects
  }

  private showComboCompletedEffect(comboChain: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    
    // Create enhanced combo completion toast with fire theme
    const comboToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, 0x330000, 0.95)
        .setStrokeStyle(3, 0xFF6600, 1), // Fire orange border
      
      text: this.scene.add.text(0, 0, `🔥 COMBO COMPLETE! 🔥\n${comboChain.chain}-HIT CHAIN\n+${comboChain.totalPoints.toLocaleString()} points!`, {
        fontSize: '28px',
        color: '#FF6600', // Fire orange
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 8,
        stroke: '#662200',
        strokeThickness: 2
      }),
      
      space: {
        left: 25,
        right: 25,
        top: 18,
        bottom: 18
      },
      
      duration: {
        in: 250,
        hold: 2000,
        out: 350
      },
      
      transitIn: 'popup',
      transitOut: 'fadeOut',
      destroy: true
    })
    .setDepth(1350)
    .setScrollFactor(0)
    .showMessage();
    
    // Camera shake removed - was distracting with new effects
  }

  private showComboBrokenEffect(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    
    // Create combo broken toast with ice theme (cooling down from fire)
    const brokenToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 12, 0x001133, 0.9)
        .setStrokeStyle(2, 0x4488FF, 1), // Cool blue for broken combo
      
      text: this.scene.add.text(0, 0, '❄️ COMBO COOLED DOWN ❄️', {
        fontSize: '24px',
        color: '#4488FF', // Cool blue
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        stroke: '#002266',
        strokeThickness: 1
      }),
      
      space: {
        left: 20,
        right: 20,
        top: 15,
        bottom: 15
      },
      
      duration: {
        in: 200,
        hold: 1200,
        out: 300
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
    
    // Clean up new UI elements
    this.mainHUD?.destroy();
    this.heightText?.destroy();
    this.scoreText?.destroy();
    this.multiplierText?.destroy();
    this.comboToast?.destroy();
    this.comboProgressBar?.destroy();
  }
}