import { Scene, Cameras } from 'phaser';
import { Player } from './Player';
import { GameConfiguration, CameraConfig } from './GameConfiguration';
import { EventBus } from './EventBus';

export class CameraManager {
  private scene: Scene;
  private player: Player;
  private camera: Cameras.Scene2D.Camera;
  private config: CameraConfig;
  
  private highestPlayerY: number = 0;
  private cameraTargetY: number = 0;
  private initialCameraY: number = 0;
  private autoScrollEnabled: boolean = false;
  private playerDeadzoneBottom: number = 0;
  private playerDeadzoneTop: number = 0;
  private usingBuiltInFollowing: boolean = true;

  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.camera = scene.cameras.main;
    this.config = gameConfig.camera;
    
    this.setupCamera();
    this.setupEventListeners();
  }

  private setupCamera(): void {
    // Store initial camera position
    this.initialCameraY = this.camera.scrollY;
    this.highestPlayerY = this.player.y;
    this.cameraTargetY = this.initialCameraY;
    
    // Set camera bounds (no horizontal bounds, but track vertical movement)
    this.camera.setBounds(0, -Infinity, this.scene.scale.width, Infinity);
    
    // Initially enable Phaser's built-in following (will be disabled when auto-scroll starts)
    this.camera.startFollow(this.player, false, this.config.cameraFollowSmoothing, this.config.cameraFollowSmoothing);
    
    // Set camera deadzone for vertical following only
    this.camera.setDeadzone(this.scene.scale.width * 0.3, this.scene.scale.height * 0.2);
    
    // Camera should follow player upward but not downward too quickly
    this.camera.setFollowOffset(0, this.scene.scale.height * 0.3); // Player in upper third of screen
    
    // Initialize player deadzone bounds
    this.updatePlayerDeadzone();
  }

  private setupEventListeners(): void {
    EventBus.on('player-height-changed', this.onPlayerHeightChanged.bind(this));
    EventBus.on('camera-shake', this.onCameraShake.bind(this));
    EventBus.on('death-line-activated', this.onDeathLineActivated.bind(this));
  }

  update(deltaTime: number): void {
    if (this.autoScrollEnabled) {
      this.updateUnifiedCameraControl(deltaTime);
    } else {
      this.updateCameraPosition();
    }
    this.emitCameraState();
  }

  private updateCameraPosition(): void {
    const playerY = this.player.y;
    
    // Track the highest point the player has reached
    if (playerY < this.highestPlayerY) {
      this.highestPlayerY = playerY;
      
      // Camera should follow upward movement immediately
      const targetY = this.highestPlayerY + this.scene.scale.height * 0.3;
      this.cameraTargetY = Math.min(this.cameraTargetY, targetY);
      
      EventBus.emit('player-height-record', {
        height: this.getPlayerHeight(),
        position: { x: this.player.x, y: this.player.y },
        timestamp: Date.now()
      });
    }
  }

  private updateUnifiedCameraControl(deltaTime: number): void {
    // Calculate auto-scroll target
    const autoScrollAmount = this.config.autoScrollSpeed * (deltaTime / 1000);
    let autoScrollTargetY = this.cameraTargetY - autoScrollAmount;
    
    // Calculate player-based target with deadzone
    const playerBasedTargetY = this.calculatePlayerBasedTarget();
    
    // Choose the higher priority target (upward movement wins)
    let finalTargetY: number;
    
    if (this.isPlayerInDeadzone()) {
      // Player is in deadzone, prioritize auto-scroll
      finalTargetY = autoScrollTargetY;
    } else if (this.player.y < this.highestPlayerY) {
      // Player reached new height, follow immediately
      this.highestPlayerY = this.player.y;
      finalTargetY = Math.min(autoScrollTargetY, playerBasedTargetY);
      this.updatePlayerDeadzone();
      
      EventBus.emit('player-height-record', {
        height: this.getPlayerHeight(),
        position: { x: this.player.x, y: this.player.y },
        timestamp: Date.now()
      });
    } else if (this.player.y > this.playerDeadzoneBottom) {
      // Player descended beyond deadzone, allow limited downward camera movement
      const descentAmount = Math.min(
        this.config.maxDescentSpeed * (deltaTime / 1000),
        this.player.y - this.playerDeadzoneBottom
      );
      finalTargetY = Math.max(autoScrollTargetY, this.cameraTargetY + descentAmount);
    } else {
      // Player is within acceptable range, use auto-scroll
      finalTargetY = autoScrollTargetY;
    }
    
    this.cameraTargetY = finalTargetY;
    
    // Smooth camera movement toward target
    const currentY = this.camera.scrollY;
    const smoothingFactor = this.player.y > this.playerDeadzoneBottom ? 
      this.config.descentSmoothingFactor : this.config.cameraFollowSmoothing;
    const newY = Phaser.Math.Linear(currentY, this.cameraTargetY, smoothingFactor);
    
    this.camera.setScroll(this.camera.scrollX, newY);
  }

  private onPlayerHeightChanged(data: any): void {
    // Custom event for when player reaches new heights
    EventBus.emit('height-milestone', data);
  }

  private onCameraShake(data: { intensity: number; duration: number }): void {
    this.camera.shake(data.duration, data.intensity * 0.01);
  }

  private emitCameraState(): void {
    const cameraState = {
      scrollY: this.camera.scrollY,
      playerHeight: this.getPlayerHeight(),
      highestHeight: this.getHighestHeight(),
      deathLineY: this.getDeathLineY(),
      isPlayerAboveCamera: this.player.y < this.camera.scrollY - this.scene.scale.height * 0.1
    };
    
    EventBus.emit('camera-state-updated', cameraState);
  }

  getPlayerHeight(): number {
    // Height is measured from initial position, positive = higher up
    return Math.max(0, this.initialCameraY + this.scene.scale.height * 0.7 - this.player.y);
  }

  getHighestHeight(): number {
    return Math.max(0, this.initialCameraY + this.scene.scale.height * 0.7 - this.highestPlayerY);
  }

  getDeathLineY(): number {
    // Death line follows camera at bottom with offset
    return this.camera.scrollY + this.scene.scale.height + this.config.deathLineOffset;
  }

  getCameraViewBounds(): { top: number; bottom: number; left: number; right: number } {
    return {
      top: this.camera.scrollY,
      bottom: this.camera.scrollY + this.scene.scale.height,
      left: this.camera.scrollX,
      right: this.camera.scrollX + this.scene.scale.width
    };
  }

  isPlayerBelowDeathLine(): boolean {
    return this.player.y > this.getDeathLineY();
  }

  private onDeathLineActivated(): void {
    this.autoScrollEnabled = true;
    this.usingBuiltInFollowing = false;
    
    // Disable Phaser's built-in camera following to prevent conflicts
    this.camera.stopFollow();
    
    // Set camera target to current position
    this.cameraTargetY = this.camera.scrollY;
    
    // Update deadzone based on current player position
    this.updatePlayerDeadzone();
    
    console.log('📷 Camera auto-scroll enabled, built-in following disabled');
  }

  private updatePlayerDeadzone(): void {
    // Create a vertical deadzone around the player's current position
    const playerScreenY = this.player.y - this.camera.scrollY;
    const screenCenterY = this.scene.scale.height / 2;
    const idealPlayerScreenY = this.scene.scale.height * 0.3; // Player in upper third
    
    // Deadzone is centered around ideal player screen position
    this.playerDeadzoneTop = this.camera.scrollY + idealPlayerScreenY - (this.config.verticalDeadzone / 2);
    this.playerDeadzoneBottom = this.camera.scrollY + idealPlayerScreenY + (this.config.verticalDeadzone / 2);
  }

  private calculatePlayerBasedTarget(): number {
    // Calculate where camera should be to keep player in the upper third of screen
    const idealOffsetFromPlayer = this.scene.scale.height * 0.3;
    return this.player.y - idealOffsetFromPlayer;
  }

  private isPlayerInDeadzone(): boolean {
    return this.player.y >= this.playerDeadzoneTop && this.player.y <= this.playerDeadzoneBottom;
  }

  focusOnPlayer(): void {
    this.camera.centerOn(this.player.x, this.player.y);
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.config = newConfig.camera;
    
    // Update camera following parameters
    this.camera.setLerp(this.config.cameraFollowSmoothing, this.config.cameraFollowSmoothing);
  }

  destroy(): void {
    EventBus.off('player-height-changed', this.onPlayerHeightChanged.bind(this));
    EventBus.off('camera-shake', this.onCameraShake.bind(this));
  }
}