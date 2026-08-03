import { Bodies, Body, Composite, Constraint, Query, Vector, type Engine } from 'matter-js';
import { COLLISION_CATEGORY } from '../core/constants';
import { upgradeMultiplier } from '../data/vehicles';
import type { InputState, StageConfig, UpgradeLevels, VehicleBodies, VehicleConfig } from '../types';

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

export class Vehicle {
  readonly bodies: VehicleBodies;
  readonly fuelCapacity: number;
  rearContact = false;
  frontContact = false;
  private readonly engineTorque: number;
  private readonly maxWheelSpeed: number;
  private readonly airTorque: number;
  private readonly group: number;

  constructor(
    private readonly engine: Engine,
    readonly config: VehicleConfig,
    upgrades: UpgradeLevels,
    stage: StageConfig,
    spawnX: number,
    spawnY: number,
  ) {
    this.group = Body.nextGroup(true);
    const engineBoost = upgradeMultiplier(upgrades.engine, 0.032);
    const gripBoost = upgradeMultiplier(upgrades.grip, 0.018);
    const suspensionBoost = upgradeMultiplier(upgrades.suspension, 0.014);
    const fuelBoost = upgradeMultiplier(upgrades.fuel, 0.035);
    this.engineTorque = config.engineTorque * engineBoost;
    this.maxWheelSpeed = config.maxWheelSpeed * (1 + (upgrades.engine - 1) * 0.009);
    this.airTorque = config.airTorque * (0.92 + engineBoost * 0.08);
    this.fuelCapacity = config.fuelCapacity * fuelBoost;

    const chassis = Bodies.rectangle(spawnX, spawnY, config.bodyWidth, config.bodyHeight, {
      label: 'vehicle:chassis',
      density: 0.003,
      friction: 0.55,
      frictionAir: 0.012,
      restitution: 0.06,
      chamfer: { radius: Math.min(12, config.bodyHeight * 0.32) },
      collisionFilter: { group: this.group, category: COLLISION_CATEGORY.vehicle, mask: COLLISION_CATEGORY.terrain },
    });
    Body.setMass(chassis, config.mass);

    const wheelOptions = {
      density: 0.003,
      friction: clamp(stage.grip * gripBoost * 1.35, 0.5, 1.75),
      frictionStatic: clamp(stage.grip * gripBoost * 2.6, 1, 3.4),
      frictionAir: 0.012,
      restitution: 0.08,
      collisionFilter: { group: this.group, category: COLLISION_CATEGORY.vehicle, mask: COLLISION_CATEGORY.terrain },
    };
    const wheelY = spawnY + config.bodyHeight * 0.48 + config.suspensionLength;
    const rearWheel = Bodies.circle(spawnX - config.wheelBase / 2, wheelY, config.wheelRadius, { ...wheelOptions, label: 'vehicle:rear-wheel' });
    const frontWheel = Bodies.circle(spawnX + config.wheelBase / 2, wheelY, config.wheelRadius, { ...wheelOptions, label: 'vehicle:front-wheel' });
    Body.setMass(rearWheel, config.wheelMass);
    Body.setMass(frontWheel, config.wheelMass);

    const springLength = config.suspensionLength * (1 + (upgrades.suspension - 1) * 0.008);
    const mainRestLength = springLength + config.bodyHeight * 0.2;
    const stabilizerRestLength = Math.hypot(config.wheelBase * 0.22, springLength + config.bodyHeight * 0.68);
    const springStiffness = clamp(0.62 + config.stats.suspension * 0.022 + suspensionBoost * 0.025, 0.68, 0.9);
    const damping = clamp(0.19 + config.stats.suspension * 0.012 + (upgrades.suspension - 1) * 0.003, 0.2, 0.39);
    const constraints = [
      Constraint.create({ bodyA: chassis, pointA: { x: -config.wheelBase / 2, y: config.bodyHeight * 0.28 }, bodyB: rearWheel, stiffness: springStiffness, damping, length: mainRestLength, label: 'suspension:rear' }),
      Constraint.create({ bodyA: chassis, pointA: { x: config.wheelBase / 2, y: config.bodyHeight * 0.28 }, bodyB: frontWheel, stiffness: springStiffness, damping, length: mainRestLength, label: 'suspension:front' }),
      Constraint.create({ bodyA: chassis, pointA: { x: -config.wheelBase * 0.28, y: -config.bodyHeight * 0.2 }, bodyB: rearWheel, stiffness: 0.35, damping: 0.18, length: stabilizerRestLength, label: 'suspension:rear-stabilizer' }),
      Constraint.create({ bodyA: chassis, pointA: { x: config.wheelBase * 0.28, y: -config.bodyHeight * 0.2 }, bodyB: frontWheel, stiffness: 0.35, damping: 0.18, length: stabilizerRestLength, label: 'suspension:front-stabilizer' }),
    ];

    const headSensor = Bodies.circle(spawnX + 9, spawnY - config.bodyHeight * 0.8 - 15, 13, {
      label: 'vehicle:head-sensor',
      isStatic: true,
      isSensor: true,
      collisionFilter: { category: COLLISION_CATEGORY.sensor, mask: COLLISION_CATEGORY.terrain },
    });
    this.bodies = { chassis, rearWheel, frontWheel, headSensor, constraints };
    Composite.add(engine.world, [chassis, rearWheel, frontWheel, headSensor, ...constraints]);
  }

  update(input: InputState, terrainBodies: Body[]): void {
    const { chassis, rearWheel, frontWheel } = this.bodies;
    this.rearContact = Query.collides(rearWheel, terrainBodies).length > 0;
    this.frontContact = Query.collides(frontWheel, terrainBodies).length > 0;
    const grounded = this.rearContact || this.frontContact;
    const wheels = [rearWheel, frontWheel];

    let targetSpeed = 0;
    let motorActive = false;
    if (input.gas) {
      targetSpeed = this.maxWheelSpeed;
      motorActive = true;
    } else if (input.brake) {
      if (chassis.velocity.x > 1.25) {
        for (const wheel of wheels) Body.setAngularVelocity(wheel, wheel.angularVelocity * 0.83);
      } else {
        targetSpeed = -this.maxWheelSpeed * 0.48;
        motorActive = true;
      }
    }

    if (grounded && motorActive) {
      for (const wheel of wheels) {
        const error = targetSpeed - wheel.angularVelocity;
        const torque = clamp(error * wheel.inertia * 0.0026 * this.engineTorque, -wheel.inertia * 0.0022, wheel.inertia * 0.0022);
        wheel.torque += torque;
        if (Math.abs(wheel.angularVelocity) > this.maxWheelSpeed * 1.12) {
          Body.setAngularVelocity(wheel, Math.sign(wheel.angularVelocity) * this.maxWheelSpeed * 1.12);
        }
      }
    }

    if (this.rearContact && this.frontContact) {
      const axleAngle = Math.atan2(frontWheel.position.y - rearWheel.position.y, frontWheel.position.x - rearWheel.position.x);
      const alignmentError = Math.atan2(Math.sin(axleAngle - chassis.angle), Math.cos(axleAngle - chassis.angle));
      Body.setAngularVelocity(chassis, chassis.angularVelocity * 0.72 + alignmentError * 0.055);
    } else if (grounded) {
      Body.setAngularVelocity(chassis, chassis.angularVelocity * 0.65);
    }

    if (!grounded) {
      const rotationInput = input.gas ? -1 : input.brake ? 1 : 0;
      chassis.torque += rotationInput * chassis.inertia * this.airTorque * 0.0015;
      const maxAirRotation = this.config.kind === 'bike' ? 0.045 : this.config.kind === 'buggy' ? 0.026 : 0.015;
      if (Math.abs(chassis.angularVelocity) > maxAirRotation) {
        Body.setAngularVelocity(chassis, Math.sign(chassis.angularVelocity) * maxAirRotation);
      }
    }
    this.syncHeadSensor();
  }

  private syncHeadSensor(): void {
    const { chassis, headSensor } = this.bodies;
    const localOffset = { x: this.config.kind === 'tractor' ? 14 : 8, y: -this.config.bodyHeight * 0.82 - 14 };
    const worldOffset = Vector.rotate(localOffset, chassis.angle);
    Body.setPosition(headSensor, Vector.add(chassis.position, worldOffset));
    Body.setAngle(headSensor, chassis.angle);
  }

  headTouches(terrainBodies: Body[]): boolean {
    this.syncHeadSensor();
    return Query.collides(this.bodies.headSensor, terrainBodies).length > 0;
  }

  wheelPosition(which: 'rear' | 'front'): { x: number; y: number } {
    return which === 'rear' ? this.bodies.rearWheel.position : this.bodies.frontWheel.position;
  }

  suspensionCompression(which: 'rear' | 'front'): number {
    const wheel = which === 'rear' ? this.bodies.rearWheel : this.bodies.frontWheel;
    const side = which === 'rear' ? -1 : 1;
    const anchor = Vector.add(this.bodies.chassis.position, Vector.rotate({ x: side * this.config.wheelBase / 2, y: this.config.bodyHeight * 0.28 }, this.bodies.chassis.angle));
    const distance = Vector.magnitude(Vector.sub(wheel.position, anchor));
    return clamp(1 - distance / (this.config.suspensionLength * 1.35), 0, 1);
  }

  get grounded(): boolean {
    return this.rearContact || this.frontContact;
  }

  get averageWheelSpeed(): number {
    return (this.bodies.rearWheel.angularVelocity + this.bodies.frontWheel.angularVelocity) / 2;
  }

  get speed(): number {
    return Vector.magnitude(this.bodies.chassis.velocity);
  }

  get upsideDown(): boolean {
    const normalized = Math.atan2(Math.sin(this.bodies.chassis.angle), Math.cos(this.bodies.chassis.angle));
    return Math.abs(normalized) > Math.PI * 0.62;
  }

  dispose(): void {
    Composite.remove(this.engine.world, this.bodies.chassis);
    Composite.remove(this.engine.world, this.bodies.rearWheel);
    Composite.remove(this.engine.world, this.bodies.frontWheel);
    Composite.remove(this.engine.world, this.bodies.headSensor);
    for (const constraint of this.bodies.constraints) Composite.remove(this.engine.world, constraint);
  }
}
