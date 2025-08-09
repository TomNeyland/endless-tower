import { Physics, Scene } from 'phaser';
import { Player } from './Player';
import { EventBus } from './EventBus';

export class OneWayPlatform {
  private scene: Scene;
  private platforms: Physics.Arcade.StaticGroup;
  private player: Player;
  private platformSpringsActive: boolean = false;
  private springsEndTime: number = 0;

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    
    // Initialize platforms group with safety check
    this.initializePlatforms();
    this.setupCollision();
    this.setupEventListeners();
  }

  private initializePlatforms(): void {
    if (this.scene.physics && this.scene.physics.add) {
      this.platforms = this.scene.physics.add.staticGroup();
      
      // Verify the group was properly initialized
      if (!this.platforms.children) {
        console.warn('OneWayPlatform: Platform group created but children property is undefined');
        this.platforms = null as any;
      }
    } else {
      console.warn('OneWayPlatform: Physics system not ready, deferring platform group creation');
    }
  }

  private setupCollision(): void {
    // Only setup collision if platforms group is ready
    if (!this.platforms || !this.platforms.children) {
      console.warn('OneWayPlatform: Deferring collision setup - platforms group not ready');
      return;
    }

    // Additional safety check for physics system
    if (!this.scene.physics || !this.scene.physics.add) {
      console.warn('OneWayPlatform: Physics system not ready, cannot setup collisions');
      return;
    }

    // Additional safety check for player
    if (!this.player || !this.player.body) {
      console.warn('OneWayPlatform: Player not ready, cannot setup collisions');
      return;
    }

    try {
      // Use overlap instead of collider to get custom collision control
      this.scene.physics.add.overlap(
        this.player,
        this.platforms,
        (player, platform) => this.handlePlatformCollision(player as Player, platform),
        (player, platform) => this.shouldCollideWithPlatform(player as Player, platform),
        this.scene
      );
    } catch (error) {
      console.error('OneWayPlatform: Failed to setup collision:', error);
    }
  }

  private shouldCollideWithPlatform(player: Player, platform: any): boolean {
    const playerBody = player.body as Physics.Arcade.Body;
    const platformBody = platform.body as Physics.Arcade.StaticBody;
    
    // Only collide if:
    // 1. Player is falling (positive Y velocity)
    // 2. Player is coming from above the platform
    const isPlayerFalling = playerBody.velocity.y > 0;
    const playerBottom = playerBody.bottom;
    const platformTop = platformBody.top;
    const playerWasAbove = (playerBody.prev.y + playerBody.height) <= platformTop + 10; // Small tolerance
    
    return isPlayerFalling && playerWasAbove && playerBottom > platformTop;
  }

  private handlePlatformCollision(player: Player, platform: any): void {
    const playerBody = player.body as Physics.Arcade.Body;
    const platformBody = platform.body as Physics.Arcade.StaticBody;
    
    // Check if platform springs are active and still valid
    if (this.platformSpringsActive && Date.now() < this.springsEndTime) {
      // Apply bounce boost - launch player upward with current horizontal momentum
      const boostMultiplier = 1.5; // 50% jump boost from powerup config
      const currentHorizontalSpeed = playerBody.velocity.x;
      
      // Calculate boosted jump similar to regular jump but with multiplier
      const baseJumpPower = -400; // Base jump velocity
      const boostedJumpPower = baseJumpPower * boostMultiplier;
      
      playerBody.setVelocityY(boostedJumpPower);
      playerBody.setVelocityX(currentHorizontalSpeed); // Keep horizontal momentum
      
      console.log(`🌸 Platform spring boost applied: ${boostedJumpPower} vertical velocity`);
      
      // Emit spring boost event for visual/audio feedback
      EventBus.emit('platform-spring-boost', {
        player,
        platform,
        boostMultiplier,
        jumpPower: boostedJumpPower
      });
      
    } else {
      // Normal platform collision behavior
      playerBody.y = platformBody.top - playerBody.height;
      playerBody.setVelocityY(0);
      
      // Set player as grounded
      player.setGrounded(true);
    }
    
    // Always emit landing event for combo system
    this.scene.events.emit('player-landed-on-platform', {
      player,
      platform,
      landingSpeed: { x: playerBody.velocity.x, y: playerBody.velocity.y },
      springBoosted: this.platformSpringsActive && Date.now() < this.springsEndTime
    });
  }

  addPlatform(x: number, y: number, texture: string, frame?: string): Physics.Arcade.Sprite {
    const platform = this.platforms.create(x, y, texture, frame) as Physics.Arcade.Sprite;
    platform.setOrigin(0, 0.5);
    platform.refreshBody();
    return platform;
  }

  addPlatformGroup(group: Physics.Arcade.StaticGroup): void {
    // Add null safety checks for group and children
    if (!group || !group.children || !group.children.entries) {
      console.warn('OneWayPlatform: Invalid group passed to addPlatformGroup', group);
      return;
    }

    // Ensure platforms group is initialized
    if (!this.platforms) {
      this.initializePlatforms();
      if (!this.platforms) {
        console.warn('OneWayPlatform: Cannot add platform group - platforms group not initialized');
        return;
      }
      // Set up collision now that platforms are ready
      this.setupCollision();
    }

    // Add all children from the group to our platforms group
    group.children.entries.forEach(child => {
      if (child) {
        // Additional check to ensure platforms group's children property exists
        if (!this.platforms.children) {
          console.error('OneWayPlatform: Platform group children property is undefined during add operation');
          return;
        }
        this.platforms.add(child);
      }
    });
  }

  getPlatforms(): Physics.Arcade.StaticGroup {
    return this.platforms;
  }

  clear(): void {
    this.platforms.clear(true, true);
  }

  private setupEventListeners(): void {
    EventBus.on('platform-generated', this.onPlatformGenerated.bind(this));
    EventBus.on('platform-cleaned-up', this.onPlatformCleanedUp.bind(this));
    EventBus.on('platform-springs-active', this.onPlatformSpringsActive.bind(this));
  }

  private onPlatformGenerated(data: { group: Physics.Arcade.StaticGroup }): void {
    // Add the new platform group to our collision system
    this.addPlatformGroup(data.group);
  }

  private onPlatformCleanedUp(data: { group: Physics.Arcade.StaticGroup }): void {
    // Remove platform group from collision system
    if (data.group && data.group.children && data.group.children.entries) {
      data.group.children.entries.forEach(child => {
        this.platforms.remove(child, false, false);
      });
    }
  }
  
  private onPlatformSpringsActive(data: any): void {
    this.platformSpringsActive = true;
    this.springsEndTime = Date.now() + data.duration;
    console.log(`🌸 Platform springs activated for ${data.duration / 1000} seconds`);
  }

  destroy(): void {
    EventBus.off('platform-generated', this.onPlatformGenerated.bind(this));
    EventBus.off('platform-cleaned-up', this.onPlatformCleanedUp.bind(this));
    EventBus.off('platform-springs-active', this.onPlatformSpringsActive.bind(this));
    
    // Safely destroy platforms group
    if (this.platforms) {
      try {
        if (this.platforms.children) {
          this.platforms.clear(true, true);
        }
        // Don't call destroy on platforms group - it will be destroyed by scene
        this.platforms = null as any;
      } catch (error) {
        console.warn('OneWayPlatform: Error during destroy:', error);
        this.platforms = null as any;
      }
    }
  }
}