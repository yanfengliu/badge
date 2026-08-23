import { Suspense, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";

import type { RenderRecipe } from "@badge/render-recipe";

import { BadgeMesh } from "./badge-mesh";
import { BADGE_DISPLAY_SCALE } from "./scene-layout";
import type { ViewerState } from "./viewer-state";

interface BadgeSceneProps {
  recipe: RenderRecipe;
  sourceArtUrl: string;
  view: ViewerState;
  onRendererFailure: (reason: string) => void;
  onTextureReady: () => void;
}

function RendererHealth({ onFailure }: { onFailure: (reason: string) => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onFailure("The live 3D renderer lost its graphics context.");
    };

    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onFailure]);

  return null;
}

export function BadgeScene({
  recipe,
  sourceArtUrl,
  view,
  onRendererFailure,
  onTextureReady,
}: BadgeSceneProps) {
  const shapeHalfHeight =
    recipe.shape === "rectangle"
      ? 0.69
      : recipe.shape === "square"
        ? 0.95
        : recipe.shape === "shield"
          ? 1.08
          : 1;
  const groundY = -(view.zoom * BADGE_DISPLAY_SCALE * shapeHalfHeight + 0.06);
  const keyLightPosition = useMemo(() => {
    const radius = 4;
    const horizontalRadius = Math.cos(view.lightElevation) * radius;

    return [
      Math.sin(view.lightAzimuth) * horizontalRadius,
      Math.sin(view.lightElevation) * radius,
      Math.cos(view.lightAzimuth) * horizontalRadius,
    ] as [number, number, number];
  }, [view.lightAzimuth, view.lightElevation]);

  return (
    <>
      <color attach="background" args={["#eee8dc"]} />
      <hemisphereLight args={["#fff8ea", "#28241f", 1.35]} />
      <directionalLight
        castShadow
        color="#fff3d8"
        intensity={3.4}
        position={keyLightPosition}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight color="#b7d3d0" intensity={0.8} position={[-3, 0.5, 2.5]} />
      <directionalLight color="#fff9ef" intensity={1.05} position={[1.8, 2.2, -2.4]} />

      <Suspense fallback={null}>
        <BadgeMesh recipe={recipe} sourceArtUrl={sourceArtUrl} view={view} onTextureReady={onTextureReady} />
      </Suspense>

      <mesh position={[0, groundY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>
      <RendererHealth onFailure={onRendererFailure} />
    </>
  );
}
