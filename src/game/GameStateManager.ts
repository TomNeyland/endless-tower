import { EventBus } from './EventBus';

export enum GameState {
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over'
}

export class GameStateManager {
  private currentState: GameState = GameState.PLAYING;
  private previousState: GameState = GameState.PLAYING;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for game over events
    EventBus.on('game-over', this.onGameOver.bind(this));
    EventBus.on('restart-game', this.onRestart.bind(this));
  }

  private onGameOver(): void {
    this.setState(GameState.GAME_OVER);
  }

  private onRestart(): void {
    this.setState(GameState.PLAYING);
  }

  public setState(newState: GameState): void {
    if (newState === this.currentState) return;

    this.previousState = this.currentState;
    this.currentState = newState;

    console.log(`🎮 Game State: ${this.previousState} → ${this.currentState}`);

    // Emit state change event
    EventBus.emit('game-state-changed', {
      newState: this.currentState,
      previousState: this.previousState
    });
  }

  public getState(): GameState {
    return this.currentState;
  }

  public getPreviousState(): GameState {
    return this.previousState;
  }

  // Convenience methods for common state checks
  public isPlaying(): boolean {
    return this.currentState === GameState.PLAYING;
  }

  public isPaused(): boolean {
    return this.currentState === GameState.PAUSED;
  }

  public isGameOver(): boolean {
    return this.currentState === GameState.GAME_OVER;
  }

  // Capability checks for systems
  public allowsGameplayUpdates(): boolean {
    return this.currentState === GameState.PLAYING;
  }

  public allowsPlayerInput(): boolean {
    return this.currentState === GameState.PLAYING;
  }

  public allowsCameraMovement(): boolean {
    return this.currentState === GameState.PLAYING;
  }

  public allowsPhysicsUpdates(): boolean {
    return this.currentState === GameState.PLAYING;
  }

  // State transition methods
  public pause(): void {
    if (this.currentState === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    }
  }

  public resume(): void {
    if (this.currentState === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
    }
  }

  public gameOver(): void {
    this.setState(GameState.GAME_OVER);
  }

  public restart(): void {
    this.setState(GameState.PLAYING);
  }

  public destroy(): void {
    EventBus.off('game-over', this.onGameOver.bind(this));
    EventBus.off('restart-game', this.onRestart.bind(this));
  }
}