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
  HIGH_SPEED_INTELLIGENT = 'high_speed_intelligent'
}

export class AIController {
  private scene: Scene;
  private player: Player;
  private platformManager: PlatformManager;
  private wallManager: WallManager;
  private gameConfig: GameConfiguration;
  
  private behaviorMode: AIBehaviorMode = AIBehaviorMode.HIGH_SPEED_INTELLIGENT;
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
    // Track wall bounces for statistics, but continue with intelligent behavior
    console.log(`🤖 AI achieved wall bounce #${this.consecutiveWallBounces}`);
  }

  update(deltaTime: number): AIInput {
    const now = Date.now();
    
    // Reduce decision cooldown for more responsive AI
    if (now - this.lastDecisionTime < 50) { // Faster decisions for high-speed play
      return this.currentInput;
    }
    
    // Analyze current situation
    const context = this.analyzeGameState();
    
    // Update stuck detection
    this.updateStuckDetection(context, deltaTime);
    
    // Use intelligent high-speed decision making
    const newInput = this.makeIntelligentDecision(context);
    
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
    
    // If stuck too long, we're already using the most intelligent behavior available
    // Just reset the timer to keep trying
    if (this.stuckTimer >= this.STUCK_THRESHOLD) {
      this.stuckTimer = 0;
      console.log('🤖 AI detected being stuck, continuing with intelligent behavior');
    }
  }

  private makeIntelligentDecision(context: AIDecisionContext): AIInput {
    // High-speed intelligent AI that synthesizes all strategies
    
    const currentSpeed = Math.abs(context.playerVelocityX);
    const targetSpeed = 450; // Very high target speed for particles (like original speed demon)
    const maxSpeed = 700; // Speed at which we can make incredible jumps
    
    // Check for wall bounce opportunities first (highest priority)
    const wallBounceDecision = this.checkWallBounceOpportunity(context);
    if (wallBounceDecision) {
      return wallBounceDecision;
    }
    
    // Check if we should land and run to build speed
    const landAndRunDecision = this.checkLandAndRunOpportunity(context, currentSpeed);
    if (landAndRunDecision) {
      return landAndRunDecision;
    }
    
    // Check for platform jump opportunities
    const platformJumpDecision = this.checkPlatformJumpOpportunity(context);
    if (platformJumpDecision) {
      return platformJumpDecision;
    }
    
    // Speed building and momentum maintenance with smart jump logic
    return this.buildAndMaintainMomentum(context, currentSpeed, targetSpeed);
  }

  private checkLandAndRunOpportunity(context: AIDecisionContext, currentSpeed: number): AIInput | null {
    // Check if we should land and run on a platform to build speed
    
    // Only consider landing if we're not fast enough yet - be much more aggressive
    const speedThreshold = 400; // Much higher threshold - only land if really slow
    if (currentSpeed >= speedThreshold) {
      return null; // Fast enough, keep momentum behaviors
    }
    
    // Only land if we're grounded or very close to a platform
    if (!context.isGrounded && context.playerVelocityY < -50) {
      return null; // In air and moving up, don't try to land yet
    }
    
    // Find current platform we might be on or landing on
    const currentPlatform = this.findCurrentOrLandingPlatform(context);
    if (!currentPlatform) {
      return null; // No suitable platform to run on
    }
    
    // Check if platform is wide enough to make running worthwhile
    const minPlatformWidth = 80; // Reduced minimum width for more opportunities
    if (currentPlatform.width < minPlatformWidth) {
      return null; // Platform too small, better to keep jumping
    }
    
    // CRITICAL FIX: Move to platform edge first if we're not already there
    const platformLeft = currentPlatform.x - currentPlatform.width / 2;
    const platformRight = currentPlatform.x + currentPlatform.width / 2;
    const distanceFromLeftEdge = context.playerX - platformLeft;
    const distanceFromRightEdge = platformRight - context.playerX;
    const edgeThreshold = 25; // How close to edge we need to be
    
    // If we're too close to center, move to an edge first
    const isNearCenter = distanceFromLeftEdge > edgeThreshold && distanceFromRightEdge > edgeThreshold;
    
    if (isNearCenter) {
      // Move to the edge that gives us more run-up room
      const wallLeft = context.wallLeft;
      const wallRight = context.wallRight;
      
      // Calculate which edge gives better run-up space considering walls
      const spaceFromLeftEdge = platformLeft - wallLeft;
      const spaceFromRightEdge = wallRight - platformRight;
      
      // Choose edge that provides better run-up opportunity
      const targetDirection = spaceFromRightEdge > spaceFromLeftEdge ? 1 : -1;
      
      return {
        left: targetDirection === -1,
        right: targetDirection === 1,
        jump: false // Don't jump, we're positioning for run-up
      };
    }
    
    // We're near an edge, now check if we should run or jump
    const isNearLeftEdge = distanceFromLeftEdge <= edgeThreshold;
    const isNearRightEdge = distanceFromRightEdge <= edgeThreshold;
    
    if ((isNearLeftEdge || isNearRightEdge) && currentSpeed < 150) {
      // We're at an edge but don't have enough speed yet - start running!
      // Run toward the center to build speed
      const runDirection = isNearLeftEdge ? 1 : -1;
      
      return {
        left: runDirection === -1,
        right: runDirection === 1,
        jump: false // Don't jump yet, build speed first
      };
    }
    
    return null; // Let other systems handle if we have speed at edge
  }

  private checkWallBounceOpportunity(context: AIDecisionContext): AIInput | null {
    // Intelligent wall bounce detection with perfect timing
    const distanceToLeftWall = context.playerX - context.wallLeft;
    const distanceToRightWall = context.wallRight - context.playerX;
    const currentSpeed = Math.abs(context.playerVelocityX);
    
    // Only attempt wall bounces if we have significant horizontal speed - be more aggressive
    const minSpeedForBounce = 300; // Higher threshold for wall bounces
    if (currentSpeed < minSpeedForBounce) {
      return null;
    }
    
    // Perfect wall bounce timing window
    const perfectTimingDistance = 30; // Distance where we should start timing
    
    // Check left wall bounce opportunity
    if (context.playerVelocityX < -150 && distanceToLeftWall <= perfectTimingDistance && distanceToLeftWall > 5) {
      return { left: true, right: false, jump: true };
    }
    
    // Check right wall bounce opportunity  
    if (context.playerVelocityX > 150 && distanceToRightWall <= perfectTimingDistance && distanceToRightWall > 5) {
      return { left: false, right: true, jump: true };
    }
    
    return null;
  }

  private checkPlatformJumpOpportunity(context: AIDecisionContext): AIInput | null {
    // Intelligent platform targeting using physics calculations
    const platforms = context.nearestPlatforms.filter(p => p.y < context.playerY - 20); // Only consider platforms above
    
    if (platforms.length === 0) {
      return null;
    }
    
    const currentSpeed = Math.abs(context.playerVelocityX);
    
    // Don't attempt jumps if we don't have enough speed - be much more aggressive
    const minimumJumpSpeed = 300; // Much higher threshold - only jump when fast
    if (currentSpeed < minimumJumpSpeed) {
      return null; // Let speed building logic handle this
    }
    
    // Find the best platform to target based on physics
    const bestPlatform = this.findOptimalPlatformTarget(context, platforms);
    if (!bestPlatform) {
      return null;
    }
    
    const horizontalDistance = bestPlatform.x - context.playerX;
    const verticalDistance = context.playerY - bestPlatform.y;
    
    // Use game's physics to check if jump is achievable
    const jumpMetrics = this.gameConfig.calculateJumpMetrics(context.playerVelocityX);
    
    // More conservative jump attempt - ensure we have margin for error
    const horizontalMargin = 1.2; // Need 20% more range than calculated
    const verticalMargin = 1.1;   // Need 10% more height than calculated
    
    if (jumpMetrics.horizontalRange * horizontalMargin >= Math.abs(horizontalDistance) && 
        jumpMetrics.maxHeight * verticalMargin >= verticalDistance) {
      
      // Aim toward the platform while jumping
      return {
        left: horizontalDistance < -20,
        right: horizontalDistance > 20,
        jump: true
      };
    }
    
    return null;
  }

  private buildAndMaintainMomentum(context: AIDecisionContext, currentSpeed: number, targetSpeed: number): AIInput {
    // Intelligent speed building and momentum maintenance
    
    // Determine if we should hold jump based on speed and situation
    const shouldHoldJump = this.shouldHoldJumpForMomentum(context, currentSpeed);
    
    // If we don't have enough speed, focus on aggressive speed building like original speed demon
    if (currentSpeed < targetSpeed) {
      
      // AGGRESSIVE SPEED BUILDING: Stay grounded to build horizontal speed aggressively
      if (context.isGrounded && currentSpeed < targetSpeed) {
        // Build speed in whatever direction has more room (like original speed demon)
        const centerX = this.scene.scale.width / 2;
        const preferRight = context.playerX < centerX;
        
        return {
          left: !preferRight,
          right: preferRight,
          jump: false // Stay grounded to build horizontal speed - key insight from original
        };
      }
      
      // If in air, maintain current direction but don't hold jump unless really fast
      const continueSameDirection = context.playerVelocityX > 0 ? 1 : -1;
      
      return {
        left: continueSameDirection === -1,
        right: continueSameDirection === 1,
        jump: shouldHoldJump
      };
    }
    
    // We have good speed, continue in current direction to maintain momentum
    const continueSameDirection = context.playerVelocityX > 0 ? 1 : -1;
    
    // Only change direction if we're about to hit a wall without bouncing opportunity
    const distanceToWall = continueSameDirection === 1 ? 
      (context.wallRight - context.playerX) : 
      (context.playerX - context.wallLeft);
    
    // If we're too close to wall and moving too slowly for bounce, reverse direction
    if (distanceToWall < 80 && currentSpeed < 300) { // Increased thresholds
      return {
        left: continueSameDirection === 1,
        right: continueSameDirection === -1, 
        jump: shouldHoldJump
      };
    }
    
    // Continue in same direction to maintain momentum
    return {
      left: continueSameDirection === -1,
      right: continueSameDirection === 1,
      jump: shouldHoldJump
    };
  }

  private shouldHoldJumpForMomentum(context: AIDecisionContext, currentSpeed: number): boolean {
    // Determine if we should hold jump based on speed and situation
    
    // If we're moving fast enough, hold jump to maintain momentum - much higher threshold
    const momentumThreshold = 400; // Only hold jump when really fast
    if (currentSpeed >= momentumThreshold) {
      return true;
    }
    
    // If we're in the air and have some speed, keep jump to maintain air time
    if (!context.isGrounded && currentSpeed > 150) {
      return true;
    }
    
    // If we're very close to a wall and have decent speed, hold jump for potential bounce
    const wallDistance = Math.min(
      context.playerX - context.wallLeft,
      context.wallRight - context.playerX
    );
    if (wallDistance < 80 && currentSpeed > 180) {
      return true;
    }
    
    // Otherwise, don't hold jump so we can land and run to build speed
    return false;
  }

  private findCurrentOrLandingPlatform(context: AIDecisionContext): { x: number; y: number; width: number; distance: number; } | null {
    // Find platform we're currently on or about to land on
    const platformsBelow = context.nearestPlatforms.filter(p => {
      const verticalDistance = p.y - context.playerY;
      const horizontalDistance = Math.abs(p.x - context.playerX);
      
      // Platform should be below us (or level with us) and horizontally close
      return verticalDistance >= -20 && verticalDistance <= 100 && horizontalDistance <= p.width / 2 + 50;
    });
    
    if (platformsBelow.length === 0) {
      return null;
    }
    
    // Return the closest platform below us
    platformsBelow.sort((a, b) => a.distance - b.distance);
    return platformsBelow[0];
  }

  private chooseBestDirectionForRunning(context: AIDecisionContext, platform: { x: number; y: number; width: number; distance: number; }): 1 | -1 {
    // Choose direction to run on platform for maximum speed building
    
    const platformLeft = platform.x - platform.width / 2;
    const platformRight = platform.x + platform.width / 2;
    const playerX = context.playerX;
    
    // If we're near the left edge, go right
    if (playerX - platformLeft < 40) {
      return 1;
    }
    
    // If we're near the right edge, go left  
    if (platformRight - playerX < 40) {
      return -1;
    }
    
    // Otherwise, continue in current direction or choose based on more space
    if (context.playerVelocityX !== 0) {
      return context.playerVelocityX > 0 ? 1 : -1;
    }
    
    // Default: go toward the side with more space
    const spaceLeft = playerX - platformLeft;
    const spaceRight = platformRight - playerX;
    return spaceRight > spaceLeft ? 1 : -1;
  }

  private chooseBestDirection(context: AIDecisionContext): 1 | -1 {
    // Intelligent direction selection based on space availability and platform positions
    
    const distanceToLeftWall = context.playerX - context.wallLeft;
    const distanceToRightWall = context.wallRight - context.playerX;
    
    // Look for platforms in each direction to bias our choice
    const leftPlatforms = context.nearestPlatforms.filter(p => p.x < context.playerX && p.y < context.playerY - 20);
    const rightPlatforms = context.nearestPlatforms.filter(p => p.x > context.playerX && p.y < context.playerY - 20);
    
    // Prefer direction with more platforms above us
    if (rightPlatforms.length > leftPlatforms.length + 1) {
      return 1;
    } else if (leftPlatforms.length > rightPlatforms.length + 1) {
      return -1;
    }
    
    // If platform count is similar, choose direction with more space
    return distanceToRightWall > distanceToLeftWall ? 1 : -1;
  }

  private findOptimalPlatformTarget(context: AIDecisionContext, platforms: Array<{ x: number; y: number; width: number; distance: number; }>): { x: number; y: number; width: number; distance: number; } | null {
    // Find the best platform to target based on physics and strategic value
    
    const reachablePlatforms = platforms.filter(platform => {
      const horizontalDistance = Math.abs(platform.x - context.playerX);
      const verticalDistance = context.playerY - platform.y;
      
      // Use game's physics to check reachability
      const jumpMetrics = this.gameConfig.calculateJumpMetrics(context.playerVelocityX);
      return jumpMetrics.horizontalRange >= horizontalDistance && jumpMetrics.maxHeight >= verticalDistance;
    });
    
    if (reachablePlatforms.length === 0) {
      return null;
    }
    
    // Sort by strategic value: prioritize height gain and reasonable horizontal distance
    reachablePlatforms.sort((a, b) => {
      const aHeight = context.playerY - a.y;
      const bHeight = context.playerY - b.y;
      const aHorizontal = Math.abs(a.x - context.playerX);
      const bHorizontal = Math.abs(b.x - context.playerX);
      
      // Prefer higher platforms, but also consider horizontal efficiency
      const aScore = aHeight - (aHorizontal * 0.3);
      const bScore = bHeight - (bHorizontal * 0.3);
      
      return bScore - aScore;
    });
    
    return reachablePlatforms[0];
  }

  private switchBehaviorMode(): void {
    // No longer needed - we use a single intelligent behavior mode
    console.log(`🤖 AI using unified high-speed intelligent behavior`);
  }

  reset(): void {
    this.currentInput = { left: false, right: false, jump: false };
    this.targetPlatform = null;
    this.stuckTimer = 0;
    this.lastPlayerY = 0;
    this.behaviorTimer = 0;
    this.consecutiveWallBounces = 0;
    this.behaviorMode = AIBehaviorMode.HIGH_SPEED_INTELLIGENT;
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