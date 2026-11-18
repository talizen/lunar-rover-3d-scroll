// @ts-nocheck — procedural three.js code, intentionally left untyped
import * as THREE from "three"
import { rng32, clamp, mix, sstep } from "./util"

const T = THREE

// Procedural textures: tileable value noise / fbm, scratch height fields, height-to-normal.
// Everything is computed in the browser; no image files are loaded.
var N = 512;

// Value noise on a periodic lattice; each octave doubles the period, so the result tiles seamlessly
function fbm(seed, px, py, oct) {
  var rnd = rng32(seed), out = new Float32Array(N * N), amp = 1, tot = 0;
  for (var o = 0; o < oct; o++) {
    var PX = px << o, PY = py << o, lat = new Float32Array(PX * PY);
    for (var i = 0; i < lat.length; i++) lat[i] = rnd();
    for (var y = 0; y < N; y++) {
      var v = y / N * PY, yi = Math.floor(v), fy = v - yi; fy = fy * fy * (3 - 2 * fy);
      var y0 = yi % PY, y1 = (yi + 1) % PY;
      for (var x = 0; x < N; x++) {
        var u = x / N * PX, xi = Math.floor(u), fx = u - xi; fx = fx * fx * (3 - 2 * fx);
        var x0 = xi % PX, x1 = (xi + 1) % PX;
        var a = lat[y0 * PX + x0], b = lat[y0 * PX + x1], c = lat[y1 * PX + x0], d = lat[y1 * PX + x1];
        out[y * N + x] += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
      }
    }
    tot += amp; amp *= 0.5;
  }
  for (var k = 0; k < out.length; k++) out[k] /= tot;
  return out;
}

// Scratch height field: 0 = untouched, positive = depth of the scratch
function scratchField(seed, count, gouges, pits) {
  var rnd = rng32(seed), H = new Float32Array(N * N);
  function dab(x, y, v) {
    var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    var x0 = ((xi % N) + N) % N, x1 = (x0 + 1) % N, y0 = ((yi % N) + N) % N, y1 = (y0 + 1) % N;
    var i;
    i = y0 * N + x0; H[i] = Math.max(H[i], v * (1 - fx) * (1 - fy));
    i = y0 * N + x1; H[i] = Math.max(H[i], v * fx * (1 - fy));
    i = y1 * N + x0; H[i] = Math.max(H[i], v * (1 - fx) * fy);
    i = y1 * N + x1; H[i] = Math.max(H[i], v * fx * fy);
  }
  function line(len, depth, width, curve) {
    var x = rnd() * N, y = rnd() * N, a = rnd() * Math.PI * 2;
    // Most scratches follow a couple of dominant directions (handling, rubbing); a few are random
    if (rnd() < 0.6) a = (rnd() < 0.5 ? 0.25 : 1.9) + (rnd() - 0.5) * 0.5;
    for (var s = 0; s < len; s += 0.5) {
      var fade = Math.sin(Math.PI * s / len);
      for (var w = 0; w < width; w++) dab(x + w * Math.sin(a) * 0.9, y - w * Math.cos(a) * 0.9, depth * (0.35 + 0.65 * fade));
      x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5; a += (rnd() - 0.5) * curve;
    }
  }
  var i;
  for (i = 0; i < count; i++) line(12 + rnd() * rnd() * 260, 0.15 + rnd() * 0.5, 1, 0.012);
  for (i = 0; i < gouges; i++) line(30 + rnd() * 160, 0.7 + rnd() * 0.3, 2 + (rnd() * 2 | 0), 0.03);
  for (i = 0; i < pits; i++) {
    var cx = rnd() * N, cy = rnd() * N, r = 1.5 + rnd() * 4, d = 0.4 + rnd() * 0.6;
    for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++) {
      var q = 1 - Math.sqrt(xx * xx + yy * yy) / r; if (q > 0) dab(cx + xx, cy + yy, d * q);
    }
  }
  return H;
}

function canvasOf(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

var maxAniso = 8;
export function texFrom(canvas, srgb, rx, ry) {
  var t = new T.CanvasTexture(canvas);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  if (rx) t.repeat.set(rx, ry || rx);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

// Height field (higher = raised) → tangent-space normal map
function normalCanvas(H, strength) {
  var c = canvasOf(N, N), ctx = c.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
  for (var y = 0; y < N; y++) {
    var yu = ((y + N - 1) % N) * N, yd = ((y + 1) % N) * N, yc = y * N;
    for (var x = 0; x < N; x++) {
      var xl = (x + N - 1) % N, xr = (x + 1) % N;
      var dx = (H[yc + xr] - H[yc + xl]) * strength, dy = (H[yd + x] - H[yu + x]) * strength;
      var inv = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (yc + x) * 4;
      d[i] = (-dx * inv * 0.5 + 0.5) * 255; d[i + 1] = (dy * inv * 0.5 + 0.5) * 255; d[i + 2] = (inv * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Fill an RGBA canvas pixel by pixel
function pixelCanvas(fn) {
  var c = canvasOf(N, N), ctx = c.getContext('2d'), img = ctx.createImageData(N, N), d = img.data, o = [0, 0, 0];
  for (var i = 0; i < N * N; i++) { fn(i, o); d[i * 4] = o[0] * 255; d[i * 4 + 1] = o[1] * 255; d[i * 4 + 2] = o[2] * 255; d[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function buildTextures() {
  var tx = {};
  var grain = fbm(11, 64, 64, 3), big = fbm(23, 3, 3, 6), mid = fbm(37, 8, 8, 5), streak = fbm(41, 28, 2, 4);
  var sc = scratchField(7, 300, 12, 90);

  // —— Micro-scratch normals shared by all metal parts: scratches + pits + fine grain
  var Hs = new Float32Array(N * N), i;
  for (i = 0; i < N * N; i++) Hs[i] = -sc[i] + grain[i] * 0.10 + mid[i] * 0.25;
  tx.scratchN = normalCanvas(Hs, 3.2);

  // —— Worn white paint: base coat + lunar dust in the crevices + vertical streaks + scratches down to bare metal
  var dust = new Float32Array(N * N);
  for (i = 0; i < N * N; i++) dust[i] = sstep(0.54, 0.7, big[i] + (mid[i] - 0.5) * 0.35 + (grain[i] - 0.5) * 0.12);
  tx.paintC = pixelCanvas(function (i, o) {
    var v = 0.9 + 0.12 * mid[i], dirt = 1 - 0.22 * sstep(0.45, 0.85, streak[i]), r = dust[i], s = sstep(0.5, 0.95, sc[i]) * (1 - r * 0.7);
    var rv = 0.7 + 0.5 * grain[i];
    var R = mix(0.86 * v * dirt, 0.42 * rv, r), G = mix(0.85 * v * dirt, 0.39 * rv, r), B = mix(0.8 * v * dirt, 0.35 * rv, r);
    o[0] = mix(R, 0.62, s); o[1] = mix(G, 0.62, s); o[2] = mix(B, 0.63, s);
  });
  // ORM convention: G = roughness, B = metalness
  tx.paintORM = pixelCanvas(function (i, o) {
    var r = dust[i], s = sstep(0.5, 0.95, sc[i]) * (1 - r * 0.7);
    o[0] = 1;
    o[1] = mix(mix(0.42 + 0.2 * mid[i] + 0.2 * sstep(0.45, 0.85, streak[i]), 0.95, r), 0.26, s);
    o[2] = mix(mix(0.12, 0.0, r), 1.0, s);
  });
  // Paint normals: scratches + grainy dust deposits
  var Hp = new Float32Array(N * N);
  for (i = 0; i < N * N; i++) Hp[i] = -sc[i] * 0.8 + dust[i] * (grain[i] * 0.7 + 0.1) + mid[i] * 0.2;
  tx.paintN = normalCanvas(Hp, 3.4);

  // —— Roughness variation for bare metal: smudges + brighter scratches
  tx.metalORM = pixelCanvas(function (i, o) {
    o[0] = 1; o[1] = clamp(0.45 + 0.55 * mid[i] + 0.25 * (big[i] - 0.5) - sc[i] * 0.35, 0.05, 1); o[2] = 1;
  });

  // —— Brushed metal: noise stretched in one direction
  var br = fbm(53, 3, 192, 2), Hb = new Float32Array(N * N);
  for (i = 0; i < N * N; i++) Hb[i] = br[i] * 0.55 - sc[i] * 0.3;
  tx.brushN = normalCanvas(Hb, 4.0);

  // —— Eyelid shutter: horizontal grooves + brushing
  var Hl = new Float32Array(N * N);
  for (i = 0; i < N * N; i++) {
    var v = ((i / N | 0) / N * 8) % 1;
    Hl[i] = sstep(0.0, 0.10, v) * (1 - sstep(0.90, 1.0, v)) * 1.3 + br[i] * 0.3 - sc[i] * 0.3;
  }
  tx.lidN = normalCanvas(Hl, 3.0);

  // —— Track rubber: chevron tread
  var Ht = new Float32Array(N * N);
  for (i = 0; i < N * N; i++) {
    var x = (i % N) / N, y = (i / N | 0) / N, w = ((x * 8 + Math.abs(y - 0.5) * 3) % 1);
    Ht[i] = sstep(0.1, 0.25, w) * (1 - sstep(0.65, 0.8, w)) + grain[i] * 0.2;
  }
  tx.treadN = normalCanvas(Ht, 4.0);

  // —— Solar cells: a 6 × 3 grid of deep-blue cells with thin bus bars
  var rnd = rng32(99), g;
  var sc2 = canvasOf(1024, 384); g = sc2.getContext('2d');
  g.fillStyle = '#c9ccd2'; g.fillRect(0, 0, 1024, 384);
  for (var cx = 0; cx < 6; cx++) for (var cy = 0; cy < 3; cy++) {
    var x0 = 8 + cx * 168, y0 = 8 + cy * 124, l = (rnd() * 14) | 0;
    var grd = g.createLinearGradient(x0, y0, x0 + 160, y0 + 116);
    grd.addColorStop(0, 'rgb(' + (16 + l) + ',' + (30 + l) + ',' + (70 + l) + ')'); grd.addColorStop(1, 'rgb(' + (8 + l) + ',' + (14 + l) + ',' + (40 + l) + ')');
    g.fillStyle = grd; g.fillRect(x0, y0, 160, 116);
    g.fillStyle = 'rgba(190,200,220,.35)';
    for (var k = 1; k < 4; k++) g.fillRect(x0 + k * 40, y0, 1.5, 116);
    g.fillRect(x0, y0 + 58, 160, 2);
  }
  tx.solar = sc2;

  // —— Name plate (worn screen print)
  var lc = canvasOf(1024, 288); g = lc.getContext('2d');
  g.font = '900 200px "Arial Black", "Helvetica Neue", Arial, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#ece8df';
  g.fillText('SV', 30, 150);
  g.fillStyle = '#d8161b'; g.fillRect(360, 40, 620, 216);
  g.fillStyle = '#ece8df'; g.textAlign = 'center'; g.fillText('54', 670, 152, 560);
  g.globalCompositeOperation = 'destination-out';
  for (i = 0; i < 2600; i++) { g.globalAlpha = rnd() * 0.9; g.fillRect(rnd() * 1024, rnd() * 288, 1 + rnd() * 5, 1 + rnd() * 3); }
  g.lineWidth = 2;
  for (i = 0; i < 70; i++) { g.globalAlpha = 0.5 + rnd() * 0.5; g.beginPath(); var sx = rnd() * 1024, sy = rnd() * 288; g.moveTo(sx, sy); g.lineTo(sx + (rnd() - 0.3) * 240, sy + (rnd() - 0.5) * 70); g.stroke(); }
  tx.label = lc;

  // —— Status display (emissive): a small radar sweep + a signal-strength bar
  var mc = canvasOf(256, 160); g = mc.getContext('2d');
  g.fillStyle = '#04080a'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = '#4fe0b0'; g.fillStyle = '#4fe0b0'; g.lineWidth = 3;
  for (i = 1; i <= 3; i++) { g.beginPath(); g.arc(64, 80, i * 18, 0, 7); g.stroke(); }
  g.beginPath(); g.moveTo(64, 80); g.arc(64, 80, 54, -1.2, -0.5); g.closePath(); g.globalAlpha = 0.6; g.fill(); g.globalAlpha = 1;
  g.beginPath(); g.arc(84, 66, 4, 0, 7); g.fill();
  for (i = 0; i < 5; i++) { g.globalAlpha = i < 3 ? 1 : 0.18; g.fillRect(140 + i * 20, 110 - i * 14, 14, 20 + i * 14); }
  tx.meter = mc;

  // —— Lunar surface: fine grain + lots of small craters (height field → normals); colour follows height
  var Hm = fbm(71, 6, 6, 6), mr = rng32(555);
  for (i = 0; i < N * N; i++) Hm[i] = Hm[i] * 0.9 + grain[i] * 0.12;
  for (i = 0; i < 150; i++) {
    var ccx = mr() * N, ccy = mr() * N, cr = 3 + mr() * mr() * 30, cd = 0.25 + mr() * 0.5, ext = Math.ceil(cr * 1.5);
    for (var yy = -ext; yy <= ext; yy++) for (var xx = -ext; xx <= ext; xx++) {
      var t = Math.sqrt(xx * xx + yy * yy) / cr; if (t > 1.5) continue;
      var q = (t - 1) / 0.2, dh = (t < 1 ? -cd * (1 - t * t) : 0) + 0.4 * cd * Math.exp(-q * q);
      Hm[((Math.floor(ccy + yy) % N + N) % N) * N + ((Math.floor(ccx + xx) % N + N) % N)] += dh;
    }
  }
  tx.moonN = normalCanvas(Hm, 5.5);
  tx.moonC = pixelCanvas(function (i, o) { var g = clamp(0.62 + (Hm[i] - 0.45) * 0.42 + (grain[i] - 0.5) * 0.12, 0.2, 1); o[0] = g; o[1] = g * 0.985; o[2] = g * 0.96; });

  // —— Knurling on the focus ring
  var Hk = new Float32Array(N * N);
  for (i = 0; i < N * N; i++) { var kx = (i % N) / N * 16, ky = (i / N | 0) / N * 16; Hk[i] = Math.max(Math.abs(Math.sin(Math.PI * (kx + ky))), Math.abs(Math.sin(Math.PI * (kx - ky)))); }
  tx.knurlN = normalCanvas(Hk, 2.2);

  // —— Engraving around the front ring of the lens
  var kc = canvasOf(1024, 1024); g = kc.getContext('2d');
  g.translate(512, 512); g.fillStyle = '#e9e4d6'; g.font = '700 30px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  var str = 'SV-54 SURVEY OPTIC  ·  1:2.8  f=35mm  ·  Ø52  ·  LUNAR MAPPING CAMERA  ·  ';
  for (i = 0; i < str.length; i++) { g.save(); g.rotate(i / str.length * Math.PI * 2); g.fillText(str[i], 0, -487); g.restore(); }
  for (i = 0; i < 120; i++) { g.save(); g.rotate(i / 120 * Math.PI * 2); g.fillRect(-1.5, -468, 3, i % 5 ? 7 : 13); g.restore(); }
  tx.mark = kc;
  return tx;
}
export function nrm(c, rx, ry) { return texFrom(c, false, rx, ry); }
export function setMaxAniso(v) { maxAniso = v; }
