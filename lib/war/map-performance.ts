import type { Base } from './game.ts';

/** Credits and quantities do not change the representative miniature of each kind. */
export function mapGeometryKey(bases: Base[]) {
  return JSON.stringify(bases.map(base => [base.id, base.uf, base.municipalityId, base.team,
    Object.entries(base.inventory).filter(([, count]) => count > 0).map(([kind]) => kind).sort()]));
}

/** Exponential interpolation in log space gives the same feel at 2× and 600×. */
export function approachZoom(current: number, target: number, seconds: number) {
  const safeTarget = Math.max(.6, Math.min(1800, target));
  if (Math.abs(Math.log(safeTarget / current)) < .0005) return safeTarget;
  return Math.exp(Math.log(current) + Math.log(safeTarget / current) * (1 - Math.exp(-18 * Math.max(0, Math.min(.1, seconds)))));
}

/** Width follows measured text, keeping the actual font size constant as the camera zooms. */
export function labelScreenSize(textureWidth: number, textureHeight: number, twoLines: boolean, mobile: boolean) {
  const ratio = (twoLines ? mobile ? 20 : 23 : mobile ? 17 : 19) / 47;
  return { width: textureWidth * ratio, height: textureHeight * ratio };
}
