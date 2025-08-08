/**
 * ElectromagneticFieldManager.ts
 * 
 * Manages magnetic platform spawning, electromagnetic physics effects,
 * chain lightning combo system, and integration with existing game systems
 */

import { Scene } from 'phaser';
import { Player } from './Player';
import { GameConfiguration } from './GameConfiguration';
import { MagneticPlatform, MagneticPolarity } from './MagneticPlatform';
import { ChainLightningEffects } from './ChainLightningEffects';
import { EventBus } from './EventBus';

interface MagneticChain {
  platforms: MagneticPlatform[];
  totalCharge: number;
  chainStartTime: number;
  lastConnectionTime: number;
}

export class ElectromagneticFieldManager {
  private scene: Scene;
  private player: Player;
  private gameConfig: GameConfiguration;
  
  // Magnetic platforms and effects
  private magneticPlatforms: MagneticPlatform[] = [];
  private chainLightningEffects: ChainLightningEffects;
  
  // Active magnetic effects
  private activeMagneticFields: Set<MagneticPlatform> = new Set();
  private currentChain: MagneticChain | null = null;
  
  // Spawning control
  private platformCount: number = 0;
  private readonly MAGNETIC_SPAWN_INTERVAL = 15; // Every 15 platforms
  private readonly MAGNETIC_SPAWN_CHANCE = 0.3; // 30% chance when interval hits
  private lastMagneticSpawn: number = 0;
  
  // Physics parameters
  private readonly MAX_MAGNETIC_FORCE = 200; // Maximum force applied per frame
  private readonly CHAIN_TIMEOUT = 3000; // 3 seconds to maintain chain
  private readonly MIN_CHAIN_DISTANCE = 200; // Minimum distance for chain
  private readonly MAX_CHAIN_DISTANCE = 400; // Maximum distance for chain
  
  constructor(scene: Scene, player: Player, gameConfig: GameConfiguration) {
    try {
      this.scene = scene;
      this.player = player;
      this.gameConfig = gameConfig;
      
      this.chainLightningEffects = new ChainLightningEffects(scene);
      this.setupEventListeners();
      
      console.log('⚡ ElectromagneticFieldManager initialized successfully');
    } catch (error) {
      console.error('⚡ ElectromagneticFieldManager initialization failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    EventBus.on('platform-created', this.onPlatformCreated.bind(this));
    EventBus.on('player-landed', this.onPlayerLanded.bind(this));
    EventBus.on('game-fully-reset', this.onGameReset.bind(this));
  }

  private onPlatformCreated(platformData: any): void {
    this.platformCount++;
    
    // Check if we should spawn a magnetic platform
    if (this.shouldSpawnMagneticPlatform()) {
      this.spawnMagneticPlatform(platformData);
      this.lastMagneticSpawn = this.platformCount;
    }
  }

  private shouldSpawnMagneticPlatform(): boolean {
    const intervalReached = (this.platformCount - this.lastMagneticSpawn) >= this.MAGNETIC_SPAWN_INTERVAL;
    const chanceRoll = Math.random() < this.MAGNETIC_SPAWN_CHANCE;
    
    // Higher chance at later stages for more exciting gameplay
    const stageBonus = Math.min(0.2, this.platformCount / 1000);
    const enhancedChance = chanceRoll || Math.random() < stageBonus;
    
    return intervalReached && enhancedChance;
  }

  private spawnMagneticPlatform(platformData: any): void {
    if (!platformData || !platformData.x || !platformData.y) {
      console.warn('⚠️ Invalid platform data for magnetic platform spawn');
      return;
    }

    // Determine polarity - balance between attract/repel
    const attractCount = this.magneticPlatforms.filter(p => 
      p.getPolarity() === MagneticPolarity.ATTRACT && p.active
    ).length;
    const repelCount = this.magneticPlatforms.filter(p => 
      p.getPolarity() === MagneticPolarity.REPEL && p.active
    ).length;
    
    // Slightly favor attract for more intuitive gameplay
    const polarity = (attractCount <= repelCount + 1 && Math.random() < 0.6) 
      ? MagneticPolarity.ATTRACT 
      : MagneticPolarity.REPEL;

    // Create magnetic platform with slightly varied properties
    const fieldStrength = 120 + Math.random() * 60; // 120-180
    const fieldRadius = 100 + Math.random() * 40; // 100-140
    
    const magneticPlatform = new MagneticPlatform(
      this.scene,
      platformData.x,
      platformData.y,
      polarity,
      fieldStrength,
      fieldRadius
    );
    
    this.magneticPlatforms.push(magneticPlatform);
    
    // Clean up old platforms that are too far away
    this.cleanupDistantPlatforms();
    
    console.log(`⚡ Spawned magnetic platform: ${polarity} (${this.magneticPlatforms.length} total)`);
  }

  private onPlayerLanded(landingData: any): void {
    // Check if player landed on a magnetic platform
    const landedPlatform = this.findMagneticPlatformAt(landingData.x, landingData.y);
    
    if (landedPlatform) {
      this.handleMagneticPlatformLanding(landedPlatform);
    }
    
    // Update chain status
    this.updateChainStatus();
  }

  private findMagneticPlatformAt(x: number, y: number): MagneticPlatform | null {
    for (const platform of this.magneticPlatforms) {
      if (!platform.active) continue;
      
      const dx = Math.abs(platform.x - x);
      const dy = Math.abs(platform.y - y);
      
      // Check if landing is close enough to platform center
      if (dx < 60 && dy < 30) {
        return platform;
      }
    }
    return null;
  }

  private handleMagneticPlatformLanding(platform: MagneticPlatform): void {
    // Activate the platform and add charge
    platform.activate();
    platform.addCharge(25);
    
    // Emit activation event for visual effects
    EventBus.emit('magnetic-platform-activated', {
      platform,
      intensity: platform.getChargeLevel() / 100
    });
    
    // Handle chain logic
    if (this.currentChain) {
      this.extendChain(platform);
    } else {
      this.startNewChain(platform);
    }
    
    console.log(`⚡ Player landed on magnetic platform - charge: ${platform.getChargeLevel()}%`);
  }

  private startNewChain(platform: MagneticPlatform): void {
    this.currentChain = {
      platforms: [platform],
      totalCharge: platform.getChargeLevel(),
      chainStartTime: Date.now(),
      lastConnectionTime: Date.now()
    };
    
    console.log('⚡ Started new magnetic chain');
  }

  private extendChain(newPlatform: MagneticPlatform): void {
    if (!this.currentChain) return;
    
    const lastPlatform = this.currentChain.platforms[this.currentChain.platforms.length - 1];
    const distance = Phaser.Math.Distance.Between(
      lastPlatform.x, lastPlatform.y,
      newPlatform.x, newPlatform.y
    );
    
    // Check if the new platform is within chaining distance
    if (distance >= this.MIN_CHAIN_DISTANCE && distance <= this.MAX_CHAIN_DISTANCE) {
      // Valid chain extension
      this.currentChain.platforms.push(newPlatform);
      this.currentChain.totalCharge += newPlatform.getChargeLevel();
      this.currentChain.lastConnectionTime = Date.now();
      
      // Create chain lightning between platforms
      this.createChainLightningBetween(lastPlatform, newPlatform);
      
      // Award combo points
      this.awardChainComboPoints();
      
      console.log(`⚡ Extended chain to ${this.currentChain.platforms.length} platforms`);
    } else {
      // Too far or too close - start new chain
      this.completeCurrentChain();
      this.startNewChain(newPlatform);
    }
  }

  private createChainLightningBetween(startPlatform: MagneticPlatform, endPlatform: MagneticPlatform): void {
    if (!this.currentChain) return;
    
    // Emit chain created event for visual effects
    EventBus.emit('magnetic-chain-created', {
      startPlatform,
      endPlatform,
      chainLength: this.currentChain.platforms.length,
      totalCharge: this.currentChain.totalCharge
    });
  }

  private awardChainComboPoints(): void {
    if (!this.currentChain) return;
    
    const chainLength = this.currentChain.platforms.length;
    const chargeBonus = this.currentChain.totalCharge / 100;
    
    // Calculate base points with exponential scaling for longer chains
    const basePoints = Math.pow(chainLength, 1.8) * 100;
    const totalPoints = Math.floor(basePoints * (1 + chargeBonus));
    
    // Emit combo event for scoring system
    EventBus.emit('magnetic-chain-combo', {
      type: 'electromagnetic_chain',
      chainLength,
      totalCharge: this.currentChain.totalCharge,
      points: totalPoints,
      multiplier: 1.0 + (chainLength * 0.2) + chargeBonus
    });
    
    console.log(`⚡ Chain combo: ${chainLength} links, ${totalPoints} points`);
  }

  private updateChainStatus(): void {
    if (!this.currentChain) return;
    
    const now = Date.now();
    const timeSinceLastConnection = now - this.currentChain.lastConnectionTime;
    
    // Check if chain has timed out
    if (timeSinceLastConnection > this.CHAIN_TIMEOUT) {
      this.completeCurrentChain();
    }
  }

  private completeCurrentChain(): void {
    if (!this.currentChain) return;
    
    console.log(`⚡ Completed magnetic chain: ${this.currentChain.platforms.length} platforms`);
    
    // Discharge all platforms in the chain
    for (const platform of this.currentChain.platforms) {
      platform.discharge();
    }
    
    // Final combo bonus for completing chain
    if (this.currentChain.platforms.length >= 3) {
      this.awardChainCompletionBonus();
    }
    
    this.currentChain = null;
  }

  private awardChainCompletionBonus(): void {
    if (!this.currentChain) return;
    
    const chainLength = this.currentChain.platforms.length;
    const bonusPoints = chainLength * 500; // Big bonus for chain completion
    
    EventBus.emit('magnetic-chain-completion-bonus', {
      chainLength,
      bonusPoints,
      message: `Electromagnetic Chain Complete! +${bonusPoints} points`
    });
  }

  /**
   * Apply magnetic forces to the player each frame
   */
  public update(deltaTime: number): void {
    this.applyMagneticForces();
    this.chainLightningEffects.update(deltaTime);
    this.updateChainStatus();
  }

  private applyMagneticForces(): void {
    if (!this.player || !this.player.body) return;
    
    let totalForceX = 0;
    let totalForceY = 0;
    this.activeMagneticFields.clear();
    
    for (const platform of this.magneticPlatforms) {
      if (!platform.active || !platform.isActiveField()) continue;
      
      const force = platform.calculateMagneticForce(this.player.x, this.player.y);
      
      if (force.inField) {
        totalForceX += force.x;
        totalForceY += force.y;
        this.activeMagneticFields.add(platform);
      }
    }
    
    // Cap total magnetic force to prevent overwhelming the physics
    const totalForceMagnitude = Math.sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
    if (totalForceMagnitude > this.MAX_MAGNETIC_FORCE) {
      const scale = this.MAX_MAGNETIC_FORCE / totalForceMagnitude;
      totalForceX *= scale;
      totalForceY *= scale;
    }
    
    // Apply magnetic forces to player
    if (totalForceMagnitude > 0) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      
      // Apply forces more smoothly to avoid jarring movement
      playerBody.velocity.x += totalForceX * 0.3;
      playerBody.velocity.y += totalForceY * 0.3;
      
      // Emit magnetic field event for potential visual effects
      EventBus.emit('player-in-magnetic-field', {
        forceX: totalForceX,
        forceY: totalForceY,
        fieldCount: this.activeMagneticFields.size
      });
    }
  }

  private cleanupDistantPlatforms(): void {
    const playerY = this.player.y;
    const cleanupDistance = 1000; // Clean up platforms more than 1000 pixels below player
    
    this.magneticPlatforms = this.magneticPlatforms.filter(platform => {
      if (platform.y > playerY + cleanupDistance) {
        platform.destroy();
        return false;
      }
      return true;
    });
  }

  private onGameReset(): void {
    // Clean up all magnetic platforms
    for (const platform of this.magneticPlatforms) {
      if (platform.active) {
        platform.destroy();
      }
    }
    
    this.magneticPlatforms = [];
    this.activeMagneticFields.clear();
    this.currentChain = null;
    this.platformCount = 0;
    this.lastMagneticSpawn = 0;
    
    console.log('⚡ ElectromagneticFieldManager reset');
  }

  // Getters for debugging and UI
  public getMagneticPlatformCount(): number {
    return this.magneticPlatforms.filter(p => p.active).length;
  }

  public getCurrentChainLength(): number {
    return this.currentChain ? this.currentChain.platforms.length : 0;
  }

  public getCurrentChainCharge(): number {
    return this.currentChain ? this.currentChain.totalCharge : 0;
  }

  public isInMagneticField(): boolean {
    return this.activeMagneticFields.size > 0;
  }

  public destroy(): void {
    // Clean up all platforms
    this.onGameReset();
    
    // Clean up chain lightning effects
    if (this.chainLightningEffects) {
      this.chainLightningEffects.destroy();
    }
    
    // Remove event listeners
    EventBus.off('platform-created', this.onPlatformCreated.bind(this));
    EventBus.off('player-landed', this.onPlayerLanded.bind(this));
    EventBus.off('game-fully-reset', this.onGameReset.bind(this));
    
    console.log('⚡ ElectromagneticFieldManager destroyed');
  }
}