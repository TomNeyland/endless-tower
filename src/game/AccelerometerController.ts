import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export interface AccelerometerState {
  horizontalTilt: number;     // -1 to 1 normalized tilt (left to right)
  tiltIntensity: number;      // 0 to 1 strength of tilt
  shakeDetected: boolean;     // True when rapid movement detected
  shouldAutoJump: boolean;    // True when auto-jump conditions met
  isActive: boolean;          // True when accelerometer is running
}

export interface AccelerometerConfig {
  sensitivity: number;        // Multiplier for tilt response (0.5 - 2.0)
  deadZone: number;           // Minimum tilt to register (0.05 - 0.3)
  maxTiltAngle: number;       // Maximum useful tilt in degrees (20 - 45)
  shakeThreshold: number;     // Acceleration change for shake detection (3.0 - 8.0)
  autoJumpEnabled: boolean;   // Enable smart auto-jump system
  autoJumpThreshold: number;  // Minimum momentum for auto-jump (0.4 - 0.8)
  autoJumpCooldown: number;   // Cooldown between auto-jumps in ms (300 - 600)
}

export class AccelerometerController {
  private scene: Scene;
  private config: AccelerometerConfig;
  
  // Device support and permissions
  private isSupported: boolean = false;
  private hasPermission: boolean = false;
  private isActive: boolean = false;
  
  // Motion data
  private currentAcceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private baselineAcceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private accelerationHistory: Array<{ x: number; timestamp: number }> = [];
  
  // State tracking
  private currentState: AccelerometerState;
  private lastAutoJumpTime: number = 0;
  private lastShakeTime: number = 0;
  private horizontalMomentum: number = 0;
  
  // Calibration
  private isCalibrated: boolean = false;
  private calibrationSamples: number[] = [];
  
  constructor(scene: Scene) {
    this.scene = scene;
    this.config = this.getDefaultConfig();
    
    this.currentState = {
      horizontalTilt: 0,
      tiltIntensity: 0,
      shakeDetected: false,
      shouldAutoJump: false,
      isActive: false
    };
    
    this.checkDeviceSupport();
    console.log(`📱 AccelerometerController initialized - Supported: ${this.isSupported}`);
  }

  private getDefaultConfig(): AccelerometerConfig {
    return {
      sensitivity: 1.2,          // Responsive but not twitchy
      deadZone: 0.1,             // Small dead zone to prevent drift
      maxTiltAngle: 35,          // Natural tilting range
      shakeThreshold: 4.0,       // Moderate shake sensitivity
      autoJumpEnabled: true,     // Enable auto-jump by default
      autoJumpThreshold: 0.5,    // Auto-jump at moderate momentum
      autoJumpCooldown: 400      // 400ms between auto-jumps
    };
  }

  private checkDeviceSupport(): void {
    // Check if DeviceMotionEvent is available
    this.isSupported = typeof DeviceMotionEvent !== 'undefined' && 'DeviceMotionEvent' in window;
    
    if (!this.isSupported) {
      console.warn('📱 DeviceMotionEvent not supported on this device/browser');
    }
  }

  async requestPermissionAndStart(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('📱 Cannot start - accelerometer not supported');
      return false;
    }

    // Request permission if required (iOS 13+)
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        console.log('📱 Requesting DeviceMotionEvent permission...');
        const permission = await (DeviceMotionEvent as any).requestPermission();
        this.hasPermission = permission === 'granted';
        
        if (!this.hasPermission) {
          console.warn('📱 DeviceMotionEvent permission denied');
          return false;
        }
        console.log('📱 DeviceMotionEvent permission granted');
      } catch (error) {
        console.error('📱 Error requesting DeviceMotionEvent permission:', error);
        this.hasPermission = false;
        return false;
      }
    } else {
      // Permission not required (Android, older iOS)
      this.hasPermission = true;
      console.log('📱 DeviceMotionEvent permission not required');
    }

    return this.start();
  }

  private start(): boolean {
    if (!this.hasPermission) {
      console.warn('📱 Cannot start - permission not granted');
      return false;
    }

    if (this.isActive) {
      console.log('📱 Accelerometer already active');
      return true;
    }

    try {
      // Add the devicemotion event listener
      window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this), { passive: true });
      this.isActive = true;
      this.currentState.isActive = true;
      
      console.log('📱 Accelerometer started - beginning calibration...');
      this.startCalibration();
      
      EventBus.emit('accelerometer-started');
      return true;
    } catch (error) {
      console.error('📱 Failed to start accelerometer:', error);
      return false;
    }
  }

  stop(): void {
    if (!this.isActive) return;

    try {
      window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this));
      this.isActive = false;
      this.currentState.isActive = false;
      
      // Reset state
      this.resetState();
      
      console.log('📱 Accelerometer stopped');
      EventBus.emit('accelerometer-stopped');
    } catch (error) {
      console.error('📱 Error stopping accelerometer:', error);
    }
  }

  private resetState(): void {
    this.currentState = {
      horizontalTilt: 0,
      tiltIntensity: 0,
      shakeDetected: false,
      shouldAutoJump: false,
      isActive: this.isActive
    };
    this.horizontalMomentum = 0;
    this.accelerationHistory = [];
    this.isCalibrated = false;
    this.calibrationSamples = [];
  }

  private startCalibration(): void {
    console.log('📱 Starting accelerometer calibration...');
    this.isCalibrated = false;
    this.calibrationSamples = [];
    
    // Calibrate for 2 seconds to establish baseline
    setTimeout(() => {
      if (this.calibrationSamples.length > 10) {
        // Calculate baseline from samples
        const avgX = this.calibrationSamples.reduce((sum, val) => sum + val, 0) / this.calibrationSamples.length;
        this.baselineAcceleration.x = avgX;
        this.isCalibrated = true;
        
        console.log(`📱 Calibration complete - baseline X: ${avgX.toFixed(3)}`);
        EventBus.emit('accelerometer-calibrated', { baseline: this.baselineAcceleration });
      } else {
        console.warn('📱 Calibration failed - insufficient samples');
      }
    }, 2000);
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    // Update current acceleration
    this.currentAcceleration = {
      x: accel.x || 0,
      y: accel.y || 0,
      z: accel.z || 0
    };

    // Collect calibration samples
    if (!this.isCalibrated && this.calibrationSamples.length < 100) {
      this.calibrationSamples.push(this.currentAcceleration.x);
      return;
    }

    // Skip processing if not calibrated yet
    if (!this.isCalibrated) return;

    // Add to history for shake detection
    const timestamp = Date.now();
    this.accelerationHistory.push({
      x: this.currentAcceleration.x,
      timestamp
    });

    // Keep only recent history (last 500ms)
    this.accelerationHistory = this.accelerationHistory.filter(
      entry => timestamp - entry.timestamp < 500
    );

    this.updateState();
  }

  private updateState(): void {
    // Calculate calibrated horizontal tilt
    const rawTilt = this.currentAcceleration.x - this.baselineAcceleration.x;
    
    // Convert to normalized tilt based on max angle
    // On most phones, tilting creates acceleration changes of about ±4-8 m/s²
    const maxAcceleration = Math.sin(this.config.maxTiltAngle * Math.PI / 180) * 9.8;
    let normalizedTilt = (rawTilt / maxAcceleration) * this.config.sensitivity;
    
    // Apply dead zone
    if (Math.abs(normalizedTilt) < this.config.deadZone) {
      normalizedTilt = 0;
    }
    
    // Clamp to valid range
    normalizedTilt = Math.max(-1, Math.min(1, normalizedTilt));
    
    // Calculate tilt intensity (0 to 1)
    const tiltIntensity = Math.abs(normalizedTilt);
    
    // Update momentum (smooth integration of tilt)
    this.horizontalMomentum = Math.max(0, Math.min(1, 
      this.horizontalMomentum * 0.95 + tiltIntensity * 0.1
    ));
    
    // Detect shake/rapid movement
    const shakeDetected = this.detectShake();
    
    // Determine auto-jump conditions
    const shouldAutoJump = this.shouldTriggerAutoJump();
    
    // Update state
    this.currentState = {
      horizontalTilt: normalizedTilt,
      tiltIntensity,
      shakeDetected,
      shouldAutoJump,
      isActive: this.isActive
    };
    
    // Emit state for other systems
    EventBus.emit('accelerometer-input', this.currentState);
  }

  private detectShake(): boolean {
    if (this.accelerationHistory.length < 5) return false;
    
    const now = Date.now();
    const recentHistory = this.accelerationHistory.slice(-8); // Last 8 samples
    
    // Look for rapid acceleration changes
    let maxChange = 0;
    let rapidChanges = 0;
    
    for (let i = 1; i < recentHistory.length; i++) {
      const change = Math.abs(recentHistory[i].x - recentHistory[i - 1].x);
      maxChange = Math.max(maxChange, change);
      
      if (change > this.config.shakeThreshold) {
        rapidChanges++;
      }
    }
    
    const isShaking = rapidChanges >= 2 && maxChange > this.config.shakeThreshold;
    
    if (isShaking && now - this.lastShakeTime > 300) {
      this.lastShakeTime = now;
      console.log(`📱 Shake detected - intensity: ${maxChange.toFixed(2)}`);
      EventBus.emit('shake-detected', { intensity: maxChange });
      return true;
    }
    
    return false;
  }

  private shouldTriggerAutoJump(): boolean {
    if (!this.config.autoJumpEnabled) return false;
    
    const now = Date.now();
    const timeSinceLastJump = now - this.lastAutoJumpTime;
    
    if (timeSinceLastJump < this.config.autoJumpCooldown) return false;
    
    // Auto-jump conditions:
    // 1. Sufficient accumulated momentum from tilting
    // 2. Strong current tilt (aggressive input) OR recent shake
    const hasMomentum = this.horizontalMomentum > this.config.autoJumpThreshold;
    const hasAggressiveInput = this.currentState.tiltIntensity > 0.6;
    const recentShake = this.currentState.shakeDetected;
    
    const shouldJump = hasMomentum && (hasAggressiveInput || recentShake);
    
    if (shouldJump) {
      this.lastAutoJumpTime = now;
      console.log(`📱 Auto-jump triggered - momentum: ${this.horizontalMomentum.toFixed(2)}, tilt: ${this.currentState.tiltIntensity.toFixed(2)}`);
      EventBus.emit('auto-jump-triggered', {
        momentum: this.horizontalMomentum,
        tilt: this.currentState.tiltIntensity,
        shake: recentShake
      });
      return true;
    }
    
    return false;
  }

  // Public API
  getState(): AccelerometerState {
    return { ...this.currentState };
  }

  isReady(): boolean {
    return this.isSupported && this.hasPermission;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  updateConfig(newConfig: Partial<AccelerometerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📱 Accelerometer configuration updated');
  }

  destroy(): void {
    this.stop();
    console.log('📱 AccelerometerController destroyed');
  }
}