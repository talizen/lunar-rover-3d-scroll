// @ts-nocheck — procedural three.js code, intentionally left untyped
import * as THREE from "three"
import { texFrom, nrm } from "./textures"

const T = THREE

// The full PBR material set: metalness / roughness / procedural normals
export function buildMaterials(tx) {
var M = {};
// Worn white paint
M.paint = new T.MeshStandardMaterial({
  map: texFrom(tx.paintC, true), roughnessMap: texFrom(tx.paintORM), metalnessMap: texFrom(tx.paintORM),
  normalMap: nrm(tx.paintN), normalScale: new T.Vector2(0.9, 0.9), metalness: 1, roughness: 1, envMapIntensity: 1.0
});
// Gunmetal
M.dark = new T.MeshStandardMaterial({
  color: 0x3a3c40, metalness: 1, roughness: 0.62, roughnessMap: texFrom(tx.metalORM, false, 1.5),
  normalMap: nrm(tx.scratchN, 1.5), normalScale: new T.Vector2(0.8, 0.8)
});
// Bright steel
M.steel = new T.MeshStandardMaterial({
  color: 0xb9bcc0, metalness: 1, roughness: 0.5, roughnessMap: texFrom(tx.metalORM, false, 2),
  normalMap: nrm(tx.scratchN, 2.5), normalScale: new T.Vector2(0.5, 0.5)
});
// Lens barrel: brushed steel
M.brushed = new T.MeshStandardMaterial({
  color: 0x9a9da2, metalness: 1, roughness: 0.55, roughnessMap: texFrom(tx.metalORM, false, 2.2),
  normalMap: nrm(tx.brushN, 2.2), normalScale: new T.Vector2(0.6, 0.6)
});
M.rubber = new T.MeshStandardMaterial({ color: 0x1b1a19, metalness: 0.15, roughness: 0.82, normalMap: nrm(tx.treadN, 1), normalScale: new T.Vector2(1.2, 1.2) });
M.black = new T.MeshStandardMaterial({ color: 0x08090b, metalness: 0.6, roughness: 0.5, normalMap: nrm(tx.scratchN, 3), normalScale: new T.Vector2(0.3, 0.3) });
M.red = new T.MeshStandardMaterial({ color: 0xd8161b, metalness: 0.4, roughness: 0.35, normalMap: nrm(tx.scratchN, 4), normalScale: new T.Vector2(0.4, 0.4) });
// Lens glass: adds reflections only (additive blending), so the iris behind stays visible
M.glass = new T.MeshPhysicalMaterial({
  color: 0x000000, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.95,
  transparent: true, blending: T.AdditiveBlending, depthWrite: false,
  normalMap: nrm(tx.scratchN, 1.2), normalScale: new T.Vector2(0.12, 0.12)
});

M.steelDS = M.steel.clone(); M.steelDS.side = T.DoubleSide;
M.blackGloss = new T.MeshStandardMaterial({ color: 0x060607, metalness: 0.85, roughness: 0.26, side: T.DoubleSide });
M.knurl = new T.MeshStandardMaterial({ color: 0x2b2d30, metalness: 1, roughness: 0.42, normalMap: nrm(tx.knurlN, 14, 0.5), normalScale: new T.Vector2(1.4, 1.4) });
M.blade = new T.MeshStandardMaterial({ color: 0x161b24, metalness: 1, roughness: 0.4, envMapIntensity: 0.6, normalMap: nrm(tx.brushN, 3), normalScale: new T.Vector2(0.5, 0.5), side: T.DoubleSide });
M.gasket = new T.MeshStandardMaterial({ color: 0x101010, metalness: 0, roughness: 0.88 });
M.chrome = new T.MeshStandardMaterial({ color: 0xe6e6e6, metalness: 1, roughness: 0.14, normalMap: nrm(tx.scratchN, 4), normalScale: new T.Vector2(0.15, 0.15) });
M.moon = new T.MeshStandardMaterial({ map: texFrom(tx.moonC, true, 8), normalMap: nrm(tx.moonN, 8), normalScale: new T.Vector2(1.5, 1.5), roughness: 0.96, metalness: 0, vertexColors: true, envMapIntensity: 0.55 });
M.rock = new T.MeshStandardMaterial({ map: texFrom(tx.moonC, true, 1), normalMap: nrm(tx.moonN, 1), normalScale: new T.Vector2(1.2, 1.2), roughness: 0.95, metalness: 0, color: 0x9a9793, envMapIntensity: 0.55 });
return M;
}
