import type { SceneObject, Vector3 } from "../types/scene.ts";
import type { WalkCommand } from "../types/humanMotion.ts";

/** Plan in bench-local coordinates, then transform the route to world space. */
export function planWalkToBench(persona: SceneObject, banca: SceneObject): WalkCommand {
  const benchScale: Vector3 = [
    banca.transform.scale[0] * banca.dimensionsMm[0] / 1500,
    banca.transform.scale[1] * banca.dimensionsMm[1] / 624.79,
    banca.transform.scale[2] * banca.dimensionsMm[2] / 850,
  ];
  const yaw = banca.transform.rotation[2];
  // Approach stops at the bench boundary expanded by the person's actual footprint.
  const sitLocalY = 0.06 * benchScale[1];
  const personHalfWidth = persona.transform.scale[0] * persona.dimensionsMm[0] / 2000;
  const personHalfDepth = persona.transform.scale[1] * persona.dimensionsMm[1] / 2000;
  const benchFrontEdge = 0.225 * benchScale[1];
  const benchRearEdge = -0.4 * benchScale[1];
  const approachOffset = benchFrontEdge + personHalfDepth;
  const approach: Vector3 = [
    banca.transform.position[0] - Math.sin(yaw) * approachOffset,
    banca.transform.position[1] + Math.cos(yaw) * approachOffset,
    persona.transform.position[2],
  ];
  const seat: Vector3 = [
    banca.transform.position[0] - Math.sin(yaw) * sitLocalY,
    banca.transform.position[1] + Math.cos(yaw) * sitLocalY,
    banca.transform.position[2] + 0.45 * benchScale[2],
  ];
  const start = [...persona.transform.position] as Vector3;
  const dx = start[0] - banca.transform.position[0];
  const dy = start[1] - banca.transform.position[1];
  const localY = -Math.sin(yaw) * dx + Math.cos(yaw) * dy;
  const route: Vector3[] = [start];
  if (localY < approachOffset) {
    const localX = Math.cos(yaw) * dx + Math.sin(yaw) * dy;
    const side = localX < 0 ? -1 : 1;
    // The GLB is 1.5 m wide: its ends are at ±0.75, not ±0.5.
    // Use a rotation-safe radius while rounding either end of the bench.
    const walkingRadius = Math.hypot(personHalfWidth, personHalfDepth) + 0.04;
    const sideX = side * (0.75 * benchScale[0] + walkingRadius);
    const toWorld = (x: number, y: number): Vector3 => [
      banca.transform.position[0] + Math.cos(yaw) * x - Math.sin(yaw) * y,
      banca.transform.position[1] + Math.sin(yaw) * x + Math.cos(yaw) * y,
      start[2],
    ];
    if (localY < 0) route.push(toWorld(sideX, benchRearEdge - walkingRadius));
    route.push(toWorld(sideX, benchFrontEdge + walkingRadius));
  }
  route.push(approach);
  const distance = route.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - route[index][0], point[1] - route[index][1]), 0);
  const walkDuration = Math.min(7, Math.max(1.35, distance / 0.85));
  const startedAt = performance.now();
  return { id: persona.id, startedAt, route, seat, seatYaw: yaw, walkDuration, turnDuration: 0.4, sitDuration: 1.8, seatDepth: 0.45 * benchScale[1] };
}
