import { Scene, Cameras } from 'phaser';
import { Player } from './Player';
import { GameConfiguration, CameraConfig } from './GameConfiguration';
import { EventBus } from './EventBus';
import { GameStateManager } from './GameStateManager';

export class CameraManager {
  private scene: Scene;
  private player: Player;
  private camera: Cameras.Scene2D.Camera;
  private config: CameraConfig;
  private gameStateManager: GameStateManager;
  
  private highestPlayerY: number = 0;
  private cameraTargetY: number = 0;
  private initialCameraY: number = 0;
  private minCameraY: number = 0; // Minimum Y the camera can scroll to
  // Removed custom control variables - using pure Phaser implementation

  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration, gameStateManager: GameStateManager) {
    this.scene = scene;
    this.player = player;
    this.camera = scene.cameras.main;
    this.config = gameConfig.camera;
    this.gameStateManager = gameStateManager;
    
    this.setupCamera();
    this.setupEventListeners();
  }

  private setupCamera(): void {
    // Store initial camera position
    this.initialCameraY = this.camera.scrollY;
    this.highestPlayerY = this.player.y;
    this.cameraTargetY = this.initialCameraY;
    
    // Calculate minimum camera Y (floor at bottom of screen)
    const floorY = this.scene.scale.height - 32; // Floor position
    this.minCameraY = floorY - this.scene.scale.height; // Camera Y when floor is at screen bottom
    
    // Set camera bounds (no horizontal bounds, but track vertical movement)
    this.camera.setBounds(0, -Infinity, this.scene.scale.width, Infinity);
    
    // Enable Phaser's built-in following for smooth normal movement
    this.camera.startFollow(this.player, false, this.config.cameraFollowSmoothing, this.config.cameraFollowSmoothing);
    
    // Set camera deadzone for comfortable player movement
    this.camera.setDeadzone(this.scene.scale.width * 0.3, this.scene.scale.height * 0.2);
    
    // Camera should follow player with player positioned higher on screen
    // This keeps more world visible below the player
    this.camera.setFollowOffset(0, -this.scene.scale.height * 0.2);
    
    // Camera setup complete - using pure Phaser following
  }

  private setupEventListeners(): void {
    EventBus.on('player-height-changed', this.onPlayerHeightChanged.bind(this));
    EventBus.on('camera-shake', this.onCameraShake.bind(this));
    EventBus.on('death-line-activated', this.onDeathLineActivated.bind(this));
  }

  update(deltaTime: number): void {
    // Safety check: ensure camera and scene are still valid
    if (!this.camera || !this.scene || !this.scene.scene?.isActive()) {
      console.warn('🚧 CameraManager: Camera or scene not available, skipping update');
      return;
    }

    // Don't update camera movement if game state doesn't allow it (with null safety)
    if (this.gameStateManager && !this.gameStateManager.allowsCameraMovement()) {
      return;
    }

    // Enforce minimum camera Y constraint
    if (this.camera.scrollY > this.minCameraY) {
      this.camera.setScroll(this.camera.scrollX, this.minCameraY);
    }

    this.trackPlayerHeight();
    this.emitCameraState();
  }

  private trackPlayerHeight(): void {
    const playerY = this.player.y;
    
    // Track the highest point the player has reached
    if (playerY < this.highestPlayerY) {
      this.highestPlayerY = playerY;
      
      EventBus.emit('player-height-record', {
        height: this.getPlayerHeight(),
        position: { x: this.player.x, y: this.player.y },
        timestamp: Date.now()
      });
    }
  }


  private onPlayerHeightChanged(data: any): void {
    // Custom event for when player reaches new heights
    EventBus.emit('height-milestone', data);
  }

  private onCameraShake(data: { intensity: number; duration: number }): void {
    this.camera.shake(data.duration, data.intensity * 0.01);
  }

  private emitCameraState(): void {
    // Safety check: ensure camera and scene are still valid
    if (!this.camera || !this.scene || !this.scene.scene?.isActive()) {
      console.warn('🚧 CameraManager: Camera or scene not available, skipping state emit');
      return;
    }

    const cameraState = {
      scrollY: this.camera.scrollY,
      playerHeight: this.getPlayerHeight(),
      highestHeight: this.getHighestHeight(),
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


  getCameraViewBounds(): { top: number; bottom: number; left: number; right: number } {
    return {
      top: this.camera.scrollY,
      bottom: this.camera.scrollY + this.scene.scale.height,
      left: this.camera.scrollX,
      right: this.camera.scrollX + this.scene.scale.width
    };
  }


  private onDeathLineActivated(): void {
    // Death line activation no longer affects camera behavior
    // Pure Phaser camera following continues unchanged
    console.log('📷 Death line activated, camera continues pure Phaser following');
  }

  // Removed custom deadzone methods - using pure Phaser deadzone system

  focusOnPlayer(): void {
    this.camera.centerOn(this.player.x, this.player.y);
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.config = newConfig.camera;
    
    // Update camera following parameters
    this.camera.setLerp(this.config.cameraFollowSmoothing, this.config.cameraFollowSmoothing);
  }

  reset(): void {
    console.log('🔄 CameraManager: Resetting camera system');
    
    // Reset camera state to initial values
    this.highestPlayerY = this.player.y;
    this.cameraTargetY = this.initialCameraY;
    
    // Reset camera position
    this.camera.setScroll(0, this.initialCameraY);
    
    // Re-enable pure Phaser built-in following
    this.camera.startFollow(this.player, false, this.config.cameraFollowSmoothing, this.config.cameraFollowSmoothing);
    this.camera.setDeadzone(this.scene.scale.width * 0.3, this.scene.scale.height * 0.2);
    this.camera.setFollowOffset(0, this.scene.scale.height * 0.1);
    
    console.log('✅ CameraManager: Reset complete - pure Phaser following');
  }

  destroy(): void {
    EventBus.off('player-height-changed', this.onPlayerHeightChanged.bind(this));
    EventBus.off('camera-shake', this.onCameraShake.bind(this));
    EventBus.off('death-line-activated', this.onDeathLineActivated.bind(this));
  }
}