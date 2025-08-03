import { Scene } from 'phaser';
import { Player } from './Player';
import { GameConfiguration } from './GameConfiguration';
import { EventBus } from './EventBus';

export class DebugUI {
  private scene: Scene;
  private player: Player;
  private gameConfig: GameConfiguration;
  
  private debugText: Phaser.GameObjects.Text;
  private configPanel: Phaser.GameObjects.Container;
  private configTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private configValues: Map<string, number> = new Map();
  
  private isVisible: boolean = true;
  private updateInterval: number = 100; // ms
  private lastUpdate: number = 0;

  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
    this.scene = scene;
    this.player = player;
    this.gameConfig = gameConfig;
    
    this.setupDebugDisplay();
    this.setupConfigPanel();
    this.setupControls();
    this.initializeConfigValues();
  }

  private setupDebugDisplay(): void {
    this.debugText = this.scene.add.text(10, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setDepth(1000);
  }

  private setupConfigPanel(): void {
    this.configPanel = this.scene.add.container(10, 200);
    this.configPanel.setDepth(1000);
    
    const background = this.scene.add.rectangle(0, 0, 300, 400, 0x000000, 0.8);
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

  private setupControls(): void {
    const keys = this.scene.input.keyboard!.addKeys('C,Q,W,A,S,E,R,ONE,TWO,THREE');
    
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
  }

  private initializeConfigValues(): void {
    const physics = this.gameConfig.physics;
    this.configValues.set('baseJumpSpeed', physics.baseJumpSpeed);
    this.configValues.set('momentumCouplingFactor', physics.momentumCouplingFactor);
    this.configValues.set('maxHorizontalSpeed', physics.maxHorizontalSpeed);
    this.configValues.set('horizontalAcceleration', physics.horizontalAcceleration);
    this.configValues.set('horizontalDrag', physics.horizontalDrag);
    this.configValues.set('gravity', physics.gravity);
    
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
        if (key === 'momentumCouplingFactor') {
          text.setText(value.toFixed(3));
        } else {
          text.setText(Math.round(value).toString());
        }
      }
    });
  }

  private toggleConfigPanel(): void {
    this.configPanel.setVisible(!this.configPanel.visible);
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
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    
    const physics = this.gameConfig.physics;
    const momentumBoost = physics.momentumCouplingFactor * Math.abs(state.horizontalSpeed);
    const expectedJumpSpeed = physics.baseJumpSpeed + momentumBoost;
    
    const debugInfo = [
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
      `=== CONTROLS ===`,
      `C: Toggle Config Panel`,
      `Q/W: Adjust Coupling Factor`,
      `A/S: Adjust Base Jump Speed`,
      `E/R: Adjust Max H Speed`,
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
    this.debugText.destroy();
    this.configPanel.destroy();
  }
}