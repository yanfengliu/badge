export class FlatRaster {
  constructor(width, height, background) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.clear(background);
  }

  clear(color) {
    for (let index = 0; index < this.data.length; index += 4) {
      this.data[index] = color[0];
      this.data[index + 1] = color[1];
      this.data[index + 2] = color[2];
      this.data[index + 3] = 255;
    }
  }

  pixel(x, y, color) {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return;
    const index = (py * this.width + px) * 4;
    this.data[index] = color[0];
    this.data[index + 1] = color[1];
    this.data[index + 2] = color[2];
  }

  rect(x, y, width, height, color) {
    const startX = Math.max(0, Math.floor(x));
    const startY = Math.max(0, Math.floor(y));
    const endX = Math.min(this.width, Math.ceil(x + width));
    const endY = Math.min(this.height, Math.ceil(y + height));
    for (let py = startY; py < endY; py += 1) {
      for (let px = startX; px < endX; px += 1) this.pixel(px, py, color);
    }
  }

  circle(cx, cy, radius, color) {
    this.ellipse(cx, cy, radius, radius, color);
  }

  ellipse(cx, cy, radiusX, radiusY, color) {
    const minY = Math.max(0, Math.floor(cy - radiusY));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radiusY));
    for (let y = minY; y <= maxY; y += 1) {
      const normalizedY = (y - cy) / radiusY;
      const halfWidth = radiusX * Math.sqrt(Math.max(0, 1 - normalizedY * normalizedY));
      this.rect(cx - halfWidth, y, halfWidth * 2 + 1, 1, color);
    }
  }

  polygon(points, color) {
    const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...points.map(([, y]) => y))));
    for (let y = minY; y <= maxY; y += 1) {
      const intersections = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      intersections.sort((left, right) => left - right);
      for (let index = 0; index + 1 < intersections.length; index += 2) {
        this.rect(intersections[index], y, intersections[index + 1] - intersections[index] + 1, 1, color);
      }
    }
  }

  arcBand(cx, cy, outerRadius, innerRadius, startDegrees, endDegrees, color, steps = 96) {
    const radians = (degrees) => (degrees * Math.PI) / 180;
    const points = [];
    for (let index = 0; index <= steps; index += 1) {
      const angle = radians(startDegrees + ((endDegrees - startDegrees) * index) / steps);
      points.push([cx + Math.cos(angle) * outerRadius, cy + Math.sin(angle) * outerRadius]);
    }
    for (let index = steps; index >= 0; index -= 1) {
      const angle = radians(startDegrees + ((endDegrees - startDegrees) * index) / steps);
      points.push([cx + Math.cos(angle) * innerRadius, cy + Math.sin(angle) * innerRadius]);
    }
    this.polygon(points, color);
  }

  broadCurve(controlPoints, width, color) {
    const points = cubicBezier(controlPoints);
    const left = [];
    const right = [];
    for (let index = 0; index < points.length; index += 1) {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const dx = next[0] - previous[0];
      const dy = next[1] - previous[1];
      const length = Math.hypot(dx, dy) || 1;
      const offsetX = (-dy / length) * width * 0.5;
      const offsetY = (dx / length) * width * 0.5;
      left.push([points[index][0] + offsetX, points[index][1] + offsetY]);
      right.push([points[index][0] - offsetX, points[index][1] - offsetY]);
    }
    this.polygon([...left, ...right.reverse()], color);
    this.circle(points[0][0], points[0][1], width * 0.5, color);
    this.circle(points.at(-1)[0], points.at(-1)[1], width * 0.5, color);
  }

  star(cx, cy, outerRadius, innerRadius, pointCount, rotationDegrees, color) {
    const points = [];
    const start = (rotationDegrees * Math.PI) / 180;
    for (let index = 0; index < pointCount * 2; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = start + (Math.PI * index) / pointCount;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
    this.polygon(points, color);
  }
}

export function renderFlatRecipe(recipe, size = 896) {
  if (size !== 896) throw new Error(`Code-native source size must remain 896, received ${size}.`);
  const colors = recipe.palette.map(({ hex }) => rgb(hex));
  const art = new FlatRaster(size, size, colors[recipe.backgroundColor]);
  for (const command of recipe.commands) {
    const fill = colors[command.color];
    if (!fill) {
      throw new Error(
        `Code-native recipe ${recipe.slug} command references palette index ${command.color}; use an existing flat color.`,
      );
    }
    if (command.kind === "rect") {
      art.rect(command.x, command.y, command.width, command.height, fill);
    } else if (command.kind === "circle") {
      art.circle(command.cx, command.cy, command.radius, fill);
    } else if (command.kind === "ellipse") {
      art.ellipse(command.cx, command.cy, command.radiusX, command.radiusY, fill);
    } else if (command.kind === "polygon") {
      art.polygon(command.points, fill);
    } else if (command.kind === "curve") {
      art.broadCurve(command.points, command.width, fill);
    } else if (command.kind === "arc") {
      art.arcBand(
        command.cx,
        command.cy,
        command.outerRadius,
        command.innerRadius,
        command.startDegrees,
        command.endDegrees,
        fill,
      );
    } else if (command.kind === "star") {
      art.star(
        command.cx,
        command.cy,
        command.outerRadius,
        command.innerRadius,
        command.points,
        command.rotationDegrees ?? -90,
        fill,
      );
    }
  }
  return art;
}

export function resizeRgbaBilinear(image, targetWidth, targetHeight = targetWidth) {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const xScale = image.width / targetWidth;
  const yScale = image.height / targetHeight;
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.max(0, Math.min(image.height - 1, (y + 0.5) * yScale - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const yWeight = sourceY - y0;
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.max(0, Math.min(image.width - 1, (x + 0.5) * xScale - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const xWeight = sourceX - x0;
      const target = (y * targetWidth + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top =
          image.data[(y0 * image.width + x0) * 4 + channel] * (1 - xWeight) +
          image.data[(y0 * image.width + x1) * 4 + channel] * xWeight;
        const bottom =
          image.data[(y1 * image.width + x0) * 4 + channel] * (1 - xWeight) +
          image.data[(y1 * image.width + x1) * 4 + channel] * xWeight;
        output[target + channel] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }
  return { data: output, width: targetWidth, height: targetHeight };
}

export function measureMiniatureResidual(image, proofSize = 48) {
  const proof = resizeRgbaBilinear(image, proofSize);
  const reconstructed = resizeRgbaBilinear(proof, image.width, image.height);
  let error = 0;
  for (let index = 0; index < image.data.length; index += 4) {
    error += Math.abs(image.data[index] - reconstructed.data[index]);
    error += Math.abs(image.data[index + 1] - reconstructed.data[index + 1]);
    error += Math.abs(image.data[index + 2] - reconstructed.data[index + 2]);
  }
  return error / (image.width * image.height * 3 * 255);
}

function cubicBezier([p0, p1, p2, p3], steps = 48) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const u = 1 - t;
    return [
      u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0],
      u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1],
    ];
  });
}

function rgb(hex) {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}
