import { Physics } from 'phaser';
import { GameConfiguration, PhysicsConfig } from './GameConfiguration';
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
}

export class MovementController {
  private body: Physics.Arcade.Body;
  private config: PhysicsConfig;
  private gameConfig: GameConfiguration;
  
  private isGrounded: boolean = false;
  private facingDirection: 1 | -1 = 1;
  private lastGroundedTime: number = 0;
  private jumpBuffer: number = 0;
  
  private readonly JUMP_BUFFER_TIME = 100;
  private readonly COYOTE_TIME = 100;

  constructor(body: Physics.Arcade.Body, gameConfig: GameConfiguration) {
    this.body = body;
    this.gameConfig = gameConfig;
    this.config = gameConfig.physics;
    
    this.setupPhysicsBody();
  }

  private setupPhysicsBody(): void {
    this.body.setCollideWorldBounds(true);
    this.body.setDragX(this.config.horizontalDrag);
    this.body.setMaxVelocity(this.config.maxHorizontalSpeed, 1000);
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
    const state: MovementState = {
      isGrounded: this.isGrounded,
      isMoving: Math.abs(this.body.velocity.x) > 10,
      horizontalSpeed: this.body.velocity.x,
      verticalSpeed: this.body.velocity.y,
      facingDirection: this.facingDirection,
      momentum: Math.abs(this.body.velocity.x)
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
      momentum: Math.abs(this.body.velocity.x)
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

  updateConfiguration(newConfig: GameConfiguration): void {
    this.gameConfig = newConfig;
    this.config = newConfig.physics;
    this.setupPhysicsBody();
  }

  getConfiguration(): PhysicsConfig {
    return { ...this.config };
  }
}