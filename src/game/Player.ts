import { Scene, Physics } from 'phaser';
import { MovementController, MovementState } from './MovementController';
import { GameConfiguration } from './GameConfiguration';
import { EventBus } from './EventBus';

export class Player extends Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd: any;
    private jumpSound: Phaser.Sound.BaseSound;
    private movementController: MovementController;
    private gameConfig: GameConfiguration;
    
    private readonly WALK_ANIMATION_FRAME_RATE = 8;

    constructor(scene: Scene, x: number, y: number, gameConfig: GameConfiguration) {
        super(scene, x, y, 'character');
        
        this.gameConfig = gameConfig;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setupPhysics();
        this.setupMovementController();
        this.setupInput();
        this.setupAnimations();
        this.setupAudio();
        this.setupEventListeners();
        
        this.setTexture('character', 'character_beige_idle');
    }

    private setupPhysics(): void {
        const body = this.body as Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(80, 100);
        body.setOffset(24, 28);
    }

    private setupMovementController(): void {
        const body = this.body as Physics.Arcade.Body;
        this.movementController = new MovementController(body, this.gameConfig);
    }

    private setupInput(): void {
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.wasd = this.scene.input.keyboard!.addKeys('W,S,A,D,SPACE');
    }

    private setupEventListeners(): void {
        EventBus.on('player-jumped', this.onJump.bind(this));
        EventBus.on('player-movement-input', this.onMovementInput.bind(this));
    }

    private setupAnimations(): void {
        if (!this.scene.anims.exists('player-idle')) {
            this.scene.anims.create({
                key: 'player-idle',
                frames: [{ key: 'character', frame: 'character_beige_idle' }],
                frameRate: 1,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists('player-walk')) {
            this.scene.anims.create({
                key: 'player-walk',
                frames: [
                    { key: 'character', frame: 'character_beige_walk_a' },
                    { key: 'character', frame: 'character_beige_walk_b' }
                ],
                frameRate: this.WALK_ANIMATION_FRAME_RATE,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists('player-jump')) {
            this.scene.anims.create({
                key: 'player-jump',
                frames: [{ key: 'character', frame: 'character_beige_jump' }],
                frameRate: 1,
                repeat: -1
            });
        }

        this.play('player-idle');
    }

    private setupAudio(): void {
        this.jumpSound = this.scene.sound.add('jump-sound', { volume: 0.3 });
    }

    override update(deltaTime: number): void {
        this.movementController.update(deltaTime);
        this.handleInput();
        this.updateAnimation();
    }

    private handleInput(): void {
        const leftPressed = this.cursors.left?.isDown || this.wasd.A.isDown;
        const rightPressed = this.cursors.right?.isDown || this.wasd.D.isDown;
        const jumpPressed = this.cursors.up?.isDown || this.wasd.W.isDown || this.wasd.SPACE.isDown;

        if (leftPressed) {
            this.movementController.moveLeft();
        } else if (rightPressed) {
            this.movementController.moveRight();
        } else {
            this.movementController.stopHorizontalMovement();
        }

        if (jumpPressed) {
            this.movementController.requestJump();
        }
    }

    private updateAnimation(): void {
        const state = this.movementController.getMovementState();
        
        if (!state.isGrounded) {
            this.play('player-jump', true);
        } else if (state.isMoving) {
            this.play('player-walk', true);
        } else {
            this.play('player-idle', true);
        }
    }

    private onJump(jumpMetrics: any): void {
        this.jumpSound.play();
    }

    private onMovementInput(input: { direction: string, facingDirection: number }): void {
        this.setFlipX(input.facingDirection === -1);
    }

    setGrounded(grounded: boolean): void {
        this.movementController.setGrounded(grounded);
    }

    getMovementState(): MovementState {
        return this.movementController.getMovementState();
    }

    getJumpPreview() {
        return this.movementController.getJumpPreview();
    }

    updateConfiguration(newConfig: GameConfiguration): void {
        this.gameConfig = newConfig;
        this.movementController.updateConfiguration(newConfig);
    }

    getMovementController(): MovementController {
        return this.movementController;
    }

    override destroy(): void {
        EventBus.off('player-jumped', this.onJump.bind(this));
        EventBus.off('player-movement-input', this.onMovementInput.bind(this));
        super.destroy();
    }
}