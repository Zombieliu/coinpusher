import { PhysicsWorld } from '../src/server/room/bll/physics/PhysicsWorld';

describe('Physics Performance Benchmark', function () {
    // @ts-ignore: Mocha context
    this.timeout(60000); // 1 minute

    before(async () => {
        await PhysicsWorld.waitForInit();
    });

    it('Stress Test: 500 Coins', () => {
        const world = new PhysicsWorld();
        const coinCount = 500;
        
        // Generate coins
        console.log(`Generating ${coinCount} coins...`);
        for(let i=0; i<coinCount; i++) {
            // Random spread X [-3, 3], Y [5, 20]
            // Spreading them out in Y to avoid instant heavy collision
            const x = (Math.random() - 0.5) * 6;
            const y = 5 + Math.random() * 10;
            
            // Use internal drop logic but hack position to avoid stacking
            const coinId = world.dropCoin(x);
            const body = world.coins.get(coinId);
            if (body) {
                body.setTranslation({ x, y, z: -6 + Math.random() * 4 }, true);
            }
        }

        console.log(`Simulating ${coinCount} coins for 300 frames (10 seconds of game time)...`);
        
        const times: number[] = [];
        
        for(let i=0; i<300; i++) {
            const start = process.hrtime();
            world.step(1/30);
            const end = process.hrtime(start);
            const ms = (end[0] * 1000 + end[1] / 1e6);
            times.push(ms);
        }
        
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const max = Math.max(...times);
        
        console.log('---------------------------------------------------');
        console.log(`Entity Count: ${coinCount} dynamic bodies`);
        console.log(`Average Step Time: ${avg.toFixed(3)} ms`);
        console.log(`Max Step Time:     ${max.toFixed(3)} ms`);
        console.log(`Projected FPS:     ${(1000/avg).toFixed(1)}`);
        console.log('---------------------------------------------------');
        
        if (avg > 33.3) {
            console.warn('🔴 WARNING: Cannot maintain 30 FPS server-side!');
        } else if (avg > 16.6) {
            console.warn('🟡 NOTE: Cannot maintain 60 FPS, but 30 FPS is fine.');
        } else {
            console.log('🟢 PERFORMANCE: Excellent. Capable of 60 FPS.');
        }
    });
});
