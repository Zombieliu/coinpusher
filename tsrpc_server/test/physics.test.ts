import assert from 'assert';
import { PhysicsWorld } from '../src/server/room/bll/physics/PhysicsWorld';

describe('PhysicsWorld Simulation', function () {
    // @ts-ignore: Mocha context
    this.timeout(10000);

    before(async () => {
        console.log('Initializing Rapier...');
        await PhysicsWorld.waitForInit();
        console.log('Rapier initialized.');
    });

    it('should initialize correctly', () => {
        const world = new PhysicsWorld();
        assert.ok(world.world);
        assert.ok(world.pushPlatformBody);
    });

    it('Push platform should move', () => {
        const world = new PhysicsWorld();
        const initialZ = world.pushPlatformBody.translation().z;
        
        console.log(`Initial Platform Z: ${initialZ}`);

        // Run for 1 second (30 steps)
        for(let i=0; i<30; i++) {
            world.step(1/30);
        }
        
        const newZ = world.pushPlatformBody.translation().z;
        console.log(`New Platform Z: ${newZ}`);
        
        assert.notStrictEqual(initialZ, newZ);
        // Default direction is forward (increasing Z?) or backward?
        // PUSH_SPEED = 1.5, dir = 1. New Z should be higher.
        assert.ok(newZ > initialZ);
    });

    it('Coin should fall under gravity', () => {
        const world = new PhysicsWorld();
        const coinId = world.dropCoin(0);
        
        let coinBody = world.coins.get(coinId);
        const startY = coinBody!.translation().y;
        console.log(`Coin spawned at Y: ${startY}`);
        
        // Simulate falling
        for(let i=0; i<20; i++) {
            world.step(1/30);
        }
        
        const newY = coinBody!.translation().y;
        console.log(`Coin fell to Y: ${newY}`);
        
        assert.ok(newY < startY, `Coin should fall (New Y: ${newY} < Start Y: ${startY})`);
    });

    it('Coin should be collected when out of bounds', () => {
        const world = new PhysicsWorld();
        
        const coinId = world.dropCoin(0);
        const coinBody = world.coins.get(coinId)!;
        
        // Manually set position to satisfy collection condition:
        // Y < -5.0 AND Z > -0.5 AND abs(X) < 1.5
        // Let's put it at (0, -6, 0)
        coinBody.setTranslation({ x: 0, y: -6.0, z: 0.0 }, true);
        
        const result = world.step(1/30);
        
        assert.ok(result.collected.includes(coinId), 'Coin should be in collected list');
        assert.strictEqual(world.coins.has(coinId), false, 'Coin should be removed from world');
    });
});
