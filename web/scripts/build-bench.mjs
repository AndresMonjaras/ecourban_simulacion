/** Rebuild the bench from the Ecourban photo, retaining the 1.5m / .45m seat. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result=value; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.(); }); }
};
const scene = new THREE.Scene();
const green = new THREE.MeshPhysicalMaterial({name:'PET verde satinado',color:0x438c69,roughness:.3,metalness:0,ior:1.57,specularIntensity:.45,clearcoat:.08,clearcoatRoughness:.4});
const dark = new THREE.MeshPhysicalMaterial({name:'PET antracita',color:0x41494c,roughness:.37,metalness:0,ior:1.57,specularIntensity:.4,clearcoat:.05,clearcoatRoughness:.45});
const steel = new THREE.MeshStandardMaterial({name:'Tornillería',color:0x929ca5,metalness:.9,roughness:.32});
const socketSteel = new THREE.MeshStandardMaterial({name:'Acero interior tornillo',color:0x737e87,metalness:.7,roughness:.45});
function add(name,geometry,position,material,rotation=0) {
 const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
 // Bake transforms into the vertices, matching the original bench convention.
 geometry.rotateX(rotation).translate(...position);scene.add(mesh);return mesh;
}
function box(name,size,position,material,radius=.003,rotation=0) {
 return add(name,new RoundedBoxGeometry(...size,2,radius),position,material,rotation);
}
// Beveled 12.4mm head with a real hex socket and a 14.2mm washer.
function screw(name, position, tilt = 0) {
 const shape = new THREE.Shape();
 shape.absarc(0,0,.0059,0,Math.PI*2,false);
 const socket = new THREE.Path();
 for(let i=0;i<6;i++) {
  const angle=-i*Math.PI/3;const x=Math.cos(angle)*.0022,y=Math.sin(angle)*.0022;
  if(i===0)socket.moveTo(x,y);else socket.lineTo(x,y);
 }
 socket.closePath();shape.holes.push(socket);
 const head=new THREE.ExtrudeGeometry(shape,{depth:.0024,steps:1,curveSegments:24,bevelEnabled:true,bevelThickness:.0003,bevelSize:.0003,bevelSegments:2});
 head.rotateX(-Math.PI/2).translate(0,.0008,0);
 add(`tornillo_${name}_cabeza`,head,position,steel,tilt);
 const washer=new THREE.TorusGeometry(.0065,.0006,8,32);
 washer.rotateX(-Math.PI/2).translate(0,.0005,0);
 add(`tornillo_${name}_arandela`,washer,position,steel,tilt);
 const bottom=new THREE.CylinderGeometry(.0024,.0024,.0003,16);
 bottom.translate(0,.0004,0);
 add(`tornillo_${name}_cavidad`,bottom,position,socketSteel,tilt);
}
for(let i=0;i<4;i++) box(`asiento_0${i+1}`,[1.5,.1065,.045],[0,(i-1.5)*.1145,.4275],green,.004);
const tilt=THREE.MathUtils.degToRad(15);
for(let i=0;i<3;i++) {
 const z=.533+i*.13;
 const y=-.235-(z-.49)*Math.tan(tilt);
 box(`respaldo_0${i+1}`,[1.5,.04,.105],[0,y,z],green,.004,tilt);
 for(const x of [-.68,.68]) {
  screw(`respaldo_${i}_${x}`,[x,y+.0202*Math.cos(tilt),z+.0202*Math.sin(tilt)],tilt);
 }
}
box('refuerzo_central_respaldo',[.035,.025,.35],[0,-.235-(.665-.49)*Math.tan(tilt)-.0325,.665],dark,.003,tilt);
for(const [side,x] of [['izquierdo',-.635],['derecho',.635]]) {
 // Side profile in Y/Z: splayed feet, curved opening and continuous back rib.
 const shape=new THREE.Shape();
 shape.moveTo(-.39,.02);shape.lineTo(-.28,.02);shape.lineTo(-.18,.265);
 shape.quadraticCurveTo(-.145,.325,-.075,.325);
 shape.quadraticCurveTo(.035,.325,.06,.26);shape.lineTo(.135,.02);
 shape.lineTo(.225,.02);shape.lineTo(.155,.29);
 shape.quadraticCurveTo(.13,.35,.19,.38);
 shape.quadraticCurveTo(.225,.385,.225,.4025);
 shape.lineTo(-.20,.4025);shape.quadraticCurveTo(-.235,.41,-.248,.455);
 shape.lineTo(-.345,.825);
 shape.quadraticCurveTo(-.351,.8475,-.374,.8475);
 shape.quadraticCurveTo(-.404,.8475,-.398,.823);
 shape.lineTo(-.291,.43);shape.quadraticCurveTo(-.278,.37,-.30,.29);shape.closePath();
 // Solid PET uprights behind the planks, without through-slots.
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.06,steps:1,bevelEnabled:true,bevelThickness:.0025,bevelSize:.0025,bevelSegments:3,curveSegments:16});
 geometry.translate(0,0,-.03);
 geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0)));
 add(`estructura_${side}`,geometry,[x,0,0],dark);
 // Subtle PET-frame molding follows the leg arch without altering its opening.
 const outerX=x+Math.sign(x)*.033;
 const curve=new THREE.CurvePath();
 const v=(y,z)=>new THREE.Vector3(outerX,y,z);
 curve.add(new THREE.LineCurve3(v(-.318,.043),v(-.215,.283)));
 curve.add(new THREE.QuadraticBezierCurve3(v(-.215,.283),v(-.181,.352),v(-.075,.352)));
 curve.add(new THREE.QuadraticBezierCurve3(v(-.075,.352),v(.025,.355),v(.06,.32)));
 curve.add(new THREE.QuadraticBezierCurve3(v(.06,.32),v(.10,.30),v(.113,.248)));
 curve.add(new THREE.LineCurve3(v(.113,.248),v(.178,.043)));
 add(`moldura_arco_${side}`,new THREE.TubeGeometry(curve,48,.0025,6,false),[0,0,0],dark);
 const rib=new THREE.LineCurve3(v(-.273,.46),v(-.374,.824));
 add(`moldura_respaldo_${side}`,new THREE.TubeGeometry(rib,1,.002,6,false),[0,0,0],dark);
 for(const [j,y] of [[0,-.335],[1,.18]]) box(`base_${side}_${j}`,[.105,.09,.022],[x,y,.011],dark,.003);
 for(const y of [-.17,.12]) {
  const screw=new THREE.CylinderGeometry(.006,.006,.003,12);screw.rotateZ(Math.PI/2);
  add(`remache_lateral_${side}_${y}`,screw,[x+Math.sign(x)*.033,y,.375],dark);
 }
}
for(const x of [-.68,.68]) screw(`frontal_${x}`,[x,.2252,.4275]);
const result=await new GLTFExporter().parseAsync(scene,{binary:true});
const destination=new URL('../public/models/banca.glb',import.meta.url);
await fs.writeFile(destination,Buffer.from(result));
const version=createHash('sha256').update(Buffer.from(result)).digest('hex').slice(0,12);
await fs.writeFile(new URL('../src/components/scene/bench/benchModelAsset.generated.ts',import.meta.url),
 `// Generated by scripts/build-bench.mjs. Content version avoids stale GLTF caches.\nexport const BENCH_MODEL_URL = "/models/banca.glb?v=${version}";\n`);
let triangles=0;scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
console.log(`Wrote ${destination.pathname}: ${result.byteLength} bytes, ${triangles} triangles`);
