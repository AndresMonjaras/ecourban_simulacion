// Validacion estructural y de deformacion del candidato v2 frente al GLB fuente (desde experiencia-ecourban/).
import fs from 'node:fs';
globalThis.self = globalThis;
const THREE = await import('three');
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
THREE.ImageBitmapLoader.prototype.load = function (url, onLoad) { const bm = { width: 1, height: 1, close() {} }; setTimeout(() => onLoad(bm), 0); return bm; };
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
async function load(p) { const b = fs.readFileSync(p); return new Promise((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej)); }
const [srcP, candP] = process.argv.slice(2);
const A = await load(srcP), C = await load(candP);
const bonesOf = g => { const m = new Map(); g.scene.traverse(o => { if (o.isBone) m.set(o.name, o); }); return m; };
const ba = bonesOf(A), bc = bonesOf(C);
let sameRest = true; const diffs = [];
for (const [n, b] of ba) {
  const o = bc.get(n);
  if (!o) { sameRest = false; diffs.push(n + ' falta'); continue; }
  const pa = b.parent?.name, pc = o.parent?.name;
  if (pa !== pc || !b.position.equals(o.position) || !b.quaternion.equals(o.quaternion) || !b.scale.equals(o.scale)) { sameRest = false; diffs.push(n); }
}
console.log(`huesos: fuente ${ba.size}, candidato ${bc.size}; nombres/padres/transform de reposo identicos: ${sameRest}`, diffs.slice(0, 5));
const sk = []; C.scene.traverse(o => { if (o.isSkinnedMesh) sk.push(o); });
const m = sk[0];
const sa = []; A.scene.traverse(o => { if (o.isSkinnedMesh) sa.push(o); });
const ibmSame = m.skeleton.boneInverses.every((x, i) => x.equals(sa[0].skeleton.boneInverses[i])) && m.skeleton.bones.map(b => b.name).join() === sa[0].skeleton.bones.map(b => b.name).join();
console.log(`skinned meshes: ${sk.length} (${sk.map(s => s.name + ' ' + s.geometry.attributes.position.count + 'v')}); joints del skin: ${m.skeleton.bones.length}; orden de joints e inverseBindMatrices identicos a la fuente: ${ibmSame}`);
let wmin = 9, wmax = 0, neg = 0, badIdx = 0, nan = 0;
for (const mm0 of sk) { const sw = mm0.geometry.attributes.skinWeight, si = mm0.geometry.attributes.skinIndex;
  for (let i = 0; i < sw.count; i++) { let s = 0; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w < 0) neg++; if (!Number.isFinite(w)) nan++; s += w; if (si.getComponent(i, k) >= mm0.skeleton.bones.length) badIdx++; } wmin = Math.min(wmin, s); wmax = Math.max(wmax, s); } }
console.log(`pesos (${sk.length} mallas): suma [${wmin.toFixed(6)}, ${wmax.toFixed(6)}], negativos ${neg}, NaN ${nan}, indices fuera de rango ${badIdx}`);
console.log('materiales:', sk.map(x => `${x.material.name}(map=${!!x.material.map},vertexColors=${x.material.vertexColors})`).join(' '));
// deformacion: rotar cada hueso y medir que vertices se mueven y por cuanto
const inst = clone(C.scene); inst.updateMatrixWorld(true);
const im = []; inst.traverse(o => { if (o.isSkinnedMesh) im.push(o); }); const bones = new Map(); inst.traverse(o => { if (o.isBone) bones.set(o.name, o); });
const N = im.reduce((a, x) => a + x.geometry.attributes.position.count, 0), v = new THREE.Vector3();
const snap = () => { inst.updateMatrixWorld(true); const a = new Float32Array(N * 3); let o = 0; for (const mm of im) { mm.skeleton.update(); const n = mm.geometry.attributes.position.count; for (let i = 0; i < n; i++, o++) { mm.getVertexPosition(i, v); a.set([v.x, v.y, v.z], o * 3); } } return a; };
const base = snap();
const sumW = (name) => { let c = 0; for (const mm of im) { const idx = mm.skeleton.bones.findIndex(b => b.name === name); const si = mm.geometry.attributes.skinIndex, sw = mm.geometry.attributes.skinWeight; for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === idx && sw.getComponent(i, k) > 0.5) { c++; break; } } return c; };
for (const [name, axis, ang] of [['Head', 'x', 0.5], ['Neck', 'y', 0.5], ['Spine', 'x', 0.4], ['Spine2', 'z', 0.3], ['LeftShoulder', 'z', 0.3], ['LeftArm', 'z', -0.8], ['RightArm', 'z', 0.8], ['LeftForeArm', 'x', 1.0], ['RightForeArm', 'x', 1.0], ['LeftHand', 'x', 0.5], ['LeftUpLeg', 'x', -1.0], ['RightUpLeg', 'x', -1.0], ['LeftLeg', 'x', 1.2], ['RightLeg', 'x', 1.2], ['LeftFoot', 'x', 0.4]]) {
  const b = bones.get(name); const q0 = b.quaternion.clone(); b.rotation[axis] += ang;
  const d = snap(); b.quaternion.copy(q0);
  let moved = 0, maxd = 0, bad = 0; for (let i = 0; i < N; i++) { const l = Math.hypot(d[i * 3] - base[i * 3], d[i * 3 + 1] - base[i * 3 + 1], d[i * 3 + 2] - base[i * 3 + 2]); if (!Number.isFinite(l)) bad++; if (l > 1e-4) moved++; maxd = Math.max(maxd, l); }
  console.log(`  rotar ${name}.${axis} ${ang} rad: vertices movidos ${moved} (dominantes de ${name}: ${sumW(name)}), desplazamiento max ${maxd.toFixed(3)} m, no finitos ${bad}`);
}
const back = snap(); let res = 0; for (let i = 0; i < back.length; i++) res = Math.max(res, Math.abs(back[i] - base[i])); console.log(`  reposo restaurado, residuo max ${res.toExponential(2)} m (vertices totales ${N})`);
const bb = new THREE.Box3(); for (const [lab, g2] of [['fuente', A], ['candidato', C]]) { const b2 = new THREE.Box3(); g2.scene.updateMatrixWorld(true); g2.scene.traverse(o => { if (o.isSkinnedMesh) { o.computeBoundingBox(); b2.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld)); } }); const s = b2.getSize(new THREE.Vector3()); console.log(`bbox ${lab}: ${s.toArray().map(x => x.toFixed(3)).join(' x ')} m, y [${b2.min.y.toFixed(3)}, ${b2.max.y.toFixed(3)}]`); }
