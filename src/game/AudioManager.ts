import { Scene } from 'phaser';
import { EventBus } from './EventBus';

export interface AudioSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  enabled: boolean;
}

export interface SoundEffect {
  volume?: number;
  rate?: number;
  detune?: number;
  loop?: boolean;
}

export class AudioManager {
  private scene: Scene;
  private settings: AudioSettings;
  
  // Sound effect pools for better performance
  private soundEffects: Map<string, Phaser.Sound.BaseSound[]> = new Map();
  private activeSounds: Set<Phaser.Sound.BaseSound> = new Set();
  
  // Sound effect mappings
  private readonly SOUND_MAPPINGS: { [key: string]: string } = {
    // Jump sounds
    'jump-normal': 'sfx_jump',
    'jump-high': 'sfx_jump-high',
    
    // Wall bounce sounds
    'wall-bounce': 'sfx_bump',
    'wall-bounce-perfect': 'sfx_gem',
    
    // Combo and score sounds
    'combo-complete': 'sfx_coin',
    'combo-broken': 'sfx_disappear',
    'milestone': 'sfx_magic',
    
    // UI and game state sounds
    'game-over': 'sfx_hurt',
    'ui-select': 'sfx_select',
    'special-effect': 'sfx_throw'
  };

  constructor(scene: Scene) {
    this.scene = scene;
    
    // Default audio settings - master volume set to 0 until better sounds are found
    this.settings = {
      masterVolume: 0.0, // Muted by default
      sfxVolume: 0.8,
      musicVolume: 0.6,
      enabled: true
    };
    
    this.loadSettings();
    this.loadSoundMappings();
    this.setupEventListeners();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('icy-tower-audio-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('AudioManager: Failed to load audio settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('icy-tower-audio-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('AudioManager: Failed to save audio settings:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for game events that should trigger sounds
    EventBus.on('player-jumped', this.onPlayerJump.bind(this));
    EventBus.on('player-wall-bounce', this.onWallBounce.bind(this));
    EventBus.on('combo-event-added', this.onComboEvent.bind(this));
    EventBus.on('combo-completed', this.onComboCompleted.bind(this));
    EventBus.on('combo-broken', this.onComboBroken.bind(this));
    EventBus.on('height-milestone-reached', this.onHeightMilestone.bind(this));
    EventBus.on('game-over', this.onGameOver.bind(this));
  }

  // Event handlers for game sounds
  private onPlayerJump(data: any): void {
    const { horizontalSpeed, jumpPower } = data;
    
    // Use high jump sound for high-momentum jumps
    if (horizontalSpeed > 300 || jumpPower > 600) {
      this.playSound('jump-high', { 
        volume: 0.7,
        rate: 1.0 + (horizontalSpeed / 1000) // Slightly higher pitch for faster jumps
      });
    } else {
      this.playSound('jump-normal', { 
        volume: 0.6,
        rate: 0.9 + (horizontalSpeed / 1500) // Vary pitch based on speed
      });
    }
  }

  private onWallBounce(data: any): void {
    const { timingQuality, momentumPreserved } = data;
    
    // Perfect timing gets special sound
    if (timingQuality === 'perfect') {
      this.playSound('wall-bounce-perfect', { 
        volume: 0.8,
        rate: 1.2
      });
    } else {
      this.playSound('wall-bounce', { 
        volume: 0.7,
        rate: 1.0 + (momentumPreserved / 1000) // Higher pitch for better bounces
      });
    }
  }

  private onComboEvent(data: any): void {
    // Subtle sound for combo event addition
    this.playSound('ui-select', { 
      volume: 0.3,
      rate: 1.5
    });
  }

  private onComboCompleted(data: any): void {
    const { chain } = data;
    
    this.playSound('combo-complete', { 
      volume: Math.min(0.8, 0.4 + (chain * 0.1)), // Louder for longer combos
      rate: Math.min(1.5, 1.0 + (chain * 0.1)) // Higher pitch for longer combos
    });
  }

  private onComboBroken(): void {
    this.playSound('combo-broken', { 
      volume: 0.5,
      rate: 0.8
    });
  }

  private onHeightMilestone(data: any): void {
    const { milestone } = data;
    
    this.playSound('milestone', { 
      volume: 0.9,
      rate: 1.0 + (milestone / 10000) // Higher pitch for higher milestones
    });
  }

  private onGameOver(): void {
    this.playSound('game-over', { 
      volume: 0.8,
      rate: 0.9
    });
  }

  // Core sound playing functionality
  public playSound(soundKey: string, options: SoundEffect = {}): void {
    if (!this.settings.enabled) return;
    
    const actualKey = this.SOUND_MAPPINGS[soundKey] || soundKey;
    
    if (!this.scene.cache.audio.exists(actualKey)) {
      console.warn(`AudioManager: Sound '${actualKey}' not found`);
      return;
    }

    try {
      const sound = this.scene.sound.add(actualKey, {
        volume: this.calculateVolume(options.volume || 1.0),
        rate: options.rate || 1.0,
        detune: options.detune || 0,
        loop: options.loop || false
      });

      sound.play();
      this.activeSounds.add(sound);

      // Clean up when sound completes
      sound.once('complete', () => {
        this.activeSounds.delete(sound);
        sound.destroy();
      });

    } catch (error) {
      console.warn(`AudioManager: Failed to play sound '${actualKey}':`, error);
    }
  }

  private calculateVolume(baseVolume: number): number {
    return baseVolume * this.settings.sfxVolume * this.settings.masterVolume;
  }

  // Settings management
  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Emit event for UI updates
    EventBus.emit('audio-settings-changed', this.settings);
  }

  public setMasterVolume(volume: number): void {
    this.updateSettings({ masterVolume: Math.max(0, Math.min(1, volume)) });
  }

  public setSfxVolume(volume: number): void {
    this.updateSettings({ sfxVolume: Math.max(0, Math.min(1, volume)) });
  }

  public setEnabled(enabled: boolean): void {
    this.updateSettings({ enabled });
    
    if (!enabled) {
      this.stopAllSounds();
    }
  }

  // Update sound mapping for events (for settings menu)
  public updateSoundMapping(eventKey: string, soundKey: string): void {
    this.SOUND_MAPPINGS[eventKey] = soundKey;
    
    // Save to localStorage
    try {
      const savedMappings = localStorage.getItem('icy-tower-sound-mappings');
      const mappings = savedMappings ? JSON.parse(savedMappings) : {};
      mappings[eventKey] = soundKey;
      localStorage.setItem('icy-tower-sound-mappings', JSON.stringify(mappings));
    } catch (error) {
      console.warn('AudioManager: Failed to save sound mapping:', error);
    }
  }

  private loadSoundMappings(): void {
    try {
      const saved = localStorage.getItem('icy-tower-sound-mappings');
      if (saved) {
        const mappings = JSON.parse(saved);
        Object.assign(this.SOUND_MAPPINGS, mappings);
      }
    } catch (error) {
      console.warn('AudioManager: Failed to load sound mappings:', error);
    }
  }

  // Utility methods
  public stopAllSounds(): void {
    this.activeSounds.forEach(sound => {
      if (sound.isPlaying) {
        sound.stop();
      }
    });
    this.activeSounds.clear();
  }

  public pauseAllSounds(): void {
    this.activeSounds.forEach(sound => {
      if (sound.isPlaying) {
        sound.pause();
      }
    });
  }

  public resumeAllSounds(): void {
    this.activeSounds.forEach(sound => {
      if (sound.isPaused) {
        sound.resume();
      }
    });
  }

  // Manual sound playing (for testing or special cases)
  public playJumpSound(momentum: number = 0): void {
    this.onPlayerJump({ horizontalSpeed: momentum, jumpPower: 500 });
  }

  public playWallBounceSound(perfect: boolean = false): void {
    this.onWallBounce({ 
      timingQuality: perfect ? 'perfect' : 'good', 
      momentumPreserved: perfect ? 800 : 600 
    });
  }

  public playComboSound(comboLength: number = 1): void {
    this.onComboCompleted({ chain: comboLength });
  }

  destroy(): void {
    // Clean up event listeners
    EventBus.off('player-jumped', this.onPlayerJump.bind(this));
    EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
    EventBus.off('combo-event-added', this.onComboEvent.bind(this));
    EventBus.off('combo-completed', this.onComboCompleted.bind(this));
    EventBus.off('combo-broken', this.onComboBroken.bind(this));
    EventBus.off('height-milestone-reached', this.onHeightMilestone.bind(this));
    EventBus.off('game-over', this.onGameOver.bind(this));

    // Stop and clean up all active sounds
    this.stopAllSounds();
    this.soundEffects.clear();
  }
}