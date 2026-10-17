import * as THREE from 'three';
import { createUnit, type Team, type UnitKind } from './unit-models.ts';
import { createBaseCamp, CAMP_SURFACE_Y } from './base-camp.ts';

type Resource = THREE.BufferGeometry | THREE.Material;
const shared = new WeakSet<Resource>();
export function isMapSharedResource(resource: Resource) { return shared.has(resource); }

/** Scene-local templates own immutable GPU resources. Clones own their transforms and animation. */
export class MapModelCache {
  private templates = new Map<string, THREE.Group>();
  private resources = new Set<Resource>();
  private disposed = false;
  private get(key: string, build: () => THREE.Group) {
    if (this.disposed) throw new Error('Map model cache has been disposed.');
    let template = this.templates.get(key);
    if (!template) {
      template = build(); this.templates.set(key, template);
      template.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const resource of [object.geometry, ...materials]) { this.resources.add(resource); shared.add(resource); }
      });
    }
    return template.clone(true);
  }
  unit(kind: UnitKind, team: Team) { return this.get(`${team}:${kind}`, () => createUnit(kind, team)); }
  camp(team: Team, size: number) {
    if (!Number.isFinite(size) || size <= 0) throw new RangeError('Invalid camp size');
    const camp = this.get(`${team}:camp`, () => createBaseCamp(team, 1));
    camp.scale.setScalar(size); camp.userData.surfaceY = CAMP_SURFACE_Y * size; return camp;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const resource of this.resources) { shared.delete(resource); resource.dispose(); }
    this.resources.clear(); this.templates.clear();
  }
}
