import type { Vector3 } from "./scene.ts";

export type WalkCommand = {
  id: string;
  startedAt: number;
  route: Vector3[];
  seat: Vector3;
  seatYaw: number;
  walkDuration: number;
  turnDuration: number;
  sitDuration: number;
  seatDepth: number;
};
