import { Scene } from 'phaser';
import { Player } from './Player';
import { EventBus } from './EventBus';

export interface ComboEvent {
  type: 'wall-bounce' | 'perfect-wall-bounce' | 'multi-platform-jump' | 'air-time' | 'speed-bonus';
  timestamp: number;
  data: any;
  points: number;
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
  
  // Combo timing
  private readonly COMBO_TIMEOUT = 2500; // Time between events to maintain combo
  private readonly MAX_COMBO_MULTIPLIER = 5.0;
  private readonly MULTIPLIER_INCREMENT = 0.2;
  
  // Event scoring
  private readonly POINT_VALUES = {
    'wall-bounce': 50,
    'perfect-wall-bounce': 150,
    'multi-platform-jump': 75,
    'air-time': 25,
    'speed-bonus': 100
  };
  
  // Air time tracking
  private airTimeStart: number = 0;
  private lastGroundedTime: number = 0;
  private minAirTimeForCombo: number = 1000; // 1 second minimum air time
  
  // Platform tracking for multi-platform jumps
  private lastPlatformLanding: number = 0;
  private platformsSkipped: number = 0;

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    this.setupEventListeners();
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
    const eventType = efficiency > 1.0 ? 'perfect-wall-bounce' : 'wall-bounce';
    
    console.log('🎯 Wall Bounce Event:', {
      type: eventType,
      side: data.side,
      efficiency: efficiency,
      speedGained: data.newSpeed - data.oldSpeed,
      bounceCount: data.bounceCount
    });
    
    this.addComboEvent(eventType, {
      side: data.side,
      efficiency: efficiency,
      speedGained: data.newSpeed - data.oldSpeed,
      bounceCount: data.bounceCount
    });
  }

  private onPlayerLanded(data: any): void {
    const now = Date.now();
    
    console.log('🛬 Player Landed:', { 
      horizontalSpeed: data?.horizontalSpeed,
      airTimeStart: this.airTimeStart,
      platformsSkipped: this.platformsSkipped
    });
    
    // Check for air time combo
    if (this.airTimeStart > 0) {
      const airTime = now - this.airTimeStart;
      if (airTime >= this.minAirTimeForCombo) {
        console.log('⏱️ Air Time Combo:', { airTime, threshold: this.minAirTimeForCombo });
        this.addComboEvent('air-time', {
          airTime,
          landingSpeed: data.horizontalSpeed
        });
      }
    }
    
    // Check for multi-platform jump
    const timeSinceLastLanding = now - this.lastPlatformLanding;
    if (timeSinceLastLanding > 500 && this.platformsSkipped > 0) { // 500ms minimum between landings
      console.log('🏗️ Multi-Platform Jump:', { 
        platformsSkipped: this.platformsSkipped,
        timeSinceLastLanding 
      });
      this.addComboEvent('multi-platform-jump', {
        platformsSkipped: this.platformsSkipped,
        jumpDistance: timeSinceLastLanding
      });
    }
    
    this.lastPlatformLanding = now;
    this.platformsSkipped = 0;
    this.lastGroundedTime = now;
    this.airTimeStart = 0;
  }

  private onPlayerTakeoff(data: any): void {
    console.log('🚀 Player Takeoff');
    this.airTimeStart = Date.now();
  }

  private onHeightRecord(data: any): void {
    // Speed bonus for maintaining high horizontal speed while climbing
    const speed = Math.abs(data.horizontalSpeed || 0);
    if (speed > 400) { // High speed threshold
      console.log('⚡ Speed Bonus:', { speed, threshold: 400, height: data.height });
      this.addComboEvent('speed-bonus', {
        speed,
        height: data.height
      });
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

  private addComboEvent(type: ComboEvent['type'], data: any): void {
    const now = Date.now();
    
    // Check if we're starting a new combo or continuing one
    if (this.currentCombo.length === 0 || now - this.lastEventTime > this.COMBO_TIMEOUT) {
      this.startNewCombo();
    }
    
    // Calculate points for this event
    const basePoints = this.POINT_VALUES[type] || 0;
    const points = Math.round(basePoints * this.comboMultiplier);
    
    const comboEvent: ComboEvent = {
      type,
      timestamp: now,
      data,
      points
    };
    
    this.currentCombo.push(comboEvent);
    this.lastEventTime = now;
    
    // Increase multiplier
    this.comboMultiplier = Math.min(
      this.comboMultiplier + this.MULTIPLIER_INCREMENT,
      this.MAX_COMBO_MULTIPLIER
    );
    
    console.log('🔥 COMBO EVENT ADDED:', {
      type,
      points,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier.toFixed(2),
      totalComboPoints: this.getCurrentComboPoints()
    });
    
    // Emit combo event
    EventBus.emit('combo-event-added', {
      event: comboEvent,
      comboLength: this.currentCombo.length,
      multiplier: this.comboMultiplier,
      totalComboPoints: this.getCurrentComboPoints()
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
      chain: this.currentCombo.length
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

  // Manual combo breaking (for things like falling too far)
  breakCombo(reason?: string): void {
    if (this.currentCombo.length > 0) {
      console.log('💥 COMBO BROKEN:', {
        reason: reason || 'manual',
        finalCombo: this.currentCombo.length,
        finalPoints: this.getCurrentComboPoints(),
        finalMultiplier: this.comboMultiplier.toFixed(2)
      });
      
      EventBus.emit('combo-broken', {
        reason: reason || 'manual',
        finalCombo: this.getCurrentCombo(),
        finalPoints: this.getCurrentComboPoints(),
        finalMultiplier: this.comboMultiplier
      });
      
      this.currentCombo = [];
      this.comboMultiplier = 1.0;
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
    this.currentCombo = [];
    this.comboStartTime = 0;
    this.lastEventTime = 0;
    this.comboMultiplier = 1.0;
    this.airTimeStart = 0;
    this.lastGroundedTime = 0;
    this.lastPlatformLanding = 0;
    this.platformsSkipped = 0;
  }

  destroy(): void {
    EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-takeoff', this.onPlayerTakeoff.bind(this));
    EventBus.off('player-height-record', this.onHeightRecord.bind(this));
    EventBus.off('movement-state-updated', this.onMovementStateUpdated.bind(this));
  }
}