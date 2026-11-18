// @ts-nocheck — small untyped numeric helpers
// Small numeric helpers
export function rng32(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
export function mix(a, b, t) { return a + (b - a) * t; }
export function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
export function ease(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
export function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
