import { BufferAttribute, ExtrudeGeometry, Shape, ShapeGeometry } from "three";

import type { BadgeShape } from "@badge/render-recipe";

function roundedRectangle(width: number, height: number, radius: number): Shape {
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  const shape = new Shape();

  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  shape.closePath();

  return shape;
}

export function createBadgeShape(shapeName: BadgeShape): Shape {
  if (shapeName === "circle") {
    const shape = new Shape();
    shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
    return shape;
  }

  if (shapeName === "square") return roundedRectangle(1.9, 1.9, 0.12);
  if (shapeName === "rectangle") return roundedRectangle(2, 1.38, 0.1);

  const shield = new Shape();
  shield.moveTo(-0.92, 0.88);
  shield.lineTo(0.92, 0.88);
  shield.lineTo(0.84, 0.06);
  shield.bezierCurveTo(0.76, -0.58, 0.34, -0.91, 0, -1.08);
  shield.bezierCurveTo(-0.34, -0.91, -0.76, -0.58, -0.84, 0.06);
  shield.closePath();
  return shield;
}

function addPlanarUvs(geometry: ShapeGeometry): void {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return;

  const positions = geometry.getAttribute("position");
  const width = bounds.max.x - bounds.min.x || 1;
  const height = bounds.max.y - bounds.min.y || 1;
  const uv = new Float32Array(positions.count * 2);

  for (let index = 0; index < positions.count; index += 1) {
    uv[index * 2] = (positions.getX(index) - bounds.min.x) / width;
    uv[index * 2 + 1] = (positions.getY(index) - bounds.min.y) / height;
  }

  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}

export function createFaceGeometry(shapeName: BadgeShape): ShapeGeometry {
  const geometry = new ShapeGeometry(createBadgeShape(shapeName), 64);
  addPlanarUvs(geometry);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBodyGeometry(shapeName: BadgeShape, thickness: number): ExtrudeGeometry {
  const bevelThickness = Math.min(thickness * 0.28, 0.025);
  const geometry = new ExtrudeGeometry(createBadgeShape(shapeName), {
    depth: thickness,
    steps: 1,
    curveSegments: 64,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: Math.min(thickness * 0.32, 0.03),
    bevelThickness,
  });

  geometry.translate(0, 0, -thickness / 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function createOutlinePoints(
  shapeName: BadgeShape,
  scale: number,
  z: number,
  count = 96,
): [number, number, number][] {
  const points = createBadgeShape(shapeName).getSpacedPoints(count);
  const outline = points.map((point) => [point.x * scale, point.y * scale, z] as [number, number, number]);
  if (outline.length > 0) outline.push([...outline[0]]);
  return outline;
}
