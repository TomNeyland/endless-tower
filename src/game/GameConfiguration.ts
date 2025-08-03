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
  autoScrollSpeed: number;
  scrollAcceleration: number;
  maxScrollSpeed: number;
  deathLineOffset: number;
  cameraFollowSmoothing: number;
  deathLineStartDelay: number;  // Time in ms before death line starts
  deathLineMinHeight: number;   // Minimum height player must reach before death line activates
  verticalDeadzone: number;     // Vertical distance player can move without camera following
  maxDescentSpeed: number;      // Maximum speed camera can move down when player descends
  descentSmoothingFactor: number; // Smoothing factor for descent camera movement
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

export interface GameConfig {
  physics: PhysicsConfig;
  platforms: PlatformConfig;
  combos: ComboConfig;
  camera: CameraConfig;
  walls: WallConfig;
}

export const DEFAULT_CONFIG: GameConfig = {
  physics: {
    baseJumpSpeed: 150,            // Lower base jump for standing still
    momentumCouplingFactor: 6.0,   // 6x horizontal speed becomes extra vertical speed
    jumpScalingExponent: 1.2,      // Slight non-linear scaling for high speeds
    horizontalRetentionFactor: 0.6, // Retain 60% of horizontal velocity on jump
    gravity: 800,
    horizontalAcceleration: 1200,  // Responsive acceleration
    maxHorizontalSpeed: 700,       // Max speed achievable
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
    autoScrollSpeed: 50,
    scrollAcceleration: 0.5,
    maxScrollSpeed: 200,
    deathLineOffset: 200,
    cameraFollowSmoothing: 0.1,
    deathLineStartDelay: 30000, // 30 seconds before death line starts
    deathLineMinHeight: 300,    // Must climb at least 300px before death line activates
    verticalDeadzone: 150,      // Player can move 150px up/down without camera following
    maxDescentSpeed: 100,       // Camera can move down at max 100px/s when player descends
    descentSmoothingFactor: 0.05 // Slower smoothing for descent to prevent jarring movement
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
  
  get walls(): WallConfig {
    return { ...this.config.walls };
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
  
  calculateJumpMetrics(horizontalSpeed: number): {
    verticalSpeed: number;
    flightTime: number;
    maxHeight: number;
    horizontalRange: number;
    momentumBoost: number;
    horizontalSpeedAfterJump: number;
  } {
    const { baseJumpSpeed, momentumCouplingFactor, jumpScalingExponent, horizontalRetentionFactor, gravity } = this.config.physics;
    
    // Non-linear momentum exchange: horizontal speed converts to vertical height
    const speedMagnitude = Math.abs(horizontalSpeed);
    const momentumBoost = momentumCouplingFactor * Math.pow(speedMagnitude, jumpScalingExponent);
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
      walls: { ...base.walls, ...custom.walls }
    };
  }
}