import type { BadgeMaterial, BadgeShape } from "@badge/render-recipe";
import type { StudioAppearance, StudioBadgeTarget } from "@badge/studio-adjustment-contract";

const SHAPES: readonly BadgeShape[] = ["circle", "square", "rectangle", "shield"];
const MATERIALS: readonly BadgeMaterial[] = ["metal", "wool", "enamel"];

function materialLabel(material: BadgeMaterial): string {
  return material === "wool" ? "Wool armband" : material;
}

export function StudioAppearancePanel({
  appearance,
  target,
  disabled,
  onChange,
}: {
  readonly appearance: StudioAppearance;
  readonly target: StudioBadgeTarget;
  readonly disabled: boolean;
  readonly onChange: (patch: Partial<StudioAppearance>) => void;
}) {
  const recipe = target.catalogueRecipe;
  const shape = appearance.shape ?? recipe.shape;
  const material = appearance.material ?? recipe.material;
  const borderColor = appearance.borderColor ?? recipe.borderColor;
  const borderWidth = appearance.borderWidth ?? recipe.borderWidth;

  return (
    <div className="appearance-controls">
      <fieldset disabled={disabled}>
        <legend>Shape</legend>
        <div className="segment">
          {SHAPES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={shape === candidate}
              onClick={() => onChange({ shape: candidate === recipe.shape ? null : candidate })}
            >
              {candidate}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={disabled}>
        <legend>Material</legend>
        <div className="segment">
          {MATERIALS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={material === candidate}
              onClick={() => onChange({ material: candidate === recipe.material ? null : candidate })}
            >
              {materialLabel(candidate)}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="control-row">
        <label>
          <span>Border color</span>
          <span className="color-control">
            <input
              type="color"
              disabled={disabled}
              value={borderColor}
              onChange={(event) => {
                const next = event.target.value.toLowerCase();
                onChange({ borderColor: next === recipe.borderColor ? null : next });
              }}
            />
            <output>{borderColor}</output>
          </span>
        </label>
        <label>
          <span>
            Border width <output>{Math.round(borderWidth * 100)}%</output>
          </span>
          <input
            type="range"
            disabled={disabled}
            min="0"
            max="0.2"
            step="0.005"
            value={borderWidth}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange({ borderWidth: next === recipe.borderWidth ? null : next });
            }}
          />
        </label>
      </div>
    </div>
  );
}
