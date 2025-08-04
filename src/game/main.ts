import { Game as MainGame } from './scenes/Game';
import { MenuScene } from './scenes/MenuScene';
import { AUTO, Game, Types } from "phaser";
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1024,
        height: 768,
        min: {
            width: 512,
            height: 384
        },
        max: {
            width: 2048,
            height: 1536
        }
    },
    fps: {
        target: 60,
        min: 30,
        forceSetTimeOut: false  // Let browser handle timing
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800, x: 0 },
            debug: false // Set to true to show physics debug hitboxes (player, platforms, walls)
            // Remove fixed physics FPS - let it sync with render
        }
    },
    render: {
        pixelArt: false,
        antialias: true,
        roundPixels: false  // Smoother sub-pixel movement
    },
    scene: [
        MenuScene,  // MenuScene loads first (initial scene)
        MainGame    // Game scene loads when transitioning from menu
    ],
    plugins: {
        scene: [{
            key: 'rexUI',
            plugin: RexUIPlugin,
            mapping: 'rexUI'
        }]
    }
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
}

export default StartGame;
