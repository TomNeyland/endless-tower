import { Physics, Scene } from 'phaser';
import { Player } from './Player';

export class OneWayPlatform {
  private scene: Scene;
  private platforms: Physics.Arcade.StaticGroup;
  private player: Player;

  constructor(scene: Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.platforms = scene.physics.add.staticGroup();
    this.setupCollision();
  }

  private setupCollision(): void {
    // Use overlap instead of collider to get custom collision control
    this.scene.physics.add.overlap(
      this.player,
      this.platforms,
      (player, platform) => this.handlePlatformCollision(player as Player, platform),
      (player, platform) => this.shouldCollideWithPlatform(player as Player, platform),
      this.scene
    );
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
    
    // Stop the player on top of the platform
    playerBody.y = platformBody.top - playerBody.height;
    playerBody.setVelocityY(0);
    
    // Set player as grounded
    player.setGrounded(true);
    
    // Emit landing event for combo system
    this.scene.events.emit('player-landed-on-platform', {
      player,
      platform,
      landingSpeed: { x: playerBody.velocity.x, y: playerBody.velocity.y }
    });
  }

  addPlatform(x: number, y: number, texture: string, frame?: string): Physics.Arcade.Sprite {
    const platform = this.platforms.create(x, y, texture, frame) as Physics.Arcade.Sprite;
    platform.setOrigin(0, 0.5);
    platform.refreshBody();
    return platform;
  }

  addPlatformGroup(group: Physics.Arcade.StaticGroup): void {
    // Add all children from the group to our platforms group
    group.children.entries.forEach(child => {
      this.platforms.add(child);
    });
  }

  getPlatforms(): Physics.Arcade.StaticGroup {
    return this.platforms;
  }

  clear(): void {
    this.platforms.clear(true, true);
  }
}