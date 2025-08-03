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
}

export interface MovementState {
  isGrounded: boolean;
  isMoving: boolean;
  horizontalSpeed: number;
  verticalSpeed: number;
  facingDirection: 1 | -1;
  momentum: number;
  wallBounceCount: number;
  isInWallBounceWindow: boolean;
  wallBounceWindowTimeLeft: number;
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
  
  // Wall bounce tracking
  private wallBounceCount: number = 0;
  private isInWallBounceWindow: boolean = false;
  private wallBounceWindowStartTime: number = 0;
  private wallContactSide: 'left' | 'right' | null = null;
  private preWallContactSpeed: number = 0;
  
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
    this.body.setMaxVelocity(this.config.maxHorizontalSpeed, 1000);
    this.body.setBounce(0, 0); // No bounce on collisions for predictable movement
  }

  update(deltaTime: number): void {
    this.updateGroundedState();
    this.updateJumpBuffer(deltaTime);
    this.updateWallBounceWindow();
    this.emitMovementState();
  }

  moveLeft(): void {
    // Check for wall bounce opportunity
    if (this.isInWallBounceWindow && this.wallContactSide === 'right') {
      this.attemptWallBounce('left');
      return;
    }
    
    this.body.setAccelerationX(-this.config.horizontalAcceleration);
    this.facingDirection = -1;
    
    EventBus.emit('player-movement-input', { direction: 'left', facingDirection: this.facingDirection });
  }

  moveRight(): void {
    // Check for wall bounce opportunity
    if (this.isInWallBounceWindow && this.wallContactSide === 'left') {
      this.attemptWallBounce('right');
      return;
    }
    
    this.body.setAccelerationX(this.config.horizontalAcceleration);
    this.facingDirection = 1;
    
    EventBus.emit('player-movement-input', { direction: 'right', facingDirection: this.facingDirection });
  }

  stopHorizontalMovement(): void {
    this.body.setAccelerationX(0);
    
    EventBus.emit('player-movement-input', { direction: 'stop', facingDirection: this.facingDirection });
  }

  requestJump(): void {
    this.jumpBuffer = this.JUMP_BUFFER_TIME;
    this.attemptJump();
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
    
    this.body.setVelocityY(-jumpMetrics.verticalSpeed);
    this.isGrounded = false;
    
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
    
    if (this.jumpBuffer > 0) {
      this.attemptJump();
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
      } else if (this.canJump()) {
        this.attemptJump();
      }
    }
  }

  private emitMovementState(): void {
    const timeLeft = this.isInWallBounceWindow ? 
      this.wallConfig.timingWindowMs - (Date.now() - this.wallBounceWindowStartTime) : 0;
    
    const state: MovementState = {
      isGrounded: this.isGrounded,
      isMoving: Math.abs(this.body.velocity.x) > 10,
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      facingDirection: this.facingDirection,
      momentum: Math.abs(this.body.velocity.x),
      wallBounceCount: this.wallBounceCount,
      isInWallBounceWindow: this.isInWallBounceWindow,
      wallBounceWindowTimeLeft: Math.max(0, timeLeft)
    };
    
    EventBus.emit('movement-state-updated', state);
  }

  getMovementState(): MovementState {
    const timeLeft = this.isInWallBounceWindow ? 
      this.wallConfig.timingWindowMs - (Date.now() - this.wallBounceWindowStartTime) : 0;
    
    return {
      isGrounded: this.isGrounded,
      isMoving: Math.abs(this.body.velocity.x) > 10,
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      facingDirection: this.facingDirection,
      momentum: Math.abs(this.body.velocity.x),
      wallBounceCount: this.wallBounceCount,
      isInWallBounceWindow: this.isInWallBounceWindow,
      wallBounceWindowTimeLeft: Math.max(0, timeLeft)
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

  startWallBounceWindow(side: 'left' | 'right'): boolean {
    if (!this.wallConfig.enabled) return false;
    
    const currentHorizontalSpeed = Math.abs(this.body.velocity.x);
    if (currentHorizontalSpeed < this.wallConfig.minSpeedForBounce) return false;
    
    // Already in a timing window, ignore
    if (this.isInWallBounceWindow) return false;
    
    // Start timing window
    this.isInWallBounceWindow = true;
    this.wallBounceWindowStartTime = Date.now();
    this.wallContactSide = side;
    this.preWallContactSpeed = currentHorizontalSpeed;
    
    // Emit timing window started event
    EventBus.emit('wall-bounce-window-started', {
      side,
      speed: currentHorizontalSpeed,
      windowDuration: this.wallConfig.timingWindowMs,
      position: { x: this.body.x, y: this.body.y },
      timestamp: Date.now()
    });
    
    return true;
  }

  private updateWallBounceWindow(): void {
    if (!this.isInWallBounceWindow) return;
    
    const elapsed = Date.now() - this.wallBounceWindowStartTime;
    if (elapsed >= this.wallConfig.timingWindowMs) {
      // Window expired, missed opportunity
      this.isInWallBounceWindow = false;
      this.wallContactSide = null;
      
      EventBus.emit('wall-bounce-window-missed', {
        elapsed,
        position: { x: this.body.x, y: this.body.y },
        timestamp: Date.now()
      });
    }
  }

  private attemptWallBounce(inputDirection: 'left' | 'right'): void {
    if (!this.isInWallBounceWindow) return;
    
    const elapsed = Date.now() - this.wallBounceWindowStartTime;
    const { perfectTimingMs, momentumPreservation } = this.wallConfig;
    
    // Determine timing quality
    let preservationRate: number;
    let timingQuality: string;
    
    if (elapsed <= perfectTimingMs) {
      preservationRate = momentumPreservation.perfect;
      timingQuality = 'perfect';
    } else if (elapsed <= perfectTimingMs * 3) {
      preservationRate = momentumPreservation.good;
      timingQuality = 'good';
    } else {
      preservationRate = momentumPreservation.late;
      timingQuality = 'late';
    }
    
    // Apply the bounce
    const newSpeed = this.preWallContactSpeed * preservationRate;
    const newVelocityX = inputDirection === 'left' ? -newSpeed : newSpeed;
    
    this.body.setVelocityX(newVelocityX);
    
    // Add vertical boost for perfect timing
    if (timingQuality === 'perfect' && this.wallConfig.perfectVerticalBoost > 0) {
      const currentVelocityY = this.body.velocity.y;
      const boostAmount = this.wallConfig.perfectVerticalBoost;
      
      // Only boost if not moving too fast upward already
      if (currentVelocityY > -400) {
        this.body.setVelocityY(currentVelocityY - boostAmount);
      }
    }
    
    this.facingDirection = inputDirection === 'left' ? -1 : 1;
    this.wallBounceCount++;
    
    // Clear timing window
    this.isInWallBounceWindow = false;
    this.wallContactSide = null;
    
    // Emit successful bounce event
    EventBus.emit('player-wall-bounce', {
      side: this.wallContactSide,
      inputDirection,
      oldSpeed: this.preWallContactSpeed,
      newSpeed: newSpeed,
      preservationRate,
      timingQuality,
      elapsed,
      bounceCount: this.wallBounceCount,
      position: { x: this.body.x, y: this.body.y },
      timestamp: Date.now()
    });
  }

  resetWallBounceCount(): void {
    this.wallBounceCount = 0;
  }

  getWallBounceMetrics(): {
    bounceCount: number;
    isInTimingWindow: boolean;
    timingWindowTimeLeft: number;
    contactSide: string;
    preContactSpeed: number;
  } {
    const timeLeft = this.isInWallBounceWindow ? 
      this.wallConfig.timingWindowMs - (Date.now() - this.wallBounceWindowStartTime) : 0;
    
    return {
      bounceCount: this.wallBounceCount,
      isInTimingWindow: this.isInWallBounceWindow,
      timingWindowTimeLeft: Math.max(0, timeLeft),
      contactSide: this.wallContactSide || 'none',
      preContactSpeed: this.preWallContactSpeed
    };
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.gameConfig = newConfig;
    this.config = newConfig.physics;
    this.wallConfig = newConfig.walls;
    this.setupPhysicsBody();
  }

  getConfiguration(): PhysicsConfig {
    return { ...this.config };
  }
}