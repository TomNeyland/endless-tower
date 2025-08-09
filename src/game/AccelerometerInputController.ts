import { Scene } from 'phaser';
import { EventBus } from './EventBus';
import { GameConfiguration } from './GameConfiguration';

export interface AccelerometerInputState {
  horizontalAcceleration: number; // -1 to 1 normalized
  tiltIntensity: number; // 0 to 1 based on shake/tilt strength
  shakeDetected: boolean; // True when rapid direction changes detected
  shouldAutoJump: boolean; // True when auto-jump conditions are met
}

export interface AccelerometerConfig {
  enabled: boolean;
  sensitivity: number; // Multiplier for acceleration values (0.1 - 3.0)
  deadZone: number; // Minimum tilt to register (0.0 - 0.5)
  maxTiltAngle: number; // Maximum tilt angle in degrees (15 - 45)
  shakeThreshold: number; // Minimum acceleration change to register shake (2.0 - 8.0)
  shakeTimeWindow: number; // Time window for shake detection in ms (100 - 500)
  autoJumpEnabled: boolean;
  autoJumpMomentumThreshold: number; // Minimum horizontal speed for auto-jump (100 - 300)
  autoJumpCooldown: number; // Cooldown between auto-jumps in ms (200 - 800)
}

export class AccelerometerInputController {
  private scene: Scene;
  private config: AccelerometerConfig;
  private isSupported: boolean = false;
  private permissionGranted: boolean = false;
  private isActive: boolean = false;
  
  // Motion data
  private currentAcceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private lastAcceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private accelerationHistory: { x: number; timestamp: number }[] = [];
  private calibrationOffset: number = 0;
  
  // Shake detection
  private lastShakeTime: number = 0;
  private shakeCount: number = 0;
  private lastDirectionChange: number = 0;
  
  // Auto-jump system
  private lastAutoJumpTime: number = 0;
  private currentMomentum: number = 0;
  
  // State
  private currentInputState: AccelerometerInputState = {
    horizontalAcceleration: 0,
    tiltIntensity: 0,
    shakeDetected: false,
    shouldAutoJump: false
  };
  
  // Debug visualization
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  private debugMode: boolean = false;

  constructor(scene: Scene, config: GameConfiguration) {
    this.scene = scene;
    this.config = this.getDefaultAccelerometerConfig();
    
    this.checkSupport();
    this.setupEventHandlers();
    
    console.log(`📱 AccelerometerInputController initialized - Support: ${this.isSupported}`);
  }

  private getDefaultAccelerometerConfig(): AccelerometerConfig {
    return {
      enabled: true,
      sensitivity: 1.2, // Slightly amplified for responsiveness
      deadZone: 0.15, // Small dead zone to prevent drift
      maxTiltAngle: 30, // 30 degree max tilt feels natural
      shakeThreshold: 3.0, // Moderate shake threshold
      shakeTimeWindow: 300, // 300ms window for shake detection
      autoJumpEnabled: true,
      autoJumpMomentumThreshold: 150, // Auto-jump at moderate speeds
      autoJumpCooldown: 400 // 400ms cooldown between auto-jumps
    };
  }

  private checkSupport(): void {
    // Check if DeviceMotionEvent is available
    this.isSupported = 'DeviceMotionEvent' in window;
    
    if (!this.isSupported) {
      console.warn('📱 Device motion not supported on this device/browser');
      return;
    }
    
    console.log('📱 Device motion API detected');
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('📱 Cannot request permission - device motion not supported');
      return false;
    }

    // Check if permission is required (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        console.log('📱 Requesting device motion permission...');
        const permission = await (DeviceMotionEvent as any).requestPermission();
        this.permissionGranted = permission === 'granted';
        
        if (this.permissionGranted) {
          console.log('📱 Device motion permission granted');
        } else {
          console.warn('📱 Device motion permission denied');
        }
      } catch (error) {
        console.error('📱 Error requesting device motion permission:', error);
        this.permissionGranted = false;
      }
    } else {
      // Permission not required (Android, older iOS)
      this.permissionGranted = true;
      console.log('📱 Device motion permission not required');
    }

    return this.permissionGranted;
  }

  async start(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('📱 Cannot start - device motion not supported');
      return false;
    }

    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('📱 Cannot start - permission not granted');
        return false;
      }
    }

    if (this.isActive) {
      console.log('📱 Accelerometer already active');
      return true;
    }

    try {
      window.addEventListener('devicemotion', this.onDeviceMotion.bind(this));
      this.isActive = true;
      this.startCalibration();
      
      console.log('📱 Accelerometer input started');
      EventBus.emit('accelerometer-started');
      return true;
    } catch (error) {
      console.error('📱 Failed to start accelerometer:', error);
      return false;
    }
  }

  stop(): void {
    if (!this.isActive) return;

    window.removeEventListener('devicemotion', this.onDeviceMotion.bind(this));
    this.isActive = false;
    
    // Reset state
    this.currentAcceleration = { x: 0, y: 0, z: 0 };
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
    this.accelerationHistory = [];
    this.currentInputState = {
      horizontalAcceleration: 0,
      tiltIntensity: 0,
      shakeDetected: false,
      shouldAutoJump: false
    };
    
    console.log('📱 Accelerometer input stopped');
    EventBus.emit('accelerometer-stopped');
  }

  private startCalibration(): void {
    // Calibrate for 2 seconds to establish baseline
    console.log('📱 Starting accelerometer calibration...');
    let samples: number[] = [];
    
    const calibrationTime = 2000;
    const startTime = Date.now();
    
    const calibrate = () => {
      if (Date.now() - startTime < calibrationTime) {
        samples.push(this.currentAcceleration.x);
        setTimeout(calibrate, 50);
      } else {
        // Calculate average as baseline offset
        this.calibrationOffset = samples.reduce((a, b) => a + b, 0) / samples.length;
        console.log(`📱 Calibration complete - offset: ${this.calibrationOffset.toFixed(3)}`);
        EventBus.emit('accelerometer-calibrated', { offset: this.calibrationOffset });
      }
    };
    
    calibrate();
  }

  private onDeviceMotion(event: DeviceMotionEvent): void {
    if (!this.config.enabled) return;
    
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    // Update acceleration data
    this.lastAcceleration = { ...this.currentAcceleration };
    this.currentAcceleration = {
      x: accel.x || 0,
      y: accel.y || 0,
      z: accel.z || 0
    };
    
    // Add to history for shake detection
    const now = Date.now();
    this.accelerationHistory.push({
      x: this.currentAcceleration.x,
      timestamp: now
    });
    
    // Keep only recent history
    this.accelerationHistory = this.accelerationHistory.filter(
      entry => now - entry.timestamp < this.config.shakeTimeWindow
    );
    
    this.updateInputState();
  }

  private updateInputState(): void {
    // Calculate calibrated horizontal acceleration
    const rawX = this.currentAcceleration.x - this.calibrationOffset;
    
    // Convert to normalized tilt (-1 to 1)
    const maxAccel = Math.sin(this.config.maxTiltAngle * Math.PI / 180) * 9.8;
    let normalizedTilt = (rawX / maxAccel) * this.config.sensitivity;
    
    // Apply dead zone
    if (Math.abs(normalizedTilt) < this.config.deadZone) {
      normalizedTilt = 0;
    }
    
    // Clamp to -1 to 1 range
    normalizedTilt = Math.max(-1, Math.min(1, normalizedTilt));
    
    // Calculate tilt intensity (0 to 1)
    const tiltIntensity = Math.abs(normalizedTilt);
    
    // Detect shake/rapid movement
    const shakeDetected = this.detectShake();
    
    // Update momentum for auto-jump (this would come from MovementController in real implementation)
    this.updateMomentumFromExternal();
    
    // Determine auto-jump conditions
    const shouldAutoJump = this.shouldTriggerAutoJump();
    
    this.currentInputState = {
      horizontalAcceleration: normalizedTilt,
      tiltIntensity,
      shakeDetected,
      shouldAutoJump
    };
    
    // Emit events for game systems
    EventBus.emit('accelerometer-input', this.currentInputState);
    
    if (this.debugMode) {
      this.updateDebugDisplay();
    }
  }

  private detectShake(): boolean {
    if (this.accelerationHistory.length < 3) return false;
    
    const now = Date.now();
    const recentHistory = this.accelerationHistory.slice(-5); // Last 5 samples
    
    // Look for rapid direction changes
    let directionChanges = 0;
    let maxAccelChange = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const prev = recentHistory[i - 1];
      const curr = recentHistory[i];
      const accelChange = Math.abs(curr.x - prev.x);
      
      maxAccelChange = Math.max(maxAccelChange, accelChange);
      
      if (accelChange > this.config.shakeThreshold) {
        directionChanges++;
      }
    }
    
    const isShaking = directionChanges >= 2 && maxAccelChange > this.config.shakeThreshold;
    
    if (isShaking && now - this.lastShakeTime > 200) {
      this.lastShakeTime = now;
      this.shakeCount++;
      EventBus.emit('shake-detected', { intensity: maxAccelChange, count: this.shakeCount });
    }
    
    return isShaking;
  }

  private updateMomentumFromExternal(): void {
    // This is properly handled by the event listener in setupEventHandlers
    // Just maintain current momentum if no recent updates
    this.currentMomentum *= 0.98; // Slight decay
  }

  private shouldTriggerAutoJump(): boolean {
    if (!this.config.autoJumpEnabled) return false;
    
    const now = Date.now();
    const timeSinceLastJump = now - this.lastAutoJumpTime;
    
    if (timeSinceLastJump < this.config.autoJumpCooldown) return false;
    
    // Auto-jump conditions:
    // 1. Sufficient momentum from accelerometer tilt
    // 2. Shake detected (aggressive input)
    const hasMomentum = this.currentMomentum > this.config.autoJumpMomentumThreshold;
    const hasAggressiveInput = Math.abs(this.currentInputState.horizontalAcceleration) > 0.6;
    const recentShake = this.currentInputState.shakeDetected;
    
    const shouldJump = hasMomentum && (hasAggressiveInput || recentShake);
    
    if (shouldJump) {
      this.lastAutoJumpTime = now;
      EventBus.emit('auto-jump-triggered', { 
        momentum: this.currentMomentum,
        tilt: this.currentInputState.horizontalAcceleration,
        shake: recentShake
      });
      return true;
    }
    
    return false;
  }

  private setupEventHandlers(): void {
    // Listen for movement state updates to track actual momentum
    EventBus.on('movement-state-updated', (state: any) => {
      this.currentMomentum = Math.abs(state.horizontalSpeed);
    });
  }

  private updateDebugDisplay(): void {
    if (!this.debugGraphics || !this.debugText) return;
    
    this.debugGraphics.clear();
    
    // Draw tilt indicator
    const centerX = 400;
    const centerY = 100;
    const maxRadius = 60;
    const tiltX = this.currentInputState.horizontalAcceleration * maxRadius;
    
    // Background circle
    this.debugGraphics.lineStyle(2, 0x666666);
    this.debugGraphics.strokeCircle(centerX, centerY, maxRadius);
    
    // Center dot
    this.debugGraphics.fillStyle(0xffffff);
    this.debugGraphics.fillCircle(centerX, centerY, 3);
    
    // Tilt indicator
    const color = this.currentInputState.shakeDetected ? 0xff4444 : 0x44ff44;
    this.debugGraphics.fillStyle(color);
    this.debugGraphics.fillCircle(centerX + tiltX, centerY, 8);
    
    // Dead zone indicator
    this.debugGraphics.lineStyle(1, 0x444444);
    const deadZoneRadius = this.config.deadZone * maxRadius;
    this.debugGraphics.strokeCircle(centerX, centerY, deadZoneRadius);
    
    // Update debug text
    const debugInfo = [
      `Tilt: ${this.currentInputState.horizontalAcceleration.toFixed(3)}`,
      `Intensity: ${this.currentInputState.tiltIntensity.toFixed(3)}`,
      `Shake: ${this.currentInputState.shakeDetected ? 'YES' : 'NO'}`,
      `Momentum: ${this.currentMomentum.toFixed(1)}`,
      `Auto-Jump: ${this.currentInputState.shouldAutoJump ? 'YES' : 'NO'}`,
      `Raw X: ${this.currentAcceleration.x.toFixed(3)}`,
      `Offset: ${this.calibrationOffset.toFixed(3)}`
    ].join('\n');
    
    this.debugText.setText(debugInfo);
  }

  // Public API
  getInputState(): AccelerometerInputState {
    return { ...this.currentInputState };
  }

  isReady(): boolean {
    return this.isSupported && this.permissionGranted;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  updateConfiguration(newConfig: Partial<AccelerometerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📱 Accelerometer configuration updated:', this.config);
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    
    if (enabled && !this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugText = this.scene.add.text(10, 10, '', {
        font: '14px monospace',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 8 }
      });
      
      this.debugGraphics.setScrollFactor(0).setDepth(1001);
      this.debugText.setScrollFactor(0).setDepth(1001);
    } else if (!enabled && this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugText?.destroy();
      this.debugGraphics = undefined;
      this.debugText = undefined;
    }
  }

  destroy(): void {
    this.stop();
    this.setDebugMode(false);
    
    // Clean up event listeners
    EventBus.off('movement-state-updated');
    
    console.log('📱 AccelerometerInputController destroyed');
  }
}