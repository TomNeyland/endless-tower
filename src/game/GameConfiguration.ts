export interface PhysicsConfig {
  baseJumpSpeed: number;
  momentumCouplingFactor: number;
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
  timingWindowMs: number;
  perfectTimingMs: number;
  momentumPreservation: {
    perfect: number;  // 0-1, percentage of momentum preserved
    good: number;
    late: number;
  };
  perfectVerticalBoost: number;  // Vertical velocity boost for perfect timing
  minSpeedForBounce: number;
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
    baseJumpSpeed: 400,
    momentumCouplingFactor: 0.3,
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
    timingWindowMs: 200,
    perfectTimingMs: 50,
    momentumPreservation: {
      perfect: 1.10,  // Perfect timing gives 110% - builds speed with skill!
      good: 0.90,     // Good timing preserves 90% of momentum  
      late: 0.80      // Late timing preserves 80% of momentum
    },
    perfectVerticalBoost: 100,  // Small upward velocity boost for perfect wall bounces
    minSpeedForBounce: 10,  // Very low threshold for debugging
    segmentHeight: 640,
    tileHeight: 64,
    generateDistance: 3000,  // Increased from 1536 to ensure adequate wall coverage
    cleanupDistance: 1500    // Increased from 768 to match generation distance ratio
  }
};

export class GameConfiguration {
  private config: GameConfig;
  
  constructor(customConfig?: Partial<GameConfig>) {
    this.config = this.mergeConfigs(DEFAULT_CONFIG, customConfig);
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
  } {
    const { baseJumpSpeed, momentumCouplingFactor, gravity } = this.config.physics;
    
    const momentumBoost = momentumCouplingFactor * Math.abs(horizontalSpeed);
    const verticalSpeed = baseJumpSpeed + momentumBoost;
    const flightTime = (2 * verticalSpeed) / gravity;
    const maxHeight = (verticalSpeed * verticalSpeed) / (2 * gravity);
    const horizontalRange = Math.abs(horizontalSpeed) * flightTime;
    
    return {
      verticalSpeed,
      flightTime,
      maxHeight,
      horizontalRange,
      momentumBoost
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