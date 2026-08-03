import { Engine } from 'matter-js';
import { describe, expect, it } from 'vitest';
import { START_X } from '../core/constants';
import { getStage } from '../data/stages';
import { defaultUpgradeLevels, getVehicle } from '../data/vehicles';
import { TerrainGenerator } from '../systems/TerrainGenerator';
import { Vehicle } from './Vehicle';

describe('Vehicle physics', () => {
  it('uses driven wheel torque and suspension to move across real terrain', () => {
    const engine = Engine.create({ enableSleeping: false });
    const stage = getStage('countryside');
    engine.gravity.y = stage.gravity;
    const terrain = new TerrainGenerator(engine, stage, 123);
    terrain.reset(stage);
    const config = getVehicle('trailblazer');
    const spawnY = terrain.heightAt(START_X) - config.wheelRadius - config.suspensionLength - config.bodyHeight * 0.48 - 3;
    const vehicle = new Vehicle(engine, config, defaultUpgradeLevels(), stage, START_X, spawnY);

    for (let frame = 0; frame < 240; frame += 1) {
      vehicle.update({ gas: frame > 60, brake: false }, terrain.collisionBodies);
      Engine.update(engine, 1000 / 60);
    }

    expect(vehicle.bodies.rearWheel.angularVelocity).toBeGreaterThan(0.05);
    expect(vehicle.bodies.chassis.position.x).toBeGreaterThan(START_X + 25);
    expect(Math.abs(vehicle.bodies.chassis.angle)).toBeLessThan(Math.PI);
    expect(vehicle.bodies.chassis).not.toBe(vehicle.bodies.frontWheel);
    expect(vehicle.bodies.frontWheel).not.toBe(vehicle.bodies.rearWheel);
    expect(vehicle.bodies.constraints).toHaveLength(4);
  });

  it('brakes and reverses from a near stop', () => {
    const engine = Engine.create({ enableSleeping: false });
    const stage = getStage('countryside');
    engine.gravity.y = stage.gravity;
    const terrain = new TerrainGenerator(engine, stage, 321);
    terrain.reset(stage);
    const config = getVehicle('trailblazer');
    const spawnY = terrain.heightAt(START_X) - config.wheelRadius - config.suspensionLength - config.bodyHeight * 0.48 - 3;
    const vehicle = new Vehicle(engine, config, defaultUpgradeLevels(), stage, START_X, spawnY);

    for (let frame = 0; frame < 200; frame += 1) {
      vehicle.update({ gas: false, brake: frame > 45 }, terrain.collisionBodies);
      Engine.update(engine, 1000 / 60);
    }

    expect(vehicle.bodies.rearWheel.angularVelocity).toBeLessThan(-0.03);
    expect(vehicle.bodies.chassis.position.x).toBeLessThan(START_X - 15);
  });
});
