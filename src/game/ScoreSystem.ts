import { Scene } from 'phaser';
import { Player } from './Player';
import { EventBus } from './EventBus';

export interface ScoreData {
  heightScore: number;
  comboScore: number;
  totalScore: number;
  currentHeight: number;
  highestHeight: number;
  multiplier: number;
}

export class ScoreSystem {
  private scene: Scene;
  private player: Player;
  
  // Score tracking
  private heightScore: number = 0;
  private comboScore: number = 0;
  private currentHeight: number = 0;
  private highestHeight: number = 0;
  private currentMultiplier: number = 1.0;
  
  // Height scoring
  private lastScoredHeight: number = 0;
  private readonly HEIGHT_SCORE_INTERVAL = 10; // Points per 10 pixels climbed
  private readonly HEIGHT_POINT_VALUE = 1;
  
  // Combo scoring (foundation for later)
  private comboChain: number = 0;
  private lastComboTime: number = 0;
  private readonly COMBO_TIMEOUT = 3000; // 3 seconds to maintain combo
  
  // Milestones
  private heightMilestones: number[] = [100, 250, 500, 1000, 2000, 5000, 10000];
  private reachedMilestones: Set<number> = new Set();
  
  // Powerup modifiers
  private heightScoreMultiplier: number = 1.0;

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    this.setupEventListeners();
    
    // Emit ready event for powerup system integration
    EventBus.emit('score-system-ready', this);
    
    console.log('📊 ScoreSystem initialized');
  }

  private setupEventListeners(): void {
    EventBus.on('camera-state-updated', this.onCameraStateUpdated.bind(this));
    EventBus.on('player-wall-bounce', this.onPlayerWallBounce.bind(this));
    EventBus.on('player-landed', this.onPlayerLanded.bind(this));
    EventBus.on('player-height-record', this.onPlayerHeightRecord.bind(this));
    
    // Enhanced combo integration
    EventBus.on('combo-completed', this.onComboCompleted.bind(this));
    EventBus.on('combo-banked', this.onComboBanked.bind(this));
  }

  private onCameraStateUpdated(cameraState: any): void {
    this.currentHeight = cameraState.playerHeight;
    this.updateHeightScore();
  }

  private onPlayerHeightRecord(data: any): void {
    const newHeight = data.height;
    if (newHeight > this.highestHeight) {
      this.highestHeight = newHeight;
      this.checkHeightMilestones(newHeight);
    }
  }

  private updateHeightScore(): void {
    // Award points for every HEIGHT_SCORE_INTERVAL pixels climbed
    const heightThreshold = Math.floor(this.currentHeight / this.HEIGHT_SCORE_INTERVAL) * this.HEIGHT_SCORE_INTERVAL;
    
    if (heightThreshold > this.lastScoredHeight) {
      const heightGained = heightThreshold - this.lastScoredHeight;
      const points = (heightGained / this.HEIGHT_SCORE_INTERVAL) * this.HEIGHT_POINT_VALUE;
      
      this.heightScore += Math.round(points * this.currentMultiplier);
      this.lastScoredHeight = heightThreshold;
      
      EventBus.emit('score-height-gained', {
        points: Math.round(points * this.currentMultiplier),
        height: this.currentHeight,
        multiplier: this.currentMultiplier
      });
    }
  }

  private checkHeightMilestones(height: number): void {
    this.heightMilestones.forEach(milestone => {
      if (height >= milestone && !this.reachedMilestones.has(milestone)) {
        this.reachedMilestones.add(milestone);
        
        // Bonus points for reaching milestones
        const bonusPoints = milestone;
        this.heightScore += bonusPoints;
        
        EventBus.emit('height-milestone-reached', {
          milestone,
          bonusPoints,
          totalHeightScore: this.heightScore,
          height
        });
      }
    });
  }

  // Enhanced combo integration - delegate to ComboSystem
  private onPlayerWallBounce(data: any): void {
    // ComboSystem now handles all combo logic
    // ScoreSystem just tracks the results
  }

  private onPlayerLanded(data: any): void {
    // ComboSystem now handles landing detection
    // ScoreSystem just tracks the results
  }
  
  // New enhanced combo event handlers
  private onComboCompleted(comboChain: any): void {
    // Add combo points to total score with massive impact
    const comboPoints = comboChain.totalPoints + comboChain.bankBonus;
    this.comboScore += comboPoints;
    
    console.log('📊 Enhanced Combo Score Added:', {
      comboPoints,
      totalComboScore: this.comboScore,
      tier: comboChain.tier,
      chain: comboChain.chain
    });
    
    EventBus.emit('score-combo-gained', {
      points: comboPoints,
      totalComboScore: this.comboScore,
      tier: comboChain.tier
    });
  }
  
  private onComboBanked(data: any): void {
    // Combo points are now permanently added to score
    // This event is just for UI feedback
    console.log('📊 Combo Points Banked:', {
      bankedAmount: data.bankedAmount,
      totalComboScore: this.comboScore
    });
  }

  // Enhanced public getters
  getScoreData(): ScoreData {
    return {
      heightScore: this.heightScore,
      comboScore: this.comboScore,
      totalScore: this.heightScore + this.comboScore,
      currentHeight: this.currentHeight,
      highestHeight: this.highestHeight,
      multiplier: this.currentMultiplier
    };
  }

  getTotalScore(): number {
    return this.heightScore + this.comboScore;
  }

  getHeightScore(): number {
    return this.heightScore;
  }

  getComboScore(): number {
    return this.comboScore;
  }

  getCurrentHeight(): number {
    return this.currentHeight;
  }

  getHighestHeight(): number {
    return this.highestHeight;
  }

  getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  getComboChain(): number {
    return this.comboChain;
  }

  // Reset for new game
  reset(): void {
    this.heightScore = 0;
    this.comboScore = 0;
    this.currentHeight = 0;
    this.highestHeight = 0;
    this.currentMultiplier = 1.0;
    this.lastScoredHeight = 0;
    this.comboChain = 0;
    this.lastComboTime = 0;
    this.reachedMilestones.clear();
    
    // Reset powerup modifiers
    this.heightScoreMultiplier = 1.0;
    
    EventBus.emit('score-reset');
  }
  
  // Powerup modifier methods
  setHeightScoreMultiplier(multiplier: number): void {
    this.heightScoreMultiplier = multiplier;
    console.log(`📊 Height score multiplier set to: ${multiplier}x`);
  }
  
  getHeightScoreMultiplier(): number {
    return this.heightScoreMultiplier;
  }

  getStats(): any {
    return {
      totalScore: this.getTotalScore(),
      heightScore: this.getHeightScore(),
      comboScore: this.getComboScore(),
      currentHeight: this.currentHeight,
      highestHeight: this.highestHeight
    };
  }

  destroy(): void {
    EventBus.off('camera-state-updated', this.onCameraStateUpdated.bind(this));
    EventBus.off('player-wall-bounce', this.onPlayerWallBounce.bind(this));
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-height-record', this.onPlayerHeightRecord.bind(this));
    EventBus.off('combo-completed', this.onComboCompleted.bind(this));
    EventBus.off('combo-banked', this.onComboBanked.bind(this));
  }
}