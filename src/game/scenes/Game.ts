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
        this.setupBackground();
        this.setupPlayer();
        this.setupPlatforms();
        this.setupWalls();
        this.setupCollisions();
        this.setupCamera();
        this.setupGameSystems();
        this.setupEffects();
        this.setupUI();
        this.setupDebugUI();
        
        EventBus.emit('current-scene-ready', this);
    }

    override update(time: number, delta: number)
    {
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
        
        if (this.debugUI) {
            this.debugUI.update(time);
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
        this.oneWayPlatforms = new OneWayPlatform(this, this.player);
        
        // Add the ground platform to the one-way platform system
        const groundPlatforms = this.platformManager.getPlatforms();
        this.oneWayPlatforms.addPlatformGroup(groundPlatforms);
        
        // Set up wall collision
        this.wallCollision = new WallCollision(this, this.player, this.wallManager);
    }

    private setupCamera(): void
    {
        this.cameraManager = new CameraManager(this, this.player, this.gameConfig);
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
}
