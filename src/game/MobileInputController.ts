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
  pointers: Set<number>; // Track multiple pointer IDs for true multi-touch
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
  
  // Visual feedback - always show on mobile, extra details in debug mode
  private leftZoneGraphics?: Phaser.GameObjects.Graphics;
  private rightZoneGraphics?: Phaser.GameObjects.Graphics;
  private mobileUIEnabled: boolean = true;  // Always show mobile UI
  private debugMode: boolean = false;       // Extra debug details

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
    this.createMobileUI();
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
      active: false,
      pointers: new Set<number>()
    };
    
    // Right zone: 40% of screen width for jumping
    const rightZoneWidth = gameWidth * this.config.rightZonePercent;
    this.rightZone = {
      bounds: new Phaser.Geom.Rectangle(leftZoneWidth, 0, rightZoneWidth, gameHeight),
      active: false,
      pointers: new Set<number>()
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
    this.updateMobileUI();
    
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
      // Remove from right zone if it was there
      if (this.rightZone.pointers.has(pointer.id)) {
        this.rightZone.pointers.delete(pointer.id);
        this.rightZone.active = this.rightZone.pointers.size > 0;
        if (!this.rightZone.active) {
          this.jumpActive = false;
        }
      }
      this.handleLeftZoneTouch(pointer, 'move');
    } else if (this.rightZone.bounds.contains(touchPoint.x, touchPoint.y)) {
      // Remove from left zone if it was there
      if (this.leftZone.pointers.has(pointer.id)) {
        this.leftZone.pointers.delete(pointer.id);
        this.leftZone.active = this.leftZone.pointers.size > 0;
        
        // If no more pointers in left zone, stop movement
        if (!this.leftZone.active) {
          this.movementDirection = 'none';
        }
      }
      // Add to right zone and activate jump
      this.handleRightZoneTouch(pointer, 'start');
    } else {
      // Pointer moved outside both zones - remove from both
      if (this.leftZone.pointers.has(pointer.id)) {
        this.leftZone.pointers.delete(pointer.id);
        this.leftZone.active = this.leftZone.pointers.size > 0;
        if (!this.leftZone.active) {
          this.movementDirection = 'none';
        }
      }
      if (this.rightZone.pointers.has(pointer.id)) {
        this.rightZone.pointers.delete(pointer.id);
        this.rightZone.active = this.rightZone.pointers.size > 0;
        if (!this.rightZone.active) {
          this.jumpActive = false;
        }
      }
    }
    
    this.updateInputState();
  }

  private onTouchEnd(pointer: Phaser.Input.Pointer): void {
    this.activeTouches.delete(pointer.id);
    
    // Remove pointer from left zone
    if (this.leftZone.pointers.has(pointer.id)) {
      this.leftZone.pointers.delete(pointer.id);
      this.leftZone.active = this.leftZone.pointers.size > 0;
      
      // If no more pointers in left zone, stop movement
      if (!this.leftZone.active) {
        this.movementDirection = 'none';
      }
    }
    
    // Remove pointer from right zone
    if (this.rightZone.pointers.has(pointer.id)) {
      this.rightZone.pointers.delete(pointer.id);
      this.rightZone.active = this.rightZone.pointers.size > 0;
      
      // If no more pointers in right zone, stop jumping
      if (!this.rightZone.active) {
        this.jumpActive = false;
      }
    }
    
    this.updateInputState();
    this.updateMobileUI();
    
    EventBus.emit('mobile-touch-end', { 
      zone: this.getTouchZone({ x: pointer.x, y: pointer.y }), 
      pointerId: pointer.id
    });
  }

  private handleLeftZoneTouch(pointer: Phaser.Input.Pointer, action: 'start' | 'move'): void {
    // Add pointer to left zone tracking
    this.leftZone.pointers.add(pointer.id);
    this.leftZone.active = this.leftZone.pointers.size > 0;
    
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
      console.log(`👈 Left zone touch: ${this.movementDirection} at (${touchX.toFixed(0)}, center: ${zoneCenter.toFixed(0)}) [${this.leftZone.pointers.size} pointers]`);
    }
  }

  private handleRightZoneTouch(pointer: Phaser.Input.Pointer, action: 'start'): void {
    // Add pointer to right zone tracking - enables true multi-touch
    this.rightZone.pointers.add(pointer.id);
    this.rightZone.active = this.rightZone.pointers.size > 0;
    this.jumpActive = true;
    
    console.log(`👆 Right zone touch: jump activated [${this.rightZone.pointers.size} pointers]`);
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

  private createMobileUI(): void {
    if (!this.mobileUIEnabled) return;
    
    // Create graphics for touch zones (always visible on mobile)
    this.leftZoneGraphics = this.scene.add.graphics();
    this.rightZoneGraphics = this.scene.add.graphics();
    
    // Make mobile UI stay on screen and be visible but not intrusive
    this.leftZoneGraphics.setScrollFactor(0);
    this.rightZoneGraphics.setScrollFactor(0);
    this.leftZoneGraphics.setDepth(999);  // Below debug UI (1000) but above game
    this.rightZoneGraphics.setDepth(999);
    
    this.updateMobileUI();
  }

  private updateMobileUI(): void {
    if (!this.mobileUIEnabled || !this.leftZoneGraphics || !this.rightZoneGraphics) return;
    
    // Clear previous graphics
    this.leftZoneGraphics.clear();
    this.rightZoneGraphics.clear();
    
    // Mobile UI: Subtle but visible touch zones
    const baseAlpha = 0.08;  // Very subtle background
    const activeAlpha = 0.2;  // More visible when touched
    
    // Draw left zone (movement)
    const leftAlpha = this.leftZone.active ? activeAlpha : baseAlpha;
    const leftColor = this.movementDirection === 'left' ? 0x4CAF50 :   // Green for left
                     this.movementDirection === 'right' ? 0x2196F3 :  // Blue for right  
                     0x9E9E9E;  // Gray for neutral
    
    this.leftZoneGraphics.fillStyle(leftColor, leftAlpha);
    this.leftZoneGraphics.fillRectShape(this.leftZone.bounds);
    
    // Add subtle border for left zone
    this.leftZoneGraphics.lineStyle(1, leftColor, 0.3);
    this.leftZoneGraphics.strokeRectShape(this.leftZone.bounds);
    
    // Draw right zone (jump)
    const rightAlpha = this.rightZone.active ? activeAlpha : baseAlpha;
    const rightColor = this.jumpActive ? 0xFF5722 : 0x9E9E9E;  // Orange for jump, gray for neutral
    
    this.rightZoneGraphics.fillStyle(rightColor, rightAlpha);
    this.rightZoneGraphics.fillRectShape(this.rightZone.bounds);
    
    // Add subtle border for right zone
    this.rightZoneGraphics.lineStyle(1, rightColor, 0.3);
    this.rightZoneGraphics.strokeRectShape(this.rightZone.bounds);
    
    // Add center indicators for touch zones
    const leftCenterX = this.leftZone.bounds.centerX;
    const leftCenterY = this.leftZone.bounds.bottom - 60;
    const rightCenterX = this.rightZone.bounds.centerX;
    const rightCenterY = this.rightZone.bounds.bottom - 60;
    
    // Left zone: Movement arrows (subtle)
    this.leftZoneGraphics.fillStyle(0xFFFFFF, 0.4);
    // Left arrow
    this.leftZoneGraphics.fillTriangle(
      leftCenterX - 30, leftCenterY,
      leftCenterX - 10, leftCenterY - 10,
      leftCenterX - 10, leftCenterY + 10
    );
    // Right arrow
    this.leftZoneGraphics.fillTriangle(
      leftCenterX + 30, leftCenterY,
      leftCenterX + 10, leftCenterY - 10,
      leftCenterX + 10, leftCenterY + 10
    );
    
    // Right zone: Jump indicator (subtle)
    this.rightZoneGraphics.fillStyle(0xFFFFFF, 0.4);
    // Up arrow for jump
    this.rightZoneGraphics.fillTriangle(
      rightCenterX, rightCenterY - 15,
      rightCenterX - 12, rightCenterY + 5,
      rightCenterX + 12, rightCenterY + 5
    );
    
    // In debug mode, add extra details
    if (this.debugMode) {
      this.addDebugDetails();
    }
  }
  
  private addDebugDetails(): void {
    if (!this.leftZoneGraphics || !this.rightZoneGraphics) return;
    
    // Draw center dead zone indicator (debug only)
    const centerX = this.leftZone.bounds.centerX;
    const centerY = this.leftZone.bounds.centerY;
    const deadZone = this.config.deadZoneRadius;
    
    this.leftZoneGraphics.lineStyle(2, 0xffffff, 0.5);
    this.leftZoneGraphics.strokeCircle(centerX, centerY, deadZone);
    
    // Add touch point indicators for active touches (debug only)
    this.activeTouches.forEach((pointer, id) => {
      const inLeftZone = this.leftZone.bounds.contains(pointer.x, pointer.y);
      const inRightZone = this.rightZone.bounds.contains(pointer.x, pointer.y);
      
      let graphics = this.leftZoneGraphics;
      let color = 0xffff00; // Default yellow
      
      if (inLeftZone) {
        graphics = this.leftZoneGraphics;
        color = 0x00ff00; // Green for left zone
      } else if (inRightZone) {
        graphics = this.rightZoneGraphics;
        color = 0xff0000; // Red for right zone
      }
      
      graphics!.fillStyle(color, 0.8);
      graphics!.fillCircle(pointer.x, pointer.y, 12);
      
      // Add pointer ID indicator
      graphics!.lineStyle(2, 0x000000, 1);
      graphics!.strokeCircle(pointer.x, pointer.y, 12);
      
      // Add small text indicator showing pointer ID
      graphics!.fillStyle(0x000000, 1);
      graphics!.fillCircle(pointer.x, pointer.y, 6);
    });
    
    // Show pointer count in each zone (debug only)
    const leftCount = this.leftZone.pointers.size;
    const rightCount = this.rightZone.pointers.size;
    
    if (leftCount > 0) {
      this.leftZoneGraphics.fillStyle(0xffffff, 0.8);
      this.leftZoneGraphics.fillRect(10, 10, 80, 20);
      this.leftZoneGraphics.fillStyle(0x000000, 1);
      // Note: In a real implementation, you'd add text here
    }
    
    if (rightCount > 0) {
      this.rightZoneGraphics.fillStyle(0xffffff, 0.8);
      this.rightZoneGraphics.fillRect(this.rightZone.bounds.right - 90, 10, 80, 20);
      this.rightZoneGraphics.fillStyle(0x000000, 1);
      // Note: In a real implementation, you'd add text here
    }
  }

  // Public API methods
  getInputState(): MobileInputState {
    return { ...this.currentInputs };
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    // Mobile UI is always shown - debug mode just adds extra details
    this.updateMobileUI();
  }
  
  setMobileUIEnabled(enabled: boolean): void {
    this.mobileUIEnabled = enabled;
    
    if (enabled && !this.leftZoneGraphics) {
      this.createMobileUI();
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
    this.updateMobileUI();
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
    
    // Clear active touches and pointer sets
    this.activeTouches.clear();
    this.leftZone.pointers.clear();
    this.rightZone.pointers.clear();
    
    console.log('🎮 MobileInputController destroyed');
  }
}