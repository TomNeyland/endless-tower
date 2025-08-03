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

  // No velocity caching needed - using proper Phaser collision handler approach

  // Visual debugging overlays
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;
  private gracePeriodIndicator: Phaser.GameObjects.Rectangle | null = null;
  private velocityArrow: Phaser.GameObjects.Graphics | null = null;
  private debugEnabled: boolean = true;

  constructor(scene: Scene, player: Player, wallManager: WallManager) {
    this.scene = scene;
    this.player = player;
    this.wallManager = wallManager;
    
    this.setupWallCollision();
    this.setupEventListeners();
    this.setupVisualDebugging();
  }

  private setupEventListeners(): void {
    EventBus.on('walls-updated', this.onWallsUpdated.bind(this));
    
    // Add debug toggle key
    this.scene.input.keyboard?.on('keydown-V', () => {
      this.debugEnabled = !this.debugEnabled;
      console.log(`🔧 Wall bounce visual debugging: ${this.debugEnabled ? 'ENABLED' : 'DISABLED'}`);
      
      if (!this.debugEnabled) {
        // Hide all debug visuals
        if (this.debugGraphics) this.debugGraphics.setVisible(false);
        if (this.gracePeriodIndicator) this.gracePeriodIndicator.setVisible(false);
        if (this.velocityArrow) this.velocityArrow.setVisible(false);
      }
    });
  }

  private onWallsUpdated(): void {
    console.log('🔄 WallCollision: Received walls-updated event, recreating colliders');
    this.updateWallCollision();
  }

  private setupWallCollision(): void {
    // CRITICAL: processCallback (4th param) captures velocity BEFORE separation,
    // collideCallback (3rd param) uses captured velocity AFTER separation.
    // Phaser zeroes velocity during separation, so collision handler gets 0.0 without this pattern.
    
    // Set up collision with left walls
    this.leftWallCollider = this.scene.physics.add.collider(
      this.player,
      this.wallManager.getLeftWalls(),
      (player, wall) => this.onCollideAfterSeparation(player as Player, wall, 'left'),
      (player, wall) => this.capturePreCollisionVelocity(player as Player, wall, 'left'),
      this.scene
    );
    
    // Set up collision with right walls
    this.rightWallCollider = this.scene.physics.add.collider(
      this.player,
      this.wallManager.getRightWalls(),
      (player, wall) => this.onCollideAfterSeparation(player as Player, wall, 'right'),
      (player, wall) => this.capturePreCollisionVelocity(player as Player, wall, 'right'),
      this.scene
    );
  }


  private capturePreCollisionVelocity(player: Player, wall: any, side: 'left' | 'right'): boolean {
    const playerBody = player.body as Physics.Arcade.Body;
    const now = Date.now();
    const timeSinceLastBounce = now - this.lastWallBounceTime;
    
    // Clone velocity before collision resolution (as per Phaser docs)
    (player as any).preHitVel = playerBody.velocity.clone();
    
    console.log(`⚡ ProcessCallback (BEFORE separation): ${side} wall, velocity X=${playerBody.velocity.x.toFixed(1)}, Y=${playerBody.velocity.y.toFixed(1)}`);
    
    // Handle grace period - if in grace period, don't allow collision
    const oppositeWallGracePeriod = 200; // 200ms grace period
    const isOppositeWall = this.lastBounceSide !== null && this.lastBounceSide !== side;
    const inGracePeriod = timeSinceLastBounce < oppositeWallGracePeriod;
    
    if (isOppositeWall && inGracePeriod) {
      console.log(`🌟 Wall collision BYPASSED: ${side} side (grace period: ${timeSinceLastBounce}ms < ${oppositeWallGracePeriod}ms, last bounce: ${this.lastBounceSide})`);
      return false; // Block collision - allow passage through opposite wall
    }
    
    // Normal collision allowed - velocity will be captured for collision handler
    return true;
  }

  private onCollideAfterSeparation(player: Player, wall: any, side: 'left' | 'right'): void {
    // Use the pre-collision velocity captured in processCallback
    const preHitVel = (player as any).preHitVel;
    
    if (!preHitVel) {
      console.log(`⚠️ No pre-hit velocity captured for ${side} wall collision`);
      return;
    }
    
    console.log(`🎯 CollideCallback (AFTER separation): ${side} wall, using captured velocity X=${preHitVel.x.toFixed(1)}, Y=${preHitVel.y.toFixed(1)}`);
    
    const wallConfig = this.wallManager.getWallConfig();
    
    // Create movement state object with the captured pre-collision velocity
    const effectiveMovementState = {
      horizontalSpeed: preHitVel.x,
      verticalSpeed: preHitVel.y,
      isGrounded: player.getMovementState().isGrounded,
      wallBounceCount: player.getMovementState().wallBounceCount
    };
    
    // Check if this collision could result in a physics-based wall bounce
    const canBounce = this.canWallBounce(effectiveMovementState, side, wallConfig);
    
    if (canBounce) {
      console.log(`✅ Wall bounce approved: ${side} side`);
      this.attemptWallBounce(effectiveMovementState, side, wallConfig);
      this.emitWallContactEffects(side);
    } else {
      console.log(`❌ Wall bounce rejected: ${side} side`);
    }
    
    // Clear the captured velocity to prevent stale data
    (player as any).preHitVel = null;
  }

  // These old methods are no longer needed - using direct collision handler approach

  // Old MacGyvered method - no longer needed with proper collision handler approach

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
    // Realistic momentum losses - prevent infinite wall climbing
    let efficiency = 0.6; // Default: some momentum loss
    
    // Check input direction vs wall side
    const pressingIntoWall = side === 'left' ? input.left : input.right;
    const pressingAwayFromWall = side === 'left' ? input.right : input.left;
    
    if (pressingIntoWall) {
      // Penalty for pressing into wall - fighting the redirect
      efficiency = 0.4;
      console.log(`⚠️ Penalty applied: pressing INTO ${side} wall (efficiency: 0.4)`);
    } else if (pressingAwayFromWall) {
      // Bonus for pressing away from wall - helping the redirect
      efficiency = 0.8;
      console.log(`🚀 Bonus applied: pressing AWAY from ${side} wall (efficiency: 0.8)`);
    } else {
      // Neutral - no input or different direction
      efficiency = 0.6;
      console.log(`➡️ Neutral redirect: no relevant input (efficiency: 0.6)`);
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
    // Wall kick physics: mirror the horizontal velocity across the wall
    // This creates the proper "goat wall kick" effect where angles are preserved
    
    let redirectedSpeed = Math.abs(currentSpeed) * efficiency;
    
    // Ensure minimum bounce-away speed to avoid getting stuck
    const minBounceSpeed = 60; // Reduced minimum speed to prevent over-bouncing
    if (redirectedSpeed < minBounceSpeed) {
      redirectedSpeed = minBounceSpeed;
      console.log(`⚡ Boosted bounce speed to minimum: ${minBounceSpeed}`);
    }
    
    // Mirror direction: left wall bounces right, right wall bounces left
    const finalSpeed = redirectedSpeed * (side === 'left' ? 1 : -1);
    
    console.log(`🪞 Wall kick redirect: ${currentSpeed.toFixed(1)} → ${finalSpeed.toFixed(1)} (${side} wall, efficiency: ${efficiency.toFixed(2)})`);
    
    return finalSpeed;
  }

  private calculateVerticalMomentumTransfer(horizontalSpeed: number, verticalSpeed: number, efficiency: number): number {
    // Wall kick physics: preserve and enhance vertical momentum
    // If moving upward, preserve most of it; if falling, convert to upward momentum
    
    let finalVerticalSpeed = verticalSpeed;
    
    if (verticalSpeed > 0) {
      // Falling: convert downward momentum to upward momentum (wall kick effect)
      finalVerticalSpeed = -verticalSpeed * 0.8; // Redirect 80% of fall speed upward
      console.log(`🦶 Wall kick: converted falling ${verticalSpeed.toFixed(1)} to rising ${finalVerticalSpeed.toFixed(1)}`);
    } else {
      // Already rising: preserve and slightly boost upward momentum
      finalVerticalSpeed = verticalSpeed * 1.2; // 20% boost to existing upward momentum
      console.log(`🚀 Wall kick: boosted existing upward momentum ${verticalSpeed.toFixed(1)} to ${finalVerticalSpeed.toFixed(1)}`);
    }
    
    // Add extra upward boost based on horizontal speed (wall kick power)
    const wallKickBoost = -Math.abs(horizontalSpeed) * 0.3; // 30% of horizontal speed becomes extra upward
    finalVerticalSpeed += wallKickBoost;
    
    // Apply efficiency multiplier
    const velocityChange = (finalVerticalSpeed - verticalSpeed) * efficiency;
    
    console.log(`🎯 Wall kick total: ${verticalSpeed.toFixed(1)} → ${(verticalSpeed + velocityChange).toFixed(1)} (change: ${velocityChange.toFixed(1)})`);
    
    return velocityChange;
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
    
    // No camera shake for wall bounces - keep it smooth
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

  private setupVisualDebugging(): void {
    if (!this.debugEnabled) return;
    
    console.log('🔧 Setting up wall bounce visual debugging...');
    
    // Create debug graphics for wall collision areas and player bounds
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.setDepth(1000);
    this.debugGraphics.setScrollFactor(1, 1); // Follow world coordinates (walls and player are in world space)
    
    // Create grace period indicator (this should stay on screen)
    this.gracePeriodIndicator = this.scene.add.rectangle(0, 0, 100, 20, 0x00ff00, 0.7);
    this.gracePeriodIndicator.setDepth(1001);
    this.gracePeriodIndicator.setVisible(false);
    this.gracePeriodIndicator.setScrollFactor(0, 0); // UI element - stay fixed to screen
    
    // Create velocity arrow (should follow player in world space)
    this.velocityArrow = this.scene.add.graphics();
    this.velocityArrow.setDepth(1002);
    this.velocityArrow.setScrollFactor(1, 1); // Follow world coordinates like the player
    
    console.log('✅ Wall bounce visual debugging setup complete');
  }

  private updateCallCount = 0;
  
  update(): void {
    if (!this.debugEnabled) return;
    
    // Log once to confirm update is being called
    if (this.updateCallCount === 0) {
      console.log('🔧 Wall collision visual debugging update started');
    }
    this.updateCallCount++;
    
    this.updateVisualDebugging();
  }

  private updateVisualDebugging(): void {
    if (!this.debugGraphics || !this.gracePeriodIndicator || !this.velocityArrow) return;
    
    const playerBody = this.player.body as Physics.Arcade.Body;
    const movementState = this.player.getMovementState();
    const now = Date.now();
    const timeSinceLastBounce = now - this.lastWallBounceTime;
    
    // Clear previous drawings
    this.debugGraphics.clear();
    this.velocityArrow.clear();
    
    // Wall lines disabled for now (not visible due to sprite layering)
    // TODO: Re-enable once we figure out sprite depth issues
    
    
    // Grace period indicator
    const oppositeWallGracePeriod = 200;
    const inGracePeriod = timeSinceLastBounce < oppositeWallGracePeriod;
    
    if (this.lastBounceSide !== null && inGracePeriod) {
      const gracePeriodProgress = timeSinceLastBounce / oppositeWallGracePeriod;
      this.gracePeriodIndicator.setVisible(true);
      this.gracePeriodIndicator.setPosition(this.scene.scale.width / 2, 50);
      this.gracePeriodIndicator.setFillStyle(0x00ff00, 0.7 * (1 - gracePeriodProgress));
      this.gracePeriodIndicator.setSize(200 * (1 - gracePeriodProgress), 20);
      
      // Highlight the wall that can be passed through
      const wallX = this.lastBounceSide === 'left' ? this.scene.scale.width : 0;
      this.debugGraphics.lineStyle(8, 0x00ff00, 0.5);
      this.debugGraphics.moveTo(wallX, this.scene.cameras.main.scrollY - 200);
      this.debugGraphics.lineTo(wallX, this.scene.cameras.main.scrollY + this.scene.scale.height + 200);
    } else {
      this.gracePeriodIndicator.setVisible(false);
    }
    
    // Velocity arrow disabled for now (not visible due to sprite layering) 
    // TODO: Re-enable once we figure out sprite depth issues
    
    // Draw player collision bounds in world coordinates
    this.debugGraphics.lineStyle(2, 0x00ffff, 0.8); // More opaque
    this.debugGraphics.strokeRect(
      playerBody.x, 
      playerBody.y,
      playerBody.width, 
      playerBody.height
    );
    
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
    
    // Clean up debug visuals
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
    if (this.gracePeriodIndicator) {
      this.gracePeriodIndicator.destroy();
    }
    if (this.velocityArrow) {
      this.velocityArrow.destroy();
    }
    
    // Reset state
    this.reset();
  }
}