import { Scene } from 'phaser';
import { EventBus } from './EventBus';
import { AudioManager } from './AudioManager';

export class GameMenu {
  private scene: Scene;
  private audioManager: AudioManager;
  
  // UI Elements
  private menuBackground: any; // RexUI overlay
  private mainMenu: any; // RexUI Sizer
  private settingsMenu: any; // RexUI Sizer
  private isVisible: boolean = false;
  private currentMenu: 'main' | 'settings' = 'main';
  
  // Available sound options for dropdowns
  private readonly AVAILABLE_SOUNDS = [
    { label: 'Jump Sound', value: 'sfx_jump' },
    { label: 'High Jump Sound', value: 'sfx_jump-high' },
    { label: 'Bump Sound', value: 'sfx_bump' },
    { label: 'Coin Sound', value: 'sfx_coin' },
    { label: 'Disappear Sound', value: 'sfx_disappear' },
    { label: 'Gem Sound', value: 'sfx_gem' },
    { label: 'Hurt Sound', value: 'sfx_hurt' },
    { label: 'Magic Sound', value: 'sfx_magic' },
    { label: 'Select Sound', value: 'sfx_select' },
    { label: 'Throw Sound', value: 'sfx_throw' }
  ];
  
  // Sound event mappings for settings
  private readonly SOUND_EVENTS = [
    { key: 'jump-normal', label: 'Normal Jump', defaultSound: 'sfx_jump' },
    { key: 'jump-high', label: 'High Speed Jump', defaultSound: 'sfx_jump-high' },
    { key: 'wall-bounce', label: 'Wall Bounce', defaultSound: 'sfx_bump' },
    { key: 'wall-bounce-perfect', label: 'Perfect Wall Bounce', defaultSound: 'sfx_gem' },
    { key: 'combo-complete', label: 'Combo Complete', defaultSound: 'sfx_coin' },
    { key: 'combo-broken', label: 'Combo Broken', defaultSound: 'sfx_disappear' },
    { key: 'milestone', label: 'Height Milestone', defaultSound: 'sfx_magic' },
    { key: 'game-over', label: 'Game Over', defaultSound: 'sfx_hurt' },
    { key: 'ui-select', label: 'UI Selection', defaultSound: 'sfx_select' }
  ];

  constructor(scene: Scene, audioManager: AudioManager) {
    this.scene = scene;
    this.audioManager = audioManager;
    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    // Listen for Escape key to toggle menu
    this.scene.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
      console.log('ESC pressed, menu visible:', this.isVisible);
      if (this.isVisible) {
        this.hideMenu();
      } else {
        this.showMenu();
      }
    });
  }

  private showMenu(): void {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.currentMenu = 'main';
    
    // Pause the game
    EventBus.emit('game-paused', true);
    
    this.createMenuBackground();
    this.createMainMenu();
  }

  private hideMenu(): void {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    
    // Resume the game
    EventBus.emit('game-paused', false);
    
    // Destroy all menu elements
    this.destroyMenus();
  }

  private createMenuBackground(): void {
    // Semi-transparent overlay using a simple rectangle
    this.menuBackground = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0.7
    )
    .setDepth(2000)
    .setScrollFactor(0)
    .setInteractive()
    .on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
      // Only close menu if clicking directly on background, not on UI elements
      console.log('Background clicked - closing menu');
      event.stopPropagation();
      this.hideMenu();
    });
  }

  private createMainMenu(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    this.mainMenu = this.scene.rexUI.add.sizer({
      x: centerX,
      y: centerY,
      orientation: 'vertical',
      space: { item: 20 }
    });

    // Title
    const title = this.scene.rexUI.add.label({
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 10, 0x333333, 0.9),
      text: this.scene.add.text(0, 0, '⏸️ GAME PAUSED', {
        fontSize: 32,  // Use number for pixel-perfect rendering
        resolution: 2,  // Higher resolution for crisp text
        color: '#ffffff',
        fontStyle: 'bold'
      }),
      space: { left: 20, right: 20, top: 15, bottom: 15 }
    });

    // Resume button
    const resumeButton = this.createButton('▶️ Resume Game', () => {
      this.hideMenu();
    });

    // Settings button
    const settingsButton = this.createButton('⚙️ Audio Settings', () => {
      this.showSettingsMenu();
    });

    // Restart button
    const restartButton = this.createButton('🔄 Restart Game', () => {
      this.hideMenu();
      EventBus.emit('request-game-restart');
    });

    // Add all elements
    this.mainMenu
      .add(title, { align: 'center' })
      .add(resumeButton, { align: 'center' })
      .add(settingsButton, { align: 'center' })
      .add(restartButton, { align: 'center' })
      .setDepth(2100)
      .setScrollFactor(0)
      .layout();
  }

  private showSettingsMenu(): void {
    this.currentMenu = 'settings';
    this.mainMenu.setVisible(false);
    this.createSettingsMenu();
  }

  private createSettingsMenu(): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    this.settingsMenu = this.scene.rexUI.add.scrollablePanel({
      x: centerX,
      y: centerY,
      width: 600,
      height: 500,

      scrollMode: 'vertical',

      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 15, 0x222222, 0.95)
        .setStrokeStyle(2, 0xffaa00, 1),

      panel: {
        child: this.createSettingsContent(),
        mask: {
          padding: 1
        }
      },

      slider: {
        track: this.scene.rexUI.add.roundRectangle(0, 0, 20, 10, 6, 0x555555),
        thumb: this.scene.rexUI.add.roundRectangle(0, 0, 20, 20, 8, 0xffaa00)
      },

      space: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
        panel: 10
      }
    })
    .setDepth(2100)
    .setScrollFactor(0)
    .layout();
  }

  private createSettingsContent(): any {
    const content = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 15 }
    });

    // Title
    const title = this.scene.add.text(0, 0, '🔊 Audio Settings', {
      fontSize: 28,  // Use number for pixel-perfect rendering
      resolution: 2,  // Higher resolution for crisp text
      color: '#ffaa00',
      fontStyle: 'bold'
    });
    content.add(title, { align: 'center' });

    // Master volume slider
    content.add(this.createVolumeSlider('Master Volume', 
      this.audioManager.getSettings().masterVolume,
      (value: number) => this.audioManager.setMasterVolume(value)
    ), { align: 'center' });

    // SFX volume slider
    content.add(this.createVolumeSlider('Sound Effects Volume', 
      this.audioManager.getSettings().sfxVolume,
      (value: number) => this.audioManager.setSfxVolume(value)
    ), { align: 'center' });

    // Sound event mappings
    const eventsTitle = this.scene.add.text(0, 0, '🎵 Sound Event Assignments', {
      fontSize: 22,  // Use number for pixel-perfect rendering
      resolution: 2,  // Higher resolution for crisp text
      color: '#ffffff',
      fontStyle: 'bold'
    });
    content.add(eventsTitle, { align: 'center' });

    // Create dropdown for each sound event
    this.SOUND_EVENTS.forEach(event => {
      content.add(this.createSoundEventRow(event), { align: 'center' });
    });

    // Back button
    const backButton = this.createButton('⬅️ Back to Menu', () => {
      this.showMainMenu();
    });
    content.add(backButton, { align: 'center' });

    return content;
  }

  private createVolumeSlider(label: string, initialValue: number, callback: (value: number) => void): any {
    return this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 10 }
    })
    .add(this.scene.add.text(0, 0, label, {
      fontSize: 16,  // Use number for pixel-perfect rendering
      resolution: 2,  // Higher resolution for crisp text
      color: '#ffffff'
    }), { proportion: 0, align: 'center-left' })
    .add(this.scene.rexUI.add.slider({
      width: 200,
      height: 20,
      orientation: 'horizontal',
      track: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 6, 0x555555),
      thumb: this.scene.rexUI.add.roundRectangle(0, 0, 20, 20, 10, 0xffaa00),
      value: initialValue,
      valuechangeCallback: callback
    }), { proportion: 0, align: 'center' })
    .layout();
  }

  private createSoundEventRow(event: any): any {
    const row = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 10 }
    });

    // Event label
    const label = this.scene.add.text(0, 0, event.label, {
      fontSize: '14px',
      color: '#ffffff'
    });
    row.add(label, { proportion: 1, align: 'center-left' });

    // Sound dropdown
    const dropdown = this.scene.rexUI.add.dropDownList({
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 5, 0x444444)
        .setStrokeStyle(1, 0x888888),
      
      text: this.scene.add.text(0, 0, this.getSoundLabel(event.defaultSound), {
        fontSize: '12px',
        color: '#ffffff'
      }),

      space: { left: 8, right: 8, top: 5, bottom: 5 },

      options: this.AVAILABLE_SOUNDS.map(sound => ({
        text: sound.label,
        value: sound.value
      })),

      list: {
        // Higher depth for dropdown list
        createBackgroundCallback: () => {
          return this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 5, 0x333333, 0.95)
            .setStrokeStyle(1, 0x888888)
            .setDepth(2300); // Higher than other menu elements
        },
        createButtonCallback: (scene: any, option: any) => {
          return scene.rexUI.add.label({
            background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 0, 0x444444, 0.01),
            text: scene.add.text(0, 0, option.text, {
              fontSize: '12px',
              color: '#ffffff'  
            }),
            space: { left: 8, right: 8, top: 4, bottom: 4 }
          })
          .setDepth(2350); // Even higher for dropdown items
        },
        onButtonClick: (button: any, index: number, pointer: any, clickEvent: any) => {
          // Update the audio manager mapping
          const selectedSound = this.AVAILABLE_SOUNDS[index];
          this.audioManager.updateSoundMapping(event.key, selectedSound.value);
          console.log(`Sound mapping updated: ${event.key} -> ${selectedSound.value}`);
          
          // Update the dropdown text to show the new selection
          dropdown.getElement('text').setText(selectedSound.label);
          dropdown.layout();
          
          // Stop event from propagating to background
          if (clickEvent) {
            clickEvent.stopPropagation();
          }
        }
      }
    })
    .setDepth(2200) // Higher depth for dropdown itself
    .on('pointerdown', (pointer: any, localX: number, localY: number, clickEvent: any) => {
      // Prevent dropdown clicks from closing menu
      if (clickEvent) {
        clickEvent.stopPropagation();
      }
    });

    row.add(dropdown, { proportion: 0, align: 'center' });

    // Preview button
    const previewButton = this.scene.rexUI.add.label({
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 5, 0x666666)
        .setStrokeStyle(1, 0xaaaaaa),
      text: this.scene.add.text(0, 0, '🔊', {
        fontSize: '12px'
      }),
      space: { left: 6, right: 6, top: 4, bottom: 4 }
    })
    .setInteractive()
    .on('pointerdown', (pointer: any, localX: number, localY: number, clickEvent: any) => {
      // Play preview of current sound
      console.log(`Playing preview sound for: ${event.key}`);
      this.audioManager.playSound(event.key);
      
      // Stop event from propagating to background
      if (clickEvent) {
        clickEvent.stopPropagation();
      }
    });

    row.add(previewButton, { proportion: 0, align: 'center' });

    return row.layout();
  }

  private getSoundLabel(soundKey: string): string {
    const sound = this.AVAILABLE_SOUNDS.find(s => s.value === soundKey);
    return sound ? sound.label : soundKey;
  }

  private showMainMenu(): void {
    this.currentMenu = 'main';
    this.settingsMenu?.setVisible(false);
    this.mainMenu.setVisible(true);
  }

  private createButton(text: string, callback: () => void): any {
    const button = this.scene.rexUI.add.label({
      background: this.scene.rexUI.add.roundRectangle(0, 0, 2, 2, 8, 0x444444)
        .setStrokeStyle(2, 0xffaa00),
      
      text: this.scene.add.text(0, 0, text, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }),
      
      space: { left: 20, right: 20, top: 10, bottom: 10 }
    });

    // Set up proper interactivity
    button.setInteractive();
    button.on('pointerdown', (pointer: any, localX: number, localY: number, event: any) => {
      console.log('Button clicked:', text);
      
      // Stop event from propagating to background
      if (event) {
        event.stopPropagation();
      }
      
      callback();
    });
    
    button.on('pointerover', () => {
      button.getElement('background').setFillStyle(0x666666);
    });
    
    button.on('pointerout', () => {
      button.getElement('background').setFillStyle(0x444444);
    });

    return button;
  }

  private destroyMenus(): void {
    this.menuBackground?.destroy();
    this.mainMenu?.destroy();
    this.settingsMenu?.destroy();
    
    this.menuBackground = null;
    this.mainMenu = null;
    this.settingsMenu = null;
  }

  public isMenuVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.destroyMenus();
    this.scene.input.keyboard?.off('keydown-ESC');
  }
}