import { Scene, GameObjects } from 'phaser';
import { EventBus } from './EventBus';

interface GameOverStats {
  finalHeight: number;
  survivalTime: number;
  totalScore: number;
  comboScore: number;
  heightScore: number;
  longestCombo: number;
  totalCombos: number;
  perfectWallBounces: number;
  totalWallBounces: number;
}

interface HighScoreData {
  bestHeight: number;
  bestScore: number;
  bestSurvivalTime: number;
  bestCombo: number;
  totalGamesPlayed: number;
}

export class GameOverScreen {
  private scene: Scene;
  private container: GameObjects.Container;
  private background: GameObjects.Graphics;
  private isVisible: boolean = false;
  private stats: GameOverStats;
  private highScores: HighScoreData;
  
  // UI Elements
  private titleText: GameObjects.Text;
  private statsContainer: GameObjects.Container;
  private highScoreContainer: GameObjects.Container;
  private restartText: GameObjects.Text;
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.loadHighScores();
    this.createUI();
    this.setupEventListeners();
  }

  private createUI(): void {
    // Create main container
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1000); // Above everything else
    this.container.setVisible(false);

    // Create semi-transparent background
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0x000000, 0.8);
    this.background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    this.container.add(this.background);

    // Title
    this.titleText = this.scene.add.text(
      this.scene.scale.width / 2,
      100,
      'GAME OVER',
      {
        fontSize: '48px',
        color: '#ff6b6b',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#000000',
          blur: 4,
          fill: true
        }
      }
    );
    this.titleText.setOrigin(0.5, 0.5);
    this.container.add(this.titleText);

    // Stats container
    this.statsContainer = this.scene.add.container(this.scene.scale.width / 2, 250);
    this.container.add(this.statsContainer);

    // High scores container
    this.highScoreContainer = this.scene.add.container(this.scene.scale.width / 2, 450);
    this.container.add(this.highScoreContainer);

    // Restart instruction
    this.restartText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height - 80,
      'Press any movement key to play again',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'italic',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    this.restartText.setOrigin(0.5, 0.5);
    this.container.add(this.restartText);

    // Add pulsing effect to restart text
    this.scene.tweens.add({
      targets: this.restartText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private setupEventListeners(): void {
    EventBus.on('game-over', this.onGameOver.bind(this));
    EventBus.on('restart-game', this.hide.bind(this));
    EventBus.on('game-stats-collected', this.onGameStatsCollected.bind(this));
  }

  private onGameOver(gameOverData: any): void {
    // Store initial game over data, wait for stats collection
    this.stats = {
      finalHeight: Math.round(gameOverData.finalHeight || 0),
      survivalTime: gameOverData.survivalTime || 0,
      totalScore: 0, // Will be updated from stats
      comboScore: 0, // Will be updated from stats
      heightScore: 0, // Will be updated from stats
      longestCombo: 0, // Will be updated from stats
      totalCombos: 0, // Will be updated from stats
      perfectWallBounces: 0, // Will be updated from stats
      totalWallBounces: 0 // Will be updated from stats
    };
  }

  private onGameStatsCollected(statsData: any): void {
    // Update stats with collected data from game systems
    if (this.stats) {
      this.stats.totalScore = statsData.totalScore || 0;
      this.stats.comboScore = statsData.comboScore || 0;
      this.stats.heightScore = statsData.heightScore || 0;
      this.stats.longestCombo = statsData.longestCombo || 0;
      this.stats.totalCombos = statsData.totalCombos || 0;
      this.stats.perfectWallBounces = statsData.perfectWallBounces || 0;
      this.stats.totalWallBounces = statsData.totalWallBounces || 0;

      this.updateHighScores();
      this.updateStatsDisplay();
      this.updateHighScoreDisplay();
      this.show();
    }
  }

  private show(): void {
    this.isVisible = true;
    this.container.setVisible(true);
    
    // Animate in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 500,
      ease: 'Power2.easeOut'
    });

    // Scale in effect for title
    this.titleText.setScale(0);
    this.scene.tweens.add({
      targets: this.titleText,
      scaleX: 1,
      scaleY: 1,
      duration: 600,
      delay: 200,
      ease: 'Back.easeOut'
    });

    // Slide in stats
    this.statsContainer.setY(this.statsContainer.y + 50);
    this.statsContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.statsContainer,
      y: this.statsContainer.y - 50,
      alpha: 1,
      duration: 500,
      delay: 400,
      ease: 'Power2.easeOut'
    });

    // Slide in high scores
    this.highScoreContainer.setY(this.highScoreContainer.y + 50);
    this.highScoreContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: this.highScoreContainer,
      y: this.highScoreContainer.y - 50,
      alpha: 1,
      duration: 500,
      delay: 600,
      ease: 'Power2.easeOut'
    });
  }

  private hide(): void {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.container.setVisible(false);
      }
    });
  }

  private updateStatsDisplay(): void {
    // Clear previous stats
    this.statsContainer.removeAll(true);

    const centerX = 0; // Container is already centered
    let currentY = -80;

    // Main stats section
    const mainStatsTitle = this.scene.add.text(centerX, currentY, 'YOUR PERFORMANCE', {
      fontSize: '28px',
      color: '#4ecdc4',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    mainStatsTitle.setOrigin(0.5, 0.5);
    this.statsContainer.add(mainStatsTitle);
    currentY += 50;

    // Create stats layout
    const statItems = [
      { label: 'Final Height', value: `${this.stats.finalHeight}m`, highlight: true },
      { label: 'Total Score', value: this.formatNumber(this.stats.totalScore), highlight: true },
      { label: 'Survival Time', value: this.formatTime(this.stats.survivalTime) },
      { label: 'Height Score', value: this.formatNumber(this.stats.heightScore) },
      { label: 'Combo Score', value: this.formatNumber(this.stats.comboScore) }
    ];

    statItems.forEach((item, index) => {
      const statGroup = this.createStatRow(item.label, item.value, item.highlight);
      statGroup.y = currentY + (index * 35);
      this.statsContainer.add(statGroup);
    });

    currentY += statItems.length * 35 + 30;

    // Combo stats if we have interesting data
    if (this.stats.totalCombos > 0 || this.stats.longestCombo > 0) {
      const comboStatsTitle = this.scene.add.text(centerX, currentY, 'COMBO PERFORMANCE', {
        fontSize: '24px',
        color: '#feca57',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      });
      comboStatsTitle.setOrigin(0.5, 0.5);
      this.statsContainer.add(comboStatsTitle);
      currentY += 40;

      const comboItems = [
        { label: 'Longest Combo', value: `${this.stats.longestCombo}x` },
        { label: 'Total Combos', value: this.stats.totalCombos.toString() }
      ];

      if (this.stats.totalWallBounces > 0) {
        comboItems.push({
          label: 'Perfect Wall Bounces',
          value: `${this.stats.perfectWallBounces}/${this.stats.totalWallBounces}`
        });
      }

      comboItems.forEach((item, index) => {
        const statGroup = this.createStatRow(item.label, item.value);
        statGroup.y = currentY + (index * 30);
        this.statsContainer.add(statGroup);
      });
    }
  }

  private updateHighScoreDisplay(): void {
    // Clear previous high scores
    this.highScoreContainer.removeAll(true);

    const centerX = 0;
    let currentY = -60;

    // High scores title
    const highScoreTitle = this.scene.add.text(centerX, currentY, 'PERSONAL RECORDS', {
      fontSize: '28px',
      color: '#ff9ff3',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    highScoreTitle.setOrigin(0.5, 0.5);
    this.highScoreContainer.add(highScoreTitle);
    currentY += 50;

    // High score items
    const highScoreItems = [
      { 
        label: 'Best Height', 
        value: `${this.highScores.bestHeight}m`,
        isNew: this.stats.finalHeight >= this.highScores.bestHeight
      },
      { 
        label: 'Best Score', 
        value: this.formatNumber(this.highScores.bestScore),
        isNew: this.stats.totalScore >= this.highScores.bestScore
      },
      { 
        label: 'Best Survival Time', 
        value: this.formatTime(this.highScores.bestSurvivalTime),
        isNew: this.stats.survivalTime >= this.highScores.bestSurvivalTime
      },
      { 
        label: 'Best Combo', 
        value: `${this.highScores.bestCombo}x`,
        isNew: this.stats.longestCombo >= this.highScores.bestCombo
      },
      { 
        label: 'Games Played', 
        value: this.highScores.totalGamesPlayed.toString()
      }
    ];

    highScoreItems.forEach((item, index) => {
      const statGroup = this.createStatRow(item.label, item.value, false, item.isNew);
      statGroup.y = currentY + (index * 35);
      this.highScoreContainer.add(statGroup);
    });
  }

  private createStatRow(label: string, value: string, highlight: boolean = false, isNew: boolean = false): GameObjects.Container {
    const group = this.scene.add.container(0, 0);

    const labelColor = highlight ? '#ffffff' : '#cccccc';
    const valueColor = highlight ? '#4ecdc4' : isNew ? '#ff6b6b' : '#ffffff';

    const labelText = this.scene.add.text(-150, 0, label, {
      fontSize: highlight ? '22px' : '18px',
      color: labelColor,
      fontStyle: highlight ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 1
    });
    labelText.setOrigin(0, 0.5);

    const valueText = this.scene.add.text(150, 0, value, {
      fontSize: highlight ? '22px' : '18px',
      color: valueColor,
      fontStyle: highlight || isNew ? 'bold' : 'normal',
      stroke: '#000000',
      strokeThickness: 1
    });
    valueText.setOrigin(1, 0.5);

    group.add([labelText, valueText]);

    // Add "NEW!" indicator for new records
    if (isNew) {
      const newText = this.scene.add.text(170, 0, 'NEW!', {
        fontSize: '14px',
        color: '#ff6b6b',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1
      });
      newText.setOrigin(0, 0.5);
      group.add(newText);

      // Add pulsing effect to new records
      this.scene.tweens.add({
        targets: newText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return group;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  private loadHighScores(): void {
    try {
      const saved = localStorage.getItem('icyTowerHighScores');
      if (saved) {
        this.highScores = JSON.parse(saved);
      } else {
        this.resetHighScores();
      }
    } catch (error) {
      console.warn('Failed to load high scores:', error);
      this.resetHighScores();
    }
  }

  private resetHighScores(): void {
    this.highScores = {
      bestHeight: 0,
      bestScore: 0,
      bestSurvivalTime: 0,
      bestCombo: 0,
      totalGamesPlayed: 0
    };
  }

  private updateHighScores(): void {
    let updated = false;

    if (this.stats.finalHeight > this.highScores.bestHeight) {
      this.highScores.bestHeight = this.stats.finalHeight;
      updated = true;
    }

    if (this.stats.totalScore > this.highScores.bestScore) {
      this.highScores.bestScore = this.stats.totalScore;
      updated = true;
    }

    if (this.stats.survivalTime > this.highScores.bestSurvivalTime) {
      this.highScores.bestSurvivalTime = this.stats.survivalTime;
      updated = true;
    }

    if (this.stats.longestCombo > this.highScores.bestCombo) {
      this.highScores.bestCombo = this.stats.longestCombo;
      updated = true;
    }

    this.highScores.totalGamesPlayed++;

    this.saveHighScores();

    if (updated) {
      console.log('🏆 New personal record achieved!');
    }
  }

  private saveHighScores(): void {
    try {
      localStorage.setItem('icyTowerHighScores', JSON.stringify(this.highScores));
    } catch (error) {
      console.warn('Failed to save high scores:', error);
    }
  }

  isShowing(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    EventBus.off('game-over', this.onGameOver.bind(this));
    EventBus.off('restart-game', this.hide.bind(this));
    EventBus.off('game-stats-collected', this.onGameStatsCollected.bind(this));
    
    if (this.container) {
      this.container.destroy();
    }
  }
}