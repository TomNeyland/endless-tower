import { Scene } from 'phaser';
import { Player } from './Player';
import { EventBus } from './EventBus';

export interface ComboEvent {
  type: 'perfect-wall-bounce' | 'platform-skip-small' | 'platform-skip-medium' | 'platform-skip-large' | 'platform-skip-massive' | 'speed-chain' | 'precision-landing';
  timestamp: number;
  data: any;
  points: number;
  chainValue: number; // How much this event contributes to combo chain
}

export interface ComboChain {
  events: ComboEvent[];
  startTime: number;
  endTime: number;
  totalPoints: number;
  multiplier: number;
  chain: number;
}

export class ComboSystem {
  private scene: Scene;
  private player: Player;
  
  // Current combo state
  private currentCombo: ComboEvent[] = [];
  private comboStartTime: number = 0;
  private lastEventTime: number = 0;
  private comboMultiplier: number = 1.0;
  
  // Combo timing - tighter window for more skill requirement
  private readonly COMBO_TIMEOUT = 4000; // 4 seconds to allow for skill chains
  private readonly MAX_COMBO_MULTIPLIER = 10.0; // Much higher ceiling
  private readonly MULTIPLIER_INCREMENT = 0.3; // Faster buildup
  
  // Combo banking system
  private comboBank: number = 0; // Banked combo score
  private readonly BANK_MULTIPLIER = 2.0; // Bonus for banking
  
  // Powerup modifiers
  private comboMultiplierBonus: number = 1.0;
  private goldenTouchEnabled: boolean = false;
  
  // Event scoring - much higher values and more variety
  private readonly POINT_VALUES = {
    'wall-bounce': 0, // Regular wall bounces no longer count
    'perfect-wall-bounce': 300, // Only perfect bounces count, much higher
    'platform-skip-small': 150, // 2-3 platforms skipped
    'platform-skip-medium': 400, // 4-6 platforms skipped  
    'platform-skip-large': 800, // 7+ platforms skipped
    'platform-skip-massive': 1500, // 10+ platforms skipped
    'speed-chain': 250, // Maintaining high speed while doing combos
    'precision-landing': 200 // Landing on platform edges
  };
  
  // Combo chain contribution - different events add different amounts
  private readonly CHAIN_VALUES = {
    'perfect-wall-bounce': 2, // Worth 2 chain points
    'platform-skip-small': 1,
    'platform-skip-medium': 3,
    'platform-skip-large': 5,
    'platform-skip-massive': 8,
    'speed-chain': 1,
    'precision-landing': 1
  };
  
  // Air time tracking
  private airTimeStart: number = 0;
  private lastGroundedTime: number = 0;
  private minAirTimeForCombo: number = 1000; // 1 second minimum air time
  
  // Platform tracking for multi-platform jumps
  private lastPlatformLanding: number = 0;
  private platformsSkipped: number = 0;
  private consecutivePlatformLandings: number = 0; // Track for combo breaking
  private readonly MAX_CONSECUTIVE_LANDINGS = 3; // Break combo after this many
  
  // Combo breaking tracking
  private readonly MIN_WALL_BOUNCE_EFFICIENCY = 0.85; // Below this breaks combo
  private readonly MAX_FALL_DISTANCE = 200; // Fall more than this breaks combo
  private lastPlayerY: number = 0;
  
  // Speed tracking for speed chains
  private highSpeedStartTime: number = 0;
  private readonly HIGH_SPEED_THRESHOLD = 350;
  private readonly MIN_SPEED_CHAIN_TIME = 2000; // 2 seconds of high speed

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
  }

  update(deltaTime: number): void {
    this.checkComboTimeout();
    this.updateAirTimeTracking();
  }

  private onWallBounce(data: any): void {
    const efficiency = data.efficiency || 0.8;
    
    console.log('🎯 Wall Bounce Event:', {
      efficiency: efficiency,
      side: data.side,
      speedGained: data.newSpeed - data.oldSpeed,
      bounceCount: data.bounceCount
    });
    
    // Only perfect wall bounces count for combos now
    if (efficiency > 1.0) {
      this.addComboEvent('perfect-wall-bounce', {
        side: data.side,
        efficiency: efficiency,
        speedGained: data.newSpeed - data.oldSpeed,
        bounceCount: data.bounceCount
      });
    } else if (efficiency < this.MIN_WALL_BOUNCE_EFFICIENCY && this.isComboActive()) {
      // Poor wall bounces break combos
      this.breakCombo('poor-wall-bounce');
    }
  }

  private onPlayerLanded(data: any): void {
    const now = Date.now();
    
    console.log('🛬 Player Landed:', { 
      horizontalSpeed: data?.horizontalSpeed,
      platformsSkipped: this.platformsSkipped,
      consecutiveLandings: this.consecutivePlatformLandings
    });
    
    // Check for platform skipping combos
    const timeSinceLastLanding = now - this.lastPlatformLanding;
    if (timeSinceLastLanding > 300 && this.platformsSkipped > 1) { // Need at least 2 platforms skipped
      let eventType: ComboEvent['type'];
      
      if (this.platformsSkipped >= 10) {
        eventType = 'platform-skip-massive';
      } else if (this.platformsSkipped >= 7) {
        eventType = 'platform-skip-large';
      } else if (this.platformsSkipped >= 4) {
        eventType = 'platform-skip-medium';
      } else {
        eventType = 'platform-skip-small';
      }
      
      console.log('🏗️ Platform Skip Combo:', { 
        type: eventType,
        platformsSkipped: this.platformsSkipped,
        timeSinceLastLanding 
      });
      
      this.addComboEvent(eventType, {
        platformsSkipped: this.platformsSkipped,
        jumpDistance: timeSinceLastLanding
      });
      
      this.consecutivePlatformLandings = 0; // Reset consecutive landings on successful skip
    } else {
      // Landing without skipping platforms
      this.consecutivePlatformLandings++;
      
      // Break combo if too many consecutive platform landings
      if (this.consecutivePlatformLandings >= this.MAX_CONSECUTIVE_LANDINGS && this.isComboActive()) {
        this.breakCombo('too-many-landings');
      }
    }
    
    // Check for precision landing (landing near platform edges)
    if (data.landingPosition && this.isPrecisionLanding(data.landingPosition)) {
      this.addComboEvent('precision-landing', {
        landingPosition: data.landingPosition,
        precision: this.calculateLandingPrecision(data.landingPosition)
      });
    }
    
    this.lastPlatformLanding = now;
    this.platformsSkipped = 0;
    this.lastGroundedTime = now;
    
    // Update player position for fall tracking
    if (data.y !== undefined) {
      this.lastPlayerY = data.y;
    }
  }

  private onPlayerTakeoff(data: any): void {
    console.log('🚀 Player Takeoff');
    this.airTimeStart = Date.now();
    
    // Update player position for fall tracking
    if (data.y !== undefined) {
      this.lastPlayerY = data.y;
    }
  }

  private onHeightRecord(data: any): void {
    // Check for fall distance to break combos
    if (this.lastPlayerY > 0 && data.height !== undefined) {
      const fallDistance = this.lastPlayerY - data.height;
      if (fallDistance > this.MAX_FALL_DISTANCE && this.isComboActive()) {
        this.breakCombo('fell-too-far');
      }
    }
    
    // Speed chain tracking for maintaining high speed while climbing
    const speed = Math.abs(data.horizontalSpeed || 0);
    if (speed > this.HIGH_SPEED_THRESHOLD) {
      if (this.highSpeedStartTime === 0) {
        this.highSpeedStartTime = Date.now();
      } else {
        const speedTime = Date.now() - this.highSpeedStartTime;
        if (speedTime >= this.MIN_SPEED_CHAIN_TIME) {
          console.log('⚡ Speed Chain:', { speed, duration: speedTime, height: data.height });
          this.addComboEvent('speed-chain', {
            speed,
            duration: speedTime,
            height: data.height
          });
          this.highSpeedStartTime = Date.now(); // Reset for next chain
        }
      }
    } else {
      this.highSpeedStartTime = 0; // Reset if speed drops
    }
    
    // Update player position
    if (data.height !== undefined) {
      this.lastPlayerY = data.height;
    }
  }

  private onMovementStateUpdated(state: any): void {
    // Enhanced platform skipping detection
    if (!state.isGrounded && this.lastGroundedTime > 0) {
      const airTime = Date.now() - this.lastGroundedTime;
      if (airTime > 200) { // Minimum time to consider a platform "skipped"
        // More accurate platform skip estimation based on height and time
        const estimatedPlatformsSkipped = Math.floor(airTime / 300); // Faster estimation
        this.platformsSkipped = Math.max(this.platformsSkipped, estimatedPlatformsSkipped);
      }
    }
    
    // Reset speed chain if grounded and not moving fast
    if (state.isGrounded && Math.abs(state.horizontalSpeed || 0) < this.HIGH_SPEED_THRESHOLD) {
      this.highSpeedStartTime = 0;
    }
  }

  private isPrecisionLanding(landingPosition: any): boolean {
    // This would need platform data to determine if landing is near edges
    // For now, implement a simple heuristic
    return false; // TODO: Implement with actual platform edge detection
  }

  private calculateLandingPrecision(landingPosition: any): number {
    // Calculate how close to platform edge the landing was
    return 0.5; // TODO: Implement actual precision calculation
  }

  private addComboEvent(type: ComboEvent['type'], data: any): void {
    const now = Date.now();
    
    // Check if we're starting a new combo or continuing one
    if (this.currentCombo.length === 0 || now - this.lastEventTime > this.COMBO_TIMEOUT) {
      this.startNewCombo();
    }
    
    // Calculate points for this event with exponential scaling
    const basePoints = this.POINT_VALUES[type] || 0;
    const chainValue = this.CHAIN_VALUES[type] || 1;
    
    // Exponential combo bonus: points scale with combo length
    const comboBonus = Math.pow(1.5, this.currentCombo.length * 0.5);
    const points = Math.round(basePoints * this.comboMultiplier * comboBonus);
    
    const comboEvent: ComboEvent = {
      type,
      timestamp: now,
      data,
      points,
      chainValue
    };
    
    this.currentCombo.push(comboEvent);
    this.lastEventTime = now;
    
    // Increase multiplier based on chain value
    this.comboMultiplier = Math.min(
      this.comboMultiplier + (this.MULTIPLIER_INCREMENT * chainValue),
      this.MAX_COMBO_MULTIPLIER
    );
    
    console.log('🔥 COMBO EVENT ADDED:', {
      type,
      points,
      chainValue,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier.toFixed(2),
      totalComboPoints: this.getCurrentComboPoints(),
      comboBonus: comboBonus.toFixed(2)
    });
    
    // Emit combo event with enhanced data
    EventBus.emit('combo-event-added', {
      event: comboEvent,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier,
      totalComboPoints: this.getCurrentComboPoints(),
      chainContribution: chainValue,
      canBank: this.canBankCombo()
    });
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
    this.consecutivePlatformLandings = 0; // Reset combo breaker tracking
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
    
    const comboChain: ComboChain = {
      events: [...this.currentCombo],
      startTime: this.comboStartTime,
      endTime: Date.now(),
      totalPoints: this.getCurrentComboPoints(),
      multiplier: this.comboMultiplier,
      chain: this.getCurrentComboChainValue()
    };
    
    console.log('✅ COMBO COMPLETED:', {
      chain: comboChain.chain,
      totalPoints: comboChain.totalPoints,
      duration: comboChain.endTime - comboChain.startTime,
      finalMultiplier: comboChain.multiplier.toFixed(2)
    });
    
    // Emit combo completed event
    EventBus.emit('combo-completed', comboChain);
    
    // Reset current combo
    this.currentCombo = [];
    this.comboMultiplier = 1.0;
    this.consecutivePlatformLandings = 0;
  }

  // Combo banking system
  public bankCombo(): number {
    if (!this.canBankCombo()) return 0;
    
    const bankingPoints = Math.round(this.getCurrentComboPoints() * this.BANK_MULTIPLIER);
    this.comboBank += bankingPoints;
    
    console.log('🏦 COMBO BANKED:', {
      points: bankingPoints,
      totalBank: this.comboBank,
      comboLength: this.currentCombo.length
    });
    
    // Emit banking event
    EventBus.emit('combo-banked', {
      bankedPoints: bankingPoints,
      totalBank: this.comboBank,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier
    });
    
    // Clear current combo but don't reset multiplier completely
    this.currentCombo = [];
    this.comboMultiplier = Math.max(1.0, this.comboMultiplier * 0.5); // Keep half the multiplier
    this.consecutivePlatformLandings = 0;
    
    return bankingPoints;
  }

  public canBankCombo(): boolean {
    return this.currentCombo.length >= 3; // Need at least 3 events to bank
  }

  public getBankedScore(): number {
    return this.comboBank;
  }

  private updateAirTimeTracking(): void {
    // This method can be used for more precise air time tracking if needed
    // For now, we rely on the landed/takeoff events
  }

  private getCurrentComboPoints(): number {
    return this.currentCombo.reduce((total, event) => total + event.points, 0);
  }

  private getCurrentComboChainValue(): number {
    return this.currentCombo.reduce((total, event) => total + event.chainValue, 0);
  }

  // Public getters for UI and scoring
  getCurrentCombo(): ComboEvent[] {
    return [...this.currentCombo];
  }

  getCurrentComboLength(): number {
    return this.currentCombo.length;
  }

  getCurrentComboChain(): number {
    return this.getCurrentComboChainValue();
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

  getTotalComboScore(): number {
    return this.getCurrentComboPoints() + this.comboBank;
  }

  // Manual combo breaking (for things like falling too far)
  breakCombo(reason?: string): void {
    if (this.currentCombo.length > 0) {
      console.log('💥 COMBO BROKEN:', {
        reason: reason || 'manual',
        finalCombo: this.currentCombo.length,
        finalChain: this.getCurrentComboChainValue(),
        finalPoints: this.getCurrentComboPoints(),
        finalMultiplier: this.comboMultiplier.toFixed(2)
      });
      
      EventBus.emit('combo-broken', {
        reason: reason || 'manual',
        finalCombo: this.getCurrentCombo(),
        finalChain: this.getCurrentComboChainValue(),
        finalPoints: this.getCurrentComboPoints(),
        finalMultiplier: this.comboMultiplier
      });
      
      this.currentCombo = [];
      this.comboMultiplier = 1.0;
      this.consecutivePlatformLandings = 0;
    }
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
      if (event.type === 'perfect-wall-bounce') {
        totalWallBounces++;
        perfectWallBounces++;
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
    this.currentCombo = [];
    this.comboStartTime = 0;
    this.lastEventTime = 0;
    this.comboMultiplier = 1.0;
    this.comboBank = 0;
    this.airTimeStart = 0;
    this.lastGroundedTime = 0;
    this.lastPlatformLanding = 0;
    this.platformsSkipped = 0;
    this.consecutivePlatformLandings = 0;
    this.lastPlayerY = 0;
    this.highSpeedStartTime = 0;
    
    // Reset powerup modifiers
    this.comboMultiplierBonus = 1.0;
    this.goldenTouchEnabled = false;
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

  destroy(): void {
    EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-takeoff', this.onPlayerTakeoff.bind(this));
    EventBus.off('player-height-record', this.onHeightRecord.bind(this));
    EventBus.off('movement-state-updated', this.onMovementStateUpdated.bind(this));
  }
}