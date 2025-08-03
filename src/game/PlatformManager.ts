import { Scene, Physics } from 'phaser';
import { EventBus } from './EventBus';

export class PlatformManager {
    private scene: Scene;
    private platforms: Physics.Arcade.StaticGroup;

    constructor(scene: Scene) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
    }

    createPlatform(x: number, y: number, width: number): { group: Physics.Arcade.StaticGroup, platformId: string } {
        const tileWidth = 64;
        const numMiddleTiles = Math.max(1, Math.floor((width - 2 * tileWidth) / tileWidth));
        const actualWidth = (numMiddleTiles + 2) * tileWidth;
        
        const startX = x - actualWidth / 2;
        
        const platformGroup = this.scene.physics.add.staticGroup();

        platformGroup.create(startX, y, 'tiles', 'terrain_grass_cloud_left')
            .setOrigin(0, 0.5)
            .refreshBody();

        for (let i = 0; i < numMiddleTiles; i++) {
            platformGroup.create(startX + tileWidth + (i * tileWidth), y, 'tiles', 'terrain_grass_cloud_middle')
                .setOrigin(0, 0.5)
                .refreshBody();
        }

        platformGroup.create(startX + tileWidth + (numMiddleTiles * tileWidth), y, 'tiles', 'terrain_grass_cloud_right')
            .setOrigin(0, 0.5)
            .refreshBody();

        this.platforms.addMultiple(platformGroup.children.entries);
        
        EventBus.emit('platform-created', platformGroup, actualWidth, tileWidth);
        
        return { group: platformGroup, platformId: `platform_${Date.now()}` };
    }

    createGroundPlatform(): { group: Physics.Arcade.StaticGroup, platformId: string } {
        const groundY = this.scene.scale.height - 100;
        const groundWidth = this.scene.scale.width * 0.8;
        const groundX = this.scene.scale.width / 2;
        
        return this.createPlatform(groundX, groundY, groundWidth);
    }

    getPlatforms(): Physics.Arcade.StaticGroup {
        return this.platforms;
    }

    destroyPlatform(platform: any): void {
        platform.destroy();
    }

    clear(): void {
        this.platforms.clear(true, true);
    }
}