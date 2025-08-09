/**
 * PowerupUI.ts
 * 
 * Displays active powerup effects in the game UI with icons, names, and timers
 */

import { Scene } from 'phaser';
import { PowerupType, POWERUP_CONFIGS } from './PowerupType';
import { EventBus } from '../EventBus';
import { PowerupEffectSystem } from './PowerupEffectSystem';

interface ActivePowerupDisplay {
    type: PowerupType;
    name: string;
    duration?: number;
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Sprite;
    nameText: Phaser.GameObjects.Text;
    timerText?: Phaser.GameObjects.Text;
    timerBar?: Phaser.GameObjects.Graphics;
    startTime: number;
}

export class PowerupUI {
    private scene: Scene;
    private effectSystem: PowerupEffectSystem;
    private activePowerupDisplays: Map<PowerupType, ActivePowerupDisplay> = new Map();
    private readonly UI_DEPTH = 1000;
    private readonly POWERUP_PANEL_WIDTH = 220;
    private readonly POWERUP_PANEL_HEIGHT = 60;
    private readonly PANEL_SPACING = 5;

    constructor(scene: Scene, effectSystem: PowerupEffectSystem) {
        this.scene = scene;
        this.effectSystem = effectSystem;
        
        this.setupEventListeners();
        console.log('🎨 PowerupUI initialized');
    }

    private setupEventListeners(): void {
        EventBus.on('powerup-effect-applied', this.onPowerupEffectApplied.bind(this));
        EventBus.on('powerup-effect-removed', this.onPowerupEffectRemoved.bind(this));
        EventBus.on('game-fully-reset', this.onGameReset.bind(this));
    }

    private onPowerupEffectApplied(data: { type: PowerupType; name: string; duration?: number }): void {
        this.addPowerupDisplay(data.type, data.name, data.duration);
    }

    private onPowerupEffectRemoved(data: { type: PowerupType }): void {
        this.removePowerupDisplay(data.type);
    }

    private addPowerupDisplay(type: PowerupType, name: string, duration?: number): void {
        // Remove existing display if present
        if (this.activePowerupDisplays.has(type)) {
            this.removePowerupDisplay(type);
        }

        const config = POWERUP_CONFIGS[type];
        const displayIndex = this.activePowerupDisplays.size;
        
        // Calculate position (top-right corner, stacked vertically)
        const x = this.scene.scale.width - this.POWERUP_PANEL_WIDTH - 10;
        const y = 20 + displayIndex * (this.POWERUP_PANEL_HEIGHT + this.PANEL_SPACING);

        // Create container for the powerup display
        const container = this.scene.add.container(x, y);
        container.setDepth(this.UI_DEPTH);
        
        // CRITICAL: Make UI follow camera instead of moving with world
        container.setScrollFactor(0, 0);

        // Background panel
        const background = this.scene.add.graphics();
        const panelColor = config.effectColor || 0x444444;
        background.fillStyle(panelColor, 0.8);
        background.fillRoundedRect(0, 0, this.POWERUP_PANEL_WIDTH, this.POWERUP_PANEL_HEIGHT, 8);
        background.lineStyle(2, 0xffffff, 0.6);
        background.strokeRoundedRect(0, 0, this.POWERUP_PANEL_WIDTH, this.POWERUP_PANEL_HEIGHT, 8);

        // Powerup icon
        const icon = this.scene.add.sprite(15, this.POWERUP_PANEL_HEIGHT / 2, config.assetKey);
        icon.setScale(0.8);
        icon.setOrigin(0, 0.5);

        // Powerup name text
        const nameText = this.scene.add.text(45, 12, name, {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        // Timer elements for temporary effects
        let timerText: Phaser.GameObjects.Text | undefined;
        let timerBar: Phaser.GameObjects.Graphics | undefined;

        if (duration) {
            // Timer text
            timerText = this.scene.add.text(45, 32, this.formatTime(duration), {
                fontSize: '12px',
                color: '#cccccc'
            });

            // Timer bar background
            timerBar = this.scene.add.graphics();
            timerBar.fillStyle(0x333333, 0.8);
            timerBar.fillRect(45, 45, this.POWERUP_PANEL_WIDTH - 55, 8);
            
            // Timer bar fill
            timerBar.fillStyle(0xffffff, 1.0);
            timerBar.fillRect(45, 45, this.POWERUP_PANEL_WIDTH - 55, 8);
        } else {
            // Permanent effect indicator
            const permanentText = this.scene.add.text(45, 32, '∞ PERMANENT', {
                fontSize: '11px',
                color: '#ffdd00',
                fontStyle: 'bold'
            });
            container.add(permanentText);
        }

        // Add all elements to container
        container.add([background, icon, nameText]);
        if (timerText) container.add(timerText);
        if (timerBar) container.add(timerBar);

        // Store display data
        const display: ActivePowerupDisplay = {
            type,
            name,
            duration,
            container,
            background,
            icon,
            nameText,
            timerText,
            timerBar,
            startTime: this.scene.time.now
        };

        this.activePowerupDisplays.set(type, display);

        // Add entrance animation
        this.playEntranceAnimation(container);
    }

    private removePowerupDisplay(type: PowerupType): void {
        const display = this.activePowerupDisplays.get(type);
        if (!display) return;

        // Play exit animation
        this.playExitAnimation(display.container, () => {
            display.container.destroy();
            this.activePowerupDisplays.delete(type);
            this.repositionDisplays();
        });
    }

    private playEntranceAnimation(container: Phaser.GameObjects.Container): void {
        // Start off-screen to the right
        container.setX(container.x + 250);
        container.setAlpha(0);

        // Slide in and fade in
        this.scene.tweens.add({
            targets: container,
            x: this.scene.scale.width - this.POWERUP_PANEL_WIDTH - 10,
            alpha: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });
    }

    private playExitAnimation(container: Phaser.GameObjects.Container, onComplete: () => void): void {
        // Slide out to the right and fade out
        this.scene.tweens.add({
            targets: container,
            x: container.x + 250,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete
        });
    }

    private repositionDisplays(): void {
        let index = 0;
        const targetX = this.scene.scale.width - this.POWERUP_PANEL_WIDTH - 10;

        this.activePowerupDisplays.forEach((display) => {
            const targetY = 20 + index * (this.POWERUP_PANEL_HEIGHT + this.PANEL_SPACING);
            
            // Animate to new position
            this.scene.tweens.add({
                targets: display.container,
                x: targetX,
                y: targetY,
                duration: 200,
                ease: 'Power2.easeOut'
            });
            
            index++;
        });
    }

    public update(): void {
        const currentTime = this.scene.time.now;

        this.activePowerupDisplays.forEach((display, type) => {
            if (!display.duration || !display.timerText || !display.timerBar) return;

            // Calculate remaining time
            const elapsed = currentTime - display.startTime;
            const remaining = Math.max(0, display.duration - elapsed);
            const progress = 1 - (remaining / display.duration);

            // Update timer text
            display.timerText.setText(this.formatTime(remaining));

            // Update timer bar
            if (display.timerBar) {
                display.timerBar.clear();
                
                // Background bar
                display.timerBar.fillStyle(0x333333, 0.8);
                display.timerBar.fillRect(45, 45, this.POWERUP_PANEL_WIDTH - 55, 8);
                
                // Progress bar
                const barWidth = (this.POWERUP_PANEL_WIDTH - 55) * (1 - progress);
                if (barWidth > 0) {
                    display.timerBar.fillStyle(0xffffff, 1.0);
                    display.timerBar.fillRect(45, 45, barWidth, 8);
                }
            }

            // Flash effect when nearly expired (last 3 seconds)
            if (remaining <= 3000 && remaining > 0) {
                const flashAlpha = Math.sin(currentTime * 0.01) * 0.3 + 0.7;
                display.container.setAlpha(flashAlpha);
            } else {
                display.container.setAlpha(1.0);
            }
        });
    }

    private formatTime(milliseconds: number): string {
        const seconds = Math.ceil(milliseconds / 1000);
        
        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        
        return `${seconds}s`;
    }

    private onGameReset(): void {
        this.reset();
    }

    public reset(): void {
        console.log('🔄 PowerupUI reset');
        
        // Destroy all displays
        this.activePowerupDisplays.forEach((display) => {
            display.container.destroy();
        });
        
        this.activePowerupDisplays.clear();
    }

    public destroy(): void {
        // Clean up event listeners
        EventBus.off('powerup-effect-applied', this.onPowerupEffectApplied.bind(this));
        EventBus.off('powerup-effect-removed', this.onPowerupEffectRemoved.bind(this));
        EventBus.off('game-fully-reset', this.onGameReset.bind(this));
        
        this.reset();
        console.log('🎨 PowerupUI destroyed');
    }
}