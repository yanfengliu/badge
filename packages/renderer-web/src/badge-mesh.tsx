import { useEffect, useMemo } from "react";
import { Line, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  ClampToEdgeWrapping,
  Color,
  SRGBColorSpace,
  type ExtrudeGeometry,
  type ShapeGeometry,
  type Texture,
} from "three";

import {
  createSourceFramingPlan,
  sourceRectToTextureTransform,
  type BadgeMaterial,
  type BadgeShape,
  type RenderRecipe,
  type SourceDimensions,
} from "@badge/render-recipe";

import { createBodyGeometry, createFaceGeometry, createOutlinePoints } from "./geometry";
import { BADGE_DISPLAY_SCALE } from "./scene-layout";
import { retainSourceTexture } from "./texture-cache";
import { sourceTextureFramingInputs } from "./viewer-lifecycle";
import type { ViewerState } from "./viewer-state";
import { createWoolWeaveTexture } from "./wool-texture";

interface BadgeMeshProps {
  recipe: RenderRecipe;
  sourceArtUrl: string;
  view: ViewerState;
  onTextureReady: () => void;
}

interface MaterialResponse {
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
}

function materialResponse(material: BadgeMaterial): MaterialResponse {
  if (material === "wool") {
    return {
      metalness: 0,
      roughness: 0.98,
      clearcoat: 0,
      clearcoatRoughness: 1,
      sheen: 0.62,
      sheenRoughness: 0.92,
    };
  }

  if (material === "enamel") {
    return {
      metalness: 0.14,
      roughness: 0.24,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18,
      sheen: 0,
      sheenRoughness: 1,
    };
  }

  return {
    metalness: 0.72,
    roughness: 0.38,
    clearcoat: 0.16,
    clearcoatRoughness: 0.32,
    sheen: 0,
    sheenRoughness: 1,
  };
}

function positiveDimension(candidates: unknown[]): number | null {
  return (
    candidates.find(
      (candidate): candidate is number =>
        typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0,
    ) ?? null
  );
}

function sourceDimensions(source: Texture): SourceDimensions {
  if (typeof source.image !== "object" || source.image === null) {
    throw new Error("Badge source artwork did not expose decoded pixel dimensions.");
  }

  const image = source.image as Record<string, unknown>;
  const width = positiveDimension([image.naturalWidth, image.videoWidth, image.width]);
  const height = positiveDimension([image.naturalHeight, image.videoHeight, image.height]);
  if (width === null || height === null) {
    throw new Error(
      "Badge source artwork has unusable decoded dimensions; repair or republish the source asset.",
    );
  }
  return { width, height };
}

function configureSourceTexture(
  source: Texture,
  shape: BadgeShape,
  cropX: number,
  cropY: number,
  cropScale: number,
  anisotropy: number,
): Texture {
  const texture = source.clone();
  const plan = createSourceFramingPlan(
    shape,
    { x: cropX, y: cropY, scale: cropScale },
    sourceDimensions(source),
  );
  const transform = sourceRectToTextureTransform(plan.sourceRect);

  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.repeat.set(transform.repeatX, transform.repeatY);
  texture.offset.set(transform.offsetX, transform.offsetY);
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

function useBadgeGeometry(recipe: RenderRecipe): {
  body: ExtrudeGeometry;
  face: ShapeGeometry;
} {
  const body = useMemo(
    () => createBodyGeometry(recipe.shape, recipe.thickness),
    [recipe.shape, recipe.thickness],
  );
  const face = useMemo(() => createFaceGeometry(recipe.shape), [recipe.shape]);

  useEffect(
    () => () => {
      body.dispose();
      face.dispose();
    },
    [body, face],
  );

  return { body, face };
}

export function BadgeMesh({ recipe, sourceArtUrl, view, onTextureReady }: BadgeMeshProps) {
  const sourceTexture = useTexture(sourceArtUrl);
  const { gl, invalidate } = useThree();
  const geometry = useBadgeGeometry(recipe);
  const response = materialResponse(recipe.material);
  const [framingShape, cropX, cropY, cropScale] = sourceTextureFramingInputs(recipe);
  const source = useMemo(
    () =>
      configureSourceTexture(
        sourceTexture,
        framingShape,
        cropX,
        cropY,
        cropScale,
        Math.min(8, gl.capabilities.getMaxAnisotropy()),
      ),
    [cropScale, cropX, cropY, framingShape, gl, sourceTexture],
  );
  const materialAnisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const borderColor = useMemo(() => new Color(recipe.borderColor), [recipe.borderColor]);
  const constructionColor = useMemo(
    () => (recipe.material === "wool" ? borderColor.clone().lerp(new Color("#453b33"), 0.5) : borderColor),
    [borderColor, recipe.material],
  );
  const backPanelColor = useMemo(
    () => constructionColor.clone().multiplyScalar(recipe.material === "wool" ? 0.66 : 0.5),
    [constructionColor, recipe.material],
  );
  const woolWeave = useMemo(
    () => (recipe.material === "wool" ? createWoolWeaveTexture(materialAnisotropy) : null),
    [materialAnisotropy, recipe.material],
  );
  const innerScale = Math.max(0.72, 1 - recipe.borderWidth);
  const bevelReach = Math.min(recipe.thickness * 0.28, 0.025);
  const frontZ = recipe.thickness / 2 + bevelReach + 0.004;
  const backZ = -recipe.thickness / 2 - bevelReach - 0.004;
  const displayScale = view.zoom * BADGE_DISPLAY_SCALE;
  const frontStitches = useMemo(
    () => createOutlinePoints(recipe.shape, Math.max(0.76, innerScale + 0.035), frontZ + 0.006),
    [frontZ, innerScale, recipe.shape],
  );
  const backConstructionLine = useMemo(
    () => createOutlinePoints(recipe.shape, 0.72, backZ - 0.01),
    [backZ, recipe.shape],
  );
  const backOuterSeam = useMemo(
    () => createOutlinePoints(recipe.shape, 0.91, backZ - 0.012),
    [backZ, recipe.shape],
  );

  useEffect(() => retainSourceTexture(sourceArtUrl, sourceTexture), [sourceArtUrl, sourceTexture]);

  useEffect(() => () => woolWeave?.dispose(), [woolWeave]);

  useEffect(() => {
    onTextureReady();
    invalidate();
    return () => source.dispose();
  }, [invalidate, onTextureReady, source]);

  return (
    <group rotation={[view.pitch, view.yaw, 0]} rotation-order="YXZ" scale={displayScale}>
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={constructionColor}
          map={woolWeave ?? undefined}
          bumpMap={woolWeave ?? undefined}
          bumpScale={recipe.material === "wool" ? 0.032 : 0}
          metalness={response.metalness}
          roughness={response.roughness}
          roughnessMap={woolWeave ?? undefined}
          clearcoat={response.clearcoat}
          clearcoatRoughness={response.clearcoatRoughness}
          sheen={response.sheen}
          sheenColor="#d4c4ac"
          sheenRoughness={response.sheenRoughness}
        />
      </mesh>

      <mesh geometry={geometry.face} position={[0, 0, frontZ]} scale={innerScale} castShadow>
        <meshPhysicalMaterial
          map={source}
          bumpMap={woolWeave ?? source}
          bumpScale={recipe.material === "wool" ? 0.026 + recipe.relief * 0.15 : recipe.relief}
          metalness={recipe.material === "metal" ? 0.38 : 0.04}
          roughness={response.roughness}
          roughnessMap={woolWeave ?? undefined}
          clearcoat={response.clearcoat}
          clearcoatRoughness={response.clearcoatRoughness}
          sheen={response.sheen}
          sheenColor="#e1d2bd"
          sheenRoughness={response.sheenRoughness}
        />
      </mesh>

      {recipe.material === "wool" ? (
        <Line
          points={frontStitches}
          color="#d9c6a7"
          dashed
          dashSize={0.045}
          gapSize={0.032}
          lineWidth={1.15}
          transparent
          opacity={0.78}
        />
      ) : null}

      <mesh
        geometry={geometry.face}
        position={[0, 0, backZ]}
        rotation={[0, Math.PI, 0]}
        scale={0.88}
        castShadow
      >
        <meshPhysicalMaterial
          color={constructionColor.clone().multiplyScalar(recipe.material === "wool" ? 0.78 : 0.58)}
          map={woolWeave ?? undefined}
          bumpMap={woolWeave ?? undefined}
          bumpScale={recipe.material === "wool" ? 0.03 : 0}
          metalness={response.metalness}
          roughness={Math.min(1, response.roughness + 0.12)}
          roughnessMap={woolWeave ?? undefined}
          clearcoat={response.clearcoat * 0.35}
          sheen={response.sheen}
          sheenColor="#c9b89d"
          sheenRoughness={response.sheenRoughness}
        />
      </mesh>

      <mesh
        geometry={geometry.face}
        position={[0, 0, backZ - 0.007]}
        rotation={[0, Math.PI, 0]}
        scale={0.61}
        castShadow
      >
        <meshPhysicalMaterial
          color={backPanelColor}
          map={woolWeave ?? undefined}
          bumpMap={woolWeave ?? undefined}
          bumpScale={recipe.material === "wool" ? 0.026 : 0}
          metalness={recipe.material === "metal" ? 0.52 : 0}
          roughness={response.roughness}
          roughnessMap={woolWeave ?? undefined}
          clearcoat={response.clearcoat * 0.2}
          sheen={response.sheen}
          sheenColor="#d1c0a5"
          sheenRoughness={response.sheenRoughness}
        />
      </mesh>

      <Line
        points={backConstructionLine}
        color={recipe.material === "wool" ? "#d6c19f" : "#c8b08b"}
        dashed={recipe.material === "wool"}
        dashSize={0.042}
        gapSize={0.03}
        lineWidth={recipe.material === "wool" ? 1.2 : 0.85}
        transparent
        opacity={recipe.material === "wool" ? 0.76 : 0.5}
      />

      {recipe.material === "wool" ? (
        <Line
          points={backOuterSeam}
          color="#bfa783"
          dashed
          dashSize={0.032}
          gapSize={0.026}
          lineWidth={0.9}
          transparent
          opacity={0.6}
        />
      ) : null}
    </group>
  );
}
