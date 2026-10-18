import * as THREE from 'three';
import { animateUnit, type Team, type UnitKind } from './unit-models.ts';
import { CAMP_SLOTS, CAMP_SURFACE_Y } from './base-camp.ts';
import { faceTeamBadge } from './team-badges.ts';
import type { MapModelCache } from './map-model-cache.ts';
import type { WarEffects } from './vfx.ts';
import type { ToyDebris } from './destruction.ts';

export type StrikeInput = {
  index: number;
  kind: UnitKind;
  team: Team;
  level: number;
  sourceId: string;
  targetId: string;
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetSize: number;
};

export type ActiveStrike = {
  index: number;
  kind: UnitKind;
  team: Team;
  level: number;
  isKamikaze: boolean;
  sourceId: string;
  targetId: string;
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetSize: number;
  actor: THREE.Group;
  trail: THREE.Line;
  age: number;
  duration: number;
};

const MAX_ACTIVE_STRIKES = 18;

/**
 * Computes unit position and heading inside/around its base camp.
 * When `inBattle` is false, restores the exact pad slot coordinates.
 * When `inBattle` is true, units march forward, maneuver and fight actively.
 */
export function applyCampCombatMotion(
  unit: THREE.Group,
  kind: UnitKind,
  size: number,
  time: number,
  inBattle: boolean,
  seedOffset = 0,
): void {
  const slot = CAMP_SLOTS[kind];
  if (!slot || !Number.isFinite(size) || size <= 0) return;
  if (!inBattle || !Number.isFinite(time)) {
    unit.position.set(slot.x * size, CAMP_SURFACE_Y * size, slot.z * size);
    unit.rotation.set(0, 0, 0);
    return;
  }

  const phase = time * 2.4 + seedOffset * 1.37;
  if (kind === 'infantry') {
    // Infantry marches out toward the front gate and flanks in assault formation
    const marchZ = slot.z + 0.14 + Math.sin(phase) * 0.16;
    const marchX = slot.x + Math.cos(phase * 0.75) * 0.08;
    const dx = -Math.sin(phase * 0.75) * 0.06;
    const dz = Math.cos(phase) * 0.16;
    unit.position.set(marchX * size, CAMP_SURFACE_Y * size, marchZ * size);
    unit.rotation.set(0, Math.atan2(dx, Math.max(0.02, dz)) * 0.45, 0);
  } else if (kind === 'tank') {
    // Tank rolls forward and angles hull to engage targets
    const rollZ = slot.z + 0.1 + Math.sin(phase * 0.85) * 0.14;
    const rollX = slot.x + Math.sin(phase * 0.5) * 0.06;
    unit.position.set(rollX * size, CAMP_SURFACE_Y * size, rollZ * size);
    unit.rotation.set(0, Math.sin(phase * 0.6) * 0.32, 0);
  } else if (kind === 'artillery') {
    // Artillery pivots to aim and recoils on salvo
    const recoil = Math.max(0, Math.sin(phase * 2.2)) * 0.045;
    unit.position.set(slot.x * size, CAMP_SURFACE_Y * size, (slot.z - recoil) * size);
    unit.rotation.set(0, Math.sin(phase * 0.7) * 0.28, 0);
  } else {
    // Drone and Aircraft take off, circle above the base and bank into attack runs
    const radius = kind === 'aircraft' ? 0.22 : 0.16;
    const speed = kind === 'aircraft' ? 2.1 : 2.6;
    const angle = time * speed + seedOffset;
    const ox = slot.x + Math.cos(angle) * radius;
    const oz = slot.z + Math.sin(angle) * radius;
    const altitude = CAMP_SURFACE_Y + (kind === 'aircraft' ? 0.18 : 0.14) + Math.sin(angle * 2) * 0.04;
    unit.position.set(ox * size, altitude * size, oz * size);
    unit.rotation.set(0.18, Math.atan2(-Math.sin(angle), Math.cos(angle)), -0.28);
  }
}

/**
 * Computes the 3D position and orientation along a strike mission at normalized progress `t` in [0, 1].
 * - `aircraft` & `drone`: climb to cruise altitude, then nose-dive kamikaze straight into the target!
 * - `infantry` & `tank`: march and charge across the ground toward the enemy base, firing on the move.
 * - `artillery`: high ballistic shell trajectory.
 */
export function strikePoseAt(
  kind: UnitKind,
  sourcePos: THREE.Vector3,
  targetPos: THREE.Vector3,
  t: number,
): { position: THREE.Vector3; quaternion: THREE.Quaternion; pitch: number } {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const position = new THREE.Vector3().lerpVectors(sourcePos, targetPos, clamped);
  const direction = targetPos.clone().sub(sourcePos);
  const flatDist = Math.hypot(direction.x, direction.z) || 1;
  const yaw = Math.atan2(direction.x, direction.z);
  let pitch = 0;
  let roll = 0;

  if (kind === 'aircraft' || kind === 'drone') {
    // Kamikaze flight curve: steep climb (0..0.55) followed by aggressive terminal dive (0.55..1.0)
    const peakHeight = Math.min(6.5, Math.max(1.8, flatDist * 0.28));
    if (clamped < 0.55) {
      const u = clamped / 0.55;
      const climb = Math.sin(u * Math.PI * 0.5);
      position.y += 0.25 + climb * peakHeight;
      pitch = -0.28 * (1 - u); // nose up during climb
      roll = Math.sin(u * Math.PI * 2) * 0.18;
    } else {
      const u = (clamped - 0.55) / 0.45;
      // Terminal kamikaze dive accelerates into target
      const dive = 1 - Math.pow(u, 1.85);
      position.y += 0.08 + dive * peakHeight;
      pitch = 0.72 + u * 0.45; // steep nose-down kamikaze dive
      roll = Math.sin(u * Math.PI * 3) * 0.32;
    }
  } else if (kind === 'artillery') {
    // High ballistic arc
    const arcHeight = Math.min(5.2, Math.max(1.4, flatDist * 0.24));
    position.y += 0.18 + Math.sin(clamped * Math.PI) * arcHeight;
    pitch = (clamped - 0.5) * 0.9;
  } else {
    // Ground assault column (infantry marching / tank charging)
    const marchProgress = Math.min(1, clamped * 1.15);
    position.lerpVectors(sourcePos, targetPos, marchProgress);
    position.y = Math.max(sourcePos.y, targetPos.y) + 0.05;
    if (kind === 'infantry') {
      position.y += Math.abs(Math.sin(clamped * Math.PI * 14)) * 0.06;
    }
    pitch = 0;
  }

  const euler = new THREE.Euler(pitch, yaw, roll, 'YXZ');
  const quaternion = new THREE.Quaternion().setFromEuler(euler);
  return { position, quaternion, pitch };
}

/**
 * Manages active marching columns and kamikaze air/drone strikes on the 3D map.
 */
export class BattleChoreographer {
  private group = new THREE.Group();
  private strikes: ActiveStrike[] = [];
  private modelCache: MapModelCache;
  private effects: WarEffects;
  private debris: ToyDebris;
  private onTargetImpact?: (strike: ActiveStrike) => void;

  constructor(
    scene: THREE.Scene,
    modelCache: MapModelCache,
    effects: WarEffects,
    debris: ToyDebris,
    onTargetImpact?: (strike: ActiveStrike) => void,
  ) {
    this.group.name = 'battle-choreography';
    scene.add(this.group);
    this.modelCache = modelCache;
    this.effects = effects;
    this.debris = debris;
    this.onTargetImpact = onTargetImpact;
  }

  get activeCount(): number {
    return this.strikes.length;
  }

  get activeStrikes(): readonly ActiveStrike[] {
    return this.strikes;
  }

  spawn(input: StrikeInput): ActiveStrike | null {
    if (this.strikes.length >= MAX_ACTIVE_STRIKES) {
      this.finishStrike(this.strikes.shift()!, true);
    }
    const isKamikaze = input.kind === 'aircraft' || input.kind === 'drone';
    const actor = this.modelCache.unit(input.kind, input.team, input.level);
    actor.name = `strike-${input.kind}-${input.index}`;
    actor.userData.strikeActor = true;
    actor.userData.kamikaze = isKamikaze;
    actor.userData.groundY = input.targetPos.y + 0.04;

    const points = [
      input.sourcePos.clone().add(new THREE.Vector3(0, 0.22, 0)),
      input.sourcePos.clone().lerp(input.targetPos, 0.5).add(new THREE.Vector3(0, isKamikaze ? 2.6 : 0.8, 0)),
      input.targetPos.clone().add(new THREE.Vector3(0, 0.18, 0)),
    ];
    const trailColor = input.team === 'red' ? '#ff7b6b' : '#6cb2ff';
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: trailColor, transparent: true, opacity: isKamikaze ? 0.82 : 0.55 }),
    );
    this.group.add(actor, trail);

    const duration = isKamikaze ? 1.35 : input.kind === 'artillery' ? 0.95 : 1.55;
    const strike: ActiveStrike = {
      ...input,
      isKamikaze,
      actor,
      trail,
      age: 0,
      duration,
    };
    const pose = strikePoseAt(input.kind, input.sourcePos, input.targetPos, 0);
    actor.position.copy(pose.position);
    actor.quaternion.copy(pose.quaternion);
    this.strikes.push(strike);
    return strike;
  }

  update(dt: number, timeSeconds: number, camera: THREE.OrthographicCamera): boolean {
    if (!Number.isFinite(dt) || dt < 0 || !this.strikes.length) return false;
    const zoomScale = Math.max(0.16, Math.min(0.85, 0.65 / Math.pow(Math.max(1, camera.zoom), 0.55)));
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const strike = this.strikes[i];
      strike.age += dt;
      const t = Math.min(1, strike.age / strike.duration);
      const pose = strikePoseAt(strike.kind, strike.sourcePos, strike.targetPos, t);
      strike.actor.position.copy(pose.position);
      strike.actor.quaternion.copy(pose.quaternion);
      strike.actor.scale.setScalar(zoomScale);
      animateUnit(strike.actor, timeSeconds + strike.index * 0.3, true);
      faceTeamBadge(strike.actor, camera);

      const mat = strike.trail.material as THREE.LineBasicMaterial;
      mat.opacity = (1 - t * 0.65) * (strike.isKamikaze ? 0.85 : 0.55);

      if (strike.age >= strike.duration) {
        this.strikes.splice(i, 1);
        this.finishStrike(strike, true);
      }
    }
    return true;
  }

  private finishStrike(strike: ActiveStrike, explodeOnTarget: boolean): void {
    this.group.remove(strike.trail);
    strike.trail.geometry.dispose();
    (strike.trail.material as THREE.Material).dispose();

    if (explodeOnTarget) {
      const impactPos = strike.targetPos.clone().add(new THREE.Vector3(0, 0.35, 0));
      const blastScale = Math.max(0.65, strike.targetSize * (strike.isKamikaze ? 1.35 : 1));
      this.effects.spawn(impactPos, blastScale);

      if (strike.isKamikaze) {
        // Kamikaze aircraft and drones self-detonate and shatter into pieces right on the target!
        strike.actor.position.copy(strike.targetPos).add(new THREE.Vector3(0, 0.12, 0));
        strike.actor.rotation.set(0, strike.actor.rotation.y, 0);
        strike.actor.scale.setScalar(Math.max(0.14, strike.targetSize * 0.16));
        strike.actor.userData.groundY = strike.targetPos.y + 0.03;
        const shattered = this.debris.shatter(strike.actor, strike.index * 9973 + 13);
        if (!shattered) {
          this.effects.spawn(impactPos.clone().add(new THREE.Vector3(0.15, 0.2, -0.15)), blastScale * 0.85);
        }
      }
      this.onTargetImpact?.(strike);
    }

    this.group.remove(strike.actor);
  }

  clear(): void {
    while (this.strikes.length) {
      const strike = this.strikes.pop()!;
      this.group.remove(strike.trail);
      strike.trail.geometry.dispose();
      (strike.trail.material as THREE.Material).dispose();
      this.group.remove(strike.actor);
    }
  }

  dispose(): void {
    this.clear();
    this.group.parent?.remove(this.group);
  }
}
