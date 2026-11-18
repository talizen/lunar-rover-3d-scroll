// @ts-nocheck — procedural three.js code, intentionally left untyped
import * as THREE from "three"
import { clamp } from "./util"

const T = THREE

// Geometry helpers
export function rbox(w, h, d, r, uv) {
  var n = 4, g = new T.BoxGeometry(w, h, d, n, n, n), P = g.attributes.position, Nn = g.attributes.normal, hs = [w / 2, h / 2, d / 2];
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  var c = [0, 0, 0], q = [0, 0, 0];
  for (var i = 0; i < P.count; i++) {
    c[0] = P.getX(i); c[1] = P.getY(i); c[2] = P.getZ(i);
    var len = 0, a;
    for (a = 0; a < 3; a++) {
      var half = hs[a], idx = Math.round((c[a] + half) / (2 * half / n));
      c[a] = idx === 0 ? -half : idx === n ? half : -(half - r) + (idx - 1) / (n - 2) * 2 * (half - r);
      q[a] = clamp(c[a], -(half - r), half - r);
      len += (c[a] - q[a]) * (c[a] - q[a]);
    }
    len = Math.sqrt(len) || 1;
    var nx = (c[0] - q[0]) / len, ny = (c[1] - q[1]) / len, nz = (c[2] - q[2]) / len;
    P.setXYZ(i, q[0] + nx * r, q[1] + ny * r, q[2] + nz * r); Nn.setXYZ(i, nx, ny, nz);
  }
  var s = uv || Math.max(w, h, d) * 0.5, U = g.attributes.uv;
  for (i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * s, U.getY(i) * s);
  return g;
}

// Convex hull outline of several circles (counter-clockwise)
export function hullOfCircles(circles, inset) {
  var pts = [], i, k;
  for (k = 0; k < circles.length; k++) for (i = 0; i < 56; i++) {
    var a = i / 56 * Math.PI * 2, r = circles[k][2] - (inset || 0);
    pts.push([circles[k][0] + Math.cos(a) * r, circles[k][1] + Math.sin(a) * r]);
  }
  pts.sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
  function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  var lo = [], up = [];
  for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
  for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
  lo.pop(); up.pop();
  return lo.concat(up).map(function (p) { return new T.Vector2(p[0], p[1]); });
}

export function rod(a, b, r, mat) {
  var d = new T.Vector3().subVectors(b, a), m = new T.Mesh(new T.CylinderGeometry(r, r, d.length(), 20), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  return m;
}
export function add(parent, geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; }
