// @ts-nocheck — procedural three.js code, intentionally left untyped
import * as THREE from "three"
import { clamp, mix, seg, ease, sstep, rng32 } from "./util"
import { buildTextures, setMaxAniso } from "./textures"
import { buildMaterials } from "./materials"
import { buildRobot } from "./robot"
import { buildMoon } from "./moon"

const T = THREE

/**
 * Starts the whole 3D scene on a canvas and returns a cleanup function.
 * Elements inside root with data-at / data-speed are the parallax text layers; data-bar is the progress bar.
 * Browser only (call it from useEffect).
 */
export function startScene(canvas: HTMLCanvasElement, root: HTMLElement, onFail?: () => void): () => void {
var renderer, raf = 0;
try {
  renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) { if (onFail) onFail(); return function () {}; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.localClippingEnabled = true;   // the eyelids use local clipping planes
setMaxAniso(renderer.capabilities.getMaxAnisotropy());

var scene = new T.Scene();
var camera = new T.PerspectiveCamera(34, 1, 0.1, 400);

// —— Environment: build a small "photo studio" in code and bake it to PMREM — no HDR image needed
(function () {
  var env = new T.Scene(), sg = new T.SphereGeometry(60, 32, 24), col = [], P = sg.attributes.position;
  var top = new T.Color(1.25, 1.0, 0.92), hor = new T.Color(0.85, 0.34, 0.30), bot = new T.Color(0.20, 0.025, 0.03), c = new T.Color();
  for (var i = 0; i < P.count; i++) {
    var y = P.getY(i) / 60;
    if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(bot, Math.pow(-y, 0.45));
    col.push(c.r, c.g, c.b);
  }
  sg.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  env.add(new T.Mesh(sg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
  function box(x, y, z, w, h, d, k, tint) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: new T.Color(k * (tint ? tint[0] : 1), k * (tint ? tint[1] : 1), k * (tint ? tint[2] : 1)) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  }
  box(18, 26, 22, 22, 14, 0.5, 14);                 // key softbox: front right, high
  box(-30, 8, 10, 6, 26, 0.5, 9, [1, 0.92, 0.85]);  // strip light on the left
  box(0, 12, -34, 30, 5, 0.5, 7, [1, 0.8, 0.7]);    // rim light from behind
  box(6, 2, 40, 10, 6, 0.5, 5);                     // straight ahead: a highlight for the lens
  box(-10, 34, 0, 10, 10, 0.5, 6);                  // top light
  var pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.03).texture;
  pm.dispose();
})();

var key = new T.DirectionalLight(0xfff1e0, 2.6);
key.position.set(7, 12, 9); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -6; key.shadow.camera.right = 6; key.shadow.camera.top = 7; key.shadow.camera.bottom = -4;
key.shadow.camera.near = 1; key.shadow.camera.far = 40; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key);
var rim = new T.DirectionalLight(0xffb39a, 1.4); rim.position.set(-8, 6, -9); scene.add(rim);
scene.add(new T.HemisphereLight(0xffe6dc, 0x40080a, 0.55));

var tx = buildTextures(), M = buildMaterials(tx);
var R = buildRobot(M, tx), robot = R.robot, head = R.head, eyes = R.eyes, driveTreads = R.driveTreads, RB = R.RB, YMAX = R.YMAX, YMIN = R.YMIN, YCLOSE = R.YCLOSE;
var W = buildMoon(M, robot), MR = W.MR, moon = W.moon, rig = W.rig, moonH = W.moonH;
scene.add(rig);

var rocks = new T.Group(); scene.add(rocks);
(function () {
  // Drifting asteroids: lumpy icosahedra, displaced with a few sine waves
  var rnd = rng32(2024), geos = [0, 1, 2].map(function (k) {
    var g = new T.IcosahedronGeometry(1, 3), P = g.attributes.position, r2 = rng32(70 + k), f = [r2() * 6, r2() * 6, r2() * 6, r2() * 6];
    for (var i = 0; i < P.count; i++) {
      var x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      var s = 1 + 0.2 * Math.sin(x * 2.3 + f[0]) * Math.sin(y * 2.9 + f[1]) + 0.12 * Math.sin(z * 4.1 + f[2]) * Math.sin(x * 3.3 + f[3]) + 0.05 * Math.sin(x * 9 + y * 7 + z * 8);
      P.setXYZ(i, x * s * 1.15, y * s * 0.85, z * s);
    }
    g.computeVertexNormals(); return g;
  });
  for (var j = 0; j < 46; j++) {
    var z = -34 + rnd() * 44, x = (rnd() - 0.5) * (34 + (10 - z) * 0.5), y = -52 + rnd() * 50;
    if (z > -21 && Math.abs(x) < 19) x = (x < 0 ? -1 : 1) * (19 + rnd() * 11);   // keep clear of the Moon
    else if (Math.abs(x) < 4.5) x = (x < 0 ? -1 : 1) * (4.5 + rnd() * 9);
    var m = new T.Mesh(geos[j % 3], M.rock), s = 0.35 + rnd() * 1.1;
    m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
    m.userData = { y: y, ph: rnd() * 6.28, sp: (rnd() - 0.5) * 0.5, ax: rnd() < 0.5 ? 'x' : 'z' };
    rocks.add(m);
  }
})();

var EYE = new T.Vector3();
robot.updateMatrixWorld(true);
head.localToWorld(EYE.set(0, 0.0, 0.52));           // in front of the lens

var layers = [].map.call(root.querySelectorAll('[data-at]'), function (el) { return { el: el, at: +el.dataset.at, speed: +el.dataset.speed }; });
var barI = root.querySelector('[data-bar]');
var P = { cur: 0, tgt: 0 }, mouse = { x: 0, y: 0, sx: 0, sy: 0 }, VW = 1, VH = 1, TAN = Math.tan(camera.fov * Math.PI / 360);

function readScroll() { var max = document.documentElement.scrollHeight - window.innerHeight; P.tgt = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0; }
function resize() {
  VW = window.innerWidth; VH = window.innerHeight;
  renderer.setSize(VW, VH, false); camera.aspect = VW / VH; camera.updateProjectionMatrix(); readScroll();
}
window.addEventListener('scroll', readScroll, { passive: true });
window.addEventListener('resize', resize);
function onPointer(e) { mouse.x = e.clientX / VW * 2 - 1; mouse.y = e.clientY / VH * 2 - 1; }
window.addEventListener('pointermove', onPointer);
resize(); P.cur = P.tgt;

var clock = new T.Clock(), time = 0, walk = 0, lastP = P.cur, terrY = 0, terrPitch = 0, terrRoll = 0, FZ = [-1.3, -0.65, 0, 0.65, 1.3], SY = new Float32Array(10), tmpV2 = new T.Vector3();
var tmpV = new T.Vector3(), tmpQ = new T.Quaternion(), invQ = new T.Quaternion(), axis = new T.Vector3(), eyeW = new T.Vector3();
robot.rotation.order = 'YXZ';
function terrainAt(wx, wz) {   // surface height near the top of the Moon, in world space
  tmpV.set(wx, MR, wz).normalize().applyQuaternion(invQ);
  return moonH(tmpV.x, tmpV.y, tmpV.z);
}

function frame() {
  raf = requestAnimationFrame(frame);
  var dt = Math.min(clock.getDelta(), 0.05); time += dt;
  P.cur += (P.tgt - P.cur) * (1 - Math.exp(-dt * 7)); if (Math.abs(P.tgt - P.cur) < 1e-5) P.cur = P.tgt;
  mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 4)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 4));
  var p = P.cur, aspect = camera.aspect, j, k;

  // Three acts: wide shot → one full turn while dollying in → close-up on the eye → blink
  var e1 = ease(seg(p, 0.05, 0.60)), e2 = ease(seg(p, 0.60, 0.86)), turn = ease(seg(p, 0.07, 0.62));
  var YAW0 = -0.55, yaw = YAW0 + (Math.PI * 2 - YAW0) * turn;

  // Driving: slow on its own, faster while scrolling. The rover stays put; the Moon rolls back beneath it
  var ds = dt * 1.25 + Math.abs(p - lastP) * 70; lastP = p; walk += ds;
  moon.rotation.x = -walk / MR; invQ.copy(moon.quaternion).invert();
  rig.rotation.y = yaw;
  driveTreads(walk);
  // Follow the terrain: sample 5 points under each track, derive pitch and roll from the front/back and
  // left/right height differences, then lift the rover until the highest point just supports the tracks,
  // so the tracks never sink into crater rims or bumps
  var sF = 0, sB = 0, sL = 0, sR = 0, si = 0;
  for (var a = 0; a < 2; a++) for (var b = 0; b < 5; b++) {
    var wx = a ? 1.5 : -1.5, wz = FZ[b];
    var ys = terrainAt(wx, wz) - (wx * wx + wz * wz) / (2 * MR);
    SY[si++] = ys; if (b > 2) sF += ys; if (b < 2) sB += ys; if (a) sR += ys; else sL += ys;
  }
  terrPitch += (Math.atan2((sB - sF) / 4, 1.85) - terrPitch) * (1 - Math.exp(-dt * 8));
  terrRoll += (Math.atan2((sR - sL) / 5, 3.0) - terrRoll) * (1 - Math.exp(-dt * 8));
  var base = -1e9, tp = Math.tan(terrPitch), tr = Math.tan(terrRoll);
  for (si = 0; si < 10; si++) base = Math.max(base, SY[si] + FZ[si % 5] * tp - (si < 5 ? -1.5 : 1.5) * tr);
  terrY = Math.max(base, terrY - dt * 0.9);          // rise immediately, settle slowly
  robot.position.y = terrY + 0.035;
  robot.rotation.set(terrPitch, 0, terrRoll);
  head.rotation.x = mix(0.06, -0.03, e2) - terrPitch * 0.8 + Math.sin(time * 1.1) * 0.02 * (1 - e2 * 0.7);
  head.rotation.y = Math.sin(Math.PI * turn) * 0.38 + Math.sin(time * 0.7) * 0.05 * (1 - e2) + mouse.sx * 0.08 * e2;
  head.rotation.z = Math.sin(time * 0.9) * 0.025 * (1 - e2 * 0.6) - terrRoll * 0.8;

  // Blink: driven by scroll between 0.88 and 0.97 (fully closed in the middle); after reaching the end it blinks on its own every few seconds
  var s = seg(p, 0.88, 0.97), blink = ease(clamp((1 - Math.abs(2 * s - 1)) * 1.7, 0, 1));
  if (p > 0.985) { var bt = (time % 3.2) / 0.34; if (bt < 1) blink = Math.max(blink, Math.pow(Math.sin(Math.PI * bt), 0.7)); bt = ((time + 2.85) % 3.2) / 0.3; if (bt < 1 && ((time / 3.2) | 0) % 2) blink = Math.max(blink, Math.pow(Math.sin(Math.PI * bt), 0.7)); }
  var focus = ease(seg(p, 0.66, 0.86));
  scene.updateMatrixWorld(true);
  for (j = 0; j < eyes.length; j++) {
    var e = eyes[j];
    // Aperture: wide open from afar, stops down while focusing up close, opens a little on each blink
    var ap = mix(0.175, 0.128, focus) + blink * 0.03 + Math.sin(time * 2.3 + j) * 0.004;
    for (k = 0; k < e.blades.length; k++) e.blades[k].position.x = RB + ap;
    // The upper lid keeps y > cut, the lower lid keeps y < cut; closed, they meet at YCLOSE
    var cu = mix(YMAX + 0.03, YCLOSE - 0.01, blink), cl = mix(YMIN - 0.03, YCLOSE + 0.01, blink);
    e.up.set(tmpV.set(0, 1, 0), -cu).applyMatrix4(e.pod.matrixWorld);
    e.upE.set(tmpV.set(0, 1, 0), -(cu - 0.016)).applyMatrix4(e.pod.matrixWorld);
    e.low.set(tmpV.set(0, -1, 0), cl).applyMatrix4(e.pod.matrixWorld);
    e.lowE.set(tmpV.set(0, -1, 0), cl + 0.016).applyMatrix4(e.pod.matrixWorld);
  }

  // Camera: the rover stays horizontally centred; in the close-up it locks onto the eye
  head.localToWorld(eyeW.set(0, 0, 0.52));
  var D0 = 44, D1 = Math.max(11, 2.1 / (TAN * aspect)), D2 = Math.max(2.7, 1.2 / (TAN * aspect));
  var D = mix(mix(D0, D1, e1), D2, e2);
  var T0 = 2.1 + 0.27 * 2 * TAN * D0;                      // first screen: rover sits low in the frame
  var tx0 = mix(0, eyeW.x, e2), ty = mix(mix(T0, 2.3, e1) + robot.position.y * 0.6, eyeW.y, e2), tz = mix(0, eyeW.z, e2), lift = mix(mix(1.6, 0.9, e1), 0.02, e2);
  camera.position.set(tx0 + mouse.sx * D * 0.035, ty + lift - mouse.sy * D * 0.02, tz + D);
  camera.lookAt(tx0, ty, tz);

  // Asteroids: the whole field rises with the scroll, each one tumbles slowly
  rocks.position.y = p * 42;
  for (j = 0; j < rocks.children.length; j++) {
    var c = rocks.children[j], u = c.userData;
    c.position.y = u.y + Math.sin(time * 0.5 + u.ph) * 0.35; c.rotation[u.ax] += u.sp * dt;
  }

  // Text layers: each moves at its own speed — that difference is the parallax
  for (j = 0; j < layers.length; j++) {
    var l = layers[j];
    l.el.style.transform = 'translate3d(' + (-mouse.sx * l.speed * 2).toFixed(2) + 'px,' + ((l.at - p) * l.speed * VH).toFixed(2) + 'px,0)';
  }
  if (barI) barI.style.transform = 'scaleY(' + p.toFixed(4) + ')';

  renderer.render(scene, camera);
}
frame();

return function () {
  cancelAnimationFrame(raf);
  window.removeEventListener('scroll', readScroll);
  window.removeEventListener('resize', resize);
  window.removeEventListener('pointermove', onPointer);
  scene.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(function (m) { for (var k in m) { if (m[k] && m[k].isTexture) m[k].dispose(); } m.dispose(); });
  });
  if (scene.environment) scene.environment.dispose();
  renderer.dispose();
};
}
