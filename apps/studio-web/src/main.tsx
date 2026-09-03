import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { StudioSurface } from "./StudioSurface";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Badge Studio could not start because the #root element is missing from index.html.");
}

// The standalone Studio build exists to prove bundle separation, not to be used on its own:
// Badge Studio adjusts a badge the Archive hands it, and there is no Archive here.
createRoot(root).render(
  <StrictMode>
    <StudioSurface
      target={null}
      onApply={async () => ({ ok: false, message: "Open Badge Studio from Discover to adjust a badge." })}
      onClose={() => undefined}
      onLeaveGuardChange={() => undefined}
    />
  </StrictMode>,
);
