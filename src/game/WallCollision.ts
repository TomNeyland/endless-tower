import { Scene, Physics } from 'phaser';
import { Player } from './Player';
import { WallManager } from './WallManager';
import { EventBus } from './EventBus';

export class WallCollision {
  private scene: Scene;
  private player: Player;
  private wallManager: WallManager;
  
  private leftWallCollider: Physics.Arcade.Collider | null = null;
  private rightWallCollider: Physics.Arcade.Collider | null = null;

  constructor(scene: Scene, player: Player, wallManager: WallManager) {
    this.scene = scene;
    this.player = player;
    this.wallManager = wallManager;
    
    this.setupWallCollision();
  }

  private setupWallCollision(): void {
    // Set up collision with left walls
    this.leftWallCollider = this.scene.physics.add.collider(
      this.player,
      this.wallManager.getLeftWalls(),
      () => this.handleLeftWallCollision(),
      (player, wall) => this.shouldCollideWithWall(player as Player, 'left'),
      this.scene
    );
    
    // Set up collision with right walls
    this.rightWallCollider = this.scene.physics.add.collider(
      this.player,
      this.wallManager.getRightWalls(),
      () => this.handleRightWallCollision(),
      (player, wall) => this.shouldCollideWithWall(player as Player, 'right'),
      this.scene
    );
  }

  private shouldCollideWithWall(player: Player, side: 'left' | 'right'): boolean {
    const playerBody = player.body as Physics.Arcade.Body;
    const movementState = player.getMovementState();
    
    // Always collide with walls - no jumping requirement
    // But only trigger bounce window if moving toward wall with sufficient speed
    const isMovingTowardWall = side === 'left' ? 
      movementState.horizontalSpeed < -30 : 
      movementState.horizontalSpeed > 30;
    
    return true; // Always collide, but bounce window depends on movement
  }

  private handleLeftWallCollision(): void {
    const movementState = this.player.getMovementState();
    const speed = Math.abs(movementState.horizontalSpeed);
    const isMovingTowardWall = movementState.horizontalSpeed < -10; // Very low threshold for debugging
    
    if (isMovingTowardWall && speed >= 10) { // Must meet minimum speed
      const movementController = this.player.getMovementController();
      if (movementController && movementController.startWallBounceWindow) {
        const windowStarted = movementController.startWallBounceWindow('left');
        if (windowStarted) {
          this.emitWallContactEffects('left');
        }
      }
    }
  }

  private handleRightWallCollision(): void {
    const movementState = this.player.getMovementState();
    const speed = Math.abs(movementState.horizontalSpeed);
    const isMovingTowardWall = movementState.horizontalSpeed > 10; // Very low threshold for debugging
    
    if (isMovingTowardWall && speed >= 10) { // Must meet minimum speed
      const movementController = this.player.getMovementController();
      if (movementController && movementController.startWallBounceWindow) {
        const windowStarted = movementController.startWallBounceWindow('right');
        if (windowStarted) {
          this.emitWallContactEffects('right');
        }
      }
    }
  }

  private emitWallContactEffects(side: 'left' | 'right'): void {
    // Emit events for visual and audio feedback when timing window starts
    EventBus.emit('wall-contact-effects', {
      side,
      playerPosition: { x: this.player.x, y: this.player.y },
      timestamp: Date.now()
    });
    
    // Light camera shake effect for wall contact
    EventBus.emit('camera-shake', {
      intensity: 2,
      duration: 50
    });
  }

  updateWallCollision(): void {
    // Update colliders when wall groups change
    if (this.leftWallCollider) {
      this.scene.physics.world.removeCollider(this.leftWallCollider);
    }
    if (this.rightWallCollider) {
      this.scene.physics.world.removeCollider(this.rightWallCollider);
    }
    
    this.setupWallCollision();
  }

  destroy(): void {
    if (this.leftWallCollider) {
      this.scene.physics.world.removeCollider(this.leftWallCollider);
    }
    if (this.rightWallCollider) {
      this.scene.physics.world.removeCollider(this.rightWallCollider);
    }
  }
}