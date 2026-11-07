import type { SceneObject, Vector3 } from "../types/scene.ts";
import { POSTURA_PERSONA_PARADA_DEFAULT } from "./humanPose.ts";

const SEAT_HEIGHT_M = 0.45;
const CLEARANCE_M = 0.01;

function size(object: SceneObject): Vector3 {
  return object.dimensionsMm.map((value, index) => value / 1000 * object.transform.scale[index]) as Vector3;
}

function alturaApoyo(object: SceneObject): number {
  return object.transform.position[2] + (object.type === "bench" ? SEAT_HEIGHT_M * object.transform.scale[2] : size(object)[2]);
}

export function getBenchDependents(bench: SceneObject, objects: SceneObject[]): SceneObject[] {
  if (bench.type !== "bench") return [];
  const supports = [bench];
  const dependents: SceneObject[] = [];
  const pending = objects.filter((object) => object.id !== bench.id && object.type !== "bench").sort((a, b) => a.transform.position[2] - b.transform.position[2]);

  for (const object of pending) {
    const support = supports.find((candidate) =>
      Math.abs(object.transform.position[2] - alturaApoyo(candidate)) <= 0.04 &&
      footprintContains(candidate, object.transform.position[0], object.transform.position[1], ...footprint(object)));
    if (support) {
      dependents.push(object);
      supports.push(object);
    }
  }
  return dependents;
}

export function removeObjectAndLandDependents(objects: SceneObject[], objectId: string): SceneObject[] {
  const removed = objects.find((object) => object.id === objectId);
  if (!removed) return objects;
  if (removed.type !== "bench") return objects.filter((object) => object.id !== objectId);

  let remaining = objects.filter((object) => object.id !== objectId);
  for (const dependent of getBenchDependents(removed, objects)) {
    const current = remaining.find((object) => object.id === dependent.id);
    if (!current) continue;
    const landing = findLandingPosition(current, current.transform.position[0], current.transform.position[1], remaining);
    const position = landing ?? [current.transform.position[0], current.transform.position[1], 0] as Vector3;
    const properties = current.type === "person" && position[2] <= 0.3
      ? { ...current.properties, posture: { ...POSTURA_PERSONA_PARADA_DEFAULT } }
      : current.properties;
    remaining = remaining.map((object) => object.id === current.id
      ? { ...object, transform: { ...object.transform, position }, properties }
      : object);
  }
  return remaining;
}

function footprint(object: SceneObject): [number, number] {
  const dimensions = size(object);
  const yaw = object.transform.rotation[2];
  return [
    Math.abs(Math.cos(yaw)) * dimensions[0] + Math.abs(Math.sin(yaw)) * dimensions[1],
    Math.abs(Math.sin(yaw)) * dimensions[0] + Math.abs(Math.cos(yaw)) * dimensions[1],
  ];
}

function overlaps(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return aMin < bMax - CLEARANCE_M && aMax > bMin + CLEARANCE_M;
}

function footprintContains(support: SceneObject, x: number, y: number, width: number, depth: number): boolean {
  const supportSize = size(support);
  const seatDepth = support.type === "bench" ? 0.45 : supportSize[1];
  const yaw = support.transform.rotation[2];
  const dx = x - support.transform.position[0];
  const dy = y - support.transform.position[1];
  const localX = Math.cos(yaw) * dx + Math.sin(yaw) * dy;
  const localY = -Math.sin(yaw) * dx + Math.cos(yaw) * dy;
  const candidateYaw = objectYawForSupport(support, width, depth);
  const [localWidth, localDepth] = candidateYaw;
  const overlapX = Math.min(localX + localWidth / 2, supportSize[0] / 2) - Math.max(localX - localWidth / 2, -supportSize[0] / 2);
  const overlapY = Math.min(localY + localDepth / 2, seatDepth / 2) - Math.max(localY - localDepth / 2, -seatDepth / 2);
  return overlapX >= Math.min(width, supportSize[0]) * 0.5 && overlapY >= Math.min(depth, seatDepth) * 0.5;
}

function objectYawForSupport(support: SceneObject, width: number, depth: number): [number, number] {
  const angle = support.transform.rotation[2];
  return [Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * depth,
    Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * depth];
}

export function findLandingPosition(object: SceneObject, x: number, y: number, objects: SceneObject[], surfaceZ?: number): Vector3 | null {
  const objectSize = size(object);
  const supports = objects.filter((item) => item.visible && item.id !== object.id &&
    ((item.type === "bench" && object.type !== "bench") || (item.type === "weight" && object.type === "weight")) &&
    (surfaceZ === undefined || item.type !== "bench" || Math.abs(surfaceZ - (item.transform.position[2] + SEAT_HEIGHT_M * item.transform.scale[2])) < 0.06) &&
    footprintContains(item, x, y, ...footprint(object)));

  const candidateSupports = [
    { height: 0, object: null as SceneObject | null },
    ...supports.map((support) => ({
      height: support.transform.position[2] + (support.type === "bench" ? SEAT_HEIGHT_M * support.transform.scale[2] : size(support)[2]),
      object: support,
    })),
  ].sort((a, b) => b.height - a.height);
  const [objectWidth, objectDepth] = footprint(object);

  for (const support of candidateSupports) {
    const position: Vector3 = [x, y, support.height];
    const collides = objects.some((other) => {
      if (!other.visible || other.id === object.id || other.id === support.object?.id) return false;
      const otherSize = size(other);
      const [otherWidth, otherDepth] = footprint(other);
      const horizontal = overlaps(x - objectWidth / 2, x + objectWidth / 2,
        other.transform.position[0] - otherWidth / 2, other.transform.position[0] + otherWidth / 2) &&
        overlaps(y - objectDepth / 2, y + objectDepth / 2,
          other.transform.position[1] - otherDepth / 2, other.transform.position[1] + otherDepth / 2);
      const vertical = overlaps(position[2], position[2] + objectSize[2], other.transform.position[2], other.transform.position[2] + otherSize[2]);
      if (other.type === "bench" && position[2] >= other.transform.position[2] + SEAT_HEIGHT_M * other.transform.scale[2] - CLEARANCE_M) return false;
      return horizontal && vertical;
    });
    if (!collides) return position;
  }
  return null;
}
