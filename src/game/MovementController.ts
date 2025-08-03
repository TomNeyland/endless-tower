import { Physics } from 'phaser';
import { GameConfiguration, PhysicsConfig, WallConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

export interface JumpMetrics {
  verticalSpeed: number;
  flightTime: number;
  maxHeight: number;
  horizontalRange: number;
  momentumBoost: number;
  horizontalSpeed: number;
  horizontalSpeedAfterJump: number;
}

export interface MovementState {
  isGrounded: boolean;
  isMoving: boolean;
  horizontalSpeed: number;
  verticalSpeed: number;
  facingDirection: 1 | -1;
  momentum: number;
  wallBounceCount: number;
}

export class MovementController {
  private body: Physics.Arcade.Body;
  private config: PhysicsConfig;
  private wallConfig: WallConfig;
  private gameConfig: GameConfiguration;
  
  private isGrounded: boolean = false;
  private facingDirection: 1 | -1 = 1;
  private lastGroundedTime: number = 0;
  private jumpBuffer: number = 0;
  
  // Wall bounce tracking (simplified)
  private wallBounceCount: number = 0;
  
  private readonly JUMP_BUFFER_TIME = 100;
  private readonly COYOTE_TIME = 100;
  private readonly WALL_BOUNCE_COOLDOWN = 100;

  constructor(body: Physics.Arcade.Body, gameConfig: GameConfiguration) {
    this.body = body;
    this.gameConfig = gameConfig;
    this.config = gameConfig.physics;
    this.wallConfig = gameConfig.walls;
    
    this.setupPhysicsBody();
  }

  private setupPhysicsBody(): void {
    this.body.setCollideWorldBounds(true);
    this.body.setDragX(this.config.horizontalDrag);
    this.body.setMaxVelocity(this.config.maxHorizontalSpeed, 10000); // Allow very high vertical speeds for momentum jumps
    this.body.setBounce(0, 0); // No bounce on collisions for predictable movement
  }

  update(deltaTime: number): void {
    this.updateGroundedState();
    this.updateJumpBuffer(deltaTime);
    this.emitMovementState();
  }

  moveLeft(): void {
    this.body.setAccelerationX(-this.config.horizontalAcceleration);
    this.facingDirection = -1;
    
    EventBus.emit('player-movement-input', { direction: 'left', facingDirection: this.facingDirection });
  }

  moveRight(): void {
    this.body.setAccelerationX(this.config.horizontalAcceleration);
    this.facingDirection = 1;
    
    EventBus.emit('player-movement-input', { direction: 'right', facingDirection: this.facingDirection });
  }

  stopHorizontalMovement(): void {
    this.body.setAccelerationX(0);
    
    EventBus.emit('player-movement-input', { direction: 'stop', facingDirection: this.facingDirection });
  }

  requestJump(): void {
    // Only set jump buffer if we're not already trying to jump
    if (this.jumpBuffer <= 0) {
      this.jumpBuffer = this.JUMP_BUFFER_TIME;
      this.attemptJump();
    }
  }

  private attemptJump(): boolean {
    const canJump = this.canJump();
    
    if (canJump) {
      this.performCoupledJump();
      this.jumpBuffer = 0;
      return true;
    }
    
    return false;
  }

  private performCoupledJump(): void {
    const horizontalSpeed = this.body.velocity.x;
    const jumpMetrics = this.gameConfig.calculateJumpMetrics(horizontalSpeed);
    
    // Apply momentum exchange: horizontal speed converts to vertical height
    this.body.setVelocityY(-jumpMetrics.verticalSpeed);
    this.body.setVelocityX(jumpMetrics.horizontalSpeedAfterJump);
    this.isGrounded = false;
    
    console.log(`🚀 Momentum exchange jump: H-speed ${horizontalSpeed.toFixed(1)} → ${jumpMetrics.horizontalSpeedAfterJump.toFixed(1)}, V-speed: ${jumpMetrics.verticalSpeed.toFixed(1)}`);
    
    EventBus.emit('player-jumped', {
      ...jumpMetrics,
      position: { x: this.body.x, y: this.body.y },
      timestamp: Date.now()
    });
  }

  private canJump(): boolean {
    const timeSinceGrounded = Date.now() - this.lastGroundedTime;
    const withinCoyoteTime = timeSinceGrounded <= this.COYOTE_TIME;
    
    return this.isGrounded || withinCoyoteTime;
  }

  private updateGroundedState(): void {
    const wasGrounded = this.isGrounded;
    this.isGrounded = this.body.touching.down || this.body.blocked.down;
    
    if (!wasGrounded && this.isGrounded) {
      this.onLanding();
    } else if (wasGrounded && !this.isGrounded) {
      this.onTakeoff();
    }
  }

  private onLanding(): void {
    this.lastGroundedTime = Date.now();
    
    // Reset wall bounce count on landing to allow new combo chains
    this.wallBounceCount = 0;
    
    // If player was trying to jump while airborne, allow it now that we've landed
    if (this.jumpBuffer > 0) {
      this.attemptJump();
      this.jumpBuffer = 0; // Clear buffer after attempting jump to prevent spam
    }
    
    const landingMetrics = {
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      position: { x: this.body.x, y: this.body.y },
      timestamp: Date.now()
    };
    
    EventBus.emit('player-landed', landingMetrics);
  }

  private onTakeoff(): void {
    EventBus.emit('player-takeoff', {
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      position: { x: this.body.x, y: this.body.y },
      timestamp: Date.now()
    });
  }

  private updateJumpBuffer(deltaTime: number): void {
    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= deltaTime;
      
      if (this.jumpBuffer <= 0) {
        this.jumpBuffer = 0;
      }
      // Try jump only when we just became able to jump (e.g., just landed)
      // but don't spam attemptJump() every frame
    }
  }

  private emitMovementState(): void {
    const state: MovementState = {
      isGrounded: this.isGrounded,
      isMoving: Math.abs(this.body.velocity.x) > 10,
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      facingDirection: this.facingDirection,
      momentum: Math.abs(this.body.velocity.x),
      wallBounceCount: this.wallBounceCount
    };
    
    EventBus.emit('movement-state-updated', state);
  }

  getMovementState(): MovementState {
    return {
      isGrounded: this.isGrounded,
      isMoving: Math.abs(this.body.velocity.x) > 10,
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      facingDirection: this.facingDirection,
      momentum: Math.abs(this.body.velocity.x),
      wallBounceCount: this.wallBounceCount
    };
  }

  getJumpPreview(): JumpMetrics {
    const horizontalSpeed = this.body.velocity.x;
    const metrics = this.gameConfig.calculateJumpMetrics(horizontalSpeed);
    return {
      ...metrics,
      horizontalSpeed
    };
  }

  setGrounded(grounded: boolean): void {
    this.isGrounded = grounded;
    if (grounded) {
      this.lastGroundedTime = Date.now();
    }
  }

  // Wall bounce methods removed - will be replaced with physics-based system

  resetWallBounceCount(): void {
    this.wallBounceCount = 0;
  }

  getWallBounceCount(): number {
    return this.wallBounceCount;
  }

  incrementWallBounceCount(): void {
    this.wallBounceCount++;
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.gameConfig = newConfig;
    this.config = newConfig.physics;
    this.wallConfig = newConfig.walls;
    this.setupPhysicsBody();
  }

  reset(): void {
    // Reset all movement state to initial values
    this.isGrounded = false;
    this.facingDirection = 1;
    this.lastGroundedTime = 0;
    this.jumpBuffer = 0;
    
    // Reset wall bounce state
    this.wallBounceCount = 0;
    
    // Reset physics body
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
    
    console.log('🔄 MovementController: Reset complete');
  }

  getConfiguration(): PhysicsConfig {
    return { ...this.config };
  }
}