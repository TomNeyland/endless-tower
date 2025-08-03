import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Player } from '../Player';
import { PlatformManager } from '../PlatformManager';
import { GameConfiguration } from '../GameConfiguration';
import { OneWayPlatform } from '../OneWayPlatform';
import { WallManager } from '../WallManager';
import { WallCollision } from '../WallCollision';
import { WallBounceEffects } from '../WallBounceEffects';
import { CameraManager } from '../CameraManager';
import { DeathLine } from '../DeathLine';
import { ScoreSystem } from '../ScoreSystem';
import { ComboSystem } from '../ComboSystem';
import { GameUI } from '../GameUI';
import { DebugUI } from '../DebugUI';
import { GameOverScreen } from '../GameOverScreen';
import { GameStateManager, GameState } from '../GameStateManager';

export class Game extends Scene
{
    private player: Player;
    private platformManager: PlatformManager;
    private gameConfig: GameConfiguration;
    private oneWayPlatforms: OneWayPlatform;
    private wallManager: WallManager;
    private wallCollision: WallCollision;
    private wallBounceEffects: WallBounceEffects;
    private cameraManager: CameraManager;
    private deathLine: DeathLine;
    private scoreSystem: ScoreSystem;
    private comboSystem: ComboSystem;
    private gameUI: GameUI;
    private debugUI: DebugUI;
    private gameOverScreen: GameOverScreen;
    private gameStateManager: GameStateManager;
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
        
        this.load.image('background-sky', 'Sprites/Backgrounds/Default/background_solid_sky.png');
        
        this.load.audio('jump-sound', 'Sounds/sfx_jump.ogg');
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
        this.setupCamera();
        console.log('✅ Camera setup complete');
        this.setupGameSystems();
        this.setupEffects();
        this.setupUI();
        this.setupDebugUI();
        this.setupGameOverScreen();
        this.setupEventListeners();
        
        console.log('🎮 Game scene initialization complete');
        EventBus.emit('current-scene-ready', this);
    }

    override update(time: number, delta: number)
    {
        // Always update debug UI
        if (this.debugUI) {
            this.debugUI.update(time);
        }

        // Only update gameplay systems when playing (with null safety during initialization)
        if (this.gameStateManager && !this.gameStateManager.allowsGameplayUpdates()) {
            return;
        }

        if (this.player) {
            this.player.update(delta);
        }
        
        if (this.wallManager) {
            this.wallManager.update(this.player.y);
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
    }

    private setupBackground(): void
    {
        const bg = this.add.image(0, 0, 'background-sky')
            .setOrigin(0, 0);
        
        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        bg.setScale(Math.max(scaleX, scaleY));
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
        this.wallCollision = new WallCollision(this, this.player, this.wallManager);
    }

    private setupCamera(): void
    {
        this.cameraManager = new CameraManager(this, this.player, this.gameConfig, this.gameStateManager);
    }

    private setupEffects(): void
    {
        this.wallBounceEffects = new WallBounceEffects(this);
    }

    private setupGameSystems(): void
    {
        this.deathLine = new DeathLine(this, this.player, this.gameConfig);
        this.scoreSystem = new ScoreSystem(this, this.player);
        this.comboSystem = new ComboSystem(this, this.player);
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

    private setupGameStateManager(): void
    {
        this.gameStateManager = new GameStateManager();
    }

    private setupEventListeners(): void
    {
        EventBus.on('game-over', this.onGameOver.bind(this));
        EventBus.on('request-game-stats', this.onRequestGameStats.bind(this));
        
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

    private onKeyDown(event: KeyboardEvent): void
    {
        // R key for restart - works anytime for debugging
        if (event.code === 'KeyR') {
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
        
        // Clear and regenerate platforms
        if (this.platformManager) {
            // Clear existing platforms
            this.platformManager.clear();
            
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
        
        // Emit reset complete event for any systems that need to know
        EventBus.emit('game-fully-reset', {
            timestamp: Date.now(),
            playerPosition: this.player ? { x: this.player.x, y: this.player.y } : null
        });
    }

    destroy(): void
    {
        console.log('🧹 Game scene destroy() called - cleaning up all systems');
        
        // Clean up event listeners
        EventBus.off('game-over', this.onGameOver.bind(this));
        EventBus.off('request-game-stats', this.onRequestGameStats.bind(this));
        
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
        
        // Reset flags
        this.isGameOver = false;
        
        console.log('✅ Game scene destruction complete');
    }
}
