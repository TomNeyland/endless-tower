import { Scene } from 'phaser';
import { Player } from './Player';
import { EventBus } from './EventBus';

export interface ComboEvent {
  type: 'wall-bounce' | 'perfect-wall-bounce' | 'multi-platform-jump' | 'air-time' | 'speed-bonus' | 'mega-jump' | 'style-bonus' | 'risky-gap' | 'height-chain' | 'wall-chain';
  timestamp: number;
  data: any;
  points: number;
  tier: 'basic' | 'advanced' | 'expert' | 'legendary';
  description: string;
}

export interface ComboChain {
  events: ComboEvent[];
  startTime: number;
  endTime: number;
  totalPoints: number;
  multiplier: number;
  chain: number;
  tier: 'basic' | 'advanced' | 'expert' | 'legendary';
  bankBonus: number;
}

export interface ComboLoss {
  reason: 'bad-landing' | 'slow-speed' | 'ground-touch' | 'wall-fail' | 'timeout';
  comboLost: number;
  pointsLost: number;
  timestamp: number;
}

export class ComboSystem {
  private scene: Scene;
  private player: Player;
  
  // Current combo state
  private currentCombo: ComboEvent[] = [];
  private comboStartTime: number = 0;
  private lastEventTime: number = 0;
  private comboMultiplier: number = 1.0;
  private buildingComboScore: number = 0;
  
  // Enhanced combo timing and difficulty
  private readonly COMBO_TIMEOUT = 3000; // Extended timeout for more generous chaining
  private readonly MAX_COMBO_MULTIPLIER = 10.0; // Much higher ceiling
  private readonly MULTIPLIER_INCREMENT = 0.3; // Faster multiplier growth
  
  // Combo loss tracking
  private consecutiveBadLandings: number = 0;
  private lastGroundTouchTime: number = 0;
  private groundTouchGracePeriod: number = 500; // 500ms grace period
  
  // Banking system
  private bankedScore: number = 0;
  private autoBank: boolean = false;
  private autoBankThreshold: number = 10;
  
  // Powerup modifiers
  private comboMultiplierBonus: number = 1.0;
  private goldenTouchEnabled: boolean = false;
  
  // Enhanced event scoring with tier system
  private readonly POINT_VALUES = {
    'wall-bounce': { basic: 100, advanced: 200, expert: 400, legendary: 800 },
    'perfect-wall-bounce': { basic: 300, advanced: 600, expert: 1200, legendary: 2400 },
    'multi-platform-jump': { basic: 150, advanced: 300, expert: 600, legendary: 1200 },
    'air-time': { basic: 80, advanced: 160, expert: 320, legendary: 640 },
    'speed-bonus': { basic: 200, advanced: 400, expert: 800, legendary: 1600 },
    'mega-jump': { basic: 500, advanced: 1000, expert: 2000, legendary: 4000 },
    'style-bonus': { basic: 300, advanced: 600, expert: 1200, legendary: 2400 },
    'risky-gap': { basic: 400, advanced: 800, expert: 1600, legendary: 3200 },
    'height-chain': { basic: 250, advanced: 500, expert: 1000, legendary: 2000 },
    'wall-chain': { basic: 600, advanced: 1200, expert: 2400, legendary: 4800 }
  };
  
  // Tier thresholds for different combo types
  private readonly TIER_THRESHOLDS = {
    wallBounceEfficiency: { advanced: 1.1, expert: 1.2, legendary: 1.3 },
    multiPlatformCount: { advanced: 3, expert: 5, legendary: 8 },
    airTimeMs: { advanced: 1500, expert: 2500, legendary: 4000 },
    speedThreshold: { advanced: 500, expert: 800, legendary: 1200 },
    jumpHeight: { advanced: 300, expert: 500, legendary: 800 },
    gapDistance: { advanced: 250, expert: 400, legendary: 600 },
    wallChainCount: { advanced: 3, expert: 5, legendary: 8 }
  };
  
  // Enhanced tracking
  private airTimeStart: number = 0;
  private lastGroundedTime: number = 0;
  private minAirTimeForCombo: number = 800; // Reduced minimum for more accessible combos
  
  // Platform tracking for multi-platform jumps
  private lastPlatformLanding: number = 0;
  private platformsSkipped: number = 0;
  private consecutivePlatformsSkipped: number = 0;
  
  // Wall bounce tracking
  private consecutiveWallBounces: number = 0;
  private lastWallSide: 'left' | 'right' | null = null;
  
  // Height tracking
  private lastHeightRecord: number = 0;
  private heightGainInCombo: number = 0;
  
  // Speed tracking
  private peakSpeedInCombo: number = 0;
  private lastSpeedMeasurement: number = 0;

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    this.setupEventListeners();
    
    // Emit ready event for powerup system integration
    EventBus.emit('combo-system-ready', this);
    
    console.log('⛓️ ComboSystem initialized');
  }

  private setupEventListeners(): void {
    // Wall bounce events
    EventBus.on('player-wall-bounce', this.onWallBounce.bind(this));
    
    // Landing/takeoff events
    EventBus.on('player-landed', this.onPlayerLanded.bind(this));
    EventBus.on('player-takeoff', this.onPlayerTakeoff.bind(this));
    
    // Height/speed events
    EventBus.on('player-height-record', this.onHeightRecord.bind(this));
    EventBus.on('movement-state-updated', this.onMovementStateUpdated.bind(this));
    
    // Combo banking events
    EventBus.on('combo-bank-requested', this.bankCombo.bind(this));
    EventBus.on('combo-auto-bank-toggle', this.toggleAutoBank.bind(this));
  }

  update(deltaTime: number): void {
    this.checkComboTimeout();
    this.updateAirTimeTracking();
    this.updateSpeedTracking();
    this.checkAutoBank();
    this.updateHeightTracking();
  }

  private onWallBounce(data: any): void {
    const efficiency = data.efficiency || 0.8;
    const side = data.side;
    const speedGained = data.newSpeed - data.oldSpeed;
    
    // Track consecutive wall bounces for chain bonuses
    if (this.lastWallSide === null || this.lastWallSide !== side) {
      this.consecutiveWallBounces++;
      this.lastWallSide = side;
    } else {
      this.consecutiveWallBounces = 1;
    }
    
    // Determine event type and tier based on efficiency and chain
    let eventType: ComboEvent['type'];
    let tier: ComboEvent['tier'];
    let description: string;
    
    if (efficiency >= this.TIER_THRESHOLDS.wallBounceEfficiency.legendary) {
      eventType = 'perfect-wall-bounce';
      tier = 'legendary';
      description = `LEGENDARY Perfect Wall Bounce! ${(efficiency * 100).toFixed(0)}% efficiency`;
    } else if (efficiency >= this.TIER_THRESHOLDS.wallBounceEfficiency.expert) {
      eventType = 'perfect-wall-bounce';
      tier = 'expert';
      description = `EXPERT Perfect Wall Bounce! ${(efficiency * 100).toFixed(0)}% efficiency`;
    } else if (efficiency >= this.TIER_THRESHOLDS.wallBounceEfficiency.advanced) {
      eventType = 'perfect-wall-bounce';
      tier = 'advanced';
      description = `Perfect Wall Bounce! ${(efficiency * 100).toFixed(0)}% efficiency`;
    } else if (efficiency > 1.0) {
      eventType = 'perfect-wall-bounce';
      tier = 'basic';
      description = `Perfect Wall Bounce! ${(efficiency * 100).toFixed(0)}% efficiency`;
    } else if (efficiency >= 0.9) {
      eventType = 'wall-bounce';
      tier = efficiency >= 0.95 ? 'advanced' : 'basic';
      description = `Solid Wall Bounce! ${(efficiency * 100).toFixed(0)}% efficiency`;
    } else {
      // Poor wall bounce - potential combo breaker
      if (efficiency < 0.7) {
        this.addComboLoss('wall-fail', `Poor wall bounce: ${(efficiency * 100).toFixed(0)}% efficiency`);
        return;
      }
      eventType = 'wall-bounce';
      tier = 'basic';
      description = `Wall Bounce ${(efficiency * 100).toFixed(0)}% efficiency`;
    }
    
    // Check for wall chain bonus
    if (this.consecutiveWallBounces >= this.TIER_THRESHOLDS.wallChainCount.legendary) {
      this.addComboEvent('wall-chain', {
        chainCount: this.consecutiveWallBounces,
        efficiency: efficiency,
        side: side
      }, 'legendary', `LEGENDARY Wall Chain! ${this.consecutiveWallBounces} consecutive bounces`);
    } else if (this.consecutiveWallBounces >= this.TIER_THRESHOLDS.wallChainCount.expert) {
      this.addComboEvent('wall-chain', {
        chainCount: this.consecutiveWallBounces,
        efficiency: efficiency,
        side: side
      }, 'expert', `EXPERT Wall Chain! ${this.consecutiveWallBounces} consecutive bounces`);
    } else if (this.consecutiveWallBounces >= this.TIER_THRESHOLDS.wallChainCount.advanced) {
      this.addComboEvent('wall-chain', {
        chainCount: this.consecutiveWallBounces,
        efficiency: efficiency,
        side: side
      }, 'advanced', `Wall Chain! ${this.consecutiveWallBounces} consecutive bounces`);
    }
    
    console.log('🎯 Enhanced Wall Bounce Event:', {
      type: eventType,
      tier: tier,
      side: side,
      efficiency: efficiency,
      speedGained: speedGained,
      wallChain: this.consecutiveWallBounces,
      description: description
    });
    
    this.addComboEvent(eventType, {
      side: side,
      efficiency: efficiency,
      speedGained: speedGained,
      bounceCount: data.bounceCount,
      wallChain: this.consecutiveWallBounces
    }, tier, description);
  }

  private onPlayerLanded(data: any): void {
    const now = Date.now();
    const horizontalSpeed = Math.abs(data?.horizontalSpeed || 0);
    const landingQuality = this.assessLandingQuality(data);
    
    console.log('🛬 Enhanced Player Landed:', { 
      horizontalSpeed: horizontalSpeed,
      airTimeStart: this.airTimeStart,
      platformsSkipped: this.platformsSkipped,
      landingQuality: landingQuality
    });
    
    // Check for bad landing that breaks combo
    if (landingQuality === 'bad') {
      this.consecutiveBadLandings++;
      if (this.consecutiveBadLandings >= 2) {
        this.addComboLoss('bad-landing', 'Too many poor landings');
        return;
      }
    } else {
      this.consecutiveBadLandings = 0;
    }
    
    // Check if landing too close to ground (ground touch detection)
    if (now - this.lastGroundTouchTime < this.groundTouchGracePeriod) {
      this.addComboLoss('ground-touch', 'Touched ground too recently');
      return;
    }
    
    // Check for air time combo with enhanced tiers
    if (this.airTimeStart > 0) {
      const airTime = now - this.airTimeStart;
      if (airTime >= this.minAirTimeForCombo) {
        let tier: ComboEvent['tier'];
        let description: string;
        
        if (airTime >= this.TIER_THRESHOLDS.airTimeMs.legendary) {
          tier = 'legendary';
          description = `LEGENDARY Air Time! ${(airTime/1000).toFixed(1)}s in the air!`;
        } else if (airTime >= this.TIER_THRESHOLDS.airTimeMs.expert) {
          tier = 'expert';
          description = `EXPERT Air Time! ${(airTime/1000).toFixed(1)}s in the air!`;
        } else if (airTime >= this.TIER_THRESHOLDS.airTimeMs.advanced) {
          tier = 'advanced';
          description = `Extended Air Time! ${(airTime/1000).toFixed(1)}s in the air!`;
        } else {
          tier = 'basic';
          description = `Air Time! ${(airTime/1000).toFixed(1)}s in the air`;
        }
        
        console.log('⏱️ Enhanced Air Time Combo:', { airTime, tier, threshold: this.minAirTimeForCombo });
        this.addComboEvent('air-time', {
          airTime,
          landingSpeed: horizontalSpeed,
          landingQuality: landingQuality
        }, tier, description);
      }
    }
    
    // Enhanced multi-platform jump with tiers
    const timeSinceLastLanding = now - this.lastPlatformLanding;
    if (timeSinceLastLanding > 500 && this.platformsSkipped > 0) {
      this.consecutivePlatformsSkipped += this.platformsSkipped;
      
      let tier: ComboEvent['tier'];
      let eventType: ComboEvent['type'] = 'multi-platform-jump';
      let description: string;
      
      if (this.platformsSkipped >= this.TIER_THRESHOLDS.multiPlatformCount.legendary) {
        tier = 'legendary';
        eventType = 'mega-jump';
        description = `LEGENDARY Mega Jump! Skipped ${this.platformsSkipped} platforms!`;
      } else if (this.platformsSkipped >= this.TIER_THRESHOLDS.multiPlatformCount.expert) {
        tier = 'expert';
        eventType = 'mega-jump';
        description = `EXPERT Mega Jump! Skipped ${this.platformsSkipped} platforms!`;
      } else if (this.platformsSkipped >= this.TIER_THRESHOLDS.multiPlatformCount.advanced) {
        tier = 'advanced';
        description = `Great Jump! Skipped ${this.platformsSkipped} platforms!`;
      } else {
        tier = 'basic';
        description = `Multi-Platform Jump! Skipped ${this.platformsSkipped} platforms`;
      }
      
      console.log('🏗️ Enhanced Multi-Platform Jump:', { 
        platformsSkipped: this.platformsSkipped,
        consecutiveSkipped: this.consecutivePlatformsSkipped,
        timeSinceLastLanding,
        tier: tier
      });
      
      this.addComboEvent(eventType, {
        platformsSkipped: this.platformsSkipped,
        consecutiveSkipped: this.consecutivePlatformsSkipped,
        jumpDistance: timeSinceLastLanding,
        landingQuality: landingQuality
      }, tier, description);
      
      // Check for height chain bonus
      if (this.heightGainInCombo > 200) {
        const heightTier = this.heightGainInCombo > 500 ? 'expert' : 
                          this.heightGainInCombo > 350 ? 'advanced' : 'basic';
        this.addComboEvent('height-chain', {
          heightGained: this.heightGainInCombo,
          platformsInChain: this.consecutivePlatformsSkipped
        }, heightTier, `Height Chain! Climbed ${Math.round(this.heightGainInCombo)}px in combo`);
      }
    } else {
      this.consecutivePlatformsSkipped = 0;
    }
    
    this.lastPlatformLanding = now;
    this.platformsSkipped = 0;
    this.lastGroundedTime = now;
    this.lastGroundTouchTime = now;
    this.airTimeStart = 0;
    
    // Reset wall bounce chain when landing
    this.consecutiveWallBounces = 0;
    this.lastWallSide = null;
  }

  private onPlayerTakeoff(data: any): void {
    const now = Date.now();
    const takeoffSpeed = Math.abs(data?.horizontalSpeed || 0);
    
    console.log('🚀 Enhanced Player Takeoff:', { takeoffSpeed });
    this.airTimeStart = now;
    
    // Track height at start of jump for height chain calculation
    this.heightGainInCombo = 0;
    
    // Check for risky gap attempt (takeoff with high speed towards a gap)
    if (takeoffSpeed > 600 && data?.gapDistance) {
      const gapDistance = data.gapDistance;
      let tier: ComboEvent['tier'];
      let description: string;
      
      if (gapDistance >= this.TIER_THRESHOLDS.gapDistance.legendary) {
        tier = 'legendary';
        description = `LEGENDARY Risky Gap! ${Math.round(gapDistance)}px gap at ${Math.round(takeoffSpeed)} speed!`;
      } else if (gapDistance >= this.TIER_THRESHOLDS.gapDistance.expert) {
        tier = 'expert';
        description = `EXPERT Risky Gap! ${Math.round(gapDistance)}px gap at ${Math.round(takeoffSpeed)} speed!`;
      } else if (gapDistance >= this.TIER_THRESHOLDS.gapDistance.advanced) {
        tier = 'advanced';
        description = `Risky Gap! ${Math.round(gapDistance)}px gap at ${Math.round(takeoffSpeed)} speed!`;
      } else {
        tier = 'basic';
        description = `Gap Jump! ${Math.round(gapDistance)}px gap`;
      }
      
      this.addComboEvent('risky-gap', {
        gapDistance: gapDistance,
        takeoffSpeed: takeoffSpeed,
        riskLevel: tier
      }, tier, description);
    }
  }

  private onHeightRecord(data: any): void {
    const speed = Math.abs(data.horizontalSpeed || 0);
    const height = data.height || 0;
    
    // Track height gain in current combo
    if (this.isComboActive()) {
      this.heightGainInCombo = height - this.lastHeightRecord;
    }
    this.lastHeightRecord = height;
    
    // Enhanced speed bonus with tiers
    if (speed > this.TIER_THRESHOLDS.speedThreshold.basic) {
      let tier: ComboEvent['tier'];
      let description: string;
      
      if (speed >= this.TIER_THRESHOLDS.speedThreshold.legendary) {
        tier = 'legendary';
        description = `LEGENDARY Speed! ${Math.round(speed)} velocity while climbing!`;
      } else if (speed >= this.TIER_THRESHOLDS.speedThreshold.expert) {
        tier = 'expert';
        description = `EXPERT Speed! ${Math.round(speed)} velocity while climbing!`;
      } else if (speed >= this.TIER_THRESHOLDS.speedThreshold.advanced) {
        tier = 'advanced';
        description = `High Speed! ${Math.round(speed)} velocity while climbing!`;
      } else {
        tier = 'basic';
        description = `Speed Bonus! ${Math.round(speed)} velocity`;
      }
      
      console.log('⚡ Enhanced Speed Bonus:', { speed, tier, height });
      this.addComboEvent('speed-bonus', {
        speed,
        height: height,
        heightGain: this.heightGainInCombo
      }, tier, description);
    }
    
    // Track peak speed in combo
    if (speed > this.peakSpeedInCombo) {
      this.peakSpeedInCombo = speed;
    }
  }

  private onMovementStateUpdated(state: any): void {
    // Track when player is above platforms (potential multi-platform jump)
    if (!state.isGrounded && this.lastGroundedTime > 0) {
      const airTime = Date.now() - this.lastGroundedTime;
      if (airTime > 200) { // Minimum time to consider a platform "skipped"
        // This is a simple heuristic - could be improved with actual platform detection
        const estimatedPlatformsSkipped = Math.floor(airTime / 500);
        this.platformsSkipped = Math.max(this.platformsSkipped, estimatedPlatformsSkipped);
      }
    }
  }

  private addComboEvent(type: ComboEvent['type'], data: any, tier: ComboEvent['tier'] = 'basic', description: string = ''): void {
    const now = Date.now();
    
    // Check if we're starting a new combo or continuing one
    if (this.currentCombo.length === 0 || now - this.lastEventTime > this.COMBO_TIMEOUT) {
      this.startNewCombo();
    }
    
    // Calculate points for this event based on tier
    const tierPoints = this.POINT_VALUES[type]?.[tier] || 0;
    const points = Math.round(tierPoints * this.comboMultiplier);
    
    const comboEvent: ComboEvent = {
      type,
      timestamp: now,
      data,
      points,
      tier,
      description: description || this.getDefaultDescription(type, tier)
    };
    
    this.currentCombo.push(comboEvent);
    this.lastEventTime = now;
    this.buildingComboScore += points;
    
    // Increase multiplier based on tier
    const tierMultiplier = tier === 'legendary' ? 0.5 : 
                          tier === 'expert' ? 0.4 : 
                          tier === 'advanced' ? 0.35 : 0.3;
    
    this.comboMultiplier = Math.min(
      this.comboMultiplier + tierMultiplier,
      this.MAX_COMBO_MULTIPLIER
    );
    
    console.log('🔥 ENHANCED COMBO EVENT ADDED:', {
      type,
      tier,
      points,
      description,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier.toFixed(2),
      totalComboPoints: this.getCurrentComboPoints(),
      buildingScore: this.buildingComboScore
    });
    
    // Emit enhanced combo event
    EventBus.emit('combo-event-added', {
      event: comboEvent,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier,
      totalComboPoints: this.getCurrentComboPoints(),
      buildingScore: this.buildingComboScore,
      tier: tier
    });
    
    // Check for style bonus (variety in combo types)
    this.checkStyleBonus();
  }

  private startNewCombo(): void {
    // Finalize previous combo if it exists
    if (this.currentCombo.length > 0) {
      this.finalizeCombo();
    }
    
    // Start new combo
    this.currentCombo = [];
    this.comboStartTime = Date.now();
    this.comboMultiplier = 1.0;
  }

  private checkComboTimeout(): void {
    if (this.currentCombo.length > 0) {
      const now = Date.now();
      if (now - this.lastEventTime > this.COMBO_TIMEOUT) {
        this.finalizeCombo();
      }
    }
  }

  private finalizeCombo(): void {
    if (this.currentCombo.length === 0) return;
    
    const totalPoints = this.getCurrentComboPoints();
    const bankBonus = this.calculateBankBonus();
    const tier = this.determineComboTier();
    
    const comboChain: ComboChain = {
      events: [...this.currentCombo],
      startTime: this.comboStartTime,
      endTime: Date.now(),
      totalPoints: totalPoints,
      multiplier: this.comboMultiplier,
      chain: this.currentCombo.length,
      tier: tier,
      bankBonus: bankBonus
    };
    
    console.log('✅ ENHANCED COMBO COMPLETED:', {
      chain: comboChain.chain,
      totalPoints: totalPoints,
      bankBonus: bankBonus,
      tier: tier,
      duration: comboChain.endTime - comboChain.startTime,
      finalMultiplier: comboChain.multiplier.toFixed(2)
    });
    
    // Add to banked score
    this.bankedScore += totalPoints + bankBonus;
    
    // Emit enhanced combo completed event
    EventBus.emit('combo-completed', comboChain);
    
    // Reset current combo
    this.resetComboState();
  }

  private updateAirTimeTracking(): void {
    // This method can be used for more precise air time tracking if needed
    // For now, we rely on the landed/takeoff events
  }

  private getCurrentComboPoints(): number {
    return this.currentCombo.reduce((total, event) => total + event.points, 0);
  }

  // Public getters for UI and scoring
  getCurrentCombo(): ComboEvent[] {
    return [...this.currentCombo];
  }

  getCurrentComboLength(): number {
    return this.currentCombo.length;
  }

  getCurrentMultiplier(): number {
    return this.comboMultiplier;
  }

  isComboActive(): boolean {
    return this.currentCombo.length > 0;
  }

  getTimeSinceLastEvent(): number {
    return this.lastEventTime > 0 ? Date.now() - this.lastEventTime : 0;
  }

  getComboTimeRemaining(): number {
    if (!this.isComboActive()) return 0;
    return Math.max(0, this.COMBO_TIMEOUT - this.getTimeSinceLastEvent());
  }

  // Enhanced combo breaking with loss tracking
  breakCombo(reason?: string): void {
    if (this.currentCombo.length > 0) {
      const pointsLost = this.getCurrentComboPoints();
      
      console.log('💥 ENHANCED COMBO BROKEN:', {
        reason: reason || 'manual',
        finalCombo: this.currentCombo.length,
        pointsLost: pointsLost,
        finalMultiplier: this.comboMultiplier.toFixed(2),
        buildingScore: this.buildingComboScore
      });
      
      const comboLoss: ComboLoss = {
        reason: (reason as ComboLoss['reason']) || 'timeout',
        comboLost: this.currentCombo.length,
        pointsLost: pointsLost,
        timestamp: Date.now()
      };
      
      EventBus.emit('combo-broken', {
        reason: reason || 'manual',
        finalCombo: this.getCurrentCombo(),
        pointsLost: pointsLost,
        finalMultiplier: this.comboMultiplier,
        comboLoss: comboLoss
      });
      
      this.resetComboState();
    }
  }
  
  // Add combo loss with specific reasons
  private addComboLoss(reason: ComboLoss['reason'], description: string): void {
    if (this.currentCombo.length === 0) return;
    
    const pointsLost = this.getCurrentComboPoints();
    
    const comboLoss: ComboLoss = {
      reason: reason,
      comboLost: this.currentCombo.length,
      pointsLost: pointsLost,
      timestamp: Date.now()
    };
    
    console.log('💥 COMBO LOSS:', {
      reason: reason,
      description: description,
      comboLost: this.currentCombo.length,
      pointsLost: pointsLost
    });
    
    EventBus.emit('combo-lost', {
      reason: reason,
      description: description,
      comboLoss: comboLoss,
      finalCombo: this.getCurrentCombo()
    });
    
    this.resetComboState();
  }

  getStats(): any {
    // Calculate stats from combo history
    let longestCombo = 0;
    let totalCombos = 0;
    let perfectWallBounces = 0;
    let totalWallBounces = 0;

    // Get current combo length if active
    if (this.isComboActive()) {
      longestCombo = Math.max(longestCombo, this.getCurrentComboLength());
    }

    // Count wall bounces in current combo
    this.currentCombo.forEach(event => {
      if (event.type === 'wall-bounce') {
        totalWallBounces++;
        if (event.data && event.data.efficiency > 1.0) {
          perfectWallBounces++;
        }
      }
    });

    // Note: In a full implementation, you'd track these stats over the entire game session
    // For now, we're providing current combo stats as a starting point
    return {
      longestCombo: Math.max(longestCombo, this.getCurrentComboLength()),
      totalCombos: this.isComboActive() ? 1 : 0, // Simplified - would need session tracking
      perfectWallBounces,
      totalWallBounces
    };
  }

  reset(): void {
    this.resetComboState();
    this.bankedScore = 0;
    this.autoBank = false;
    
    // Reset powerup modifiers
    this.comboMultiplierBonus = 1.0;
    this.goldenTouchEnabled = false;
  }
  
  private resetComboState(): void {
    this.currentCombo = [];
    this.comboStartTime = 0;
    this.lastEventTime = 0;
    this.comboMultiplier = 1.0;
    this.buildingComboScore = 0;
    this.airTimeStart = 0;
    this.lastGroundedTime = 0;
    this.lastPlatformLanding = 0;
    this.platformsSkipped = 0;
    this.consecutivePlatformsSkipped = 0;
    this.consecutiveWallBounces = 0;
    this.lastWallSide = null;
    this.consecutiveBadLandings = 0;
    this.heightGainInCombo = 0;
    this.peakSpeedInCombo = 0;
    this.lastHeightRecord = 0;
  }
  
  // Powerup modifier methods
  setComboMultiplierBonus(bonus: number): void {
    this.comboMultiplierBonus = bonus;
    console.log(`⛓️ Combo multiplier bonus set to: ${bonus}x`);
  }
  
  setGoldenTouchEnabled(enabled: boolean): void {
    this.goldenTouchEnabled = enabled;
    console.log(`💰 Golden touch ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  getComboMultiplierBonus(): number {
    return this.comboMultiplierBonus;
  }
  
  isGoldenTouchEnabled(): boolean {
    return this.goldenTouchEnabled;
  }

  // New helper methods for enhanced functionality
  private assessLandingQuality(data: any): 'excellent' | 'good' | 'poor' | 'bad' {
    const speed = Math.abs(data?.horizontalSpeed || 0);
    const verticalSpeed = Math.abs(data?.verticalSpeed || 0);
    
    if (speed > 600 && verticalSpeed < 200) return 'excellent';
    if (speed > 400 && verticalSpeed < 400) return 'good';
    if (speed > 200 && verticalSpeed < 600) return 'poor';
    return 'bad';
  }
  
  private getDefaultDescription(type: ComboEvent['type'], tier: ComboEvent['tier']): string {
    const tierPrefix = tier === 'legendary' ? 'LEGENDARY ' : 
                      tier === 'expert' ? 'EXPERT ' : 
                      tier === 'advanced' ? 'Great ' : '';
    
    const typeMap = {
      'wall-bounce': 'Wall Bounce',
      'perfect-wall-bounce': 'Perfect Wall Bounce',
      'multi-platform-jump': 'Multi-Platform Jump',
      'air-time': 'Air Time',
      'speed-bonus': 'Speed Bonus',
      'mega-jump': 'Mega Jump',
      'style-bonus': 'Style Bonus',
      'risky-gap': 'Risky Gap',
      'height-chain': 'Height Chain',
      'wall-chain': 'Wall Chain'
    };
    
    return tierPrefix + typeMap[type];
  }
  
  private checkStyleBonus(): void {
    if (this.currentCombo.length < 4) return;
    
    const types = new Set(this.currentCombo.map(event => event.type));
    if (types.size >= 4) {
      this.addComboEvent('style-bonus', {
        varietyCount: types.size,
        comboLength: this.currentCombo.length
      }, 'advanced', `Style Bonus! ${types.size} different combo types!`);
    }
  }
  
  private determineComboTier(): ComboChain['tier'] {
    const length = this.currentCombo.length;
    const hasLegendary = this.currentCombo.some(e => e.tier === 'legendary');
    const hasExpert = this.currentCombo.some(e => e.tier === 'expert');
    const hasAdvanced = this.currentCombo.some(e => e.tier === 'advanced');
    
    if (length >= 15 || hasLegendary) return 'legendary';
    if (length >= 10 || hasExpert) return 'expert';
    if (length >= 5 || hasAdvanced) return 'advanced';
    return 'basic';
  }
  
  private calculateBankBonus(): number {
    const basePoints = this.getCurrentComboPoints();
    const tier = this.determineComboTier();
    const length = this.currentCombo.length;
    
    let bonusMultiplier = 0.1; // 10% base bonus
    if (tier === 'legendary') bonusMultiplier = 0.5; // 50% bonus
    else if (tier === 'expert') bonusMultiplier = 0.3; // 30% bonus
    else if (tier === 'advanced') bonusMultiplier = 0.2; // 20% bonus
    
    // Length bonus
    const lengthBonus = Math.min(length * 0.05, 0.5); // Up to 50% for very long combos
    
    return Math.round(basePoints * (bonusMultiplier + lengthBonus));
  }
  
  private updateSpeedTracking(): void {
    // This would be called from movement controller with current speed
    // For now, we'll track it during events
  }
  
  private updateHeightTracking(): void {
    // Track height gain during combo
    // Implementation depends on camera/height tracking integration
  }
  
  private checkAutoBank(): void {
    if (this.autoBank && this.currentCombo.length >= this.autoBankThreshold) {
      this.bankCombo();
    }
  }
  
  // Banking system methods
  bankCombo(): void {
    if (this.currentCombo.length === 0) return;
    
    this.finalizeCombo();
    
    EventBus.emit('combo-banked', {
      bankedAmount: this.bankedScore,
      comboLength: this.currentCombo.length
    });
  }
  
  toggleAutoBank(): void {
    this.autoBank = !this.autoBank;
    EventBus.emit('auto-bank-toggled', { enabled: this.autoBank });
  }
  
  // Enhanced getters
  getBuildingComboScore(): number {
    return this.buildingComboScore;
  }
  
  getBankedScore(): number {
    return this.bankedScore;
  }
  
  getTotalPotentialScore(): number {
    return this.bankedScore + this.buildingComboScore;
  }
  
  getComboTier(): ComboChain['tier'] {
    if (this.currentCombo.length === 0) return 'basic';
    return this.determineComboTier();
  }
  
  isAutoBank(): boolean {
    return this.autoBank;
  }

  destroy(): void {
    EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-takeoff', this.onPlayerTakeoff.bind(this));
    EventBus.off('player-height-record', this.onHeightRecord.bind(this));
    EventBus.off('movement-state-updated', this.onMovementStateUpdated.bind(this));
    EventBus.off('combo-bank-requested', this.bankCombo.bind(this));
    EventBus.off('combo-auto-bank-toggle', this.toggleAutoBank.bind(this));
  }
}