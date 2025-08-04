import { Scene } from 'phaser';
import { EventBus } from './EventBus';
import { BiomeManager, BiomeTheme } from './BiomeManager';

export class BackgroundColorManager {
  private scene: Scene;
  private biomeManager: BiomeManager;
  private currentBiome: BiomeTheme;
  private nextBiome: BiomeTheme;
  private platformCount: number = 0;
  
  // Smoothing and throttling
  private lastUpdateHeight: number = 0;
  private readonly UPDATE_THRESHOLD = 8; // Update every 8 pixels of height change
  private currentColorHex: string = '#4a7c59'; // Start with grassland primary
  private targetColorHex: string = '#4a7c59';
  private readonly SMOOTHING_FACTOR = 0.02; // Slow, smooth transitions
  
  // Store bound function references for proper EventBus cleanup
  private boundOnBiomeChanged: (data: any) => void;
  private boundOnCameraStateUpdated: (cameraState: any) => void;
  private boundOnGameReset: () => void;

  constructor(scene: Scene, biomeManager: BiomeManager) {
    this.scene = scene;
    this.biomeManager = biomeManager;
    
    // Bind event handlers once and store references
    this.boundOnBiomeChanged = this.onBiomeChanged.bind(this);
    this.boundOnCameraStateUpdated = this.onCameraStateUpdated.bind(this);
    this.boundOnGameReset = this.onGameReset.bind(this);
    
    this.initializeColors();
    this.setupEventListeners();
    
    console.log('🎨 BackgroundColorManager initialized');
  }

  private initializeColors(): void {
    this.currentBiome = this.biomeManager.getCurrentBiome();
    this.nextBiome = this.getNextBiome();
    
    // Initialize with current biome primary color
    this.currentColorHex = this.currentBiome.colors.primary;
    this.targetColorHex = this.currentBiome.colors.primary;
    
    // Set initial background color
    this.scene.cameras.main.setBackgroundColor(this.currentColorHex);
  }

  private setupEventListeners(): void {
    EventBus.on('biome-changed', this.boundOnBiomeChanged);
    EventBus.on('camera-state-updated', this.boundOnCameraStateUpdated);
    EventBus.on('game-fully-reset', this.boundOnGameReset);
  }

  private onBiomeChanged(data: any): void {
    console.log(`🎨 Biome changed: ${data.currentBiome.name} - updating background colors`);
    
    this.currentBiome = data.currentBiome;
    this.nextBiome = this.getNextBiome();
    this.platformCount = data.platformCount;
    
    // Only update target color, let smoothing handle the transition
    this.updateTargetColor();
  }

  private onCameraStateUpdated(cameraState: any): void {
    // CRITICAL: Stop processing if scene is no longer active (prevents stale MenuScene updates)
    if (!this.scene || !this.scene.scene?.isActive()) {
      console.warn('🎨 BackgroundColorManager: Scene not active, ignoring camera update');
      return;
    }

    // Additional safety check: ensure camera is available before processing
    if (!this.scene.cameras?.main) {
      console.warn('🎨 BackgroundColorManager: Camera not available during update, ignoring');
      return;
    }

    // Throttle target color updates but always smooth the current color
    const heightDiff = Math.abs(cameraState.playerHeight - this.lastUpdateHeight);
    if (heightDiff >= this.UPDATE_THRESHOLD) {
      this.lastUpdateHeight = cameraState.playerHeight;
      this.updateTargetColor();
    }
    
    // Always smooth toward target color (with camera safety check already done)
    this.smoothBackgroundColor();
  }

  private onGameReset(): void {
    this.platformCount = 0;
    this.lastUpdateHeight = 0;
    this.initializeColors();
    console.log('🎨 BackgroundColorManager reset');
  }

  private updateTargetColor(): void {
    this.targetColorHex = this.calculateInterpolatedColor();
  }

  private smoothBackgroundColor(): void {
    // Only update if there's a meaningful difference
    if (this.currentColorHex === this.targetColorHex) {
      return;
    }

    // Safety check: ensure scene is still active (FIRST CHECK)
    if (!this.scene || !this.scene.scene?.isActive()) {
      // Don't log here since onCameraStateUpdated already logs it
      return;
    }

    // Safety check: ensure camera exists before trying to update it
    if (!this.scene.cameras?.main) {
      // Don't log here since onCameraStateUpdated already logs it
      return;
    }

    // Interpolate current color toward target color using Phaser's Linear interpolation
    const currentRgb = this.hexToRgb(this.currentColorHex);
    const targetRgb = this.hexToRgb(this.targetColorHex);
    
    const smoothedRgb = {
      r: Phaser.Math.Linear(currentRgb.r, targetRgb.r, this.SMOOTHING_FACTOR),
      g: Phaser.Math.Linear(currentRgb.g, targetRgb.g, this.SMOOTHING_FACTOR),
      b: Phaser.Math.Linear(currentRgb.b, targetRgb.b, this.SMOOTHING_FACTOR)
    };
    
    this.currentColorHex = this.rgbToHex(smoothedRgb);
    this.scene.cameras.main.setBackgroundColor(this.currentColorHex);
  }

  private calculateInterpolatedColor(): string {
    // Get progress through current biome (0.0 to 1.0)
    const biomeProgress = this.getBiomeProgress();
    
    // Get progress toward next biome transition (0.0 to 1.0)
    const transitionProgress = this.getTransitionProgress();
    
    // Convert hex colors to RGB for interpolation
    const currentPrimary = this.hexToRgb(this.currentBiome.colors.primary);
    const currentSecondary = this.hexToRgb(this.currentBiome.colors.secondary);
    const nextPrimary = this.hexToRgb(this.nextBiome.colors.primary);
    
    // Use much more subtle interpolation within biomes
    const subtleBiomeProgress = biomeProgress * 0.3; // Only 30% of the way to secondary color
    const currentBiomeColor = this.interpolateRgb(currentPrimary, currentSecondary, subtleBiomeProgress);
    
    // Start blending to next biome much earlier for smoother progression
    if (transitionProgress > 0.4) { // Start blending after 40% through biome
      const blendFactor = (transitionProgress - 0.4) / 0.6; // 0.0 to 1.0 over 60% of biome
      // Make inter-biome transition more gradual
      const subtleBlendFactor = blendFactor * 0.5; // Only 50% toward next biome's primary
      const finalColor = this.interpolateRgb(currentBiomeColor, nextPrimary, subtleBlendFactor);
      return this.rgbToHex(finalColor);
    }
    
    return this.rgbToHex(currentBiomeColor);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private rgbToHex(rgb: { r: number; g: number; b: number }): string {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  private interpolateRgb(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }, factor: number): { r: number; g: number; b: number } {
    return {
      r: color1.r + (color2.r - color1.r) * factor,
      g: color1.g + (color2.g - color1.g) * factor,
      b: color1.b + (color2.b - color1.b) * factor
    };
  }

  private getBiomeProgress(): number {
    // Calculate progress within current biome based on vertical height
    // Use a moderate cycle for gradual but noticeable color changes
    const heightInBiome = this.lastUpdateHeight % 400; // 400px cycles within each biome
    return Math.min(1.0, heightInBiome / 400);
  }

  private getTransitionProgress(): number {
    // Calculate how close we are to the next biome transition
    const platformsUntilNext = this.biomeManager.getPlatformsUntilNextBiome();
    const totalPlatformsInBiome = this.calculateCurrentBiomeLength();
    
    if (totalPlatformsInBiome <= 0) return 0;
    
    const progressThroughBiome = 1.0 - (platformsUntilNext / totalPlatformsInBiome);
    return Math.max(0, Math.min(1.0, progressThroughBiome));
  }

  private calculateCurrentBiomeLength(): number {
    // Calculate the length of the current biome in platforms
    const currentPlatformCount = this.biomeManager.getPlatformCount();
    
    // Biome transition points: 25, 50, 75, 100, then every 50
    if (currentPlatformCount < 25) return 25;
    if (currentPlatformCount < 50) return 25;
    if (currentPlatformCount < 75) return 25;
    if (currentPlatformCount < 100) return 25;
    
    // After 100, biomes are 50 platforms each
    return 50;
  }

  private getNextBiome(): BiomeTheme {
    const allBiomes = this.biomeManager.getAllBiomes();
    const currentIndex = this.biomeManager.getCurrentBiomeIndex();
    const nextIndex = (currentIndex + 1) % allBiomes.length;
    return allBiomes[nextIndex];
  }

  // Debug method to force color update
  forceColorUpdate(): void {
    this.updateTargetColor();
    console.log(`🎨 [DEBUG] Background color updated - Current biome: ${this.currentBiome.name}`);
  }

  // Debug method to get current color info
  getColorDebugInfo(): any {
    const targetColorHex = this.calculateInterpolatedColor();
    const currentColorRgb = this.hexToRgb(this.currentColorHex);
    const targetColorRgb = this.hexToRgb(targetColorHex);
    
    return {
      currentBiome: this.currentBiome.name,
      nextBiome: this.nextBiome.name,
      biomeProgress: this.getBiomeProgress(),
      transitionProgress: this.getTransitionProgress(),
      currentColor: {
        hex: this.currentColorHex,
        r: currentColorRgb.r,
        g: currentColorRgb.g,
        b: currentColorRgb.b
      },
      targetColor: {
        hex: targetColorHex,
        r: targetColorRgb.r,
        g: targetColorRgb.g,
        b: targetColorRgb.b
      },
      platformCount: this.platformCount,
      lastUpdateHeight: this.lastUpdateHeight,
      smoothingFactor: this.SMOOTHING_FACTOR
    };
  }

  destroy(): void {
    console.log('🎨 BackgroundColorManager destroy() called - removing EventBus listeners');
    
    // Properly remove EventBus listeners using stored bound function references
    EventBus.off('biome-changed', this.boundOnBiomeChanged);
    EventBus.off('camera-state-updated', this.boundOnCameraStateUpdated);
    EventBus.off('game-fully-reset', this.boundOnGameReset);
    
    // Clear scene reference to prevent any further updates
    this.scene = null as any;
    this.biomeManager = null as any;
    
    console.log('✅ BackgroundColorManager destroyed and EventBus listeners removed');
  }
}