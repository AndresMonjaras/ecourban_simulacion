// Aplica las poses procedurales REALES de la app (animacionPersona.ts + adaptadorRigPersona.ts) a un GLB
// y exporta posiciones skinneadas (CPU) por primitiva para render offline.
// Uso (desde experiencia-ecourban/): node .tmp_poses_app.mjs <glb> <salida_dir> <etiqueta>
import fs from 'node:fs';
import path from 'node:path';
globalThis.self = globalThis;
const THREE = await import('three');
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const anim = await import(path.resolve('src/escena/animacionPersona.ts'));
const { crearAdaptadorRigPersona } = await import(path.resolve('src/escena/adaptadorRigPersona.ts'));
THREE.ImageBitmapLoader.prototype.load = function (url, onLoad) { const bm = { width: 1, height: 1, close() {} }; setTimeout(() => onLoad(bm), 0); return bm; };
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });

// Copia literal de PERFIL_ACTION_SUIT (perfilRigPersona.ts usa import.meta.env, no importable en node)
const PERFIL = {
  id: 'action-suit-human', urlModelo: '', rotacionBase: [0, 0, 0], escalaAltura: 0.94, alturaCaderaReposo: 1.0192, offsetY: 0, longitudTorsoSuperior: 0.13,
  huesos: { cadera: 'Hips', columna: 'Spine', columnaMedia: 'Spine1', pecho: 'Spine2', cuello: 'Neck', cabeza: 'Head',
    hombroIzq: 'LeftShoulder', brazoIzq: 'LeftArm', antebrazoIzq: 'LeftForeArm', manoIzq: 'LeftHand',
    hombroDer: 'RightShoulder', brazoDer: 'RightArm', antebrazoDer: 'RightForeArm', manoDer: 'RightHand',
    musloIzq: 'LeftUpLeg', pantorrillaIzq: 'LeftLeg', pieIzq: 'LeftFoot', musloDer: 'RightUpLeg', pantorrillaDer: 'RightLeg', pieDer: 'RightFoot' },
};
const [glbPath, outDir, label] = process.argv.slice(2);
const b = fs.readFileSync(glbPath);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', res, rej));
const ad = crearAdaptadorRigPersona(gltf.scene, PERFIL, false);
const poses = { pie: 0.0, marcha_a: 0.17, marcha_b: 0.26, sentandose: 0.86, sentado: 1.0 };
const v = new THREE.Vector3();
const resumen = {};
for (const [nombre, p] of Object.entries(poses)) {
  const pose = anim.posePersonaParaProgreso(p);
  ad.aplicarPose(pose, [0, 0, 0], 0);
  ad.raiz.position.set(0, ad.raiz.position.y, 0); ad.raiz.rotation.set(0, 0, 0); // vista centrada y de frente
  ad.raiz.updateMatrixWorld(true);
  const meshes = []; ad.raiz.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  const arrays = [];
  let bad = 0;
  for (const m of meshes) {
    m.skeleton.update();
    const n = m.geometry.attributes.position.count; const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { m.getVertexPosition(i, v); v.applyMatrix4(m.matrixWorld); if (!Number.isFinite(v.x + v.y + v.z)) bad++; out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    arrays.push(out);
  }
  const all = Float32Array.from(arrays.flatMap(a => Array.from(a)));
  fs.writeFileSync(path.join(outDir, `${label}_${nombre}.f32`), Buffer.from(all.buffer));
  let ymin = Infinity, ymax = -Infinity; for (let i = 1; i < all.length; i += 3) { ymin = Math.min(ymin, all[i]); ymax = Math.max(ymax, all[i]); }
  resumen[nombre] = { progreso: p, fase: pose.raiz.fase, mallas: meshes.map(m => m.name), vertices: all.length / 3, noFinitos: bad, yMin: +ymin.toFixed(3), yMax: +ymax.toFixed(3) };
}
console.log(label, JSON.stringify(resumen));
