import { Scene } from 'phaser';
import { Player } from './Player';
import { PlatformManager } from './PlatformManager';
import { WallManager } from './WallManager';
import { GameConfiguration } from './GameConfiguration';
import { MovementState } from './MovementController';
import { EventBus } from './EventBus';

export interface AIInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface AIDecisionContext {
  playerX: number;
  playerY: number;
  playerVelocityX: number;
  playerVelocityY: number;
  isGrounded: boolean;
  nearestPlatforms: Array<{ x: number; y: number; width: number; distance: number; }>;
  wallLeft: number;
  wallRight: number;
  deathLineY: number;
  targetDirection: 1 | -1;
}

export enum AIBehaviorMode {
  SAFE_CLIMBING = 'safe_climbing',
  COMBO_SEEKER = 'combo_seeker', 
  WALL_BOUNCER = 'wall_bouncer',
  SPEED_DEMON = 'speed_demon',
  SHOWOFF = 'showoff'
}

export class AIController {
  private scene: Scene;
  private player: Player;
  private platformManager: PlatformManager;
  private wallManager: WallManager;
  private gameConfig: GameConfiguration;
  
  private behaviorMode: AIBehaviorMode = AIBehaviorMode.SAFE_CLIMBING;
  private currentInput: AIInput = { left: false, right: false, jump: false };
  private lastDecisionTime: number = 0;
  private decisionCooldown: number = 100; // Minimum time between decisions (ms)
  
  // AI state tracking
  private targetPlatform: { x: number; y: number; width: number; } | null = null;
  private stuckTimer: number = 0;
  private lastPlayerY: number = 0;
  private behaviorTimer: number = 0;
  private consecutiveWallBounces: number = 0;
  
  // Behavior parameters
  private readonly MIN_PLATFORM_GAP = 50;
  private readonly MAX_PLATFORM_SEARCH_DISTANCE = 300;
  private readonly STUCK_THRESHOLD = 2000; // Consider stuck after 2 seconds
  private readonly BEHAVIOR_SWITCH_TIME = 5000; // Switch behavior every 5 seconds
  private readonly WALL_BOUNCE_PROXIMITY = 100; // Distance from wall to attempt bouncing

  constructor(scene: Scene, player: Player, platformManager: PlatformManager, wallManager: WallManager, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.platformManager = platformManager;
    this.wallManager = wallManager;
    this.gameConfig = gameConfig;
    
    this.setupEventListeners();
    this.switchBehaviorMode();
  }

  private setupEventListeners(): void {
    EventBus.on('player-landed', this.onPlayerLanded.bind(this));
    EventBus.on('player-wall-bounce', this.onWallBounce.bind(this));
  }

  private onPlayerLanded(): void {
    // Reset target when landing to reassess situation
    this.targetPlatform = null;
    this.stuckTimer = 0;
  }

  private onWallBounce(): void {
    this.consecutiveWallBounces++;
    // After successful wall bounce, might want to continue or switch strategy
    if (this.consecutiveWallBounces >= 3) {
      this.behaviorMode = AIBehaviorMode.COMBO_SEEKER;
      this.consecutiveWallBounces = 0;
    }
  }

  update(deltaTime: number): AIInput {
    const now = Date.now();
    
    // Update behavior timer and potentially switch modes
    this.behaviorTimer += deltaTime;
    if (this.behaviorTimer >= this.BEHAVIOR_SWITCH_TIME) {
      this.switchBehaviorMode();
      this.behaviorTimer = 0;
    }
    
    // Enforce decision cooldown to prevent jittery behavior
    if (now - this.lastDecisionTime < this.decisionCooldown) {
      return this.currentInput;
    }
    
    // Analyze current situation
    const context = this.analyzeGameState();
    
    // Update stuck detection
    this.updateStuckDetection(context, deltaTime);
    
    // Make decision based on current behavior mode
    const newInput = this.makeDecision(context);
    
    this.currentInput = newInput;
    this.lastDecisionTime = now;
    
    return this.currentInput;
  }

  private analyzeGameState(): AIDecisionContext {
    const movementState = this.player.getMovementState();
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    
    // Get nearby platforms
    const nearbyPlatforms = this.findNearbyPlatforms(this.player.x, this.player.y);
    
    // Get wall boundaries (approximate)
    const wallLeft = 0;
    const wallRight = this.scene.scale.width;
    
    // Get death line position (approximate)
    const deathLineY = this.player.y + 400; // Rough estimate, death line is usually below player
    
    return {
      playerX: this.player.x,
      playerY: this.player.y,
      playerVelocityX: movementState.horizontalSpeed,
      playerVelocityY: movementState.verticalSpeed,
      isGrounded: movementState.isGrounded,
      nearestPlatforms: nearbyPlatforms,
      wallLeft,
      wallRight,
      deathLineY,
      targetDirection: this.player.x < this.scene.scale.width / 2 ? 1 : -1
    };
  }

  private findNearbyPlatforms(playerX: number, playerY: number): Array<{ x: number; y: number; width: number; distance: number; }> {
    const platforms: Array<{ x: number; y: number; width: number; distance: number; }> = [];
    const platformGroups = this.platformManager.getPlatforms();
    
    if (!platformGroups) return platforms;
    
    platformGroups.children.entries.forEach((platform: any) => {
      const distance = Phaser.Math.Distance.Between(playerX, playerY, platform.x, platform.y);
      
      if (distance <= this.MAX_PLATFORM_SEARCH_DISTANCE) {
        platforms.push({
          x: platform.x,
          y: platform.y,
          width: platform.width || 100, // Default width if not available
          distance
        });
      }
    });
    
    // Sort by distance (closest first)
    platforms.sort((a, b) => a.distance - b.distance);
    
    return platforms.slice(0, 10); // Return closest 10 platforms
  }

  private updateStuckDetection(context: AIDecisionContext, deltaTime: number): void {
    // Check if player is making upward progress
    const verticalProgress = this.lastPlayerY - context.playerY; // Negative Y is upward
    
    if (verticalProgress > 5) {
      // Making good progress, reset stuck timer
      this.stuckTimer = 0;
    } else {
      // Not making progress, increment stuck timer
      this.stuckTimer += deltaTime;
    }
    
    this.lastPlayerY = context.playerY;
    
    // If stuck too long, switch to more aggressive behavior
    if (this.stuckTimer >= this.STUCK_THRESHOLD) {
      this.behaviorMode = AIBehaviorMode.WALL_BOUNCER;
      this.stuckTimer = 0;
    }
  }

  private makeDecision(context: AIDecisionContext): AIInput {
    switch (this.behaviorMode) {
      case AIBehaviorMode.SAFE_CLIMBING:
        return this.safeCimbingBehavior(context);
      case AIBehaviorMode.COMBO_SEEKER:
        return this.comboSeekerBehavior(context);
      case AIBehaviorMode.WALL_BOUNCER:
        return this.wallBouncerBehavior(context);
      case AIBehaviorMode.SPEED_DEMON:
        return this.speedDemonBehavior(context);
      case AIBehaviorMode.SHOWOFF:
        return this.showoffBehavior(context);
      default:
        return this.safeCimbingBehavior(context);
    }
  }

  private safeCimbingBehavior(context: AIDecisionContext): AIInput {
    // Conservative strategy: find nearest climbable platform and go for it
    const targetPlatform = this.findBestPlatformToClimb(context);
    
    if (!targetPlatform) {
      // No good platform found, try to build horizontal momentum
      return { left: context.targetDirection === -1, right: context.targetDirection === 1, jump: false };
    }
    
    const horizontalDistance = targetPlatform.x - context.playerX;
    const verticalDistance = targetPlatform.y - context.playerY;
    
    // If platform is above us, consider jumping
    if (verticalDistance < -20 && context.isGrounded) {
      const requiredSpeed = Math.abs(horizontalDistance) / 0.5; // Rough estimate
      
      if (Math.abs(context.playerVelocityX) >= requiredSpeed * 0.8) {
        // We have enough horizontal speed, jump!
        return { left: false, right: false, jump: true };
      }
    }
    
    // Move toward target platform
    return {
      left: horizontalDistance < -10,
      right: horizontalDistance > 10,
      jump: false
    };
  }

  private comboSeekerBehavior(context: AIDecisionContext): AIInput {
    // Look for opportunities to chain multiple platforms or wall bounces
    const platforms = context.nearestPlatforms.filter(p => p.y < context.playerY - 50);
    
    if (platforms.length >= 2) {
      // Multiple platforms available, try to chain them
      const targetPlatform = platforms[0];
      const horizontalDistance = targetPlatform.x - context.playerX;
      
      // Build MORE horizontal speed for spectacular jumps and particle effects
      if (Math.abs(context.playerVelocityX) < 300 && context.isGrounded) {
        return {
          left: horizontalDistance < 0,
          right: horizontalDistance > 0,
          jump: false
        };
      }
      
      // When ready, make the jump
      if (context.isGrounded && Math.abs(horizontalDistance) < 150) {
        return { left: false, right: false, jump: true };
      }
    }
    
    // Fall back to safe climbing if no combo opportunity
    return this.safeCimbingBehavior(context);
  }

  private wallBouncerBehavior(context: AIDecisionContext): AIInput {
    // Actively seek wall bounces for momentum and style points
    const distanceToLeftWall = context.playerX - context.wallLeft;
    const distanceToRightWall = context.wallRight - context.playerX;
    
    // If close to a wall and have horizontal momentum, try to time a wall bounce
    if (distanceToLeftWall < this.WALL_BOUNCE_PROXIMITY && context.playerVelocityX < -50) {
      // Approaching left wall with leftward momentum - perfect for bounce
      return { left: true, right: false, jump: !context.isGrounded };
    }
    
    if (distanceToRightWall < this.WALL_BOUNCE_PROXIMITY && context.playerVelocityX > 50) {
      // Approaching right wall with rightward momentum - perfect for bounce
      return { left: false, right: true, jump: !context.isGrounded };
    }
    
    // Build momentum toward nearest wall
    if (distanceToLeftWall < distanceToRightWall) {
      return { left: true, right: false, jump: context.isGrounded };
    } else {
      return { left: false, right: true, jump: context.isGrounded };
    }
  }

  private speedDemonBehavior(context: AIDecisionContext): AIInput {
    // DEDICATED mode for building maximum horizontal speed to trigger particle effects
    const currentSpeed = Math.abs(context.playerVelocityX);
    const SPEED_TARGET = 450; // Very high target speed for particles
    
    // If we have high speed and are airborne, continue in same direction
    if (!context.isGrounded && currentSpeed > 200) {
      const continueSameDirection = context.playerVelocityX > 0 ? 1 : -1;
      return {
        left: continueSameDirection === -1,
        right: continueSameDirection === 1,
        jump: false // Don't interfere with current trajectory
      };
    }
    
    // If grounded and don't have enough speed, build it aggressively
    if (context.isGrounded && currentSpeed < SPEED_TARGET) {
      // Build speed in whatever direction has more room
      const centerX = this.scene.scale.width / 2;
      const preferRight = context.playerX < centerX;
      
      return {
        left: !preferRight,
        right: preferRight,
        jump: false // Stay grounded to build horizontal speed
      };
    }
    
    // If we have good speed, make strategic jumps to maintain momentum
    if (currentSpeed >= 250) {
      // Look for platforms we can reach to continue momentum
      const platforms = context.nearestPlatforms.filter(p => p.y < context.playerY - 30);
      if (platforms.length > 0 && context.isGrounded) {
        return { left: false, right: false, jump: true };
      }
    }
    
    // Default: continue building speed
    return {
      left: context.targetDirection === -1,
      right: context.targetDirection === 1,
      jump: false
    };
  }

  private showoffBehavior(context: AIDecisionContext): AIInput {
    // Combination of aggressive moves - try to show multiple game mechanics
    const random = Math.random();
    
    if (random < 0.2) {
      return this.wallBouncerBehavior(context);
    } else if (random < 0.4) {
      return this.comboSeekerBehavior(context);
    } else if (random < 0.7) {
      return this.speedDemonBehavior(context); // Include speed demon for particles
    } else {
      // High-speed moves to trigger particle effects
      // Build extreme horizontal speed when grounded
      if (context.isGrounded && Math.abs(context.playerVelocityX) < 400) {
        return {
          left: context.targetDirection === -1,
          right: context.targetDirection === 1,
          jump: false
        };
      }
      
      return {
        left: context.targetDirection === -1,
        right: context.targetDirection === 1,
        jump: Math.random() < 0.6 // Higher jump probability for more aerial action
      };
    }
  }

  private findBestPlatformToClimb(context: AIDecisionContext): { x: number; y: number; width: number; } | null {
    // Find the best platform to aim for based on reachability and height gain
    const reachablePlatforms = context.nearestPlatforms.filter(platform => {
      const horizontalDistance = Math.abs(platform.x - context.playerX);
      const verticalDistance = context.playerY - platform.y; // Positive means platform is above
      
      // Only consider platforms that are above us and not too far
      if (verticalDistance < 20 || horizontalDistance > 200) {
        return false;
      }
      
      // Use game's physics to check if jump is possible
      const jumpMetrics = this.gameConfig.calculateJumpMetrics(context.playerVelocityX);
      const canReachHorizontally = jumpMetrics.horizontalRange >= horizontalDistance;
      const canReachVertically = jumpMetrics.maxHeight >= verticalDistance;
      
      return canReachHorizontally && canReachVertically;
    });
    
    if (reachablePlatforms.length === 0) {
      return null;
    }
    
    // Prefer platforms that are higher up (more progress)
    reachablePlatforms.sort((a, b) => a.y - b.y); // Sort by Y (lower Y = higher up)
    
    return reachablePlatforms[0];
  }

  private switchBehaviorMode(): void {
    const modes = Object.values(AIBehaviorMode);
    const currentIndex = modes.indexOf(this.behaviorMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.behaviorMode = modes[nextIndex];
    console.log(`🤖 AI switching to behavior: ${this.behaviorMode}`);
    
    // Reset behavior-specific state
    this.targetPlatform = null;
    this.consecutiveWallBounces = 0;
  }

  reset(): void {
    this.currentInput = { left: false, right: false, jump: false };
    this.targetPlatform = null;
    this.stuckTimer = 0;
    this.lastPlayerY = 0;
    this.behaviorTimer = 0;
    this.consecutiveWallBounces = 0;
    this.behaviorMode = AIBehaviorMode.SAFE_CLIMBING;
  }

  setBehaviorMode(mode: AIBehaviorMode): void {
    this.behaviorMode = mode;
    this.behaviorTimer = 0;
  }

  getCurrentBehavior(): AIBehaviorMode {
    return this.behaviorMode;
  }

  destroy(): void {
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
  }
}