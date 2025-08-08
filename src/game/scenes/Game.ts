import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Player } from '../Player';
import { PlatformManager } from '../PlatformManager';
import { GameConfiguration } from '../GameConfiguration';
import { OneWayPlatform } from '../OneWayPlatform';
import { WallManager } from '../WallManager';
import { WallCollision } from '../WallCollision';
import { WallBounceEffects } from '../WallBounceEffects';
import { SpinningParticleEffects } from '../SpinningParticleEffects';
import { CameraManager } from '../CameraManager';
import { DeathLine } from '../DeathLine';
import { ScoreSystem } from '../ScoreSystem';
import { ComboSystem } from '../ComboSystem';
import { GameUI } from '../GameUI';
import { DebugUI } from '../DebugUI';
import { GameOverScreen } from '../GameOverScreen';
import { GameStateManager, GameState } from '../GameStateManager';
import { AudioManager } from '../AudioManager';
import { GameMenu } from '../GameMenu';
import { BiomeManager } from '../BiomeManager';
import { BackgroundColorManager } from '../BackgroundColorManager';
import { PowerupManager } from '../powerups/PowerupManager';
import { PowerupEffectSystem } from '../powerups/PowerupEffectSystem';
import { PowerupUI } from '../powerups/PowerupUI';
import { InventorySystem } from '../items/InventorySystem';
import { InventoryUI } from '../items/InventoryUI';
import { ItemManager } from '../items/ItemManager';
import { PlatformSpawner } from '../items/PlatformSpawner';
import { ItemType } from '../items/ItemType';

export class Game extends Scene
{
    private player: Player;
    private platformManager: PlatformManager;
    private gameConfig: GameConfiguration;
    private oneWayPlatforms: OneWayPlatform;
    private wallManager: WallManager;
    private wallCollision: WallCollision;
    private wallBounceEffects: WallBounceEffects;
    private spinningParticleEffects: SpinningParticleEffects;
    private cameraManager: CameraManager;
    private deathLine: DeathLine;
    private scoreSystem: ScoreSystem;
    private comboSystem: ComboSystem;
    private gameUI: GameUI;
    private debugUI: DebugUI;
    private gameOverScreen: GameOverScreen;
    private gameStateManager: GameStateManager;
    private audioManager: AudioManager;
    private gameMenu: GameMenu;
    private biomeManager: BiomeManager;
    private backgroundColorManager: BackgroundColorManager;
    private powerupManager: PowerupManager;
    private powerupEffectSystem: PowerupEffectSystem;
    private powerupUI: PowerupUI;
    private inventorySystem: InventorySystem;
    private inventoryUI: InventoryUI;
    private itemManager: ItemManager;
    private platformSpawner: PlatformSpawner;
    private isGameOver: boolean = false;

    constructor ()
    {
        super('Game');
        this.gameConfig = new GameConfiguration();
    }

    preload ()
    {
        this.load.setPath('assets/kenney_new-platformer-pack-1.0');
        
        this.load.atlasXML('character', 
            'Spritesheets/spritesheet-characters-default.png',
            'Spritesheets/spritesheet-characters-default.xml'
        );
        
        this.load.atlasXML('tiles',
            'Spritesheets/spritesheet-tiles-default.png', 
            'Spritesheets/spritesheet-tiles-default.xml'
        );
        
        // Load all biome background textures
        this.load.image('background-grass', 'Sprites/Backgrounds/Default/background_solid_grass.png');
        this.load.image('background-sand', 'Sprites/Backgrounds/Default/background_solid_sand.png');
        this.load.image('background-dirt', 'Sprites/Backgrounds/Default/background_solid_dirt.png');
        this.load.image('background-mushrooms', 'Sprites/Backgrounds/Default/background_color_mushrooms.png');
        this.load.image('background-cloud', 'Sprites/Backgrounds/Default/background_solid_cloud.png');
        this.load.image('background-sky', 'Sprites/Backgrounds/Default/background_solid_sky.png');
        
        // Load star texture for spinning particle effects
        this.load.image('star', 'Sprites/Tiles/Default/star.png');
        
        // Load powerup assets
        this.load.image('gem_blue', 'Sprites/Tiles/Default/gem_blue.png');
        this.load.image('gem_green', 'Sprites/Tiles/Default/gem_green.png');
        this.load.image('gem_red', 'Sprites/Tiles/Default/gem_red.png');
        this.load.image('gem_yellow', 'Sprites/Tiles/Default/gem_yellow.png');
        this.load.image('coin_gold', 'Sprites/Tiles/Default/coin_gold.png');
        this.load.image('coin_silver', 'Sprites/Tiles/Default/coin_silver.png');
        this.load.image('coin_bronze', 'Sprites/Tiles/Default/coin_bronze.png');
        this.load.image('heart', 'Sprites/Tiles/Default/heart.png');
        this.load.image('key_blue', 'Sprites/Tiles/Default/key_blue.png');
        this.load.image('key_green', 'Sprites/Tiles/Default/key_green.png');
        this.load.image('key_yellow', 'Sprites/Tiles/Default/key_yellow.png');
        
        // Load all available Kenney sound effects
        this.load.audio('sfx_jump', 'Sounds/sfx_jump.ogg');
        this.load.audio('sfx_jump-high', 'Sounds/sfx_jump-high.ogg');
        this.load.audio('sfx_bump', 'Sounds/sfx_bump.ogg');
        this.load.audio('sfx_coin', 'Sounds/sfx_coin.ogg');
        this.load.audio('sfx_disappear', 'Sounds/sfx_disappear.ogg');
        this.load.audio('sfx_gem', 'Sounds/sfx_gem.ogg');
        this.load.audio('sfx_hurt', 'Sounds/sfx_hurt.ogg');
        this.load.audio('sfx_magic', 'Sounds/sfx_magic.ogg');
        this.load.audio('sfx_select', 'Sounds/sfx_select.ogg');
        this.load.audio('sfx_throw', 'Sounds/sfx_throw.ogg');
    }

    create ()
    {
        console.log('🎮 Game scene create() called');
        this.setupBackground();
        console.log('✅ Background setup complete');
        this.setupPlayer();
        console.log('✅ Player setup complete');
        this.setupPlatforms();
        console.log('✅ Platforms setup complete');
        this.setupWalls();
        this.setupCollisions();
        this.setupGameStateManager();
        console.log('✅ GameStateManager setup complete');
        this.setupBiomeManager();
        console.log('✅ BiomeManager setup complete');
        this.setupBackgroundColorManager();
        console.log('✅ BackgroundColorManager setup complete');
        this.setupPowerupSystems();
        console.log('✅ Powerup systems setup complete');
        this.setupItemSystems();
        console.log('✅ Item systems setup complete');
        this.setupCamera();
        console.log('✅ Camera setup complete');
        this.setupGameSystems();
        this.setupEffects();
        this.setupUI();
        this.setupDebugUI();
        this.setupGameOverScreen();
        this.setupGameMenu();
        this.setupEventListeners();
        
        console.log('🎮 Game scene initialization complete');
        
        // Add fade-in effect when scene starts
        this.addSceneFadeIn();
        
        EventBus.emit('current-scene-ready', this);
    }

    override update(time: number, delta: number)
    {
        // Safety check: ensure scene is still active
        if (!this.scene || !this.scene.isActive()) {
            return;
        }

        // Always update debug UI
        if (this.debugUI) {
            this.debugUI.update(time);
        }

        // Don't update when menu is open
        if (this.gameMenu && this.gameMenu.isMenuVisible()) {
            return;
        }
        
        // Only update gameplay systems when playing (with null safety during initialization)
        if (this.gameStateManager && !this.gameStateManager.allowsGameplayUpdates()) {
            return;
        }

        try {
            if (this.player) {
                this.player.update(delta);
            }
            
            if (this.wallManager) {
                this.wallManager.update(this.player.y);
            }
            
            if (this.wallCollision) {
                this.wallCollision.update();
            }
            
            if (this.cameraManager) {
                this.cameraManager.update(delta);
            }
            
            if (this.deathLine) {
                this.deathLine.update(delta);
            }
            
            if (this.comboSystem) {
                this.comboSystem.update(delta);
            }
            
            if (this.gameUI) {
                this.gameUI.update(delta);
            }
            
            if (this.powerupManager) {
                this.powerupManager.update();
            }
            
            if (this.powerupEffectSystem) {
                this.powerupEffectSystem.update(delta);
            }
            
            if (this.powerupUI) {
                this.powerupUI.update();
            }
            
            // No need to update inventory UI as it's event-driven
        } catch (error) {
            console.error('🚨 Game update error caught:', error);
            // Don't crash the whole game, just log and continue
        }
    }

    private setupBackground(): void
    {
        // Background colors are now handled dynamically by BackgroundColorManager
        // No static background image needed - camera background color will be updated in real-time
        console.log('✅ Background setup complete - using dynamic color system');
    }

    private setupPlatforms(): void
    {
        this.platformManager = new PlatformManager(this, this.gameConfig);
        this.platformManager.createGroundPlatform();
    }

    private setupPlayer(): void
    {
        const groundY = this.scale.height - 100;
        const playerX = this.scale.width / 2;
        const playerY = groundY - 100;
        
        this.player = new Player(this, playerX, playerY, this.gameConfig);
    }

    private setupWalls(): void
    {
        this.wallManager = new WallManager(this, this.gameConfig);
    }

    private setupCollisions(): void
    {
        // Delay OneWayPlatform creation to ensure physics is fully ready
        this.time.delayedCall(100, () => {
            this.oneWayPlatforms = new OneWayPlatform(this, this.player);
            
            // Add the ground platform to the one-way platform system
            const groundPlatforms = this.platformManager.getPlatforms();
            this.oneWayPlatforms.addPlatformGroup(groundPlatforms);
        });
        
        // Set up wall collision
        this.wallCollision = new WallCollision(this, this.player, this.wallManager, this.gameConfig);
    }

    private setupCamera(): void
    {
        this.cameraManager = new CameraManager(this, this.player, this.gameConfig, this.gameStateManager);
    }

    private setupEffects(): void
    {
        this.wallBounceEffects = new WallBounceEffects(this);
        this.spinningParticleEffects = new SpinningParticleEffects(this);
    }

    private setupGameSystems(): void
    {
        this.deathLine = new DeathLine(this, this.player, this.gameConfig);
        this.scoreSystem = new ScoreSystem(this, this.player);
        this.comboSystem = new ComboSystem(this, this.player);
        this.audioManager = new AudioManager(this);
    }

    private setupUI(): void
    {
        this.gameUI = new GameUI(this, this.scoreSystem, this.comboSystem);
    }

    private setupDebugUI(): void
    {
        this.debugUI = new DebugUI(this, this.player, this.gameConfig);
    }

    private setupGameOverScreen(): void
    {
        this.gameOverScreen = new GameOverScreen(this);
    }

    private setupGameMenu(): void
    {
        this.gameMenu = new GameMenu(this, this.audioManager);
    }

    private setupGameStateManager(): void
    {
        this.gameStateManager = new GameStateManager();
    }

    private setupBiomeManager(): void
    {
        this.biomeManager = new BiomeManager(this);
    }

    private setupBackgroundColorManager(): void
    {
        this.backgroundColorManager = new BackgroundColorManager(this, this.biomeManager);
    }

    private setupPowerupSystems(): void
    {
        // Initialize powerup effect system first
        this.powerupEffectSystem = new PowerupEffectSystem(this, this.player);
        
        // Initialize powerup manager
        this.powerupManager = new PowerupManager(this, this.player, this.gameConfig);
        
        // Initialize powerup UI
        this.powerupUI = new PowerupUI(this, this.powerupEffectSystem);
    }

    private setupItemSystems(): void
    {
        // Initialize inventory system
        this.inventorySystem = new InventorySystem(this);
        
        // Initialize item manager
        this.itemManager = new ItemManager(this, this.inventorySystem);
        
        // Initialize platform spawner
        this.platformSpawner = new PlatformSpawner(this, this.player, this.platformManager);
        
        // Initialize inventory UI
        this.inventoryUI = new InventoryUI(this, this.inventorySystem);

        // Give player a platform spawner item for testing
        this.itemManager.givePlayerItem(ItemType.PLATFORM_SPAWNER);
    }

    private setupEventListeners(): void
    {
        EventBus.on('game-over', this.onGameOver.bind(this));
        EventBus.on('request-game-stats', this.onRequestGameStats.bind(this));
        EventBus.on('game-paused', this.onGamePaused.bind(this));
        EventBus.on('request-game-restart', this.onRequestRestart.bind(this));
        
        // Input handling for restart
        this.input.keyboard?.on('keydown', this.onKeyDown.bind(this));
    }

    private onGameOver(gameOverData: any): void
    {
        this.isGameOver = true;
        console.log('🎮 Game Over triggered');
    }

    private onRequestGameStats(): void
    {
        // Collect stats from all systems and add to EventBus data
        const comboStats = this.comboSystem ? this.comboSystem.getStats() : {};
        const scoreStats = this.scoreSystem ? this.scoreSystem.getStats() : {};
        
        // Store stats for GameOverScreen to pick up
        EventBus.emit('game-stats-collected', {
            ...comboStats,
            ...scoreStats
        });
    }
    
    private onGamePaused(isPaused: boolean): void
    {
        // Don't use scene.pause() as it can interfere with input
        // The update method already checks if menu is visible
        console.log('Game paused state:', isPaused);
    }
    
    private onRequestRestart(): void
    {
        this.restartGame();
    }

    private onKeyDown(event: KeyboardEvent): void
    {
        // R key for restart - works anytime for debugging (only if debug enabled)
        if (event.code === 'KeyR') {
            if (!this.gameConfig.debug.enabled) return;
            console.log('🔧 Debug restart triggered by R key');
            this.restartGame();
            return;
        }

        // Only handle movement key restart if game is not playing and game over screen is showing
        if (this.gameStateManager.isPlaying() || !this.gameOverScreen.isShowing()) {
            return;
        }

        // Movement keys that trigger restart
        const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
        
        if (movementKeys.includes(event.code)) {
            console.log('🎮 Movement key restart triggered');
            this.restartGame();
        }
    }

    private restartGame(): void
    {
        console.log('🔄 Restarting game...');
        console.log('🔄 Current game state:', this.gameStateManager ? this.gameStateManager.getState() : 'undefined');
        console.log('🔄 Game over screen showing:', this.gameOverScreen ? this.gameOverScreen.isShowing() : 'undefined');
        
        // Use custom reset instead of scene.restart()
        this.resetGameSystems();
    }

    private resetGameSystems(): void {
        console.log('🔄 Starting custom game reset...');
        
        try {
            // Phase 1: Reset game state manager first
            if (this.gameStateManager) {
                this.gameStateManager.reset();
            }

            // Phase 2: Reset all game systems in specific order (CRITICAL: Camera first!)
            this.resetCameraState();
            this.resetGameplayState();
            this.resetPlayerState();
            this.resetWorldState();
            this.resetUIState();
            
            // Phase 3: Re-initialize critical systems
            this.reinitializeGameSystems();
            
            console.log('✅ Custom game reset complete');
            
            // Phase 4: Log final state for debugging
            if (this.platformManager) {
                console.log(`🔍 Platform count after reset: ${this.platformManager.getPlatformCount()}`);
            }
            
        } catch (error) {
            console.error('❌ Error during custom reset, falling back to scene restart:', error);
            // Fallback to scene restart if custom reset fails
            this.scene.restart();
        }
    }

    private resetCameraState(): void {
        console.log('🔄 Resetting camera state first...');
        
        // CRITICAL: Reset camera BEFORE death line to prevent auto-scroll activation
        if (this.cameraManager) {
            this.cameraManager.reset();
        }
    }

    private resetGameplayState(): void {
        console.log('🔄 Resetting gameplay state...');
        
        // Reset gameplay flags
        this.isGameOver = false;
        
        // Reset scoring and combo systems
        if (this.scoreSystem) {
            this.scoreSystem.reset();
        }
        
        if (this.comboSystem) {
            this.comboSystem.reset();
        }
        
        // Reset death line system
        if (this.deathLine) {
            this.deathLine.reset();
        }
        
        // Reset audio manager (stop any playing sounds)
        if (this.audioManager) {
            this.audioManager.stopAllSounds();
        }
    }

    private resetPlayerState(): void {
        console.log('🔄 Resetting player state...');
        
        if (this.player) {
            // Reset player position to ground level
            const groundY = this.scale.height - 100;
            const playerX = this.scale.width / 2;
            const playerY = groundY - 100;
            
            this.player.setPosition(playerX, playerY);
            this.player.setVelocity(0, 0);
            this.player.setGrounded(true);
            
            // Reset player movement controller state
            const movementController = this.player.getMovementController();
            if (movementController && typeof movementController.reset === 'function') {
                movementController.reset();
            }
        }
    }

    private resetWorldState(): void {
        console.log('🔄 Resetting world state...');
        
        // Reset and regenerate platforms
        if (this.platformManager) {
            // Use the proper reset method which clears state counters
            this.platformManager.reset();
            
            // Recreate ground platform
            this.platformManager.createGroundPlatform();
            
            // Re-register with collision system
            if (this.oneWayPlatforms) {
                const groundPlatforms = this.platformManager.getPlatforms();
                this.oneWayPlatforms.addPlatformGroup(groundPlatforms);
            }
        }
        
        // Reset wall system
        if (this.wallManager) {
            this.wallManager.reset();
        }
        
        // Reset powerup systems
        if (this.powerupManager) {
            this.powerupManager.reset();
        }
        
        if (this.powerupEffectSystem) {
            this.powerupEffectSystem.reset();
        }
        
        if (this.powerupUI) {
            this.powerupUI.reset();
        }
        
        // Reset wall collision cooldowns
        if (this.wallCollision) {
            this.wallCollision.reset();
        }
        
        // Camera reset moved to separate phase
    }

    private resetUIState(): void {
        console.log('🔄 Resetting UI state...');
        
        // Reset game UI displays
        if (this.gameUI) {
            // GameUI will automatically update based on reset systems
        }
        
        // Hide game over screen
        if (this.gameOverScreen && this.gameOverScreen.isShowing()) {
            // The screen should automatically hide when game state changes
        }
    }

    private reinitializeGameSystems(): void {
        console.log('🔄 Reinitializing game systems...');
        
        // Reset BiomeManager BEFORE emitting reset event to prevent conflicts
        if (!this.biomeManager) {
            this.setupBiomeManager();
            console.log('🌍 BiomeManager recreated during reset');
        } else {
            // If BiomeManager exists, manually reset it to ensure clean state
            console.log('🌍 BiomeManager exists, manually resetting state');
            // CRITICAL: Reset BiomeManager AFTER PlatformManager to avoid interference
            this.biomeManager.setPlatformCount(0); // Force reset to 0 platforms
        }
        
        // Recreate BackgroundColorManager if it was destroyed (BEFORE emitting reset event)
        if (!this.backgroundColorManager) {
            this.setupBackgroundColorManager();
            console.log('🎨 BackgroundColorManager recreated during reset');
        }
        
        // Emit reset complete event AFTER managers are ready
        EventBus.emit('game-fully-reset', {
            timestamp: Date.now(),
            playerPosition: this.player ? { x: this.player.x, y: this.player.y } : null
        });
        
        // Ensure collision systems are properly reconnected
        if (this.oneWayPlatforms && this.platformManager) {
            // Platform collision system should be ready
            const platforms = this.platformManager.getPlatforms();
            if (platforms && platforms.children) {
                // Systems should be already connected, but ensure they're active
            }
        }
        
        // Restart camera following if needed
        if (this.cameraManager && this.player) {
            this.cameraManager.focusOnPlayer();
        }
    }

    destroy(): void
    {
        console.log('🧹 Game scene destroy() called - cleaning up all systems');
        
        // Clean up event listeners
        EventBus.off('game-over', this.onGameOver.bind(this));
        EventBus.off('request-game-stats', this.onRequestGameStats.bind(this));
        EventBus.off('game-paused', this.onGamePaused.bind(this));
        EventBus.off('request-game-restart', this.onRequestRestart.bind(this));
        
        // Properly clean up input handlers
        if (this.input && this.input.keyboard) {
            // Remove all keyboard event listeners to prevent accumulation
            this.input.keyboard.removeAllListeners();
            this.input.keyboard.off('keydown', this.onKeyDown.bind(this));
        }

        // Destroy all systems in reverse order of creation
        if (this.gameOverScreen) {
            this.gameOverScreen.destroy();
            this.gameOverScreen = null as any;
        }
        
        if (this.debugUI) {
            this.debugUI.destroy();
            this.debugUI = null as any;
        }
        
        if (this.gameUI) {
            this.gameUI.destroy();
            this.gameUI = null as any;
        }
        
        if (this.comboSystem) {
            this.comboSystem.destroy();
            this.comboSystem = null as any;
        }
        
        if (this.scoreSystem) {
            this.scoreSystem.destroy();
            this.scoreSystem = null as any;
        }
        
        if (this.deathLine) {
            this.deathLine.destroy();
            this.deathLine = null as any;
        }
        
        if (this.wallBounceEffects) {
            this.wallBounceEffects.destroy();
            this.wallBounceEffects = null as any;
        }
        
        if (this.wallCollision) {
            this.wallCollision.destroy();
            this.wallCollision = null as any;
        }
        
        if (this.oneWayPlatforms) {
            this.oneWayPlatforms.destroy();
            this.oneWayPlatforms = null as any;
        }
        
        if (this.cameraManager) {
            this.cameraManager.destroy();
            this.cameraManager = null as any;
        }
        
        if (this.wallManager) {
            this.wallManager.destroy();
            this.wallManager = null as any;
        }
        
        if (this.platformManager) {
            this.platformManager.destroy();
            this.platformManager = null as any;
        }
        
        if (this.player) {
            this.player.destroy();
            this.player = null as any;
        }

        if (this.gameStateManager) {
            this.gameStateManager.destroy();
            this.gameStateManager = null as any;
        }
        
        if (this.audioManager) {
            this.audioManager.destroy();
            this.audioManager = null as any;
        }
        
        if (this.gameMenu) {
            this.gameMenu.destroy();
            this.gameMenu = null as any;
        }
        
        if (this.biomeManager) {
            this.biomeManager.destroy();
            this.biomeManager = null as any;
        }
        
        if (this.backgroundColorManager) {
            this.backgroundColorManager.destroy();
            this.backgroundColorManager = null as any;
        }
        
        if (this.powerupManager) {
            this.powerupManager.destroy();
            this.powerupManager = null as any;
        }
        
        if (this.powerupEffectSystem) {
            this.powerupEffectSystem.destroy();
            this.powerupEffectSystem = null as any;
        }
        
        if (this.powerupUI) {
            this.powerupUI.destroy();
            this.powerupUI = null as any;
        }
        
        // Reset flags
        this.isGameOver = false;
        
        console.log('✅ Game scene destruction complete');
    }

    // Scene transition methods
    private addSceneFadeIn(): void {
        // Create fade overlay starting fully opaque
        const fadeOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 1);
        fadeOverlay.setOrigin(0, 0);
        fadeOverlay.setDepth(3000); // Above everything else
        
        // Fade in animation
        this.tweens.add({
            targets: fadeOverlay,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Remove the fade overlay once fade is complete
                fadeOverlay.destroy();
            }
        });
        
        console.log('🎬 Game scene fade-in effect applied');
    }

    returnToMenu(): void {
        console.log('🎮 Returning to menu...');
        
        // Stop all systems before transitioning
        if (this.audioManager) {
            this.audioManager.stopAllSounds();
        }
        
        // Create fade out effect
        const fadeOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0);
        fadeOverlay.setOrigin(0, 0);
        fadeOverlay.setDepth(3000); // Above everything else
        
        // Fade out animation
        this.tweens.add({
            targets: fadeOverlay,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Transition to menu scene after fade completes
                this.scene.start('MenuScene');
            }
        });
    }
}
