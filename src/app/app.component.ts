import { Component } from '@angular/core';
import { PhaserGame } from './phaser-game.component';
import { EventBus } from '../game/EventBus';
import Phaser from 'phaser';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [PhaserGame],
    templateUrl: './app.component.html'
})
export class AppComponent
{
    constructor()
    {
        // Set up EventBus subscriptions
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
            console.log('Scene ready:', scene.scene.key);
        });
    }
}
