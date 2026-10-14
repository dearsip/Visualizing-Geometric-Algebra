export const EPS = 1e-9;
export const popcount = m => { let n = 0; while (m) { n += m & 1; m >>>= 1; } return n; };
export function parity(a, b) {
  let n = 0;
  for (let i = 0; (1 << i) <= a; i++) if (a & (1 << i)) n += popcount(b & ((1 << i) - 1));
  return n % 2 ? -1 : 1;
}
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const scale = (a, s) => a.map(v => v * s);
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const length = a => Math.sqrt(dot(a, a));
export const unit = a => scale(a, 1 / (length(a) || 1));
export const basis = (n, i, s = 1) => Array.from({ length: n }, (_, j) => i === j ? s : 0);
export function metric(n, kind = 'euclidean') {
  const g = Array.from({ length: n }, (_, i) => basis(n, i));
  if (kind === 'rigid') g[n - 1][n - 1] = 0;
  if (kind === 'conformal') {
    g[n - 1][n - 1] = g[n - 2][n - 2] = 0;
    g[n - 1][n - 2] = g[n - 2][n - 1] = -1;
  }
  return g;
}
export class Algebra {
  constructor(n, kind = 'euclidean') {
    this.n = n; this.size = 1 << n; this.top = this.size - 1; this.kind = kind;
    this.g = metric(n, kind); this.cache = new Map();
  }
  zero() { return Array(this.size).fill(0); }
  scalar(s = 1) { const r = this.zero(); r[0] = s; return r; }
  volume(s = 1) { const r = this.zero(); r[this.top] = s; return r; }
  vector(v) { const r = this.zero(); v.forEach((x, i) => { r[1 << i] = x; }); return r; }
  coordinates(a) { return Array.from({ length: this.n }, (_, i) => a[1 << i]); }
  blade(vectors) { return vectors.reduce((a, v) => this.wedge(a, this.vector(v)), this.scalar()); }
  wedge(a, b) {
    const r = this.zero();
    for (let i = 0; i < this.size; i++) if (a[i]) for (let j = 0; j < this.size; j++) {
      if (b[j] && !(i & j)) r[i | j] += a[i] * b[j] * parity(i, j);
    }
    return r;
  }
  complement(a, side = 'right') {
    const r = this.zero();
    for (let i = 0; i < this.size; i++) {
      const j = this.top ^ i;
      r[j] = a[i] * (side === 'right' ? parity(i, j) : parity(j, i));
    }
    return r;
  }
  rc(a) { return this.complement(a); }
  lc(a) { return this.complement(a, 'left'); }
  antiwedge(a, b) { return this.lc(this.wedge(this.rc(a), this.rc(b))); }
  reverse(a) { return a.map((v, i) => v * ((popcount(i) * (popcount(i) - 1) / 2) % 2 ? -1 : 1)); }
  grade(a, k) { return a.map((v, i) => popcount(i) === k ? v : 0); }
  gradeOf(a) { const gs = [...new Set(a.flatMap((v, i) => Math.abs(v) > EPS ? [popcount(i)] : []))]; return gs.length === 1 ? gs[0] : gs.length === 0 ? -1 : null; }
  // Chevalley action handles the non-diagonal null basis of CGA directly.
  vectorAction(i, a) {
    const r = this.zero(); const bit = 1 << i;
    for (let m = 0; m < this.size; m++) if (a[m]) {
      if (!(m & bit)) r[m | bit] += a[m] * parity(bit, m);
      let pos = 0;
      for (let j = 0; j < this.n; j++) if (m & (1 << j)) {
        r[m ^ (1 << j)] += a[m] * (pos % 2 ? -1 : 1) * this.g[i][j]; pos++;
      }
    }
    return r;
  }
  basisProduct(a, b) {
    const key = a * this.size + b;
    if (this.cache.has(key)) return this.cache.get(key);
    const result = this.zero();
    if (a === 0) result[b] = 1;
    else {
      const bit = a & -a; const i = Math.log2(bit); const rest = a ^ bit;
      const act = this.vectorAction(i, this.basisProduct(rest, b));
      for (let m = 0; m < this.size; m++) result[m] = act[m];
      let pos = 0;
      for (let j = 0; j < this.n; j++) if (rest & (1 << j)) {
        const c = (pos % 2 ? -1 : 1) * this.g[i][j];
        if (c) { const correction = this.basisProduct(rest ^ (1 << j), b); for (let m = 0; m < this.size; m++) result[m] -= c * correction[m]; }
        pos++;
      }
    }
    this.cache.set(key, result); return result;
  }
  gp(a, b) {
    const r = this.zero();
    for (let i = 0; i < this.size; i++) if (Math.abs(a[i]) > EPS) for (let j = 0; j < this.size; j++) if (Math.abs(b[j]) > EPS) {
      const p = this.basisProduct(i, j); for (let k = 0; k < this.size; k++) r[k] += a[i] * b[j] * p[k];
    }
    return r;
  }
  agp(a, b) { return this.lc(this.gp(this.rc(a), this.rc(b))); }
  metricMap(a) {
    const r = this.zero();
    for (let m = 0; m < this.size; m++) if (a[m]) {
      const vs = [];
      for (let i = 0; i < this.n; i++) if (m & (1 << i)) vs.push(this.g.map(row => row[i]));
      const b = this.blade(vs); for (let j = 0; j < this.size; j++) r[j] += a[m] * b[j];
    }
    return r;
  }
  antiMetricMap(a) { return this.lc(this.metricMap(this.rc(a))); }
  dual(a, weight = false, side = 'right') { return this.complement(weight ? this.antiMetricMap(a) : this.metricMap(a), side); }
  bulk(a) { return a.map((v, i) => (i & (1 << (this.n - 1))) ? 0 : v); }
  weight(a) { return sub(a, this.bulk(a)); }
  inner(a, b) { return dot(a, this.metricMap(b)); }
  antiInner(a, b) { return dot(a, this.antiMetricMap(b)); }
  attitude(a) { return this.antiwedge(a, this.vector(basis(this.n, this.n - 1))); }
  coefficientNorm(a) { return length(a); }
  bulkNorm(a) { return length(this.bulk(a)); }
  weightNorm(a) { return length(this.weight(a)); }
  project(a, b, { central = false, anti = false } = {}) {
    const d = this.dual(b, !central);
    const intermediate = anti ? this.antiwedge(a, d) : this.wedge(a, d);
    return { dual: d, intermediate, result: anti ? this.wedge(b, intermediate) : this.antiwedge(b, intermediate) };
  }
  reflect(v, a) {
    const q = this.inner(a, a);
    if (Math.abs(q) < EPS) return null;
    return scale(this.gp(this.gp(scale(a, -1), v), a), 1 / q);
  }
  antiReflect(v, a) { const r = this.reflect(this.rc(v), a); return r ? this.lc(r) : null; }
  factor(a) {
    const k = this.gradeOf(a);
    if (k === -1 || k === null || k === 0) return [];
    if (k === 1) return [this.coordinates(a)];
    const frame = [];
    for (let m = 0; m < this.size && frame.length < k; m++) if (popcount(m) === k - 1) {
      let v = Array.from({ length: this.n }, (_, j) => (m & (1 << j)) ? 0 : a[m | (1 << j)] * parity(1 << j, m));
      for (const u of frame) v = sub(v, scale(u, dot(u, v)));
      if (length(v) > EPS) frame.push(unit(v));
    }
    if (frame.length !== k) return [];
    const b = this.blade(frame); frame[0] = scale(frame[0], dot(a, b));
    if (length(sub(this.blade(frame), a)) > 1e-6) return []; // No false blade rendering of non-simple multivectors.
    return frame;
  }
}
export const close = (a, b, tolerance = 1e-7) => length(sub(a, b)) < tolerance;
export function basisOrder(n) {
  if (n === 3) return ['', '1', '2', '3', '23', '31', '12', '123'];
  if (n === 4) return ['', '1', '2', '3', '4', '41', '42', '43', '23', '31', '12', '423', '431', '412', '321', '1234'];
  return ['', '1', '2', '3', '4', '5', '41', '42', '43', '23', '31', '12', '15', '25', '35', '45', '423', '431', '412', '321', '415', '425', '435', '235', '315', '125', '1234', '4235', '4315', '4125', '3215', '12345'];
}
export function indicesBlade(alg, indices) { return alg.blade([...indices].map(i => basis(alg.n, +i - 1))); }
export function formatMV(a, alg, precision = 2) {
  const out = [];
  for (const indices of basisOrder(alg.n)) {
    const b = indicesBlade(alg, indices), m = b.findIndex(v => v !== 0), s = b[m];
    const v = a[m] * s;
    if (Math.abs(v) < 1e-7) continue;
    const sign = v < 0 ? '−' : out.length ? '+' : '';
    const power = 10 ** precision;
    const x = Math.round((Math.abs(v) + 1e-10) * power) / power;
    const label = indices.length === alg.n ? '𝟙' : indices ? `e${indices.replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[+d])}` : '1';
    out.push(`${sign}${x === 1 && indices ? '' : x}${indices ? ' ' : '·'}${label}`);
  }
  return out.join(' ') || '0';
}
