import fs from 'node:fs';
globalThis.self = globalThis;
const THREE = await import('three');
const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
// Sin DOM: se sustituye la decodificacion de imagen por un bitmap vacio (solo se valida estructura/rig).
THREE.ImageBitmapLoader.prototype.load = function (url, onLoad) { const bm = { width: 1024, height: 1024, close() {} }; setTimeout(() => onLoad(bm), 0); return bm; };
globalThis.createImageBitmap = async () => ({ width: 1024, height: 1024, close() {} });
const need = ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot'];
async function load(p) { const b = fs.readFileSync(p); const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); return new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej)); }
function info(g, label) {
  const m = clone(g.scene); m.updateMatrixWorld(true);
  const sk = [], bones = new Map();
  m.traverse(o => { if (o.isSkinnedMesh) sk.push(o); if (o.isBone) bones.set(o.name, o); });
  const bb = new THREE.Box3(), tmp = new THREE.Box3();
  for (const s of sk) { s.computeBoundingBox(); tmp.copy(s.boundingBox).applyMatrix4(s.matrixWorld); bb.union(tmp); }
  const size = bb.getSize(new THREE.Vector3());
  console.log(label, 'skinned:', sk.map(s => s.name + '(' + s.geometry.attributes.position.count + 'v)').join(', '), '| huesos:', bones.size, '| faltan:', need.filter(n => !bones.has(n)),
    '| esqueleto unico compartido:', new Set(sk.map(s => s.skeleton.bones.map(b => b.uuid).join())).size === 1, '| bbox', size.toArray().map(v => v.toFixed(3)).join('x'), 'min.y', bb.min.y.toFixed(3));
  const head = bones.get('Head'), arm = bones.get('LeftArm');
  const cap = sk.find(s => s.name.includes('Gorra'));
  if (cap) {
    const v = new THREE.Vector3();
    const probe = () => { m.updateMatrixWorld(true); cap.skeleton.update(); cap.getVertexPosition(0, v); return v.clone().applyMatrix4(cap.matrixWorld); };
    const hp = () => head.getWorldPosition(new THREE.Vector3());
    const p0 = probe(), d0 = hp().distanceTo(p0);
    head.rotation.x += 0.5; head.rotation.y += 0.6; arm.rotation.z += 0.8; bones.get('Spine1').rotation.x += 0.3;
    const p1 = probe(), d1 = hp().distanceTo(p1);
    console.log(`  gorra: vertice desplazado ${p0.distanceTo(p1).toFixed(3)} m tras rotar Head/Spine1; distancia a Head ${d0.toFixed(4)} -> ${d1.toFixed(4)} (rigida)`);
  }
}
const M = process.argv[2];
const a = await load(M + 'persona-articulada.glb'), c = await load(M + 'persona-articulada-ropa-ecourban-v1.glb');
info(a, 'FUENTE   '); info(c, 'CANDIDATO');
const names = g => { const r = []; g.scene.traverse(o => r.push(o.name + ':' + o.type)); return r; };
const na = names(a), nc = names(c);
console.log('jerarquia fuente preservada:', na.every(n => nc.includes(n)), '| nodos extra:', nc.filter(n => !na.includes(n)));
const mats = []; c.scene.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(x => mats.push(o.name + '->' + x.name + (x.map ? '[map]' : '') + (x.normalMap ? '[normal]' : ''))); } });
console.log('materiales:', mats.join(' | '));
