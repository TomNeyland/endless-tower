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
  
  // Prevent repeated wall bounces
  private lastWallBounceTime: number = 0;
  private wallBounceCooldown: number = 500; // 500ms cooldown between bounces
  private lastBounceSide: 'left' | 'right' | null = null;

  constructor(scene: Scene, player: Player, wallManager: WallManager) {
    this.scene = scene;
    this.player = player;
    this.wallManager = wallManager;
    
    this.setupWallCollision();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on('walls-updated', this.onWallsUpdated.bind(this));
  }

  private onWallsUpdated(): void {
    console.log('🔄 WallCollision: Received walls-updated event, recreating colliders');
    this.updateWallCollision();
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
    
    console.log(`🧱 Wall collision check: ${side} side, player can go through? NO - always block`);
    
    // ALWAYS collide with walls - walls should be solid barriers
    return true; // Always collide - walls are solid
  }

  private handleLeftWallCollision(): void {
    this.handleWallCollision('left');
  }

  private handleRightWallCollision(): void {
    this.handleWallCollision('right');
  }

  private handleWallCollision(side: 'left' | 'right'): void {
    const movementState = this.player.getMovementState();
    const wallConfig = this.wallManager.getWallConfig();
    
    console.log(`🔄 Wall contact: ${side} side, speed: ${movementState.horizontalSpeed.toFixed(1)}, grounded: ${movementState.isGrounded}`);
    
    // Check if this collision could result in a physics-based wall bounce
    const canBounce = this.canWallBounce(movementState, side, wallConfig);
    
    if (canBounce) {
      console.log(`✅ Wall bounce approved: ${side} side`);
      this.attemptWallBounce(movementState, side, wallConfig);
      // Only emit effects when an actual bounce happens
      this.emitWallContactEffects(side);
    } else {
      console.log(`❌ Wall bounce rejected: ${side} side`);
    }
  }

  private canWallBounce(movementState: any, side: 'left' | 'right', wallConfig: any): boolean {
    const now = Date.now();
    const speed = Math.abs(movementState.horizontalSpeed);
    const timeSinceLastBounce = now - this.lastWallBounceTime;
    
    // Check cooldown to prevent repeated bounces
    if (timeSinceLastBounce < this.wallBounceCooldown) {
      console.log(`⏰ Rejected: Cooldown (${timeSinceLastBounce}ms < ${this.wallBounceCooldown}ms)`);
      return false;
    }
    
    // Check minimum speed requirement - very forgiving
    if (speed < 20) {
      console.log(`🐌 Rejected: Too slow (${speed.toFixed(1)} < 20)`);
      return false;
    }
    
    // Check if moving toward the wall (not away from it)
    const movingTowardWall = side === 'left' ? 
      movementState.horizontalSpeed < 0 : 
      movementState.horizontalSpeed > 0;
    
    if (!movingTowardWall) {
      console.log(`↩️ Rejected: Moving away from wall (${side}, speed: ${movementState.horizontalSpeed.toFixed(1)})`);
      return false;
    }
    
    // Allow wall bounces when grounded OR airborne
    console.log(`🎯 Wall bounce approved! Speed: ${speed.toFixed(1)}, Direction: ${side}, Grounded: ${movementState.isGrounded}`);
    return true;
  }

  private attemptWallBounce(movementState: any, side: 'left' | 'right', wallConfig: any): void {
    // Sample current input to determine player intention
    const inputSample = this.samplePlayerInput();
    console.log(`🎮 Input sample: left=${inputSample.left}, right=${inputSample.right}, up=${inputSample.up}`);
    
    // Calculate bounce efficiency based on approach and input
    const efficiency = this.calculateBounceEfficiency(movementState, side, inputSample, wallConfig);
    console.log(`⚡ Calculated efficiency: ${efficiency.toFixed(3)}`);
    
    if (efficiency > 0) {
      this.executeWallBounce(movementState, side, efficiency);
    } else {
      console.log(`💥 Bounce cancelled: efficiency too low (${efficiency.toFixed(3)})`);
    }
  }

  private samplePlayerInput(): { left: boolean; right: boolean; up: boolean } {
    // Sample current input state - in a real implementation, this would sample 
    // input over the last few frames before contact
    const cursors = this.scene.input.keyboard?.createCursorKeys();
    const wasd = this.scene.input.keyboard?.addKeys('W,A,S,D') as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    
    return {
      left: (cursors?.left?.isDown || wasd?.A?.isDown) || false,
      right: (cursors?.right?.isDown || wasd?.D?.isDown) || false, 
      up: (cursors?.up?.isDown || wasd?.W?.isDown) || false
    };
  }

  private calculateBounceEfficiency(movementState: any, side: 'left' | 'right', input: any, wallConfig: any): number {
    // Simple physics-based efficiency calculation
    let efficiency = 1.0; // Start with 100% momentum redirection
    
    // Check input direction vs wall side
    const pressingIntoWall = side === 'left' ? input.left : input.right;
    const pressingAwayFromWall = side === 'left' ? input.right : input.left;
    
    if (pressingIntoWall) {
      // Penalty for pressing into wall - fighting the redirect
      efficiency = 0.8;
      console.log(`⚠️ Penalty applied: pressing INTO ${side} wall (efficiency: 0.8)`);
    } else if (pressingAwayFromWall) {
      // Bonus for pressing away from wall - helping the redirect
      efficiency = 1.25;
      console.log(`🚀 Bonus applied: pressing AWAY from ${side} wall (efficiency: 1.25)`);
    } else {
      // Neutral - no input or different direction
      efficiency = 1.0;
      console.log(`➡️ Neutral redirect: no relevant input (efficiency: 1.0)`);
    }
    
    return efficiency;
  }

  private executeWallBounce(movementState: any, side: 'left' | 'right', efficiency: number): void {
    const playerBody = this.player.body as Physics.Arcade.Body;
    const currentHorizontalSpeed = Math.abs(movementState.horizontalSpeed);
    const currentVerticalSpeed = movementState.verticalSpeed;
    
    // Calculate momentum redirection with physics-based conservation
    const redirectedHorizontalSpeed = this.calculateRedirectedHorizontalSpeed(
      currentHorizontalSpeed, 
      side, 
      efficiency
    );
    
    // Calculate vertical momentum transfer based on horizontal speed and efficiency
    const verticalMomentumTransfer = this.calculateVerticalMomentumTransfer(
      currentHorizontalSpeed,
      currentVerticalSpeed,
      efficiency
    );
    
    // Apply momentum conservation limits to prevent infinite speed buildup
    const finalHorizontalSpeed = this.applyMomentumLimits(redirectedHorizontalSpeed);
    const finalVerticalSpeed = this.applyVerticalLimits(
      currentVerticalSpeed + verticalMomentumTransfer
    );
    
    // Apply new velocities with physics-based momentum redirection
    playerBody.setVelocityX(finalHorizontalSpeed);
    playerBody.setVelocityY(finalVerticalSpeed);
    
    // Nudge player away from wall to prevent sticking
    const nudgeDistance = 50; // Much bigger push away from wall
    if (side === 'left') {
      playerBody.x += nudgeDistance; // Push right when hitting left wall
    } else {
      playerBody.x -= nudgeDistance; // Push left when hitting right wall  
    }
    console.log(`👋 Nudged player away from ${side} wall by ${nudgeDistance}px`);
    
    // Also ensure the velocity is definitely applied
    console.log(`🚀 Final velocity applied: X=${finalHorizontalSpeed}, Y=${finalVerticalSpeed}`);
    console.log(`📍 Player position after bounce: X=${playerBody.x.toFixed(1)}, Y=${playerBody.y.toFixed(1)}`);
    
    // Schedule a check to see what happens in the next frame
    this.scene.time.delayedCall(50, () => {
      const newVelocity = playerBody.velocity;
      console.log(`🔍 50ms after bounce: velocity X=${newVelocity.x.toFixed(1)}, Y=${newVelocity.y.toFixed(1)}, position X=${playerBody.x.toFixed(1)}`);
      if (Math.abs(newVelocity.x) < 10) {
        console.log(`⚠️ WARNING: Horizontal velocity dropped to near zero after bounce - possible immediate opposite wall collision`);
      }
    });
    
    // Record bounce time and side for cooldown mechanism
    this.lastWallBounceTime = Date.now();
    this.lastBounceSide = side;
    
    // Update wall bounce count in movement controller
    const movementController = this.player.getMovementController();
    if (movementController && typeof movementController.incrementWallBounceCount === 'function') {
      movementController.incrementWallBounceCount();
    }
    
    // Emit wall bounce event for combo system and effects
    EventBus.emit('player-wall-bounce', {
      side,
      efficiency,
      oldSpeed: currentHorizontalSpeed,
      newSpeed: Math.abs(finalHorizontalSpeed),
      verticalGain: Math.abs(verticalMomentumTransfer),
      position: { x: this.player.x, y: this.player.y },
      bounceCount: movementState.wallBounceCount + 1
    });
    
    console.log(`🚀 WALL BOUNCE EXECUTED! ${side} side, efficiency: ${efficiency.toFixed(2)}, speed: ${currentHorizontalSpeed.toFixed(0)} → ${Math.abs(finalHorizontalSpeed).toFixed(0)}, vertical gain: ${Math.abs(verticalMomentumTransfer).toFixed(0)}`);
  }

  private calculateRedirectedHorizontalSpeed(currentSpeed: number, side: 'left' | 'right', efficiency: number): number {
    // Redirect momentum to opposite direction with efficiency-based conservation
    let redirectedSpeed = currentSpeed * efficiency;
    
    // Ensure minimum bounce-away speed to avoid getting stuck
    const minBounceSpeed = 60; // Reduced minimum speed to prevent over-bouncing
    if (redirectedSpeed < minBounceSpeed) {
      redirectedSpeed = minBounceSpeed;
      console.log(`⚡ Boosted bounce speed to minimum: ${minBounceSpeed}`);
    }
    
    // Apply direction based on which wall was hit
    const finalSpeed = redirectedSpeed * (side === 'left' ? 1 : -1);
    console.log(`🔄 Speed redirect: ${currentSpeed} → ${finalSpeed} (side: ${side}, efficiency: ${efficiency})`);
    
    return finalSpeed;
  }

  private calculateVerticalMomentumTransfer(horizontalSpeed: number, verticalSpeed: number, efficiency: number): number {
    // Simple physics: redirect can only ADD vertical velocity, never remove it
    const baseVerticalBoost = horizontalSpeed * 0.4; // 40% of horizontal speed becomes vertical
    
    // Only add upward momentum if we're not already going up too fast
    const maxAdditionalUpwardVelocity = -200; // Limit how much extra upward we can add
    const proposedVerticalBoost = -baseVerticalBoost; // Negative is up in Phaser
    
    // If already moving up fast, reduce the boost
    if (verticalSpeed < -200) {
      return Math.max(maxAdditionalUpwardVelocity, proposedVerticalBoost * 0.5);
    }
    
    // Otherwise add the full boost
    return proposedVerticalBoost;
  }

  private applyMomentumLimits(horizontalSpeed: number): number {
    // Simple speed limits - no minimum, reasonable maximum
    const maxWallBounceSpeed = 800;
    
    if (Math.abs(horizontalSpeed) > maxWallBounceSpeed) {
      return maxWallBounceSpeed * Math.sign(horizontalSpeed);
    }
    
    return horizontalSpeed;
  }

  private applyVerticalLimits(verticalSpeed: number): number {
    // Simple vertical limits - can only ADD upward velocity
    const maxUpwardVelocity = -600; // Max upward speed
    const maxDownwardVelocity = 600; // Max falling speed
    
    return Math.max(maxUpwardVelocity, Math.min(maxDownwardVelocity, verticalSpeed));
  }

  private emitWallContactEffects(side: 'left' | 'right'): void {
    // Emit events for visual and audio feedback on wall contact
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

  reset(): void {
    // Reset cooldown state
    this.lastWallBounceTime = 0;
    this.lastBounceSide = null;
    
    // Recreate wall colliders after reset
    console.log('🔄 WallCollision: Recreating colliders after reset');
    this.updateWallCollision();
  }

  destroy(): void {
    // Clean up event listeners
    EventBus.off('walls-updated', this.onWallsUpdated.bind(this));
    
    if (this.leftWallCollider) {
      this.scene.physics.world.removeCollider(this.leftWallCollider);
    }
    if (this.rightWallCollider) {
      this.scene.physics.world.removeCollider(this.rightWallCollider);
    }
    
    // Reset state
    this.reset();
  }
}