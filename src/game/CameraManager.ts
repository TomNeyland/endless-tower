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
    
    // Enable smooth camera following
    this.camera.startFollow(this.player, false, this.config.cameraFollowSmoothing, this.config.cameraFollowSmoothing);
    
    // Set camera deadzone for vertical following only
    this.camera.setDeadzone(this.scene.scale.width * 0.3, this.scene.scale.height * 0.2);
    
    // Camera should follow player upward but not downward too quickly
    this.camera.setFollowOffset(0, this.scene.scale.height * 0.3); // Player in upper third of screen
  }

  private setupEventListeners(): void {
    EventBus.on('player-height-changed', this.onPlayerHeightChanged.bind(this));
    EventBus.on('camera-shake', this.onCameraShake.bind(this));
  }

  update(deltaTime: number): void {
    this.updateCameraPosition();
    this.updateAutoScroll(deltaTime);
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

  private updateAutoScroll(deltaTime: number): void {
    // Optional: Slowly push camera upward to create urgency
    if (this.config.autoScrollSpeed > 0) {
      const scrollAmount = this.config.autoScrollSpeed * (deltaTime / 1000);
      this.cameraTargetY -= scrollAmount;
      
      // Smooth camera movement toward target
      const currentY = this.camera.scrollY;
      const lerpSpeed = this.config.cameraFollowSmoothing * 2; // Slightly faster for auto-scroll
      const newY = Phaser.Math.Linear(currentY, this.cameraTargetY, lerpSpeed);
      
      this.camera.setScroll(this.camera.scrollX, newY);
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