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
import { GameStateManager } from '../GameStateManager';
import { AudioManager } from '../AudioManager';
import { BiomeManager } from '../BiomeManager';
import { BackgroundColorManager } from '../BackgroundColorManager';
import { AIController } from '../AIController';
import { POWERUP_CONFIGS, PowerupType } from '../powerups/PowerupType';

export class MenuScene extends Scene {
    // Game systems (identical to Game scene but with AI)
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
    private gameStateManager: GameStateManager;
    private audioManager: AudioManager;
    private biomeManager: BiomeManager;
    private backgroundColorManager: BackgroundColorManager;
    
    // AI and menu-specific systems
    private aiController: AIController;
    private menuUI: Phaser.GameObjects.Container;
    private titleText: Phaser.GameObjects.Text;
    private instructionText: Phaser.GameObjects.Text;
    private currentBehaviorText: Phaser.GameObjects.Text;
    private blinkTimer: number = 0;
    private showInstructions: boolean = true;
    
    // Demo state management
    private demoResetTimer: number = 0;
    private readonly DEMO_RESET_TIME = 30000; // Reset demo every 30 seconds

    constructor() {
        super('MenuScene');
        this.gameConfig = new GameConfiguration();
    }

    preload() {
        // Use same asset loading as Game scene
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
        
        // Load powerup assets for legend display
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

    create() {
        console.log('🎮 MenuScene create() called');
        
        // Set up the full game environment (identical to Game scene)
        this.setupBackground();
        this.setupPlayer();
        this.setupPlatforms();
        this.setupWalls();
        this.setupCollisions();
        this.setupGameStateManager();
        this.setupBiomeManager();
        this.setupBackgroundColorManager();
        this.setupCamera();
        this.setupGameSystems();
        this.setupEffects();
        this.setupUI();
        
        // Set up AI controller to drive the demo
        this.setupAIController();
        
        // Set up menu UI overlay
        this.setupMenuUI();
        
        // Set up input handling for menu navigation
        this.setupMenuInput();
        
        console.log('🎮 MenuScene initialization complete');
        EventBus.emit('current-scene-ready', this);
    }

    override update(time: number, delta: number) {
        // Update demo reset timer
        this.demoResetTimer += delta;
        if (this.demoResetTimer >= this.DEMO_RESET_TIME) {
            this.resetDemo();
            this.demoResetTimer = 0;
        }
        
        // Update blinking instruction text
        this.updateInstructionBlink(delta);
        
        // Update game systems (identical to Game scene)
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
        
        // Update AI controller behavior display
        if (this.aiController && this.currentBehaviorText) {
            const behavior = this.aiController.getCurrentBehavior();
            this.currentBehaviorText.setText(`AI Mode: ${behavior.replace('_', ' ').toUpperCase()}`);
        }
    }

    // Identical setup methods to Game scene with demo mode enabled
    private setupBackground(): void {
        console.log('✅ Background setup complete - using dynamic color system');
    }

    private setupPlatforms(): void {
        this.platformManager = new PlatformManager(this, this.gameConfig);
        this.platformManager.createGroundPlatform();
    }

    private setupPlayer(): void {
        const groundY = this.scale.height - 100;
        const playerX = this.scale.width / 2;
        const playerY = groundY - 100;
        
        this.player = new Player(this, playerX, playerY, this.gameConfig);
        
        // Enable demo mode - this will be handled in Player modification
        (this.player as any).setDemoMode(true);
    }

    private setupWalls(): void {
        this.wallManager = new WallManager(this, this.gameConfig);
    }

    private setupCollisions(): void {
        this.time.delayedCall(100, () => {
            this.oneWayPlatforms = new OneWayPlatform(this, this.player);
            const groundPlatforms = this.platformManager.getPlatforms();
            this.oneWayPlatforms.addPlatformGroup(groundPlatforms);
        });
        
        this.wallCollision = new WallCollision(this, this.player, this.wallManager, this.gameConfig);
    }

    private setupCamera(): void {
        this.cameraManager = new CameraManager(this, this.player, this.gameConfig, this.gameStateManager);
    }

    private setupEffects(): void {
        this.wallBounceEffects = new WallBounceEffects(this);
        this.spinningParticleEffects = new SpinningParticleEffects(this);
    }

    private setupGameSystems(): void {
        this.deathLine = new DeathLine(this, this.player, this.gameConfig);
        this.deathLine.setDemoMode(true); // Disable death line in demo mode
        this.scoreSystem = new ScoreSystem(this, this.player);
        this.comboSystem = new ComboSystem(this, this.player);
        this.audioManager = new AudioManager(this);
    }

    private setupUI(): void {
        this.gameUI = new GameUI(this, this.scoreSystem, this.comboSystem);
        // GameUI doesn't have setAlpha method, it manages its own RexUI components
        // The UI will be visible but at normal opacity in demo mode
    }

    private setupGameStateManager(): void {
        this.gameStateManager = new GameStateManager();
        // Keep game in playing state for demo (starts in PLAYING by default)
        // No need to call startPlaying() as it starts in PLAYING state
    }

    private setupBiomeManager(): void {
        this.biomeManager = new BiomeManager(this);
    }

    private setupBackgroundColorManager(): void {
        this.backgroundColorManager = new BackgroundColorManager(this, this.biomeManager);
    }

    private setupAIController(): void {
        this.aiController = new AIController(
            this,
            this.player,
            this.platformManager,
            this.wallManager,
            this.gameConfig
        );
        
        // Connect AI controller to player
        (this.player as any).setAIController(this.aiController);
    }

    private setupMenuUI(): void {
        // Create a container for all menu UI elements
        this.menuUI = this.add.container(0, 0);
        
        // Add semi-transparent dark overlay to make text more readable
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.4);
        overlay.setOrigin(0, 0);
        this.menuUI.add(overlay);
        
        // Game title
        this.titleText = this.add.text(this.scale.width / 2, 120, 'ENDLESS TOWER', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 72,  // Use number for pixel-perfect rendering
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4,
            resolution: 2  // Higher resolution for crisp text
        });
        this.titleText.setOrigin(0.5);
        this.menuUI.add(this.titleText);
        
        
        // Instructions
        this.instructionText = this.add.text(this.scale.width / 2, this.scale.height - 100, 'PRESS ANY KEY TO START', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 28,  // Use number for pixel-perfect rendering
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2  // Higher resolution for crisp text
        });
        this.instructionText.setOrigin(0.5);
        this.menuUI.add(this.instructionText);
        
        // Controls hint
        const controlsText = this.add.text(this.scale.width / 2, this.scale.height - 60, 'ARROW KEYS / WASD TO MOVE • SPACE / UP TO JUMP', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 16,  // Use number instead of string for pixel-perfect rendering
            color: '#AAAAAA',
            stroke: '#000000',
            strokeThickness: 2,
            resolution: 2  // Higher resolution for crisp text
        });
        controlsText.setOrigin(0.5);
        this.menuUI.add(controlsText);
        
        // AI behavior indicator
        this.currentBehaviorText = this.add.text(20, 20, 'AI Mode: SAFE CLIMBING', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,  // Use number for pixel-perfect rendering
            color: '#00FF00',
            stroke: '#000000',
            strokeThickness: 2,
            resolution: 2  // Higher resolution for crisp text
        });
        this.currentBehaviorText.setOrigin(0, 0);
        this.menuUI.add(this.currentBehaviorText);
        
        
        // Set menu UI to highest depth so it appears above game elements
        this.menuUI.setDepth(1000);
        
        // CRITICAL: Make menu UI follow camera so it stays visible
        this.menuUI.setScrollFactor(0, 0); // Don't scroll with camera
        
        // Add powerup legend
        this.setupPowerupLegend();
    }

    private setupPowerupLegend(): void {
        // Create legend container centered horizontally
        const legendContainer = this.add.container(this.scale.width / 2, 180);
        legendContainer.setScrollFactor(0, 0); // Stay fixed to screen
        legendContainer.setDepth(9999); // Maximum depth to ensure visibility above all UI
        
        // Legend title (centered)
        const legendTitle = this.add.text(0, 0, 'POWERUPS', {
            fontFamily: 'Arial, sans-serif',
            fontSize: 24,
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 3,
            resolution: 2
        });
        legendTitle.setOrigin(0.5, 0);
        legendContainer.add(legendTitle);
        
        // Get all powerup types and create compact legend entries
        const powerupTypes = Object.values(PowerupType);
        const entriesPerColumn = 5;
        const columnWidth = 280;
        const entryHeight = 40;
        
        powerupTypes.forEach((powerupType, index) => {
            const config = POWERUP_CONFIGS[powerupType];
            const column = Math.floor(index / entriesPerColumn);
            const row = index % entriesPerColumn;
            
            // Center the legend entries by offsetting from container center
            const entryX = (column * columnWidth) - (columnWidth * 0.75); // Adjust for centering
            const entryY = 35 + row * entryHeight;
            
            // Powerup icon (scaled down)
            const icon = this.add.sprite(entryX, entryY, config.assetKey);
            icon.setScale(0.6); // Smaller scale for compact display
            icon.setOrigin(0, 0.5);
            
            // Powerup name and description
            const nameText = this.add.text(entryX + 30, entryY - 8, config.name, {
                fontFamily: 'Arial, sans-serif',
                fontSize: 12,
                color: '#FFFFFF',
                fontStyle: 'bold',
                resolution: 2
            });
            nameText.setOrigin(0, 0);
            
            // Terse description
            const descText = this.add.text(entryX + 30, entryY + 6, config.description, {
                fontFamily: 'Arial, sans-serif',
                fontSize: 10,
                color: '#CCCCCC',
                resolution: 2
            });
            descText.setOrigin(0, 0);
            
            // Add duration indicator for temporary effects
            if (config.duration) {
                const durationText = this.add.text(entryX + 30, entryY + 18, `${Math.round(config.duration / 1000)}s`, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 9,
                    color: '#888888',
                    fontStyle: 'italic',
                    resolution: 2
                });
                durationText.setOrigin(0, 0);
                legendContainer.add(durationText);
            } else {
                const permanentText = this.add.text(entryX + 30, entryY + 18, 'PERMANENT', {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 9,
                    color: '#FFAA00',
                    fontStyle: 'italic',
                    resolution: 2
                });
                permanentText.setOrigin(0, 0);
                legendContainer.add(permanentText);
            }
            
            legendContainer.add([icon, nameText, descText]);
        });
        
        this.menuUI.add(legendContainer);
    }

    private setupMenuInput(): void {
        // Listen for any key press to start the game
        this.input.keyboard?.on('keydown', this.onKeyPressed.bind(this));
        
        // Also listen for mouse/touch input
        this.input.on('pointerdown', this.onPointerPressed.bind(this));
    }

    private onKeyPressed(event: KeyboardEvent): void {
        console.log('🎮 Key pressed in menu, starting game...');
        this.startGame();
    }

    private onPointerPressed(): void {
        console.log('🎮 Pointer pressed in menu, starting game...');
        this.startGame();
    }

    private startGame(): void {
        console.log('🎮 Starting transition to game...');
        
        // Play selection sound
        if (this.audioManager) {
            try {
                this.sound.play('sfx_select');
            } catch (e) {
                console.log('Menu selection sound not available');
            }
        }
        
        // Disable input during transition
        this.input.keyboard?.removeAllListeners();
        this.input.removeAllListeners();
        
        // CRITICAL: Immediately destroy BackgroundColorManager to stop camera update spam
        if (this.backgroundColorManager) {
            console.log('🎨 MenuScene: Destroying BackgroundColorManager during transition');
            this.backgroundColorManager.destroy();
            this.backgroundColorManager = null as any;
        }
        
        // Create fade out effect
        const fadeOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0);
        fadeOverlay.setOrigin(0, 0);
        fadeOverlay.setDepth(2000); // Above everything else
        
        // Fade out animation
        this.tweens.add({
            targets: fadeOverlay,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Proper scene transition: stop this scene and start Game scene
                console.log('🎬 MenuScene: Starting proper scene transition');
                this.scene.stop('MenuScene');
                this.scene.start('Game');
            }
        });
        
        // Optional: Fade out menu UI during transition
        this.tweens.add({
            targets: this.menuUI,
            alpha: 0,
            duration: 300,
            ease: 'Power2'
        });
    }

    private updateInstructionBlink(delta: number): void {
        this.blinkTimer += delta;
        
        // Blink every 800ms
        if (this.blinkTimer >= 800) {
            this.showInstructions = !this.showInstructions;
            this.instructionText.setVisible(this.showInstructions);
            this.blinkTimer = 0;
        }
    }

    private resetDemo(): void {
        console.log('🔄 Resetting demo...');
        
        // Reset player position
        const groundY = this.scale.height - 100;
        const playerX = this.scale.width / 2;
        const playerY = groundY - 100;
        
        this.player.setPosition(playerX, playerY);
        this.player.setVelocity(0, 0);
        this.player.setGrounded(true);
        
        // Reset all game systems
        if (this.scoreSystem) {
            this.scoreSystem.reset();
        }
        
        if (this.comboSystem) {
            this.comboSystem.reset();
        }
        
        if (this.deathLine) {
            this.deathLine.reset();
        }
        
        if (this.cameraManager) {
            this.cameraManager.reset();
        }
        
        if (this.aiController) {
            this.aiController.reset();
        }
        
        // Clear and regenerate platforms
        if (this.platformManager) {
            this.platformManager.clear();
            this.platformManager.createGroundPlatform();
            
            if (this.oneWayPlatforms) {
                const groundPlatforms = this.platformManager.getPlatforms();
                this.oneWayPlatforms.addPlatformGroup(groundPlatforms);
            }
        }
        
        // Reset wall system
        if (this.wallManager) {
            this.wallManager.reset();
        }
        
        // Reset biome manager
        if (this.biomeManager) {
            this.biomeManager.setPlatformCount(0);
        }
        
        console.log('✅ Demo reset complete');
    }

    destroy(): void {
        console.log('🧹 MenuScene destroy() called');
        
        // Stop all tweens to prevent them from continuing after scene destruction
        this.tweens.killAll();
        
        // Clean up input handlers
        if (this.input && this.input.keyboard) {
            this.input.keyboard.removeAllListeners();
        }
        
        // Clean up pointer input
        if (this.input) {
            this.input.removeAllListeners();
        }
        
        // Destroy AI controller first to stop it from updating
        if (this.aiController) {
            this.aiController.destroy();
            this.aiController = null as any;
        }
        
        // Destroy particle effects
        if (this.spinningParticleEffects) {
            this.spinningParticleEffects.destroy();
            this.spinningParticleEffects = null as any;
        }
        
        // Destroy all game systems (identical to Game scene)
        if (this.gameUI) {
            this.gameUI.destroy();
        }
        
        if (this.comboSystem) {
            this.comboSystem.destroy();
        }
        
        if (this.scoreSystem) {
            this.scoreSystem.destroy();
        }
        
        if (this.deathLine) {
            this.deathLine.destroy();
        }
        
        if (this.wallBounceEffects) {
            this.wallBounceEffects.destroy();
        }
        
        if (this.wallCollision) {
            this.wallCollision.destroy();
        }
        
        if (this.oneWayPlatforms) {
            this.oneWayPlatforms.destroy();
        }
        
        if (this.cameraManager) {
            this.cameraManager.destroy();
        }
        
        if (this.wallManager) {
            this.wallManager.destroy();
        }
        
        if (this.platformManager) {
            this.platformManager.destroy();
        }
        
        if (this.player) {
            this.player.destroy();
        }
        
        if (this.gameStateManager) {
            this.gameStateManager.destroy();
        }
        
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        
        if (this.biomeManager) {
            this.biomeManager.destroy();
        }
        
        if (this.backgroundColorManager) {
            this.backgroundColorManager.destroy();
        }
        
        console.log('✅ MenuScene destruction complete');
    }
}