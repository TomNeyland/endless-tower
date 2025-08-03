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

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on('camera-state-updated', this.onCameraStateUpdated.bind(this));
    EventBus.on('player-wall-bounce', this.onPlayerWallBounce.bind(this));
    EventBus.on('player-landed', this.onPlayerLanded.bind(this));
    EventBus.on('player-height-record', this.onPlayerHeightRecord.bind(this));
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

  // Foundation for combo system - will be expanded later
  private onPlayerWallBounce(data: any): void {
    // Track wall bounces for combo system
    this.updateCombo('wall-bounce', data);
  }

  private onPlayerLanded(data: any): void {
    // Reset combo on landing (for now - can be refined later)
    this.resetCombo();
  }

  private updateCombo(type: string, data: any): void {
    const now = Date.now();
    
    // Check if combo chain is still active
    if (now - this.lastComboTime > this.COMBO_TIMEOUT) {
      this.comboChain = 0;
    }
    
    this.comboChain++;
    this.lastComboTime = now;
    
    // Calculate combo multiplier (simple for now)
    this.currentMultiplier = 1.0 + (this.comboChain * 0.1);
    
    // Combo scoring (basic implementation)
    const comboPoints = this.comboChain * 10;
    this.comboScore += comboPoints;
    
    EventBus.emit('combo-updated', {
      type,
      chain: this.comboChain,
      multiplier: this.currentMultiplier,
      points: comboPoints,
      data
    });
  }

  private resetCombo(): void {
    if (this.comboChain > 0) {
      EventBus.emit('combo-broken', {
        finalChain: this.comboChain,
        finalMultiplier: this.currentMultiplier,
        totalComboScore: this.comboScore
      });
    }
    
    this.comboChain = 0;
    this.currentMultiplier = 1.0;
  }

  // Public getters
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
    
    EventBus.emit('score-reset');
  }

  destroy(): void {
    EventBus.off('camera-state-updated', this.onCameraStateUpdated.bind(this));
    EventBus.off('player-wall-bounce', this.onPlayerWallBounce.bind(this));
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-height-record', this.onPlayerHeightRecord.bind(this));
  }
}