import { Scene } from 'phaser';
import { Player } from './Player';
import { GameConfiguration } from './GameConfiguration';
import { EventBus } from './EventBus';

export class DebugUI {
  private scene: Scene;
  private player: Player;
  private gameConfig: GameConfiguration;
  
  private cameraState: any = null;
  private platformCount: number = 0;
  
  private debugText: Phaser.GameObjects.Text;
  private configPanel: Phaser.GameObjects.Container;
  private configTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private configValues: Map<string, number> = new Map();
  
  private isVisible: boolean = false;
  private updateInterval: number = 100; // ms
  private lastUpdate: number = 0;

  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.gameConfig = gameConfig;
    
    this.setupDebugDisplay();
    this.setupConfigPanel();
    this.setupControls();
    this.setupEventListeners();
    this.initializeConfigValues();
  }

  private setupDebugDisplay(): void {
    this.debugText = this.scene.add.text(10, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setDepth(1000).setScrollFactor(0).setVisible(this.isVisible);
  }

  private setupConfigPanel(): void {
    this.configPanel = this.scene.add.container(10, 200);
    this.configPanel.setDepth(1000).setScrollFactor(0).setVisible(this.isVisible);
    
    const background = this.scene.add.rectangle(0, 0, 300, 450, 0x000000, 0.8);
    background.setOrigin(0, 0);
    this.configPanel.add(background);
    
    const title = this.scene.add.text(10, 10, 'Physics Config (Press C to toggle)', {
      fontSize: '16px',
      color: '#ffff00'
    });
    this.configPanel.add(title);
    
    this.createConfigControl('Base Jump Speed', 'baseJumpSpeed', 50, 400, 10);
    this.createConfigControl('Coupling Factor (k)', 'momentumCouplingFactor', 60, 0.1, 0.8, 0.05);
    this.createConfigControl('Max H Speed', 'maxHorizontalSpeed', 90, 200, 1000, 50);
    this.createConfigControl('H Acceleration', 'horizontalAcceleration', 120, 400, 2000, 100);
    this.createConfigControl('H Drag', 'horizontalDrag', 150, 200, 1500, 50);
    this.createConfigControl('Gravity', 'gravity', 180, 400, 1200, 50);
    
    // Wall Bounce Controls
    const wallTitle = this.scene.add.text(10, 220, 'Wall Bounce Config', {
      fontSize: '14px',
      color: '#00ffff'
    });
    this.configPanel.add(wallTitle);
    
    this.createWallConfigControl('Timing Window (ms)', 'timingWindowMs', 250, 100, 500, 25);
    this.createWallConfigControl('Perfect Timing (ms)', 'perfectTimingMs', 280, 25, 100, 25);
    this.createWallConfigControl('Perfect Preservation', 'perfectPreservation', 310, 0.8, 1.3, 0.05);
  }

  private createConfigControl(label: string, configKey: string, y: number, min: number, max: number, step: number = 10): void {
    const labelText = this.scene.add.text(10, y, label, {
      fontSize: '12px',
      color: '#ffffff'
    });
    this.configPanel.add(labelText);
    
    const valueText = this.scene.add.text(200, y, '0', {
      fontSize: '12px',
      color: '#00ff00'
    });
    this.configPanel.add(valueText);
    this.configTexts.set(configKey, valueText);
    
    const decreaseBtn = this.scene.add.text(10, y + 15, '- (Q/A)', {
      fontSize: '10px',
      color: '#ff6666'
    }).setInteractive();
    
    const increaseBtn = this.scene.add.text(100, y + 15, '+ (W/S)', {
      fontSize: '10px',
      color: '#66ff66'
    }).setInteractive();
    
    this.configPanel.add(decreaseBtn);
    this.configPanel.add(increaseBtn);
    
    decreaseBtn.on('pointerdown', () => this.adjustConfig(configKey, -step, min, max));
    increaseBtn.on('pointerdown', () => this.adjustConfig(configKey, step, min, max));
    
    (decreaseBtn as any).configKey = configKey;
    (decreaseBtn as any).step = -step;
    (decreaseBtn as any).min = min;
    (decreaseBtn as any).max = max;
    
    (increaseBtn as any).configKey = configKey;
    (increaseBtn as any).step = step;
    (increaseBtn as any).min = min;
    (increaseBtn as any).max = max;
  }

  private createWallConfigControl(label: string, configKey: string, y: number, min: number, max: number, step: number = 0.1): void {
    const labelText = this.scene.add.text(10, y, label, {
      fontSize: '12px',
      color: '#ffffff'
    });
    this.configPanel.add(labelText);
    
    const valueText = this.scene.add.text(200, y, '0', {
      fontSize: '12px',
      color: '#00ffff'
    });
    this.configPanel.add(valueText);
    this.configTexts.set(configKey, valueText);
    
    const decreaseBtn = this.scene.add.text(10, y + 15, '- (T/Y)', {
      fontSize: '10px',
      color: '#ff6666'
    }).setInteractive();
    
    const increaseBtn = this.scene.add.text(100, y + 15, '+ (U/I)', {
      fontSize: '10px',
      color: '#66ff66'
    }).setInteractive();
    
    this.configPanel.add(decreaseBtn);
    this.configPanel.add(increaseBtn);
    
    decreaseBtn.on('pointerdown', () => this.adjustWallConfig(configKey, -step, min, max));
    increaseBtn.on('pointerdown', () => this.adjustWallConfig(configKey, step, min, max));
  }

  private setupEventListeners(): void {
    EventBus.on('camera-state-updated', (cameraState: any) => {
      this.cameraState = cameraState;
    });
    
    EventBus.on('platform-generated', (data: any) => {
      this.platformCount++;
    });
    
    EventBus.on('platform-cleaned-up', (data: any) => {
      this.platformCount--;
    });
  }

  private setupControls(): void {
    const keys = this.scene.input.keyboard!.addKeys('C,Q,W,A,S,E,R,T,Y,U,I,ONE,TWO,THREE,D');
    
    (keys as any).D.on('down', () => this.toggleDebugUI());
    (keys as any).C.on('down', () => this.toggleConfigPanel());
    (keys as any).ONE.on('down', () => this.setPreset('default'));
    (keys as any).TWO.on('down', () => this.setPreset('high_momentum'));
    (keys as any).THREE.on('down', () => this.setPreset('low_momentum'));
    
    // Keyboard shortcuts for common adjustments
    (keys as any).Q.on('down', () => this.adjustConfig('momentumCouplingFactor', -0.05, 0.1, 0.8));
    (keys as any).W.on('down', () => this.adjustConfig('momentumCouplingFactor', 0.05, 0.1, 0.8));
    (keys as any).A.on('down', () => this.adjustConfig('baseJumpSpeed', -25, 200, 600));
    (keys as any).S.on('down', () => this.adjustConfig('baseJumpSpeed', 25, 200, 600));
    (keys as any).E.on('down', () => this.adjustConfig('maxHorizontalSpeed', -50, 300, 1000));
    (keys as any).R.on('down', () => this.adjustConfig('maxHorizontalSpeed', 50, 300, 1000));
    
    // Wall bounce controls
    (keys as any).T.on('down', () => this.adjustWallConfig('timingWindowMs', -25, 100, 500));
    (keys as any).Y.on('down', () => this.adjustWallConfig('timingWindowMs', 25, 100, 500));
    (keys as any).U.on('down', () => this.adjustWallConfig('perfectPreservation', -0.05, 0.8, 1.3));
    (keys as any).I.on('down', () => this.adjustWallConfig('perfectPreservation', 0.05, 0.8, 1.3));
  }

  private initializeConfigValues(): void {
    const physics = this.gameConfig.physics;
    const walls = this.gameConfig.walls;
    
    this.configValues.set('baseJumpSpeed', physics.baseJumpSpeed);
    this.configValues.set('momentumCouplingFactor', physics.momentumCouplingFactor);
    this.configValues.set('maxHorizontalSpeed', physics.maxHorizontalSpeed);
    this.configValues.set('horizontalAcceleration', physics.horizontalAcceleration);
    this.configValues.set('horizontalDrag', physics.horizontalDrag);
    this.configValues.set('gravity', physics.gravity);
    
    // Wall bounce configuration
    this.configValues.set('timingWindowMs', walls.timingWindowMs);
    this.configValues.set('perfectTimingMs', walls.perfectTimingMs);
    this.configValues.set('perfectPreservation', walls.momentumPreservation.perfect);
    
    this.updateConfigDisplay();
  }

  private adjustConfig(key: string, delta: number, min: number, max: number): void {
    const currentValue = this.configValues.get(key) || 0;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));
    this.configValues.set(key, newValue);
    
    this.gameConfig.updatePhysics({ [key]: newValue } as any);
    this.player.updateConfiguration(this.gameConfig);
    
    this.updateConfigDisplay();
    
    EventBus.emit('config-updated', { key, value: newValue });
  }

  private adjustWallConfig(key: string, delta: number, min: number, max: number): void {
    const currentValue = this.configValues.get(key) || 0;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));
    this.configValues.set(key, newValue);
    
    // Handle special case for nested momentum preservation values
    if (key === 'perfectPreservation') {
      const currentWalls = this.gameConfig.walls;
      this.gameConfig.updateWalls({
        momentumPreservation: {
          ...currentWalls.momentumPreservation,
          perfect: newValue
        }
      });
    } else {
      this.gameConfig.updateWalls({ [key]: newValue } as any);
    }
    
    this.player.updateConfiguration(this.gameConfig);
    this.updateConfigDisplay();
    
    EventBus.emit('wall-config-updated', { key, value: newValue });
  }

  private setPreset(preset: string): void {
    let newConfig: any = {};
    
    switch (preset) {
      case 'default':
        newConfig = {
          baseJumpSpeed: 400,
          momentumCouplingFactor: 0.3,
          maxHorizontalSpeed: 600,
          horizontalAcceleration: 1200,
          horizontalDrag: 800,
          gravity: 800
        };
        break;
      case 'high_momentum':
        newConfig = {
          baseJumpSpeed: 350,
          momentumCouplingFactor: 0.5,
          maxHorizontalSpeed: 800,
          horizontalAcceleration: 1500,
          horizontalDrag: 600,
          gravity: 750
        };
        break;
      case 'low_momentum':
        newConfig = {
          baseJumpSpeed: 450,
          momentumCouplingFactor: 0.15,
          maxHorizontalSpeed: 400,
          horizontalAcceleration: 800,
          horizontalDrag: 1000,
          gravity: 850
        };
        break;
    }
    
    Object.entries(newConfig).forEach(([key, value]) => {
      this.configValues.set(key, value as number);
    });
    
    this.gameConfig.updatePhysics(newConfig);
    this.player.updateConfiguration(this.gameConfig);
    this.updateConfigDisplay();
  }

  private updateConfigDisplay(): void {
    this.configValues.forEach((value, key) => {
      const text = this.configTexts.get(key);
      if (text) {
        if (key === 'momentumCouplingFactor' || key === 'perfectPreservation') {
          text.setText(value.toFixed(3));
        } else {
          text.setText(Math.round(value).toString());
        }
      }
    });
  }

  private toggleDebugUI(): void {
    this.isVisible = !this.isVisible;
    this.debugText.setVisible(this.isVisible);
    this.configPanel.setVisible(this.isVisible);
  }

  private toggleConfigPanel(): void {
    if (this.isVisible) {
      this.configPanel.setVisible(!this.configPanel.visible);
    }
  }

  update(time: number): void {
    if (!this.isVisible) return;
    
    if (time - this.lastUpdate > this.updateInterval) {
      this.updateDebugInfo();
      this.lastUpdate = time;
    }
  }

  private updateDebugInfo(): void {
    const state = this.player.getMovementState();
    const jumpPreview = this.player.getJumpPreview();
    const wallMetrics = this.player.getMovementController().getWallBounceMetrics();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    
    const physics = this.gameConfig.physics;
    const walls = this.gameConfig.walls;
    const momentumBoost = physics.momentumCouplingFactor * Math.abs(state.horizontalSpeed);
    const expectedJumpSpeed = physics.baseJumpSpeed + momentumBoost;
    
    // Get FPS info
    const game = this.scene.game;
    const fps = Math.round(game.loop.actualFps);
    const targetFps = game.loop.targetFps;
    
    const debugInfo = [
      `=== PERFORMANCE ===`,
      `FPS: ${fps}/${targetFps} (${fps < targetFps * 0.9 ? 'POOR' : 'GOOD'})`,
      `Frame Time: ${Math.round(game.loop.delta)}ms`,
      ``,
      `=== CAMERA & HEIGHT ===`,
      `Player Height: ${this.cameraState ? Math.round(this.cameraState.playerHeight) : 0}px`,
      `Highest Height: ${this.cameraState ? Math.round(this.cameraState.highestHeight) : 0}px`,
      `Camera Y: ${Math.round(this.scene.cameras.main.scrollY)}`,
      `Death Line Y: ${this.cameraState ? Math.round(this.cameraState.deathLineY) : 0}`,
      ``,
      `=== PLATFORMS ===`,
      `Active Platforms: ${this.platformCount}`,
      `Generation: ${this.platformCount > 1 ? 'ACTIVE' : 'WAITING'}`,
      ``,
      `=== PLAYER STATE ===`,
      `Position: (${Math.round(body.x)}, ${Math.round(body.y)})`,
      `Velocity: (${Math.round(state.horizontalSpeed)}, ${Math.round(state.verticalSpeed)})`,
      `Grounded: ${state.isGrounded ? 'YES' : 'NO'}`,
      `Moving: ${state.isMoving ? 'YES' : 'NO'}`,
      ``,
      `=== JUMP PHYSICS ===`,
      `Base Jump Speed: ${physics.baseJumpSpeed}`,
      `Coupling Factor (k): ${physics.momentumCouplingFactor.toFixed(3)}`,
      `Momentum Boost: +${Math.round(momentumBoost)}`,
      `Expected Jump Speed: ${Math.round(expectedJumpSpeed)}`,
      ``,
      `=== JUMP PREVIEW ===`,
      `Flight Time: ${jumpPreview.flightTime.toFixed(2)}s`,
      `Max Height: ${Math.round(jumpPreview.maxHeight)}px`,
      `Horizontal Range: ${Math.round(jumpPreview.horizontalRange)}px`,
      ``,
      `=== WALL BOUNCE ===`,
      `Bounce Count: ${wallMetrics.bounceCount}`,
      `In Timing Window: ${wallMetrics.isInTimingWindow ? 'YES' : 'NO'}`,
      `Window Time Left: ${Math.round(wallMetrics.timingWindowTimeLeft)}ms`,
      `Contact Side: ${wallMetrics.contactSide}`,
      `Pre-Contact Speed: ${Math.round(wallMetrics.preContactSpeed)}`,
      `Timing Window: ${walls.timingWindowMs}ms`,
      `Perfect Preservation: ${walls.momentumPreservation.perfect.toFixed(2)}`,
      ``,
      `=== BOUNCE ELIGIBILITY ===`,
      `Speed: ${Math.round(Math.abs(state.horizontalSpeed))}/${walls.minSpeedForBounce} ${Math.abs(state.horizontalSpeed) >= walls.minSpeedForBounce ? '✓' : '✗'}`,
      `Direction: ${state.horizontalSpeed < -10 ? 'LEFT ✓' : state.horizontalSpeed > 10 ? 'RIGHT ✓' : 'SLOW ✗'}`,
      `Ready: ${Math.abs(state.horizontalSpeed) >= walls.minSpeedForBounce && (Math.abs(state.horizontalSpeed) > 10) ? 'YES' : 'NO'}`,
      ``,
      `=== DEBUG INFO ===`,
      `Exact H Speed: ${state.horizontalSpeed.toFixed(1)}`,
      `Grounded State: ${state.isGrounded ? 'GROUND' : 'AIR'}`,
      `Window Active: ${state.isInWallBounceWindow ? 'ACTIVE' : 'NONE'}`,
      ``,
      `=== CONTROLS ===`,
      `C: Toggle Config Panel`,
      `Q/W: Adjust Coupling Factor`,
      `A/S: Adjust Base Jump Speed`,
      `E/R: Adjust Max H Speed`,
      `T/Y: Adjust Timing Window`,
      `U/I: Adjust Perfect Preservation`,
      `1/2/3: Load Presets`
    ].join('\n');
    
    this.debugText.setText(debugInfo);
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.debugText.setVisible(visible);
    this.configPanel.setVisible(visible && this.configPanel.visible);
  }

  destroy(): void {
    EventBus.off('camera-state-updated');
    EventBus.off('platform-generated');
    EventBus.off('platform-cleaned-up');
    this.debugText.destroy();
    this.configPanel.destroy();
  }
}