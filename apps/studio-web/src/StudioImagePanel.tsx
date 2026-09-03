import type { ChangeEvent, RefObject } from "react";
import type { StudioBadgeTarget } from "@badge/studio-adjustment-contract";

import type { StudioPendingImage } from "./studio-adjust-state";

export function StudioImagePanel({
  target,
  pendingImage,
  usingOwnImage,
  disabled,
  busy,
  description,
  uploadInput,
  onPick,
  onDescriptionChange,
  onUseCatalogueImage,
}: {
  readonly target: StudioBadgeTarget;
  readonly pendingImage: StudioPendingImage | null;
  readonly usingOwnImage: boolean;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly description: string;
  readonly uploadInput: RefObject<HTMLInputElement | null>;
  readonly onPick: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onDescriptionChange: (description: string) => void;
  readonly onUseCatalogueImage: () => void;
}) {
  const currentLabel = pendingImage
    ? pendingImage.fileName
    : usingOwnImage
      ? (target.ownImageDescription ?? "Your own picture")
      : "The picture this badge shipped with";

  return (
    <section className="studio-panel studio-panel--image" aria-labelledby="studio-image-heading">
      <h3 id="studio-image-heading">Image</h3>
      <p className="studio-panel__hint">
        Your original is kept unchanged in Badge Studio. The archive stores a re-encoded copy with the
        filename, EXIF, GPS and other embedded metadata removed.
      </p>
      <p className="studio-image-current">
        <span>Showing</span>
        <strong>{currentLabel}</strong>
      </p>
      <div className="studio-image-actions">
        <button type="button" disabled={disabled || busy} onClick={() => uploadInput.current?.click()}>
          {busy ? "Reading image…" : "Use my own image"}
        </button>
        <button type="button" disabled={disabled || busy || !usingOwnImage} onClick={onUseCatalogueImage}>
          Use the original image
        </button>
        <input
          ref={uploadInput}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onPick}
        />
      </div>
      <p className="studio-panel__hint">PNG, JPEG, or WebP · up to 16 MB</p>
      {usingOwnImage ? (
        <label className="studio-image-description">
          <span>Describe this picture</span>
          <textarea
            rows={2}
            maxLength={500}
            disabled={disabled}
            value={description}
            placeholder="Granite walls above a turquoise river at sunrise."
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          <small>
            Read aloud in place of the picture. The catalogue wrote one for its own art; this one is yours.
          </small>
        </label>
      ) : null}
    </section>
  );
}
