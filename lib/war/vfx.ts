import * as THREE from 'three';

const COLUMNS = 8;
const ROWS = 4;
const FRAMES = COLUMNS * ROWS;
const DURATION = 1.28;
const MAX_EFFECTS = 24;

type Effect = { sprite: THREE.Sprite; material: THREE.SpriteMaterial; texture: THREE.Texture; age: number; scale: number };

/** Billboard atlas effects: one original transparent sprite sheet, no inventory mutation. */
export class WarEffects {
  private atlas: THREE.Texture;
  private effects: Effect[] = [];
  private disposed = false;
  private scene: THREE.Scene;

  get activeCount(): number { return this.effects.length; }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.atlas = new THREE.TextureLoader().load('/war-assets/explosions.png', () => {
      if (!this.disposed) this.effects.forEach(effect => { effect.texture.needsUpdate = true; });
    });
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.atlas.minFilter = THREE.LinearFilter;
    this.atlas.magFilter = THREE.LinearFilter;
    this.atlas.generateMipmaps = false;
  }

  spawn(position: THREE.Vector3, scale = 1): void {
    if (this.disposed || !position.toArray().every(Number.isFinite) || !Number.isFinite(scale) || scale <= 0) return;
    if (this.effects.length >= MAX_EFFECTS) this.release(this.effects.shift()!);
    const texture = this.atlas.clone();
    texture.repeat.set(1 / COLUMNS, 1 / ROWS);
    texture.offset.set(0, 1 - 1 / ROWS);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
    const sprite = new THREE.Sprite(material);
    sprite.name = 'stylized-explosion';
    sprite.position.copy(position);
    sprite.position.y += scale;
    sprite.scale.setScalar(scale * 2.8);
    sprite.renderOrder = 2;
    this.scene.add(sprite);
    this.effects.push({ sprite, texture, material, age: 0, scale });
  }

  update(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
    // Elapsed time is not capped: a hidden tab resumes without immortal explosions.
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.age += deltaSeconds;
      if (effect.age >= DURATION) { this.release(effect); this.effects.splice(i, 1); continue; }
      const frame = Math.min(FRAMES - 1, Math.floor(effect.age / DURATION * FRAMES));
      effect.texture.offset.set((frame % COLUMNS) / COLUMNS, 1 - (Math.floor(frame / COLUMNS) + 1) / ROWS);
      const progress = effect.age / DURATION;
      effect.sprite.position.y += deltaSeconds * effect.scale * 0.12;
      effect.material.opacity = progress < 0.88 ? 1 : (1 - progress) / 0.12;
    }
  }

  private release(effect: Effect): void {
    this.scene.remove(effect.sprite);
    effect.material.dispose();
    effect.texture.dispose();
    // Sprite geometry is shared by Three.js; do not dispose it per effect.
  }

  dispose(): void {
    if (this.disposed) return;
    this.effects.forEach(effect => this.release(effect));
    this.effects = [];
    this.atlas.dispose();
    this.disposed = true;
  }
}
