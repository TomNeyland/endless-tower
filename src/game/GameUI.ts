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
  private buildingScoreDisplay: any; // Building combo score
  private bankedScoreDisplay: any; // Banked score display
  private tierDisplay: any; // Combo tier indicator
  private comboParticles: any; // Particle effects for combos
  
  // Enhanced UI State
  private currentScore: ScoreData;
  private comboVisible: boolean = false;
  private comboFadeOut: Phaser.Tweens.Tween | null = null;
  private lastComboEventTime: number = 0;
  private comboShakeIntensity: number = 0;

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
      fontSize: 28,  // Use number for pixel-perfect rendering
      color: '#00FFFF', // Bright cyan for current height
      fontStyle: 'bold',
      fontFamily: 'monospace', // Pixel-like font
      stroke: '#003366',
      strokeThickness: 2,
      resolution: 2  // Higher resolution for crisp text
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
    
    // Building combo score display
    this.buildingScoreDisplay = this.scene.add.text(0, 0, '🔥 Building: 0pts', {
      fontSize: '18px',
      color: '#FF6600', // Fire orange for building score
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#662200',
      strokeThickness: 1
    });
    
    // Banked score display
    this.bankedScoreDisplay = this.scene.add.text(0, 0, '💎 Banked: 0pts', {
      fontSize: '18px',
      color: '#00FF88', // Emerald green for banked score
      fontStyle: 'bold',
      fontFamily: 'monospace',
      stroke: '#004422',
      strokeThickness: 1
    });
    
    // Create enhanced main HUD container with ice-themed background
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
        item: 4
      },
      anchor: {
        left: 'left',
        top: 'top'
      }
    })
    .add(this.heightText, { align: 'left' })
    .add(this.scoreText, { align: 'left' })
    .add(this.multiplierText, { align: 'left' })
    .add(this.buildingScoreDisplay, { align: 'left' })
    .add(this.bankedScoreDisplay, { align: 'left' })
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
    
    // Enhanced combo events
    EventBus.on('combo-event-added', this.onComboEventAdded.bind(this));
    EventBus.on('combo-completed', this.onComboCompleted.bind(this));
    EventBus.on('combo-broken', this.onComboBroken.bind(this));
    EventBus.on('combo-lost', this.onComboLost.bind(this));
    EventBus.on('combo-banked', this.onComboBanked.bind(this));
    
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
    this.showComboEventEffect(data);
  }

  private onComboCompleted(comboChain: any): void {
    this.showEnhancedComboCompletedEffect(comboChain);
    this.hideComboDisplay();
  }

  private onComboBroken(data: any): void {
    this.showEnhancedComboBrokenEffect(data);
    this.hideComboDisplay();
  }

  private onCameraUpdate(): void {
    this.updateDisplay();
  }

  private updateDisplay(): void {
    // Add null safety checks for score system and enhanced HUD elements
    if (!this.scoreSystem || !this.mainHUD || !this.heightText || !this.scoreText || !this.multiplierText || !this.buildingScoreDisplay || !this.bankedScoreDisplay) {
      return;
    }

    // Safety check: ensure scene is still active
    if (!this.scene || !this.scene.scene || !this.scene.scene.isActive()) {
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
      
      // Update total score (now includes banked score)
      const baseScore = this.currentScore.totalScore;
      const bankedScore = this.comboSystem.getBankedScore();
      const totalScore = baseScore + bankedScore;
      this.scoreText.setText(`💰 ${totalScore.toLocaleString()}pts`);
      
      // Update multiplier with enhanced dynamic color - use ComboSystem multiplier
      const multiplier = this.comboSystem.getCurrentMultiplier();
      this.multiplierText.setText(`⚡ ${multiplier.toFixed(1)}x`);
      
      // Enhanced dynamic multiplier color based on value
      if (multiplier >= 5.0) {
        this.multiplierText.setColor('#FF0099'); // Hot pink for legendary multipliers
        this.multiplierText.setStroke('#660033', 2);
      } else if (multiplier >= 3.0) {
        this.multiplierText.setColor('#FF6600'); // Fire orange for high multipliers
        this.multiplierText.setStroke('#662200', 2);
      } else if (multiplier >= 2.0) {
        this.multiplierText.setColor('#FFD700'); // Gold for active multipliers
        this.multiplierText.setStroke('#664400', 1);
      } else if (multiplier > 1.0) {
        this.multiplierText.setColor('#FFFF00'); // Yellow for low multipliers
        this.multiplierText.setStroke('#666600', 1);
      } else {
        this.multiplierText.setColor('#FFFFFF'); // White for base multiplier
        this.multiplierText.setStroke('#333333', 1);
      }
      
      // Update building combo score
      const buildingScore = this.comboSystem.getBuildingComboScore();
      if (buildingScore > 0) {
        this.buildingScoreDisplay.setText(`🔥 Building: ${buildingScore.toLocaleString()}pts`);
        this.buildingScoreDisplay.setVisible(true);
      } else {
        this.buildingScoreDisplay.setVisible(false);
      }
      
      // Update banked score
      if (bankedScore > 0) {
        this.bankedScoreDisplay.setText(`💎 Banked: ${bankedScore.toLocaleString()}pts`);
        this.bankedScoreDisplay.setVisible(true);
      } else {
        this.bankedScoreDisplay.setVisible(false);
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
    // Create enhanced dynamic combo toast for active combos
    if (!this.comboVisible && this.comboSystem.isComboActive()) {
      this.comboVisible = true;
      
      const centerX = this.scene.scale.width / 2;
      const centerY = this.scene.scale.height * 0.75; // Bottom center
      
      const comboLength = this.comboSystem.getCurrentComboLength();
      const multiplier = this.comboSystem.getCurrentMultiplier();
      const tier = this.comboSystem.getComboTier();
      const buildingScore = this.comboSystem.getBuildingComboScore();
      
      // Ensure any existing elements are cleaned up first
      if (this.comboProgressBar) {
        this.comboProgressBar.destroy();
        this.comboProgressBar = null;
      }
      if (this.tierDisplay) {
        this.tierDisplay.destroy();
        this.tierDisplay = null;
      }
      
      // Create tier-appropriate colors and effects
      const tierConfig = this.getTierConfig(tier);
      
      // Create enhanced progress bar with tier coloring
      this.comboProgressBar = this.scene.rexUI.add.circularProgress({
        radius: 15,
        barColor: tierConfig.color,
        trackColor: 0x330000,
        centerColor: 0x000000,
        thickness: 0.4,
        startAngle: Phaser.Math.DegToRad(270),
        anticlockwise: false
      }).setScrollFactor(0);
      
      // Create tier display
      this.tierDisplay = this.scene.add.text(0, 0, tierConfig.label, {
        fontSize: '16px',
        color: tierConfig.textColor,
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center'
      }).setScrollFactor(0);
      
      // Create enhanced combo celebration toast
      this.comboToast = this.scene.rexUI.add.sizer({
        x: centerX,
        y: centerY,
        orientation: 'vertical',
        background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, tierConfig.bgColor, 0.95)
          .setStrokeStyle(4, tierConfig.color, 1),
        space: {
          left: 24,
          right: 24,
          top: 18,
          bottom: 18,
          item: 10
        }
      })
      .add(this.tierDisplay, { align: 'center' })
      .add(
        this.scene.add.text(0, 0, `🔥 ${comboLength}-HIT COMBO! 🔥`, {
          fontSize: tierConfig.fontSize,
          color: tierConfig.textColor,
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
      .add(
        this.scene.add.text(0, 0, `💰 ${buildingScore.toLocaleString()}pts`, {
          fontSize: '18px',
          color: '#00FF88',
          fontStyle: 'bold',
          fontFamily: 'monospace',
          align: 'center'
        }).setScrollFactor(0), { align: 'center' }
      )
      .add(this.comboProgressBar, { align: 'center' })
      .setDepth(1300)
      .setScrollFactor(0)
      .layout();
      
      // Enhanced animate in with tier-appropriate effect
      this.comboToast.setAlpha(0).setScale(0.3);
      const animDuration = tier === 'legendary' ? 500 : tier === 'expert' ? 400 : 300;
      this.scene.tweens.add({
        targets: this.comboToast,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: animDuration,
        ease: tier === 'legendary' ? 'Elastic.out' : 'Back.out'
      });
      
      // Add tier-appropriate screen effects
      if (tier === 'legendary') {
        this.addLegendaryEffect(centerX, centerY);
      }
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
        
        // Update enhanced combo text if toast is active
        const comboLength = this.comboSystem.getCurrentComboLength();
        const multiplier = this.comboSystem.getCurrentMultiplier();
        const tier = this.comboSystem.getComboTier();
        const buildingScore = this.comboSystem.getBuildingComboScore();
        
        // Update the combo text elements within the toast
        const elements = this.comboToast.getElement('items');
        const tierText = elements[0];
        const comboText = elements[1];
        const multiplierText = elements[2];
        const scoreText = elements[3];
        
        if (tierText) {
          const tierConfig = this.getTierConfig(tier);
          tierText.setText(tierConfig.label);
          tierText.setColor(tierConfig.textColor);
        }
        if (comboText) {
          comboText.setText(`🔥 ${comboLength}-HIT COMBO! 🔥`);
        }
        if (multiplierText) {
          multiplierText.setText(`${multiplier.toFixed(1)}x MULTIPLIER`);
        }
        if (scoreText) {
          scoreText.setText(`💰 ${buildingScore.toLocaleString()}pts`);
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

  private showEnhancedComboCompletedEffect(comboChain: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    const tier = comboChain.tier || 'basic';
    const tierConfig = this.getTierConfig(tier);
    
    // Create tier-appropriate combo completion effects
    const fontSize = tier === 'legendary' ? '36px' : tier === 'expert' ? '32px' : '28px';
    const holdDuration = tier === 'legendary' ? 3500 : tier === 'expert' ? 3000 : 2500;
    
    const comboToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 20, tierConfig.bgColor, 0.95)
        .setStrokeStyle(5, tierConfig.color, 1),
      
      text: this.scene.add.text(0, 0, 
        `${tierConfig.emoji} ${tierConfig.label} COMBO! ${tierConfig.emoji}\n` +
        `${comboChain.chain}-HIT CHAIN\n` +
        `+${comboChain.totalPoints.toLocaleString()} points!\n` +
        `+${comboChain.bankBonus.toLocaleString()} bank bonus!`, {
        fontSize: fontSize,
        color: tierConfig.textColor,
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 10,
        stroke: tierConfig.strokeColor,
        strokeThickness: 3
      }),
      
      space: {
        left: 30,
        right: 30,
        top: 22,
        bottom: 22
      },
      
      duration: {
        in: tier === 'legendary' ? 600 : 400,
        hold: holdDuration,
        out: 500
      },
      
      transitIn: tier === 'legendary' ? 'popup' : 'popup',
      transitOut: 'scaleDown',
      destroy: true
    })
    .setDepth(1350)
    .setScrollFactor(0)
    .showMessage();
    
    // Add tier-appropriate screen effects
    if (tier === 'legendary') {
      this.addLegendaryComboEffect(centerX, centerY);
      this.addScreenShake(200, 8);
    } else if (tier === 'expert') {
      this.addExpertComboEffect(centerX, centerY);
      this.addScreenShake(150, 5);
    } else if (tier === 'advanced') {
      this.addAdvancedComboEffect(centerX, centerY);
      this.addScreenShake(100, 3);
    }
  }

  private showEnhancedComboBrokenEffect(data: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.4;
    const reason = data.reason || 'timeout';
    const pointsLost = data.pointsLost || 0;
    
    // Create enhanced combo broken toast with appropriate theming
    const brokenToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, 0x001133, 0.9)
        .setStrokeStyle(3, 0x4488FF, 1),
      
      text: this.scene.add.text(0, 0, 
        `❄️ COMBO ENDED ❄️\n` +
        `Reason: ${this.getReasonText(reason)}\n` +
        `Lost: ${pointsLost.toLocaleString()} points`, {
        fontSize: '24px',
        color: '#4488FF',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 6,
        stroke: '#002266',
        strokeThickness: 2
      }),
      
      space: {
        left: 24,
        right: 24,
        top: 18,
        bottom: 18
      },
      
      duration: {
        in: 250,
        hold: 1800,
        out: 400
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
    // Always update enhanced combo display to show current state
    this.updateComboDisplay();
    
    // Update any ongoing visual effects
    this.updateVisualEffects(deltaTime);
  }

  // Enhanced event handlers for new combo events
  private onComboLost(data: any): void {
    this.showComboLossEffect(data);
    this.hideComboDisplay();
  }
  
  private onComboBanked(data: any): void {
    this.showComboBankedEffect(data);
    this.updateDisplay();
  }
  
  private showComboEventEffect(data: any): void {
    const now = Date.now();
    
    // Prevent spam by limiting effects frequency
    if (now - this.lastComboEventTime < 200) return;
    this.lastComboEventTime = now;
    
    const event = data.event;
    const tier = event.tier;
    
    // Add shake effect based on tier
    if (tier === 'legendary') {
      this.addScreenShake(80, 4);
    } else if (tier === 'expert') {
      this.addScreenShake(50, 3);
    } else if (tier === 'advanced') {
      this.addScreenShake(30, 2);
    }
    
    // Show floating text for the event
    this.showFloatingEventText(event);
  }
  
  private showComboLossEffect(data: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.5;
    
    const lossToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 12, 0x330000, 0.9)
        .setStrokeStyle(2, 0xFF3333, 1),
      
      text: this.scene.add.text(0, 0, 
        `💥 COMBO LOST! 💥\n` +
        `${data.description}\n` +
        `Lost: ${data.comboLoss.pointsLost.toLocaleString()} points`, {
        fontSize: '22px',
        color: '#FF3333',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 6,
        stroke: '#660000',
        strokeThickness: 2
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
    .setDepth(1350)
    .setScrollFactor(0)
    .showMessage();
  }
  
  private showComboBankedEffect(data: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.35;
    
    const bankToast = this.scene.rexUI.add.toast({
      x: centerX,
      y: centerY,
      
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, 0x003300, 0.95)
        .setStrokeStyle(3, 0x00FF88, 1),
      
      text: this.scene.add.text(0, 0, 
        `💎 COMBO BANKED! 💎\n` +
        `+${data.bankedAmount.toLocaleString()} points secured!`, {
        fontSize: '26px',
        color: '#00FF88',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        align: 'center',
        lineSpacing: 8,
        stroke: '#004422',
        strokeThickness: 2
      }),
      
      space: {
        left: 25,
        right: 25,
        top: 18,
        bottom: 18
      },
      
      duration: {
        in: 300,
        hold: 2000,
        out: 400
      },
      
      transitIn: 'popup',
      transitOut: 'scaleDown',
      destroy: true
    })
    .setDepth(1350)
    .setScrollFactor(0)
    .showMessage();
  }

  destroy(): void {
    EventBus.off('score-height-gained', this.onScoreUpdate.bind(this));
    EventBus.off('height-milestone-reached', this.onHeightMilestone.bind(this));
    EventBus.off('combo-event-added', this.onComboEventAdded.bind(this));
    EventBus.off('combo-completed', this.onComboCompleted.bind(this));
    EventBus.off('combo-broken', this.onComboBroken.bind(this));
    EventBus.off('combo-lost', this.onComboLost.bind(this));
    EventBus.off('combo-banked', this.onComboBanked.bind(this));
    EventBus.off('camera-state-updated', this.onCameraUpdate.bind(this));
    
    if (this.comboFadeOut) {
      this.comboFadeOut.destroy();
    }
    
    // Clean up enhanced UI elements
    this.mainHUD?.destroy();
    this.heightText?.destroy();
    this.scoreText?.destroy();
    this.multiplierText?.destroy();
    this.buildingScoreDisplay?.destroy();
    this.bankedScoreDisplay?.destroy();
    this.comboToast?.destroy();
    this.comboProgressBar?.destroy();
    this.tierDisplay?.destroy();
    this.comboParticles?.destroy();
  }
  
  // Helper methods for enhanced visual effects
  private getTierConfig(tier: string): any {
    switch (tier) {
      case 'legendary':
        return {
          color: 0xFF0099,
          bgColor: 0x330033,
          textColor: '#FF00FF',
          strokeColor: '#990066',
          label: '🌟 LEGENDARY 🌟',
          emoji: '🌟',
          fontSize: '28px'
        };
      case 'expert':
        return {
          color: 0xFF6600,
          bgColor: 0x331100,
          textColor: '#FF8800',
          strokeColor: '#663300',
          label: '⚡ EXPERT ⚡',
          emoji: '⚡',
          fontSize: '26px'
        };
      case 'advanced':
        return {
          color: 0xFFD700,
          bgColor: 0x332200,
          textColor: '#FFDD00',
          strokeColor: '#665500',
          label: '🔥 ADVANCED 🔥',
          emoji: '🔥',
          fontSize: '24px'
        };
      default:
        return {
          color: 0xFF6600,
          bgColor: 0x330000,
          textColor: '#FF6600',
          strokeColor: '#662200',
          label: '💫 COMBO 💫',
          emoji: '💫',
          fontSize: '22px'
        };
    }
  }
  
  private getReasonText(reason: string): string {
    switch (reason) {
      case 'bad-landing': return 'Poor Landing';
      case 'slow-speed': return 'Too Slow';
      case 'ground-touch': return 'Ground Touch';
      case 'wall-fail': return 'Wall Bounce Failed';
      case 'timeout': return 'Time Expired';
      default: return 'Unknown';
    }
  }
  
  private addScreenShake(duration: number, intensity: number): void {
    if (!this.scene.cameras.main) return;
    
    this.scene.cameras.main.shake(duration, intensity * 0.01);
  }
  
  private addLegendaryEffect(x: number, y: number): void {
    // Create particle burst effect for legendary combos
    // This would use Phaser's particle system if available
    
    // For now, create a simple burst of animated elements
    const colors = [0xFF00FF, 0xFF0099, 0x9900FF, 0xFF6600];
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 50;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      const particle = this.scene.add.circle(x, y, 4, colors[i % colors.length])
        .setDepth(1400)
        .setScrollFactor(0);
        
      this.scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 800,
        ease: 'Cubic.out',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  private addLegendaryComboEffect(x: number, y: number): void {
    this.addLegendaryEffect(x, y);
    
    // Add screen flash
    const flash = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xFFFFFF,
      0.3
    ).setDepth(1500).setScrollFactor(0);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });
  }
  
  private addExpertComboEffect(x: number, y: number): void {
    // Create fire-like effect for expert combos
    const colors = [0xFF6600, 0xFF8800, 0xFFAA00];
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const distance = 35;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      const particle = this.scene.add.circle(x, y, 3, colors[i % colors.length])
        .setDepth(1400)
        .setScrollFactor(0);
        
      this.scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.out',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  private addAdvancedComboEffect(x: number, y: number): void {
    // Create gold sparkle effect for advanced combos
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const distance = 25;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      const particle = this.scene.add.circle(x, y, 2, 0xFFD700)
        .setDepth(1400)
        .setScrollFactor(0);
        
      this.scene.tweens.add({
        targets: particle,
        x: endX,
        y: endY,
        alpha: 0,
        duration: 400,
        ease: 'Cubic.out',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  private showFloatingEventText(event: any): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height * 0.6;
    
    // Offset position slightly for multiple events
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 50;
    
    const tierConfig = this.getTierConfig(event.tier);
    
    const floatingText = this.scene.add.text(
      centerX + offsetX,
      centerY + offsetY,
      `+${event.points.toLocaleString()}`,
      {
        fontSize: tierConfig.fontSize,
        color: tierConfig.textColor,
        fontStyle: 'bold',
        fontFamily: 'monospace',
        stroke: tierConfig.strokeColor,
        strokeThickness: 2
      }
    ).setDepth(1350).setScrollFactor(0);
    
    // Animate the floating text
    this.scene.tweens.add({
      targets: floatingText,
      y: centerY - 80,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      ease: 'Cubic.out',
      onComplete: () => floatingText.destroy()
    });
  }
  
  private updateVisualEffects(deltaTime: number): void {
    // Update any ongoing visual effects
    // This could include particle systems, ongoing animations, etc.
    
    // Update combo shake intensity decay
    if (this.comboShakeIntensity > 0) {
      this.comboShakeIntensity = Math.max(0, this.comboShakeIntensity - deltaTime * 0.001);
    }
  }
}