// @ts-nocheck — procedural three.js code, intentionally left untyped
import * as THREE from "three"
import { rng32, clamp, mix, sstep } from "./util"

const T = THREE

export function buildMoon(M, robot) {
var MR = 16, moon = new T.Group(); moon.position.set(0, -MR, 0);
// The rover and the Moon share one turntable: the whole rig spins for the 360° turn, while the Moon
// only rolls around its own fixed axis. The rover therefore always drives along the same great circle;
// nothing big sits on that route, so rocks and beacons can stay put without being run over
var rig = new T.Group(); rig.add(robot); rig.add(moon);
var moonCr = (function () {
  var rnd = rng32(31337), list = [];
  for (var j = 0; j < 110; j++) {
    var u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 0.065 + rnd() * rnd() * 0.16;   // angular radius; times MR that is 1–3.6 units
    list.push({ x: s * Math.cos(ph), y: u, z: s * Math.sin(ph), r: r, d: Math.min(0.34, r * MR * 0.11), lim: Math.cos(Math.min(3.1, r * 1.7)) });
  }
  return list;
})();
// Unit direction → surface height relative to the radius: low hills + craters (bowl + rim)
function moonH(x, y, z) {
  var h = 0.12 * Math.sin(x * 8.3 + 1.3) * Math.sin(y * 7.1 + 0.4) * Math.sin(z * 7.7 + 2.1) + 0.04 * Math.sin(x * 17 + z * 14) * Math.sin(y * 19 + 0.7);
  for (var j = 0; j < moonCr.length; j++) {
    var c = moonCr[j], dot = x * c.x + y * c.y + z * c.z;
    if (dot > c.lim) { var t = Math.acos(Math.min(1, dot)) / c.r, q = (t - 1) / 0.22; if (t < 1) h -= c.d * (1 - t * t); h += 0.35 * c.d * Math.exp(-q * q); }
  }
  return h;
}
(function () {
  var g = new T.BoxGeometry(1, 1, 1, 84, 84, 84), P = g.attributes.position, Nn = g.attributes.normal, col = [];
  var d = new T.Vector3(), t1 = new T.Vector3(), t2 = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3(), p0 = new T.Vector3(), AX = new T.Vector3(0, 1, 0), AZ = new T.Vector3(1, 0, 0);
  function disp(v, out) { out.copy(v).normalize(); return out.multiplyScalar(MR + moonH(out.x, out.y, out.z)); }
  for (var i = 0; i < P.count; i++) {
    d.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
    var h = moonH(d.x, d.y, d.z);
    t1.crossVectors(d, Math.abs(d.y) < 0.9 ? AX : AZ).normalize(); t2.crossVectors(d, t1);
    p0.copy(d).multiplyScalar(MR + h);
    disp(a.copy(d).addScaledVector(t1, 0.008), a).sub(p0); disp(b.copy(d).addScaledVector(t2, 0.008), b).sub(p0);
    a.cross(b).normalize(); if (a.dot(d) < 0) a.negate();
    P.setXYZ(i, p0.x, p0.y, p0.z); Nn.setXYZ(i, a.x, a.y, a.z);
    // Vertex colours: maria (large dark patches), dark crater floors, bright rims — so you can see it roll
    var mare = sstep(0.05, 0.3, Math.sin(d.x * 3.1 + 0.5) * Math.sin(d.y * 2.6 + 1.1) + 0.6 * Math.sin(d.z * 3.4 + d.x * 1.9));
    var sh = clamp(0.86 + h * 1.4, 0.42, 1.25) * mix(1, 0.62, mare);
    col.push(sh, sh, sh);
  }
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  var m = new T.Mesh(g, M.moon); m.receiveShadow = true; moon.add(m);
})();
// Things on the surface: rocks and survey beacons. They are fixed to the Moon and only roll with it
var UP = new T.Vector3(0, 1, 0);
function seatOnMoon(o, dir) {   // seat an object on the surface in a given direction
  o.m.position.copy(dir).multiplyScalar(MR + moonH(dir.x, dir.y, dir.z) - o.sink);
  o.m.quaternion.setFromUnitVectors(UP, dir); o.m.rotateY(o.spin);
}
(function () {
  var rnd = rng32(4242), dir = new T.Vector3();
  function rdir(band) { do { var u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); dir.set(s * Math.cos(ph), u, s * Math.sin(ph)); } while (Math.abs(dir.x) * MR < band); return dir; }   // band: minimum distance from the route (the x = 0 great circle)
  function put(obj, sink) {
    seatOnMoon({ m: obj, sink: sink, spin: rnd() * 6.28 }, dir); moon.add(obj);
  }
  var rockG = [0, 1, 2].map(function (k) {
    var g = new T.IcosahedronGeometry(1, 2), P = g.attributes.position, r2 = rng32(900 + k), f = [r2() * 6, r2() * 6, r2() * 6];
    for (var i = 0; i < P.count; i++) { var x = P.getX(i), y = P.getY(i), z = P.getZ(i), s = 1 + 0.22 * Math.sin(x * 2.7 + f[0]) * Math.sin(y * 3.1 + f[1]) + 0.16 * Math.sin(z * 4.3 + f[2]) * Math.sin(x * 3.7); P.setXYZ(i, x * s, y * s * 0.72, z * s); }
    g.computeVertexNormals(); return g;
  });
  var j;
  for (j = 0; j < 200; j++) {
    var big = j < 34, s = big ? 0.5 + rnd() * 1.0 : 0.05 + rnd() * 0.1, m = new T.Mesh(rockG[j % 3], M.rock);
    rdir(big ? 2.7 + s : 0);
    m.scale.set(s, s * (0.7 + rnd() * 0.5), s * (0.8 + rnd() * 0.4)); m.castShadow = m.receiveShadow = true;
    put(m, s * 0.25);   // pebbles everywhere; big rocks only on either side of the route
  }
  // Survey beacons the rover has planted along the way: a pole, a small flag and a light
  var poleG = new T.CylinderGeometry(0.03, 0.035, 1.3, 10), tipG = new T.SphereGeometry(0.07, 14, 10), flagG = new T.PlaneGeometry(0.36, 0.22);
  var tipM = new T.MeshStandardMaterial({ color: 0x220000, emissive: 0xff7a3a, emissiveIntensity: 2.6 });
  var flagM = new T.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.8, side: T.DoubleSide });
  for (j = 0; j < 22; j++) {
    rdir(3.3); var b = new T.Group();
    var pole = new T.Mesh(poleG, M.steel); pole.position.y = 0.65; pole.castShadow = true; b.add(pole);
    var tip = new T.Mesh(tipG, tipM); tip.position.y = 1.33; b.add(tip);
    var flag = new T.Mesh(flagG, flagM); flag.position.set(0.19, 1.08, 0); flag.castShadow = true; b.add(flag);
    put(b, 0.02);
  }
})();
return { MR: MR, moon: moon, rig: rig, moonH: moonH };
}
