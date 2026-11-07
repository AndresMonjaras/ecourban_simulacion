import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { PoseHumana } from "../../utils/humanPose.ts";
import type { Vector3 } from "../../types/scene.ts";
import type { WalkCommand } from "../../types/humanMotion.ts";

const HEIGHT_HIPS_MODEL = 1.019;
const UPRIGHT = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI)
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));

function aimBone(bone: THREE.Bone | undefined, child: THREE.Bone | undefined, start: THREE.Vector3, end: THREE.Vector3, scene: THREE.Scene) {
  if (!bone || !child) return;
  scene.updateMatrixWorld(true);
  const from = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3()));
  const to = end.clone().sub(start);
  if (from.lengthSq() < 1e-8 || to.lengthSq() < 1e-8) return;
  const world = bone.getWorldQuaternion(new THREE.Quaternion());
  world.premultiply(new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize()));
  const parentWorld = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
  bone.quaternion.copy(parentWorld.invert().multiply(world));
  scene.updateMatrixWorld(true);
}

const vector = (point: Vector3) => new THREE.Vector3(...point);
const mix3 = (a: Vector3, b: Vector3, t: number): Vector3 => [
  THREE.MathUtils.lerp(a[0], b[0], t),
  THREE.MathUtils.lerp(a[1], b[1], t),
  THREE.MathUtils.lerp(a[2], b[2], t),
];

function walkingPose(pose: PoseHumana, phase: number): PoseHumana {
  const joints = {
    ...pose.joints,
    knees: pose.joints.knees.map((point) => [...point] as Vector3),
    ankles: pose.joints.ankles.map((point) => [...point] as Vector3),
    wrists: pose.joints.wrists.map((point) => [...point] as Vector3),
    elbows: pose.joints.elbows.map((point) => [...point] as Vector3),
  };
  for (let index = 0; index < 2; index += 1) {
    const cycle = phase + (index === 0 ? 0 : Math.PI);
    const stride = Math.sin(cycle);
    const lift = Math.max(0, Math.cos(cycle));
    joints.ankles[index][1] += stride * 0.11;
    joints.ankles[index][2] += lift * 0.055;
    joints.knees[index][1] += stride * 0.035;
    joints.knees[index][2] += lift * 0.025;
    joints.wrists[index][1] -= stride * 0.075;
    joints.elbows[index][1] -= stride * 0.03;
  }
  return { ...pose, joints };
}

function blendPose(a: PoseHumana, b: PoseHumana, t: number): PoseHumana {
  const jointKeys = ["hips", "knees", "ankles", "shoulders", "elbows", "wrists"] as const;
  const joints = { ...a.joints };
  for (const key of jointKeys) joints[key] = a.joints[key].map((point, index) => mix3(point, b.joints[key][index], t));
  return {
    ...a,
    pelvis: { ...a.pelvis, center: mix3(a.pelvis.center, b.pelvis.center, t) },
    torso: { ...a.torso, start: mix3(a.torso.start, b.torso.start, t), end: mix3(a.torso.end, b.torso.end, t) },
    cuello: { ...a.cuello, start: mix3(a.cuello.start, b.cuello.start, t), end: mix3(a.cuello.end, b.cuello.end, t) },
    cabeza: { ...a.cabeza, center: mix3(a.cabeza.center, b.cabeza.center, t) },
    joints,
    manos: a.manos.map((item, index) => ({ ...item, center: mix3(item.center, b.manos[index].center, t) })),
    pies: a.pies.map((item, index) => ({ ...item, center: mix3(item.center, b.pies[index].center, t) })),
  };
}

function smooth(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function routeLength(route: Vector3[]) {
  return route.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - route[index][0], point[1] - route[index][1]), 0);
}

export default function HumanModel({ pose, proportions, motion, sitPose, sitLift }: { pose: PoseHumana; proportions: Vector3; motion: WalkCommand | null; sitPose: PoseHumana | null; sitLift: number }) {
  const { scene: source } = useGLTF("/models/action-suit-human.glb");
  const scene = useThree((state) => state.scene);
  const model = useMemo(() => cloneSkinned(source) as THREE.Group, [source]);
  const poseSpace = useRef<THREE.Group>(null);
  const bones = useMemo(() => {
    const found = new Map<string, THREE.Bone>();
    model.traverse((object) => {
      if ((object as THREE.Bone).isBone) found.set(object.name, object as THREE.Bone);
    });
    return found;
  }, [model]);
  const rest = useMemo(() => new Map([...bones].map(([name, bone]) => [name, bone.quaternion.clone()])), [bones]);
  const applyPose = useCallback((activePose: PoseHumana, lift = 0) => {
    const space = poseSpace.current;
    if (!space) return;
    space.position.set(0, 0, activePose.pelvis.center[2] - HEIGHT_HIPS_MODEL * proportions[2] + lift);
    for (const [name, quaternion] of rest) bones.get(name)?.quaternion.copy(quaternion);
    scene.updateMatrixWorld(true);
    const poseOriginZ = space.position.z - lift;
    const target = (point: Vector3) => space.localToWorld(vector([point[0], point[1], point[2] - poseOriginZ]));
    const p = {
      pelvis: target(activePose.pelvis.center),
      waist: target(activePose.torso.start),
      chest: target(activePose.torso.end),
      neck: target(activePose.cuello.end),
      head: target(activePose.cabeza.center),
    };
    const bone = (name: string) => bones.get(name);
    aimBone(bone("Hips"), bone("Spine"), p.pelvis, p.waist, scene);
    aimBone(bone("Spine"), bone("Spine1"), p.waist, p.chest, scene);
    const torsoAxis = p.chest.clone().sub(p.waist).normalize();
    aimBone(bone("Spine1"), bone("Spine2"), p.chest, p.chest.clone().addScaledVector(torsoAxis, 0.13), scene);
    aimBone(bone("Spine2"), bone("Neck"), p.chest, p.neck, scene);
    aimBone(bone("Neck"), bone("Head"), p.neck, p.head, scene);
    for (const [side, index] of [["Left", 0], ["Right", 1]] as const) {
      const shoulder = target(activePose.joints.shoulders[index]);
      const elbow = target(activePose.joints.elbows[index]);
      const wrist = target(activePose.joints.wrists[index]);
      const hip = target(activePose.joints.hips[index]);
      const knee = target(activePose.joints.knees[index]);
      const ankle = target(activePose.joints.ankles[index]);
      aimBone(bone(`${side}Shoulder`), bone(`${side}Arm`), p.chest, shoulder, scene);
      aimBone(bone(`${side}Arm`), bone(`${side}ForeArm`), shoulder, elbow, scene);
      aimBone(bone(`${side}ForeArm`), bone(`${side}Hand`), elbow, wrist, scene);
      aimBone(bone(`${side}UpLeg`), bone(`${side}Leg`), hip, knee, scene);
      aimBone(bone(`${side}Leg`), bone(`${side}Foot`), knee, ankle, scene);
    }
  }, [bones, proportions, rest, scene]);

  useLayoutEffect(() => { if (!motion) applyPose(pose); }, [applyPose, motion, pose]);
  useFrame(() => {
    if (!motion || !sitPose) return;
    const elapsed = (performance.now() - motion.startedAt) / 1000;
    const length = routeLength(motion.route);
    if (elapsed < motion.walkDuration) {
      const travelled = length * smooth(elapsed / motion.walkDuration);
      const phase = travelled / 0.62 * Math.PI * 2;
      applyPose(walkingPose(pose, phase));
    } else if (elapsed < motion.walkDuration + motion.turnDuration) {
      applyPose(pose);
    } else {
      const rawSitting = smooth((elapsed - motion.walkDuration - motion.turnDuration) / motion.sitDuration);
      const sitting = 1 - (1 - rawSitting) ** 2;
      applyPose(blendPose(pose, sitPose, sitting), sitLift * sitting);
    }
  });

  return <group ref={poseSpace}><group quaternion={UPRIGHT} scale={proportions}><primitive object={model} /></group></group>;
}

useGLTF.preload("/models/action-suit-human.glb");
