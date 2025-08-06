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

// Removed behavior mode enum - using unified intelligent strategy

export class AIController {
  private scene: Scene;
  private player: Player;
  private platformManager: PlatformManager;
  private wallManager: WallManager;
  private gameConfig: GameConfiguration;
  
  private currentInput: AIInput = { left: false, right: false, jump: false };
  private lastDecisionTime: number = 0;
  private decisionCooldown: number = 50; // Faster decisions for high-speed play
  
  // AI state tracking
  private targetPlatform: { x: number; y: number; width: number; } | null = null;
  private stuckTimer: number = 0;
  private lastPlayerY: number = 0;
  
  // Intelligent AI parameters
  private readonly MIN_SPEED_FOR_JUMP_HOLDING = 300; // Speed threshold to start holding jump (spinning speed)
  private readonly LONG_PLATFORM_THRESHOLD = 150; // Width threshold for "long" platforms good for running
  private readonly TARGET_SPEED = 400; // Target speed for optimal momentum-coupled jumps
  private readonly MAX_PLATFORM_SEARCH_DISTANCE = 300;
  private readonly STUCK_THRESHOLD = 2000; // Consider stuck after 2 seconds
  private readonly WALL_BOUNCE_PROXIMITY = 30; // Precise timing window for perfect wall bounces
  private readonly MIN_VELOCITY_FOR_WALL_BOUNCE = 100; // Minimum velocity needed for wall bounce attempt
  private readonly DEFAULT_PLATFORM_WIDTH = 100; // Fallback width when platform.width is missing
  private readonly DEATH_LINE_OFFSET_ESTIMATE = 400; // Rough estimate of death line position below player

  constructor(scene: Scene, player: Player, platformManager: PlatformManager, wallManager: WallManager, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.platformManager = platformManager;
    this.wallManager = wallManager;
    this.gameConfig = gameConfig;
    
    this.setupEventListeners();
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
    // Wall bounce successful - continue momentum-based strategy
    console.log('🎯 AI executed successful wall bounce');
  }

  update(deltaTime: number): AIInput {
    const now = Date.now();
    
    // Enforce decision cooldown to prevent jittery behavior
    if (now - this.lastDecisionTime < this.decisionCooldown) {
      return this.currentInput;
    }
    
    // Analyze current situation
    const context = this.analyzeGameState();
    
    // Update stuck detection
    this.updateStuckDetection(context, deltaTime);
    
    // Make intelligent decision using unified strategy
    const newInput = this.makeIntelligentDecision(context);
    
    this.currentInput = newInput;
    this.lastDecisionTime = now;
    
    return this.currentInput;
  }

  private analyzeGameState(): AIDecisionContext {
    const movementState = this.player.getMovementState();
    
    // Validate movement state data
    if (!movementState || typeof movementState.horizontalSpeed !== 'number' || typeof movementState.verticalSpeed !== 'number') {
      console.warn('🤖 AI: Invalid movement state, using default values');
      const defaultMovementState = { horizontalSpeed: 0, verticalSpeed: 0, isGrounded: false };
      const movementStateToUse = movementState || defaultMovementState;
      
      return {
        playerX: this.player.x,
        playerY: this.player.y,
        playerVelocityX: movementStateToUse.horizontalSpeed || 0,
        playerVelocityY: movementStateToUse.verticalSpeed || 0,
        isGrounded: movementStateToUse.isGrounded || false,
        nearestPlatforms: [],
        wallLeft: 0,
        wallRight: this.scene.scale.width - 64,
        deathLineY: this.player.y + this.DEATH_LINE_OFFSET_ESTIMATE,
        targetDirection: this.player.x < this.scene.scale.width / 2 ? 1 : -1
      };
    }
    
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    
    // Get nearby platforms
    const nearbyPlatforms = this.findNearbyPlatforms(this.player.x, this.player.y);
    
    // Get actual wall boundaries from wall manager
    const wallLeft = 0; // Left wall is at scene edge
    const wallRight = this.scene.scale.width - 64; // Right wall accounts for tile width (64px)
    
    // Get death line position (approximate)
    const deathLineY = this.player.y + this.DEATH_LINE_OFFSET_ESTIMATE; // Rough estimate, death line is usually below player
    
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
          width: platform.width || this.DEFAULT_PLATFORM_WIDTH, // Default width if not available
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
    
    // If stuck too long, reset target to reassess situation
    if (this.stuckTimer >= this.STUCK_THRESHOLD) {
      this.targetPlatform = null;
      this.stuckTimer = 0;
      console.log('🤖 AI detected stuck situation, reassessing strategy');
    }
  }

  private makeIntelligentDecision(context: AIDecisionContext): AIInput {
    const currentSpeed = Math.abs(context.playerVelocityX);
    
    // Priority 1: Perfect wall bounce timing (highest priority)
    const wallBounceInput = this.checkWallBounceOpportunity(context);
    if (wallBounceInput) {
      return wallBounceInput;
    }
    
    // Priority 2: Platform jumping when we have good speed and targets
    if (currentSpeed >= this.MIN_SPEED_FOR_JUMP_HOLDING) {
      const platformJumpInput = this.checkPlatformJumpOpportunity(context);
      if (platformJumpInput) {
        return platformJumpInput;
      }
    }
    
    // Priority 3: Speed building - land on long platforms when speed is low
    if (currentSpeed < this.TARGET_SPEED && context.isGrounded) {
      const speedBuildingInput = this.buildSpeed(context);
      if (speedBuildingInput) {
        return speedBuildingInput;
      }
    }
    
    // Priority 4: Strategic platform selection for climbing
    return this.selectStrategicPlatform(context);
  }

  private checkWallBounceOpportunity(context: AIDecisionContext): AIInput | null {
    const distanceToLeftWall = context.playerX - context.wallLeft;
    const distanceToRightWall = context.wallRight - context.playerX;
    
    // Check for perfect wall bounce timing window (30px for 110% momentum + boost)
    if (distanceToLeftWall <= this.WALL_BOUNCE_PROXIMITY && context.playerVelocityX < -this.MIN_VELOCITY_FOR_WALL_BOUNCE) {
      console.log('🎯 AI attempting perfect left wall bounce');
      return { left: true, right: false, jump: true };
    }
    
    if (distanceToRightWall <= this.WALL_BOUNCE_PROXIMITY && context.playerVelocityX > this.MIN_VELOCITY_FOR_WALL_BOUNCE) {
      console.log('🎯 AI attempting perfect right wall bounce');
      return { left: false, right: true, jump: true };
    }
    
    return null;
  }

  private checkPlatformJumpOpportunity(context: AIDecisionContext): AIInput | null {
    // Find physics-verified reachable platforms above us
    const reachablePlatforms = context.nearestPlatforms.filter(platform => {
      const horizontalDistance = Math.abs(platform.x - context.playerX);
      const verticalDistance = context.playerY - platform.y; // Positive means platform is above
      
      if (verticalDistance <= 20) return false; // Platform must be meaningfully above us
      
      // Use game's physics to verify jump feasibility
      const jumpMetrics = this.gameConfig.calculateJumpMetrics(context.playerVelocityX);
      
      // Add validation for jump metrics
      if (!jumpMetrics || typeof jumpMetrics.horizontalRange !== 'number' || typeof jumpMetrics.maxHeight !== 'number') {
        console.warn('🤖 AI: Invalid jump metrics returned, skipping platform');
        return false;
      }
      
      return jumpMetrics.horizontalRange >= horizontalDistance && jumpMetrics.maxHeight >= verticalDistance;
    });
    
    if (reachablePlatforms.length > 0 && context.isGrounded) {
      // Sort by strategic value: height gain minus horizontal effort
      reachablePlatforms.sort((a, b) => {
        const scoreA = (context.playerY - a.y) - 0.3 * Math.abs(a.x - context.playerX);
        const scoreB = (context.playerY - b.y) - 0.3 * Math.abs(b.x - context.playerX);
        return scoreB - scoreA; // Higher scores first
      });
      
      const targetPlatform = reachablePlatforms[0];
      const horizontalDistance = targetPlatform.x - context.playerX;
      
      console.log(`🚀 AI jumping to platform at (${targetPlatform.x}, ${targetPlatform.y}) with speed ${Math.abs(context.playerVelocityX).toFixed(1)}`);
      
      // Slight directional adjustment if needed, then jump
      if (Math.abs(horizontalDistance) > 20) {
        return {
          left: horizontalDistance < 0,
          right: horizontalDistance > 0,
          jump: true
        };
      } else {
        return { left: false, right: false, jump: true };
      }
    }
    
    return null;
  }

  private buildSpeed(context: AIDecisionContext): AIInput | null {
    // Look for long platforms to run on for acceleration
    const nearbyLongPlatforms = context.nearestPlatforms.filter(platform => {
      const verticalDistance = context.playerY - platform.y;
      const horizontalDistance = Math.abs(platform.x - context.playerX);
      
      // Platform should be at roughly the same level or slightly below, and be long
      return verticalDistance >= -30 && verticalDistance <= 30 && 
             platform.width >= this.LONG_PLATFORM_THRESHOLD && 
             horizontalDistance <= 200;
    });
    
    if (nearbyLongPlatforms.length > 0) {
      // Find the closest long platform
      nearbyLongPlatforms.sort((a, b) => a.distance - b.distance);
      const targetPlatform = nearbyLongPlatforms[0];
      const horizontalDistance = targetPlatform.x - context.playerX;
      
      console.log(`🏃 AI targeting long platform (width: ${targetPlatform.width}) for speed building`);
      
      // Move toward the long platform, don't jump yet
      return {
        left: horizontalDistance < -20,
        right: horizontalDistance > 20,
        jump: false // Critical: don't jump, need to run on the platform
      };
    }
    
    // No long platforms found, build speed in open direction
    const centerX = this.scene.scale.width / 2;
    const preferRight = context.playerX < centerX;
    
    return {
      left: !preferRight,
      right: preferRight,
      jump: false // Stay grounded to build horizontal speed
    };
  }

  private selectStrategicPlatform(context: AIDecisionContext): AIInput {
    // Final fallback: basic platform climbing when no other strategies apply
    const targetPlatform = this.findBestPlatformToClimb(context);
    
    if (!targetPlatform) {
      // No suitable platform found, continue building momentum
      const centerX = this.scene.scale.width / 2;
      const preferRight = context.playerX < centerX;
      
      return {
        left: !preferRight,
        right: preferRight,
        jump: false
      };
    }
    
    const horizontalDistance = targetPlatform.x - context.playerX;
    const verticalDistance = targetPlatform.y - context.playerY;
    
    // If we're grounded and platform is above us, consider jumping
    if (verticalDistance < -20 && context.isGrounded) {
      const jumpMetrics = this.gameConfig.calculateJumpMetrics(context.playerVelocityX);
      
      // Validate jump metrics before using
      if (jumpMetrics && typeof jumpMetrics.horizontalRange === 'number' && typeof jumpMetrics.maxHeight === 'number') {
        if (jumpMetrics.horizontalRange >= Math.abs(horizontalDistance) && 
            jumpMetrics.maxHeight >= Math.abs(verticalDistance)) {
          return { left: false, right: false, jump: true };
        }
      }
    }
    
    // Move toward target platform
    return {
      left: horizontalDistance < -10,
      right: horizontalDistance > 10,
      jump: false
    };
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
      
      // Validate jump metrics
      if (!jumpMetrics || typeof jumpMetrics.horizontalRange !== 'number' || typeof jumpMetrics.maxHeight !== 'number') {
        console.warn('🤖 AI: Invalid jump metrics in findBestPlatformToClimb, skipping platform');
        return false;
      }
      
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


  reset(): void {
    this.currentInput = { left: false, right: false, jump: false };
    this.targetPlatform = null;
    this.stuckTimer = 0;
    this.lastPlayerY = 0;
    console.log('🤖 AI reset - unified intelligent strategy active');
  }

  // Method for UI display compatibility - replaces removed getCurrentBehavior
  getCurrentStrategy(): string {
    const currentSpeed = Math.abs(this.player.getMovementState()?.horizontalSpeed || 0);
    const movementState = this.player.getMovementState();
    
    if (!movementState) return 'INITIALIZING';
    
    // Determine current strategy based on AI decision logic
    if (currentSpeed >= this.MIN_SPEED_FOR_JUMP_HOLDING) {
      return 'MOMENTUM_JUMPING';
    } else if (currentSpeed < this.TARGET_SPEED && movementState.isGrounded) {
      return 'SPEED_BUILDING';
    } else {
      return 'STRATEGIC_CLIMBING';
    }
  }

  destroy(): void {
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
  }
}