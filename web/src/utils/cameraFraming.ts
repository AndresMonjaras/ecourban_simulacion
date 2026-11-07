import { Box3, MathUtils, Sphere, Vector3 } from "three";

export type CameraFrame = {
  center: [number, number, number];
  radius: number;
  distance: number;
};

export function calculateCameraFrame(box: Box3, verticalFovDeg: number, aspect: number, padding = 1.2): CameraFrame {
  const sphere = box.getBoundingSphere(new Sphere());
  const radius = Math.max(sphere.radius, 0.05);
  const verticalFov = MathUtils.degToRad(verticalFovDeg);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(aspect, 0.1));
  const verticalDistance = radius / Math.sin(verticalFov / 2);
  const horizontalDistance = radius / Math.sin(horizontalFov / 2);
  const center = box.getCenter(new Vector3());

  return {
    center: center.toArray(),
    radius,
    distance: Math.max(verticalDistance, horizontalDistance) * padding,
  };
}
