// @ts-nocheck — procedural three.js code, intentionally left untyped
import * as THREE from "three"
import { mix } from "./util"
import { texFrom, nrm } from "./textures"
import { rbox, hullOfCircles, rod, add } from "./geometry"

const T = THREE

// SV-54, a small lunar survey rover: low tracked chassis, rounded hull, solar wing,
// antenna mast and a single camera eye. Everything is built from primitives.
export function buildRobot(M, tx) {
var robot = new T.Group();
var i;
function xcyl(r, len, seg) { var c = new T.CylinderGeometry(r, r, len, seg || 20); c.rotateZ(Math.PI / 2); return c; }
function lathe(pts, seg) { var g = new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 80); g.rotateX(Math.PI / 2); return g; }

// —— Hull: a low, rounded shell with a dark front bay
var body = new T.Group(); robot.add(body);
add(body, rbox(2.2, 0.2, 1.95, 0.05), M.dark, 0, 0.74, 0);                     // chassis plate
add(body, rbox(2.3, 1.1, 1.9, 0.34, 1), M.paint, 0, 1.38, 0);                  // shell
add(body, rbox(1.7, 0.62, 0.12, 0.08), M.dark, 0, 1.4, 0.92);                  // front bay
add(body, rbox(2.34, 0.08, 1.94, 0.04), M.black, 0, 1.0, 0);                   // seam line
add(body, rbox(1.9, 0.07, 1.55, 0.03), M.dark, 0, 1.96, -0.05);                // top deck
// Side intakes
for (i = 0; i < 5; i++) {
  add(body, rbox(0.04, 0.06, 0.9, 0.015), M.black, 1.16, 1.2 + i * 0.09, -0.1);
  add(body, rbox(0.04, 0.06, 0.9, 0.015), M.black, -1.16, 1.2 + i * 0.09, -0.1);
}
// Bolts around the bay
var boltG = new T.CylinderGeometry(0.03, 0.03, 0.04, 10); boltG.rotateX(Math.PI / 2);
[[-0.8, 1.66], [0.8, 1.66], [-0.8, 1.14], [0.8, 1.14]].forEach(function (p) { add(body, boltG, M.steel, p[0], p[1], 0.985); });
// Name plate
var label = add(body, new T.PlaneGeometry(0.86, 0.24), new T.MeshStandardMaterial({ map: texFrom(tx.label, true), transparent: true, roughness: 0.55, metalness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), -0.34, 1.4, 0.985);
// Status display + switches
var meterT = texFrom(tx.meter, true);
add(body, new T.PlaneGeometry(0.46, 0.29), new T.MeshStandardMaterial({ map: meterT, emissiveMap: meterT, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0 }), 0.48, 1.4, 0.983);
var btnG = new T.CylinderGeometry(0.05, 0.055, 0.05, 20); btnG.rotateX(Math.PI / 2);
add(body, btnG, M.red, 0.12, 1.5, 0.99); add(body, btnG, M.steel, 0.12, 1.32, 0.99);
// Rear: a radiator and a warning light
add(body, rbox(1.4, 0.6, 0.1, 0.04), M.dark, 0, 1.4, -0.97);
for (i = 0; i < 6; i++) add(body, rbox(1.2, 0.04, 0.05, 0.015), M.black, 0, 1.18 + i * 0.09, -1.03);
add(body, new T.SphereGeometry(0.06, 16, 12), new T.MeshStandardMaterial({ color: 0x300000, emissive: 0xff2a1a, emissiveIntensity: 2.2, roughness: 0.3 }), -0.55, 1.82, -0.98);

// —— Tracks: a long, flat belt; cleats and wheels turn with the distance driven
var treads = [];
function buildTread(side) {
  var g = new T.Group(), W = 0.6, circles = [[1.05, 0.34, 0.34], [-1.05, 0.34, 0.34], [0, 0.3, 0.3]];
  var hull = hullOfCircles(circles), n = hull.length, pos = [], nor = [], uv = [], idx = [], s = 0, L = 0, j;
  for (j = 0; j < n; j++) L += hull[j].distanceTo(hull[(j + 1) % n]);
  var reps = Math.round(L / 0.62), pathS = [0];
  for (j = 0; j <= n; j++) {
    var p = hull[j % n], a = hull[(j - 1 + n) % n], b = hull[(j + 1) % n], tx_ = b.x - a.x, ty_ = b.y - a.y, tl = Math.hypot(tx_, ty_);
    var nx = ty_ / tl, ny = -tx_ / tl;   // outward normal of a counter-clockwise outline
    pos.push(-W / 2, p.y, p.x, W / 2, p.y, p.x); nor.push(0, ny, nx, 0, ny, nx); uv.push(s / L * reps, 0, s / L * reps, 1);
    if (j < n) { var q = j * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); s += p.distanceTo(b); pathS.push(s); }
  }
  var belt = new T.BufferGeometry();
  belt.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); belt.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  belt.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); belt.setIndex(idx);
  var beltMat = M.rubber.clone(); beltMat.side = T.DoubleSide; beltMat.normalMap = nrm(tx.treadN, 1);
  g.add(new T.Mesh(belt, beltMat));
  var count = Math.round(L / 0.17), cleats = new T.InstancedMesh(rbox(W + 0.04, 0.07, 0.1, 0.02), M.rubber, count);
  g.add(cleats);
  var tr = { cleats: cleats, hull: hull, pathS: pathS, L: L, n: n, count: count, reps: reps, belt: beltMat, wheels: [] };
  // Fender over the track
  add(g, rbox(W + 0.1, 0.06, 2.6, 0.03), M.paint, 0, 0.8, 0);
  // Side plates + wheels
  var plate = new T.ShapeGeometry(new T.Shape(hullOfCircles(circles, 0.07))); plate.rotateY(-Math.PI / 2);
  var plateMat = M.dark.clone(); plateMat.side = T.DoubleSide;
  add(g, plate, plateMat, side * (W / 2 - 0.06), 0, 0); add(g, plate, plateMat, -side * (W / 2 - 0.1), 0, 0);
  circles.forEach(function (c) {
    var wgp = new T.Group(); wgp.position.set(0, c[1], c[0]); g.add(wgp);
    var wg = new T.CylinderGeometry(c[2] - 0.1, c[2] - 0.1, W - 0.04, 28); wg.rotateZ(Math.PI / 2);
    add(wgp, wg, M.steel);
    var hg = new T.CylinderGeometry(c[2] * 0.5, c[2] * 0.56, 0.1, 6); hg.rotateZ(Math.PI / 2);   // hex hub
    add(wgp, hg, M.dark, side * (W / 2 + 0.01), 0, 0);
    var cg = new T.CylinderGeometry(c[2] * 0.16, c[2] * 0.16, 0.14, 12); cg.rotateZ(Math.PI / 2);
    add(wgp, cg, M.chrome, side * (W / 2 + 0.01), 0, 0);
    tr.wheels.push({ g: wgp, r: c[2] });
    g.add(rod(new T.Vector3(-side * W / 2, c[1], c[0]), new T.Vector3(-side * 0.6, c[1], c[0]), 0.08, M.dark));  // axle
  });
  g.position.x = side * 1.5;
  treads.push(tr);
  return g;
}
var m4 = new T.Matrix4(), bx = new T.Vector3(1, 0, 0), by = new T.Vector3(), bz = new T.Vector3();
function driveTreads(off) {
  for (var k = 0; k < treads.length; k++) {
    var tr = treads[k], e = 0, prev = -1;
    for (var j = 0; j < tr.count; j++) {
      var d = ((j / tr.count * tr.L - off) % tr.L + tr.L) % tr.L;
      if (d < prev) e = 0; prev = d;
      while (tr.pathS[e + 1] < d) e++;
      var A = tr.hull[e % tr.n], B = tr.hull[(e + 1) % tr.n], f = (d - tr.pathS[e]) / (tr.pathS[e + 1] - tr.pathS[e]), ex = B.x - A.x, ey = B.y - A.y, el = Math.hypot(ex, ey);
      var onx = ey / el, ony = -ex / el;
      m4.makeBasis(bx, by.set(0, ony, onx), bz.set(0, -onx, ony));
      m4.setPosition(0, mix(A.y, B.y, f) + ony * 0.02, mix(A.x, B.x, f) + onx * 0.02);
      tr.cleats.setMatrixAt(j, m4);
    }
    tr.cleats.instanceMatrix.needsUpdate = true;
    tr.belt.normalMap.offset.x = off / tr.L * tr.reps;
    for (j = 0; j < tr.wheels.length; j++) tr.wheels[j].g.rotation.x = off / tr.wheels[j].r;
  }
}
robot.add(buildTread(1)); robot.add(buildTread(-1)); driveTreads(0);

// —— Solar wing: one wide panel on a hinge behind the head, tilted toward the sky
var wing = new T.Group(); wing.position.set(0, 2.06, -0.72); wing.rotation.x = 0.5; robot.add(wing);
add(wing, xcyl(0.07, 1.9, 16), M.steel);
add(wing, rbox(0.12, 0.26, 0.12, 0.03), M.dark, 0.7, -0.1, 0); add(wing, rbox(0.12, 0.26, 0.12, 0.03), M.dark, -0.7, -0.1, 0);
var solarT = texFrom(tx.solar, true);
add(wing, rbox(2.5, 0.05, 0.95, 0.02), M.dark, 0, 0.0, -0.52);
add(wing, new T.PlaneGeometry(2.4, 0.86), new T.MeshPhysicalMaterial({ map: solarT, metalness: 0.5, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }), 0, 0.03, -0.52).rotation.x = -Math.PI / 2;

// —— Antenna mast with a small dish and a beacon
var mast = new T.Group(); mast.position.set(-0.86, 1.99, -0.45); robot.add(mast);
add(mast, new T.CylinderGeometry(0.1, 0.12, 0.1, 16), M.dark, 0, 0.05, 0);
mast.add(rod(new T.Vector3(0, 0.05, 0), new T.Vector3(0, 1.25, 0), 0.025, M.chrome));
var dish = new T.SphereGeometry(0.2, 24, 8, 0, Math.PI * 2, 0, 1.0); dish.rotateX(-Math.PI / 2); dish.translate(0, 0, 0.2);
var dishM = M.steel.clone(); dishM.side = T.DoubleSide;
add(mast, dish, dishM, 0, 0.8, 0).rotation.set(-0.5, 0.6, 0);
add(mast, new T.SphereGeometry(0.045, 12, 8), new T.MeshStandardMaterial({ color: 0x200, emissive: 0xff5a2a, emissiveIntensity: 3 }), 0, 1.28, 0);

// —— Neck: one short post on a turntable
var neck = new T.Group(); robot.add(neck);
add(neck, new T.CylinderGeometry(0.3, 0.34, 0.12, 28), M.dark, 0, 2.04, 0.2);
add(neck, new T.CylinderGeometry(0.13, 0.15, 0.5, 20), M.steel, 0, 2.3, 0.2);
add(neck, new T.CylinderGeometry(0.17, 0.17, 0.08, 20), M.dark, 0, 2.2, 0.2);
add(neck, new T.CylinderGeometry(0.17, 0.17, 0.08, 20), M.dark, 0, 2.42, 0.2);

// —— Head: a rounded camera housing with one large lens
var head = new T.Group(); head.position.set(0, 3.0, 0.38); head.scale.setScalar(0.84); robot.add(head);
add(head, rbox(1.62, 1.18, 1.05, 0.36, 1), M.paint, 0, 0, -0.38);
add(head, rbox(1.3, 0.9, 0.06, 0.2), M.dark, 0, 0, 0.14);                      // face plate
add(head, rbox(1.68, 0.06, 1.1, 0.03), M.black, 0, 0.36, -0.38);               // brow seam
add(head, rbox(0.5, 0.08, 0.5, 0.04), M.dark, 0, 0.62, -0.42);                 // top hatch
// Two small sensor LEDs beside the lens
[[0.56, 0.3, 0x6fd8ff], [0.56, 0.16, 0xffb44a]].forEach(function (s) {
  add(head, new T.CircleGeometry(0.035, 16), new T.MeshStandardMaterial({ color: 0x111111, emissive: s[2], emissiveIntensity: 2.4 }), s[0], s[1], 0.175);
  add(head, new T.TorusGeometry(0.04, 0.008, 6, 20), M.steel, s[0], s[1], 0.175);
});
// Side pivots that hold the head
add(head, xcyl(0.2, 0.12, 24), M.dark, 0.86, -0.05, -0.38); add(head, xcyl(0.2, 0.12, 24), M.dark, -0.86, -0.05, -0.38);
add(head, xcyl(0.1, 0.16, 16), M.chrome, 0.9, -0.05, -0.38); add(head, xcyl(0.1, 0.16, 16), M.chrome, -0.9, -0.05, -0.38);

var eyes = [];
var YMAX = 0.47, YMIN = -0.47, YCLOSE = -0.06, NB = 9, RB = 0.14;
function buildEye() {
  var pod = new T.Group(); pod.position.set(0, 0, -0.42); pod.scale.setScalar(1.05);
  var circles = [[0, 0, 0.5]], WALL = 0.06, DEPTH = 0.9, ZF = DEPTH - 0.24;
  var outer = hullOfCircles(circles), inner = hullOfCircles(circles, WALL);
  // Barrel: an outline with a hole, extruded
  var sh = new T.Shape(outer); sh.holes.push(new T.Path(inner));
  add(pod, new T.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 3, curveSegments: 32 }), M.brushed);
  // Rubber seal at the front + two bands around the barrel
  var mid = hullOfCircles(circles, WALL / 2).map(function (p) { return new T.Vector3(p.x, p.y, DEPTH + 0.016); });
  add(pod, new T.TubeGeometry(new T.CatmullRomCurve3(mid, true), 200, 0.024, 8, true), M.gasket);
  var band = new T.Shape(hullOfCircles(circles, -0.014)); band.holes.push(new T.Path(hullOfCircles(circles, 0.01)));
  add(pod, new T.ExtrudeGeometry(band, { depth: 0.07, bevelEnabled: false, curveSegments: 32 }), M.dark, 0, 0, 0.7);
  add(pod, new T.ExtrudeGeometry(band, { depth: 0.03, bevelEnabled: false, curveSegments: 32 }), M.steel, 0, 0, 0.6);
  // Front panel with a hole for the lens; the lens barrel is recessed
  var fp = new T.Shape(inner), h1 = new T.Path();
  h1.absarc(0, 0, 0.30, 0, Math.PI * 2, true); fp.holes.push(h1);
  add(pod, new T.ShapeGeometry(fp, 48), M.black, 0, 0, ZF);
  var scr = new T.CylinderGeometry(0.024, 0.024, 0.02, 14); scr.rotateX(Math.PI / 2);
  for (var sI = 0; sI < 4; sI++) {
    var an = Math.PI / 4 + sI * Math.PI / 2, px = Math.cos(an) * 0.415, py = Math.sin(an) * 0.415;
    add(pod, scr, M.steel, px, py, ZF + 0.008);
    add(pod, new T.BoxGeometry(0.04, 0.007, 0.006), M.black, px, py, ZF + 0.019).rotation.z = an;
  }

  var lens = new T.Group(); lens.position.set(0, 0, ZF); pod.add(lens);
  // Stepped front ring + knurled focus ring + engraving
  add(lens, lathe([[0.30, -0.005], [0.30, 0.036], [0.318, 0.06], [0.355, 0.066], [0.38, 0.05], [0.392, 0.02], [0.392, -0.005]]), M.steelDS);
  var kn = new T.CylinderGeometry(0.398, 0.398, 0.03, 96, 1, true); kn.rotateX(Math.PI / 2);
  add(lens, kn, M.knurl, 0, 0, 0.014);
  var markT = texFrom(tx.mark, true);
  add(lens, new T.RingGeometry(0.318, 0.352, 96, 1), new T.MeshStandardMaterial({ map: markT, transparent: true, roughness: 0.6, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0, 0.0665);
  // Three recessed barrel steps
  add(lens, lathe([[0.30, 0.0], [0.30, -0.03], [0.272, -0.03], [0.272, -0.062], [0.246, -0.062], [0.246, -0.1]]), M.blackGloss);
  // Aperture: nine real blades, each tilted slightly around its radial axis so they overlap
  var blades = [];
  for (var b = 0; b < NB; b++) {
    var holder = new T.Group(); holder.rotation.z = b / NB * Math.PI * 2; holder.position.z = -0.1; lens.add(holder);
    var bl = add(holder, new T.CircleGeometry(RB, 40), M.blade, RB + 0.1, 0, 0); bl.rotation.x = 0.09;
    add(bl, new T.RingGeometry(RB - 0.006, RB, 48), M.steel, 0, 0, 0.0008);   // bright blade edge
    blades.push(bl);
  }
  // Behind the aperture: sensor, a warm ring, a cool ring and one small inner lens
  add(lens, new T.CircleGeometry(0.26, 48), new T.MeshStandardMaterial({ color: 0x020203, metalness: 0.3, roughness: 0.5, envMapIntensity: 0.2 }), 0, 0, -0.21);
  add(lens, new T.RingGeometry(0.092, 0.106, 64), new T.MeshStandardMaterial({ color: 0x110a04, emissive: 0xffb866, emissiveIntensity: 2.2, roughness: 0.4 }), 0, 0, -0.2);
  add(lens, new T.RingGeometry(0.15, 0.156, 64), new T.MeshStandardMaterial({ color: 0x050a10, emissive: 0x6fb4ff, emissiveIntensity: 0.9, roughness: 0.4 }), 0, 0, -0.2);
  var core = add(lens, new T.SphereGeometry(0.088, 32, 20), new T.MeshPhysicalMaterial({ color: 0x050c1c, metalness: 0.2, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.45 }), 0, 0, -0.205); core.scale.z = 0.5;
  // Outermost domed glass
  var RHO = 0.5, TH = Math.asin(0.298 / RHO), dome = new T.SphereGeometry(RHO, 64, 24, 0, Math.PI * 2, 0, TH); dome.rotateX(Math.PI / 2);
  add(lens, dome, M.glass, 0, 0, 0.02 - RHO * Math.cos(TH)).renderOrder = 3;

  // Eyelids: plates shaped like the opening, revealed with local clipping planes;
  // a dark plate just behind each one gives the edge a thin shadow line
  var lidG = new T.ShapeGeometry(new T.Shape(hullOfCircles(circles, WALL - 0.004)), 32);
  function lid(z, tint, plain) {
    var m = plain ? new T.MeshStandardMaterial({ color: tint, metalness: 0.6, roughness: 0.6, side: T.DoubleSide })
      : new T.MeshStandardMaterial({ color: tint, metalness: 1, roughness: 0.5, roughnessMap: M.brushed.roughnessMap, normalMap: nrm(tx.lidN, 1), normalScale: new T.Vector2(1.0, 1.0), side: T.DoubleSide });
    m.clippingPlanes = [new T.Plane()];
    add(pod, lidG, m, 0, 0, z);
    return m.clippingPlanes[0];
  }
  var e = { pod: pod, side: 0, blades: blades, core: core,
    up: lid(ZF + 0.165, 0x7d8085), upE: lid(ZF + 0.16, 0x050505, true), low: lid(ZF + 0.152, 0x6c6f74), lowE: lid(ZF + 0.147, 0x050505, true) };
  eyes.push(e);
  return pod;
}
head.add(buildEye());

robot.traverse(function (o) { if (o.isMesh) { o.castShadow = o.material !== M.glass && !(o.material.clippingPlanes && o.material.clippingPlanes.length) && o !== label; o.receiveShadow = o.material !== M.glass; } });
return { robot: robot, head: head, arms: [], eyes: eyes, driveTreads: driveTreads, RB: RB, YMAX: YMAX, YMIN: YMIN, YCLOSE: YCLOSE };
}
