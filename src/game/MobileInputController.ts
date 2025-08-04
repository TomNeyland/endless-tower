import { Scene } from 'phaser';
import { EventBus } from './EventBus';
import { GameConfiguration, MobileConfig } from './GameConfiguration';

export interface MobileInputState {
  leftPressed: boolean;
  rightPressed: boolean;
  jumpPressed: boolean;
}

export interface TouchZone {
  bounds: Phaser.Geom.Rectangle;
  active: boolean;
  pointer?: Phaser.Input.Pointer;
}

export class MobileInputController {
  private scene: Scene;
  private config: MobileConfig;
  private leftZone: TouchZone;
  private rightZone: TouchZone;
  private currentInputs: MobileInputState;
  
  // Touch state tracking
  private activeTouches: Map<number, Phaser.Input.Pointer> = new Map();
  private movementDirection: 'left' | 'right' | 'none' = 'none';
  private jumpActive: boolean = false;
  
  // Visual feedback for debug mode
  private leftZoneGraphics?: Phaser.GameObjects.Graphics;
  private rightZoneGraphics?: Phaser.GameObjects.Graphics;
  private debugMode: boolean = false;

  constructor(scene: Scene, config: GameConfiguration) {
    this.scene = scene;
    this.config = config.mobile;
    
    this.currentInputs = {
      leftPressed: false,
      rightPressed: false,
      jumpPressed: false
    };
    
    this.setupTouchZones();
    this.setupInputHandlers();
    this.createDebugVisuals();
  }

  static isMobileDevice(): boolean {
    // Check for touch capability and mobile user agents
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Also check screen size as a fallback
    const isSmallScreen = window.screen.width <= 768 || window.screen.height <= 1024;
    
    return isTouchDevice && (isMobileUserAgent || isSmallScreen);
  }

  private setupTouchZones(): void {
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    
    // Left zone: 60% of screen width for movement
    const leftZoneWidth = gameWidth * this.config.leftZonePercent;
    this.leftZone = {
      bounds: new Phaser.Geom.Rectangle(0, 0, leftZoneWidth, gameHeight),
      active: false
    };
    
    // Right zone: 40% of screen width for jumping
    const rightZoneWidth = gameWidth * this.config.rightZonePercent;
    this.rightZone = {
      bounds: new Phaser.Geom.Rectangle(leftZoneWidth, 0, rightZoneWidth, gameHeight),
      active: false
    };
    
    console.log(`🎮 Mobile touch zones setup: Left(${leftZoneWidth}x${gameHeight}), Right(${rightZoneWidth}x${gameHeight})`);
  }

  private setupInputHandlers(): void {
    // Handle touch start
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onTouchStart(pointer);
    });
    
    // Handle touch move
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.onTouchMove(pointer);
    });
    
    // Handle touch end
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.onTouchEnd(pointer);
    });
    
    // Handle touch cancel (when touch is interrupted)
    this.scene.input.on('pointercancel', (pointer: Phaser.Input.Pointer) => {
      this.onTouchEnd(pointer);
    });
  }

  private onTouchStart(pointer: Phaser.Input.Pointer): void {
    const touchPoint = { x: pointer.x, y: pointer.y };
    this.activeTouches.set(pointer.id, pointer);
    
    if (this.leftZone.bounds.contains(touchPoint.x, touchPoint.y)) {
      this.handleLeftZoneTouch(pointer, 'start');
    } else if (this.rightZone.bounds.contains(touchPoint.x, touchPoint.y)) {
      this.handleRightZoneTouch(pointer, 'start');
    }
    
    this.updateInputState();
    this.updateDebugVisuals();
    
    EventBus.emit('mobile-touch-start', { 
      zone: this.getTouchZone(touchPoint), 
      position: touchPoint,
      pointerId: pointer.id
    });
  }

  private onTouchMove(pointer: Phaser.Input.Pointer): void {
    if (!this.activeTouches.has(pointer.id)) return;
    
    const touchPoint = { x: pointer.x, y: pointer.y };
    
    // Handle movement in left zone
    if (this.leftZone.bounds.contains(touchPoint.x, touchPoint.y)) {
      this.handleLeftZoneTouch(pointer, 'move');
    } else if (this.rightZone.bounds.contains(touchPoint.x, touchPoint.y)) {
      // If finger moved from left to right zone, stop movement
      if (this.leftZone.pointer?.id === pointer.id) {
        this.leftZone.active = false;
        this.leftZone.pointer = undefined;
        this.movementDirection = 'none';
      }
    }
    
    this.updateInputState();
  }

  private onTouchEnd(pointer: Phaser.Input.Pointer): void {
    this.activeTouches.delete(pointer.id);
    
    // Clear left zone if this pointer was controlling it
    if (this.leftZone.pointer?.id === pointer.id) {
      this.leftZone.active = false;
      this.leftZone.pointer = undefined;
      this.movementDirection = 'none';
    }
    
    // Clear right zone if this pointer was controlling it
    if (this.rightZone.pointer?.id === pointer.id) {
      this.rightZone.active = false;
      this.rightZone.pointer = undefined;
      this.jumpActive = false;
    }
    
    this.updateInputState();
    this.updateDebugVisuals();
    
    EventBus.emit('mobile-touch-end', { 
      zone: this.getTouchZone({ x: pointer.x, y: pointer.y }), 
      pointerId: pointer.id
    });
  }

  private handleLeftZoneTouch(pointer: Phaser.Input.Pointer, action: 'start' | 'move'): void {
    if (!this.leftZone.active || this.leftZone.pointer?.id === pointer.id) {
      this.leftZone.active = true;
      this.leftZone.pointer = pointer;
      
      // Determine movement direction based on touch position relative to zone center
      const zoneCenter = this.leftZone.bounds.centerX;
      const touchX = pointer.x;
      
      if (touchX < zoneCenter - this.config.deadZoneRadius) {
        this.movementDirection = 'left';
      } else if (touchX > zoneCenter + this.config.deadZoneRadius) {
        this.movementDirection = 'right';
      } else {
        this.movementDirection = 'none'; // Dead zone in center
      }
      
      if (action === 'start') {
        console.log(`👈 Left zone touch: ${this.movementDirection} at (${touchX.toFixed(0)}, center: ${zoneCenter.toFixed(0)})`);
      }
    }
  }

  private handleRightZoneTouch(pointer: Phaser.Input.Pointer, action: 'start'): void {
    if (!this.rightZone.active || this.rightZone.pointer?.id === pointer.id) {
      this.rightZone.active = true;
      this.rightZone.pointer = pointer;
      this.jumpActive = true;
      
      console.log(`👆 Right zone touch: jump activated`);
    }
  }

  private updateInputState(): void {
    // Update movement inputs based on active touches
    this.currentInputs.leftPressed = this.movementDirection === 'left';
    this.currentInputs.rightPressed = this.movementDirection === 'right';
    this.currentInputs.jumpPressed = this.jumpActive;
  }

  private getTouchZone(point: { x: number, y: number }): 'left' | 'right' | 'none' {
    if (this.leftZone.bounds.contains(point.x, point.y)) {
      return 'left';
    } else if (this.rightZone.bounds.contains(point.x, point.y)) {
      return 'right';
    }
    return 'none';
  }

  private createDebugVisuals(): void {
    if (!this.debugMode) return;
    
    // Create debug graphics for touch zones
    this.leftZoneGraphics = this.scene.add.graphics();
    this.rightZoneGraphics = this.scene.add.graphics();
    
    // Make debug visuals stay on screen
    this.leftZoneGraphics.setScrollFactor(0);
    this.rightZoneGraphics.setScrollFactor(0);
    this.leftZoneGraphics.setDepth(1000);
    this.rightZoneGraphics.setDepth(1000);
    
    this.updateDebugVisuals();
  }

  private updateDebugVisuals(): void {
    if (!this.debugMode || !this.leftZoneGraphics || !this.rightZoneGraphics) return;
    
    // Clear previous graphics
    this.leftZoneGraphics.clear();
    this.rightZoneGraphics.clear();
    
    // Draw left zone
    const leftAlpha = this.leftZone.active ? 0.3 : 0.1;
    const leftColor = this.movementDirection === 'left' ? 0x00ff00 : 
                     this.movementDirection === 'right' ? 0x0000ff : 0x888888;
    
    this.leftZoneGraphics.fillStyle(leftColor, leftAlpha);
    this.leftZoneGraphics.fillRectShape(this.leftZone.bounds);
    
    // Draw right zone
    const rightAlpha = this.rightZone.active ? 0.3 : 0.1;
    const rightColor = this.jumpActive ? 0xff0000 : 0x888888;
    
    this.rightZoneGraphics.fillStyle(rightColor, rightAlpha);
    this.rightZoneGraphics.fillRectShape(this.rightZone.bounds);
    
    // Draw center dead zone indicator
    if (this.leftZone.active) {
      const centerX = this.leftZone.bounds.centerX;
      const centerY = this.leftZone.bounds.centerY;
      const deadZone = this.config.deadZoneRadius;
      
      this.leftZoneGraphics.lineStyle(2, 0xffffff, 0.5);
      this.leftZoneGraphics.strokeCircle(centerX, centerY, deadZone);
    }
  }

  // Public API methods
  getInputState(): MobileInputState {
    return { ...this.currentInputs };
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    
    if (enabled && !this.leftZoneGraphics) {
      this.createDebugVisuals();
    } else if (!enabled && this.leftZoneGraphics) {
      this.leftZoneGraphics.destroy();
      this.rightZoneGraphics?.destroy();
      this.leftZoneGraphics = undefined;
      this.rightZoneGraphics = undefined;
    }
  }

  updateConfiguration(newConfig: GameConfiguration): void {
    this.config = newConfig.mobile;
    this.setupTouchZones();
    this.updateDebugVisuals();
  }

  destroy(): void {
    // Clean up event listeners
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.scene.input.off('pointercancel');
    
    // Clean up graphics
    this.leftZoneGraphics?.destroy();
    this.rightZoneGraphics?.destroy();
    
    // Clear active touches
    this.activeTouches.clear();
    
    console.log('🎮 MobileInputController destroyed');
  }
}