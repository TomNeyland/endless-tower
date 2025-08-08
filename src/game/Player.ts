import { Scene, Physics } from 'phaser';
import { MovementController, MovementState } from './MovementController';
import { GameConfiguration } from './GameConfiguration';
import { EventBus } from './EventBus';
import { AIController, AIInput } from './AIController';
import { MobileInputController, MobileInputState } from './MobileInputController';

export class Player extends Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd: any;
    private movementController: MovementController;
    private gameConfig: GameConfiguration;
    
    private lastJumpVerticalSpeed: number = 0; // Track initial jump velocity for rotation
    
    // Item usage tracking to prevent key repeat
    private itemKeysPreviousState: { Q: boolean; E: boolean } = { Q: false, E: false };
    
    // Input mode properties
    private isMobileDevice: boolean = false;
    private mobileInputController: MobileInputController | null = null;
    
    // Demo mode properties
    private demoMode: boolean = false;
    private aiController: AIController | null = null;
    
    private readonly WALK_ANIMATION_FRAME_RATE = 8;

    constructor(scene: Scene, x: number, y: number, gameConfig: GameConfiguration) {
        super(scene, x, y, 'character');
        
        this.gameConfig = gameConfig;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.setupPhysics();
        this.setupMovementController();
        this.setupInput();
        this.setupMobileInput();
        this.setupAnimations();
        this.setupEventListeners();
        
        this.setTexture('character', 'character_beige_idle');
        
        // Apply visual scale to match physics body
        const playerConfig = this.gameConfig.player;
        this.setScale(playerConfig.scale);
    }

    private setupPhysics(): void {
        const body = this.body as Physics.Arcade.Body;
        
        // Set custom world bounds - keep left/right walls but allow infinite vertical climbing
        body.setCollideWorldBounds(true);
        body.world.setBounds(0, -1000000, this.scene.scale.width, 2000000); // Truly infinite vertical space (1 million units each direction)
        
        // Apply player scale to body size and offset
        const playerConfig = this.gameConfig.player;
        const scaledWidth = playerConfig.baseBodyWidth * playerConfig.scale;
        const scaledHeight = playerConfig.baseBodyHeight * playerConfig.scale;
        
        // When sprite is scaled, we need to adjust the offset to center the hitbox properly
        // The offset needs to account for how the scaled sprite texture is positioned
        const offsetX = playerConfig.baseOffsetX + (playerConfig.baseBodyWidth * (1 - playerConfig.scale)) / 2;
        const offsetY = playerConfig.baseOffsetY + (playerConfig.baseBodyHeight * (1 - playerConfig.scale)) / 2;
        
        body.setSize(scaledWidth, scaledHeight);
        body.setOffset(offsetX, offsetY);
    }

    private setupMovementController(): void {
        const body = this.body as Physics.Arcade.Body;
        this.movementController = new MovementController(body, this.gameConfig);
    }

    private setupInput(): void {
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        this.wasd = this.scene.input.keyboard!.addKeys('W,S,A,D,SPACE,Q,E');
    }

    private setupMobileInput(): void {
        // Detect if we're on a mobile device
        this.isMobileDevice = MobileInputController.isMobileDevice();
        
        if (this.isMobileDevice) {
            this.mobileInputController = new MobileInputController(this.scene, this.gameConfig);
            console.log('📱 Mobile device detected - mobile controls enabled');
            
            // Enable debug visualization for testing
            if (this.gameConfig.debug.enabled) {
                this.mobileInputController.setDebugMode(true);
            }
        } else {
            console.log('🖥️ Desktop device detected - keyboard controls active');
        }
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


    override update(deltaTime: number): void {
        this.movementController.update(deltaTime);
        this.handleInput();
        this.updateAnimation();
        this.updateRotationEffect(deltaTime);
    }

    private handleInput(): void {
        let leftPressed: boolean;
        let rightPressed: boolean;
        let jumpPressed: boolean;
        let qPressed: boolean;
        let ePressed: boolean;
        
        if (this.demoMode && this.aiController) {
            // Use AI input in demo mode
            const aiInput = this.aiController.update(16.67); // Assume ~60fps for deltaTime
            leftPressed = aiInput.left;
            rightPressed = aiInput.right;
            jumpPressed = aiInput.jump;
            qPressed = false; // AI doesn't use items for now
            ePressed = false;
        } else if (this.isMobileDevice && this.mobileInputController) {
            // Use mobile touch input
            const mobileInput = this.mobileInputController.getInputState();
            leftPressed = mobileInput.leftPressed;
            rightPressed = mobileInput.rightPressed;
            jumpPressed = mobileInput.jumpPressed;
            qPressed = false; // Mobile doesn't support item keys yet
            ePressed = false;
        } else {
            // Use keyboard input for desktop
            leftPressed = this.cursors.left?.isDown || this.wasd.A.isDown;
            rightPressed = this.cursors.right?.isDown || this.wasd.D.isDown;
            jumpPressed = this.cursors.up?.isDown || this.wasd.W.isDown || this.wasd.SPACE.isDown;
            qPressed = this.wasd.Q.isDown;
            ePressed = this.wasd.E.isDown;
        }

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

        // Handle item usage (Q and E keys) - only on key press, not hold
        if (qPressed && !this.itemKeysPreviousState.Q) {
            this.handleItemUse('Q');
        }
        if (ePressed && !this.itemKeysPreviousState.E) {
            this.handleItemUse('E');
        }

        // Update previous state for next frame
        this.itemKeysPreviousState.Q = qPressed;
        this.itemKeysPreviousState.E = ePressed;
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
        const minHorizontalSpeedForParticles = 150; // Much lower threshold - easier to trigger
        
        if (!state.isGrounded && initialJumpSpeed > speedThreshold) {
            // Calculate rotation speed with much gentler initial scaling
            const speedRatio = Math.min((initialJumpSpeed - speedThreshold) / (maxRotationSpeed - speedThreshold), 1.0);
            const exponentialRatio = Math.pow(speedRatio, 1.5); // Higher exponent = slower at low end, faster at high end
            const rotationSpeed = exponentialRatio * 35.0; // Max 35 radians per second
            
            // Rotate in direction player is facing (not movement direction)
            const rotationDirection = state.facingDirection; // 1 for right, -1 for left
            this.rotation += rotationSpeed * rotationDirection * (deltaTime / 1000);
            
            console.log(`🌪️ Jump-based rotation: initial=${initialJumpSpeed.toFixed(0)}, facing=${rotationDirection > 0 ? 'right' : 'left'}, rotation=${(this.rotation * 180 / Math.PI).toFixed(0)}°`);
            
            // Check if we should emit spinning particles (fast movement + spinning)
            const currentHorizontalSpeed = Math.abs(state.horizontalSpeed);
            const minRotationForParticles = 5; // Much lower threshold - easier to trigger
            
            if (currentHorizontalSpeed >= minHorizontalSpeedForParticles && rotationSpeed >= minRotationForParticles) {
                // Emit spinning event with data
                EventBus.emit('player-spinning', {
                    rotationSpeed: rotationSpeed,
                    horizontalSpeed: currentHorizontalSpeed,
                    playerPosition: { x: this.x, y: this.y }
                });
            }
        } else {
            // Stop spinning particles when conditions no longer met
            EventBus.emit('player-spinning-stop');
            
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
        // Audio is now handled by AudioManager via 'player-jumped' event
        
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

    private handleItemUse(slotKey: string): void {
        // Emit event for inventory system to handle
        EventBus.emit('player-use-item', { slotKey });
        console.log(`🎮 Player requested to use item in slot ${slotKey}`);
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
        
        // Update mobile input controller if it exists
        if (this.mobileInputController) {
            this.mobileInputController.updateConfiguration(newConfig);
            
            // Update debug mode based on new config
            this.mobileInputController.setDebugMode(newConfig.debug.enabled);
        }
        
        // Update player scale if it changed
        const playerConfig = newConfig.player;
        this.setScale(playerConfig.scale);
        
        // Update physics body size and offset
        const body = this.body as Physics.Arcade.Body;
        const scaledWidth = playerConfig.baseBodyWidth * playerConfig.scale;
        const scaledHeight = playerConfig.baseBodyHeight * playerConfig.scale;
        
        // When sprite is scaled, we need to adjust the offset to center the hitbox properly
        const offsetX = playerConfig.baseOffsetX + (playerConfig.baseBodyWidth * (1 - playerConfig.scale)) / 2;
        const offsetY = playerConfig.baseOffsetY + (playerConfig.baseBodyHeight * (1 - playerConfig.scale)) / 2;
        
        body.setSize(scaledWidth, scaledHeight);
        body.setOffset(offsetX, offsetY);
    }

    getMovementController(): MovementController {
        return this.movementController;
    }

    // Demo mode methods
    setDemoMode(enabled: boolean): void {
        this.demoMode = enabled;
        console.log(`🤖 Player demo mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    setAIController(aiController: AIController): void {
        this.aiController = aiController;
        console.log('🤖 AI controller connected to player');
    }

    isDemoMode(): boolean {
        return this.demoMode;
    }

    // Mobile input methods
    isMobile(): boolean {
        return this.isMobileDevice;
    }

    toggleMobileDebugMode(): void {
        if (this.mobileInputController) {
            const currentDebugMode = this.gameConfig.debug.enabled;
            this.mobileInputController.setDebugMode(!currentDebugMode);
            console.log(`📱 Mobile debug mode ${!currentDebugMode ? 'enabled' : 'disabled'}`);
        }
    }

    override destroy(): void {
        // Clean up mobile input controller
        if (this.mobileInputController) {
            this.mobileInputController.destroy();
            this.mobileInputController = null;
        }
        
        EventBus.off('player-jumped', this.onJump.bind(this));
        EventBus.off('player-movement-input', this.onMovementInput.bind(this));
        EventBus.off('player-wall-bounce', this.onWallBounce.bind(this));
        super.destroy();
    }
}