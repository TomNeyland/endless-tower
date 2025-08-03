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
    
    private lastJumpVerticalSpeed: number = 0; // Track initial jump velocity for rotation
    
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
        
        // Set custom world bounds - keep left/right walls but allow infinite vertical climbing
        body.setCollideWorldBounds(true);
        body.world.setBounds(0, -10000, this.scene.scale.width, 20000); // Huge vertical space for infinite climbing
        
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
        EventBus.on('player-wall-bounce', this.onWallBounce.bind(this));
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
        this.updateRotationEffect(deltaTime);
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

    private updateRotationEffect(deltaTime: number): void {
        const state = this.movementController.getMovementState();
        const initialJumpSpeed = this.lastJumpVerticalSpeed; // Use captured initial jump speed
        const speedThreshold = 400; // Lower threshold - easier to trigger spinning
        const maxRotationSpeed = 1200; // Lower max threshold for smoother scaling
        
        if (!state.isGrounded && initialJumpSpeed > speedThreshold) {
            // Calculate rotation speed with much gentler initial scaling
            const speedRatio = Math.min((initialJumpSpeed - speedThreshold) / (maxRotationSpeed - speedThreshold), 1.0);
            const exponentialRatio = Math.pow(speedRatio, 1.5); // Higher exponent = slower at low end, faster at high end
            const rotationSpeed = exponentialRatio * 35.0; // Max 35 radians per second
            
            // Rotate in direction player is facing (not movement direction)
            const rotationDirection = state.facingDirection; // 1 for right, -1 for left
            this.rotation += rotationSpeed * rotationDirection * (deltaTime / 1000);
            
            console.log(`🌪️ Jump-based rotation: initial=${initialJumpSpeed.toFixed(0)}, facing=${rotationDirection > 0 ? 'right' : 'left'}, rotation=${(this.rotation * 180 / Math.PI).toFixed(0)}°`);
        } else {
            // Smoothly return to upright when grounded or below threshold
            if (Math.abs(this.rotation) > 0.01) {
                this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, 0, 0.15);
            } else {
                this.rotation = 0;
                // Reset jump speed when grounded
                if (state.isGrounded) {
                    this.lastJumpVerticalSpeed = 0;
                }
            }
        }
    }

    private onJump(jumpMetrics: any): void {
        this.jumpSound.play();
        
        // Capture initial jump vertical speed for rotation effect
        this.lastJumpVerticalSpeed = jumpMetrics.verticalSpeed;
        console.log(`🚀 Jump captured: initial v-speed=${this.lastJumpVerticalSpeed.toFixed(0)} for rotation`);
    }

    private onWallBounce(bounceData: any): void {
        // Treat wall bounce redirected horizontal speed as "jump speed" for rotation
        const redirectedSpeed = Math.abs(bounceData.newSpeed || 0);
        this.lastJumpVerticalSpeed = redirectedSpeed; // Reuse the same property
        console.log(`🏀 Wall bounce captured: redirected speed=${redirectedSpeed.toFixed(0)} for rotation`);
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
        EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
        super.destroy();
    }
}