export interface PhysicsConfig {
  baseJumpSpeed: number;
  momentumCouplingFactor: number;
  jumpScalingExponent: number;  // Non-linear scaling exponent for momentum exchange
  horizontalRetentionFactor: number;  // How much horizontal velocity to retain (0.0-1.0)
  gravity: number;
  horizontalAcceleration: number;
  maxHorizontalSpeed: number;
  horizontalDrag: number;
}

export interface PlatformConfig {
  minPlatformGap: number;
  maxPlatformGap: number;
  platformWidth: number;
  platformHeightVariance: number;
  verticalSpacing: {
    min: number;
    max: number;
  };
}

export interface ComboConfig {
  comboWindowTime: number;
  baseScore: number;
  comboMultiplier: number;
  exponentialScaling: number;
}

export interface CameraConfig {
  cameraFollowSmoothing: number; // Smoothing factor for Phaser's built-in camera following
}

export interface DeathLineConfig {
  riseSpeed: number;            // Speed at which death line rises (pixels per second)
  startDelay: number;           // Time in ms before death line starts
  minHeight: number;            // Minimum height player must reach before death line activates
  warningDistance: number;      // Distance from death line to show warnings
  visualOpacity: number;        // Opacity of the death line block (0.0-1.0)
  // Catch-up mechanism parameters
  maxPlayerDistance: number;    // Maximum distance player can get ahead before catch-up triggers
  catchUpThreshold: number;     // Distance at which catch-up begins (should be < maxPlayerDistance)
  maxCatchUpSpeed: number;      // Maximum speed during catch-up (pixels per second)
  catchUpAcceleration: number;  // How quickly catch-up speed increases (pixels per second squared)
}

export interface WallConfig {
  enabled: boolean;
  // Physics-based bounce parameters (to be implemented)
  baseBounceEfficiency: number;  // Base efficiency for momentum redirection (0.0-1.0)
  maxBounceEfficiency: number;   // Maximum efficiency with perfect execution (0.0-1.2)
  minSpeedForBounce: number;     // Minimum speed required for wall bounce
  // Wall generation parameters
  segmentHeight: number;
  tileHeight: number;
  generateDistance: number;
  cleanupDistance: number;
}

export interface PlayerConfig {
  scale: number;                 // Player scale factor (1.0 = normal, 0.7 = 30% smaller)
  baseBodyWidth: number;         // Base body width before scaling
  baseBodyHeight: number;        // Base body height before scaling
  baseOffsetX: number;           // Base offset X before scaling  
  baseOffsetY: number;           // Base offset Y before scaling
}

export interface MobileConfig {
  leftZonePercent: number;        // Percentage of screen width for left movement zone (0.0-1.0)
  rightZonePercent: number;       // Percentage of screen width for right jump zone (0.0-1.0)
  deadZoneRadius: number;         // Radius of dead zone in center of left zone (pixels)
  touchSensitivity: number;       // Touch sensitivity multiplier (1.0 = normal)
  hapticFeedback: boolean;        // Enable haptic feedback for touch events
  extendedCoyoteTime: number;     // Extended coyote time for mobile (ms)
  extendedJumpBuffer: number;     // Extended jump buffer for mobile (ms)
  collisionTolerance: number;     // Extended collision tolerance for touch imprecision (pixels)
}

export interface DebugConfig {
  enabled: boolean;
}

export interface GameConfig {
  physics: PhysicsConfig;
  platforms: PlatformConfig;
  combos: ComboConfig;
  camera: CameraConfig;
  deathLine: DeathLineConfig;
  walls: WallConfig;
  player: PlayerConfig;
  mobile: MobileConfig;
  debug: DebugConfig;
}

export const DEFAULT_CONFIG: GameConfig = {
  physics: {
    baseJumpSpeed: 200,            // Good base jump for standing still  
    momentumCouplingFactor: 2.0,   // Simple 2.0x max conversion at full speed
    jumpScalingExponent: 1.0,      // Linear scaling for now
    horizontalRetentionFactor: 0.6, // Retain 60% of horizontal velocity on jump
    gravity: 800,
    horizontalAcceleration: 600,   // Slower acceleration creates bigger skill gap
    maxHorizontalSpeed: 1350,      // Even higher ceiling unlocked by wall bouncing skill
    horizontalDrag: 300            // Low drag for smooth long-distance acceleration
  },
  
  platforms: {
    minPlatformGap: 120,
    maxPlatformGap: 320,
    platformWidth: 200,
    platformHeightVariance: 80,
    verticalSpacing: {
      min: 100,
      max: 160
    }
  },
  
  combos: {
    comboWindowTime: 2000,
    baseScore: 10,
    comboMultiplier: 1.5,
    exponentialScaling: 1.2
  },
  
  camera: {
    cameraFollowSmoothing: 0.1  // Phaser built-in camera smoothing
  },
  
  deathLine: {
    riseSpeed: 50,              // Death line rises at 50 pixels per second
    startDelay: 30000,          // 30 seconds before death line starts
    minHeight: 300,             // Must climb at least 300px before death line activates
    warningDistance: 300,       // Show warnings when within 300px of death line
    visualOpacity: 0.7,         // 70% opacity for the translucent block
    // Catch-up mechanism configuration
    maxPlayerDistance: 1200,    // Maximum distance player can get ahead (2 screens at 600px each)
    catchUpThreshold: 800,      // Start catching up when player is 800px ahead (1.33 screens)
    maxCatchUpSpeed: 200,       // Maximum catch-up speed (4x normal when fully triggered)
    catchUpAcceleration: 75     // Gradual acceleration to catch-up speed (pixels/s²)
  },
  
  walls: {
    enabled: true,
    // Physics-based bounce parameters (very forgiving by default)
    baseBounceEfficiency: 0.95,  // Base 95% momentum preservation (very forgiving)
    maxBounceEfficiency: 1.3,    // Up to 130% with perfect technique (very rewarding)
    minSpeedForBounce: 20,       // Very low threshold for easy wall bounces
    // Wall generation parameters
    segmentHeight: 640,
    tileHeight: 64,
    generateDistance: 3000,
    cleanupDistance: 1500
  },
  
  player: {
    scale: 0.7,                  // 30% smaller for bigger arena feel  
    baseBodyWidth: 108,          // Tuned for good fit
    baseBodyHeight: 128,         // Tuned for good fit
    baseOffsetX: 10,             // Tuned for 0.7 scale (will scale proportionally)
    baseOffsetY: 14              // Tuned for 0.7 scale (will scale proportionally)
  },
  
  mobile: {
    leftZonePercent: 0.6,        // 60% of screen for movement zone
    rightZonePercent: 0.4,       // 40% of screen for jump zone
    deadZoneRadius: 40,          // 40px dead zone in center of movement area
    touchSensitivity: 1.0,       // Normal touch sensitivity
    hapticFeedback: true,        // Enable haptic feedback by default
    extendedCoyoteTime: 200,     // 200ms coyote time for mobile (vs 100ms desktop)
    extendedJumpBuffer: 150,     // 150ms jump buffer for mobile (vs 100ms desktop)
    collisionTolerance: 5        // 5px extra collision tolerance for touch imprecision
  },
  
  debug: {
    enabled: false               // Debug key bindings disabled by default
  }
};

export class GameConfiguration {
  private config: GameConfig;
  
  constructor(customConfig?: Partial<GameConfig>) {
    this.config = this.mergeConfigs(DEFAULT_CONFIG, customConfig);
  }

  // Physics presets for different gameplay styles
  static getPreset(preset: 'beginner' | 'classic' | 'expert' | 'speedrun'): Partial<GameConfig> {
    const presets: Record<string, Partial<GameConfig>> = {
      beginner: {
        walls: {
          ...DEFAULT_CONFIG.walls,
          baseBounceEfficiency: 0.9,  // Very forgiving
          maxBounceEfficiency: 1.15,  // Modest skill ceiling
          minSpeedForBounce: 30       // Very accessible
        },
        physics: {
          ...DEFAULT_CONFIG.physics,
          momentumCouplingFactor: 0.4, // Higher momentum boost
          jumpScalingExponent: 1.3,    // Less exponential scaling for beginners
          horizontalRetentionFactor: 0.2, // Retain more horizontal velocity
          maxHorizontalSpeed: 600      // Lower top speed
        }
      },
      classic: DEFAULT_CONFIG, // Use default tuned values
      expert: {
        walls: {
          ...DEFAULT_CONFIG.walls,
          baseBounceEfficiency: 0.75, // Requires more skill
          maxBounceEfficiency: 1.3,   // Higher reward for perfect play
          minSpeedForBounce: 60       // Higher skill requirement
        },
        physics: {
          ...DEFAULT_CONFIG.physics,
          momentumCouplingFactor: 0.25, // Less momentum assistance
          jumpScalingExponent: 1.7,    // More exponential scaling for experts
          horizontalRetentionFactor: 0.05, // Consume most horizontal velocity
          maxHorizontalSpeed: 800       // Higher skill ceiling
        }
      },
      speedrun: {
        walls: {
          ...DEFAULT_CONFIG.walls,
          baseBounceEfficiency: 0.8,
          maxBounceEfficiency: 1.4,   // Maximum reward for perfect play
          minSpeedForBounce: 50
        },
        physics: {
          ...DEFAULT_CONFIG.physics,
          momentumCouplingFactor: 0.35,
          jumpScalingExponent: 1.8,  // Maximum exponential scaling for speedrun
          horizontalRetentionFactor: 0.0, // Complete horizontal velocity consumption
          maxHorizontalSpeed: 1000,   // Extreme high speed for speedrunners
          gravity: 900                // Faster falling for quicker gameplay
        }
      }
    };
    
    return presets[preset];
  }

  applyPreset(preset: 'beginner' | 'classic' | 'expert' | 'speedrun'): void {
    const presetConfig = GameConfiguration.getPreset(preset);
    this.config = this.mergeConfigs(this.config, presetConfig);
    console.log(`🎮 Applied ${preset} physics preset`);
  }
  
  get physics(): PhysicsConfig {
    return { ...this.config.physics };
  }
  
  get platforms(): PlatformConfig {
    return { ...this.config.platforms };
  }
  
  get combos(): ComboConfig {
    return { ...this.config.combos };
  }
  
  get camera(): CameraConfig {
    return { ...this.config.camera };
  }

  get deathLine(): DeathLineConfig {
    return { ...this.config.deathLine };
  }
  
  get walls(): WallConfig {
    return { ...this.config.walls };
  }
  
  get player(): PlayerConfig {
    return { ...this.config.player };
  }
  
  get mobile(): MobileConfig {
    return { ...this.config.mobile };
  }
  
  get debug(): DebugConfig {
    return { ...this.config.debug };
  }
  
  updatePhysics(updates: Partial<PhysicsConfig>): void {
    this.config.physics = { ...this.config.physics, ...updates };
  }
  
  updatePlatforms(updates: Partial<PlatformConfig>): void {
    this.config.platforms = { ...this.config.platforms, ...updates };
  }
  
  updateCombos(updates: Partial<ComboConfig>): void {
    this.config.combos = { ...this.config.combos, ...updates };
  }
  
  updateCamera(updates: Partial<CameraConfig>): void {
    this.config.camera = { ...this.config.camera, ...updates };
  }
  
  updateWalls(updates: Partial<WallConfig>): void {
    this.config.walls = { ...this.config.walls, ...updates };
  }
  
  updatePlayer(updates: Partial<PlayerConfig>): void {
    this.config.player = { ...this.config.player, ...updates };
  }
  
  updateMobile(updates: Partial<MobileConfig>): void {
    this.config.mobile = { ...this.config.mobile, ...updates };
  }
  
  updateDebug(updates: Partial<DebugConfig>): void {
    this.config.debug = { ...this.config.debug, ...updates };
  }
  
  calculateJumpMetrics(horizontalSpeed: number): {
    verticalSpeed: number;
    flightTime: number;
    maxHeight: number;
    horizontalRange: number;
    momentumBoost: number;
    horizontalSpeedAfterJump: number;
  } {
    const { baseJumpSpeed, momentumCouplingFactor, jumpScalingExponent, horizontalRetentionFactor, gravity } = this.config.physics;
    
    // Progressive momentum exchange: 0.25x at low speed → 2.0x at max speed
    const speedMagnitude = Math.abs(horizontalSpeed);
    const maxSpeed = this.config.physics.maxHorizontalSpeed;
    const speedPercent = Math.min(speedMagnitude / maxSpeed, 1.0); // 0.0 to 1.0
    
    // Progressive conversion rate: subtle scaling
    const minConversion = 1.0;  // 1.0x at 0% speed (no boost)
    const maxConversion = 1.25; // 1.25x at 100% speed
    const conversionRate = minConversion + (maxConversion - minConversion) * speedPercent;
    
    const momentumBoost = speedMagnitude * conversionRate;
    const verticalSpeed = baseJumpSpeed + momentumBoost;
    
    // Calculate remaining horizontal velocity after jump (momentum exchange)
    const horizontalSpeedAfterJump = horizontalSpeed * horizontalRetentionFactor;
    
    const flightTime = (2 * verticalSpeed) / gravity;
    const maxHeight = (verticalSpeed * verticalSpeed) / (2 * gravity);
    const horizontalRange = Math.abs(horizontalSpeedAfterJump) * flightTime;
    
    return {
      verticalSpeed,
      flightTime,
      maxHeight,
      horizontalRange,
      momentumBoost,
      horizontalSpeedAfterJump
    };
  }
  
  isGapReachable(gapDistance: number, horizontalSpeed: number): boolean {
    const { horizontalRange } = this.calculateJumpMetrics(horizontalSpeed);
    return horizontalRange >= gapDistance;
  }
  
  getRequiredSpeedForGap(gapDistance: number): number {
    const { baseJumpSpeed, momentumCouplingFactor, gravity } = this.config.physics;
    
    if (momentumCouplingFactor === 0) {
      const baseFlightTime = (2 * baseJumpSpeed) / gravity;
      return gapDistance / baseFlightTime;
    }
    
    const a = 2 * momentumCouplingFactor / gravity;
    const b = 2 * baseJumpSpeed / gravity;
    const c = -gapDistance;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return Infinity;
    
    return (-b + Math.sqrt(discriminant)) / (2 * a);
  }
  
  private mergeConfigs(base: GameConfig, custom?: Partial<GameConfig>): GameConfig {
    if (!custom) return { ...base };
    
    return {
      physics: { ...base.physics, ...custom.physics },
      platforms: { ...base.platforms, ...custom.platforms },
      combos: { ...base.combos, ...custom.combos },
      camera: { ...base.camera, ...custom.camera },
      deathLine: { ...base.deathLine, ...custom.deathLine },
      walls: { ...base.walls, ...custom.walls },
      player: { ...base.player, ...custom.player },
      mobile: { ...base.mobile, ...custom.mobile },
      debug: { ...base.debug, ...custom.debug }
    };
  }
}