import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ArchiveSurface } from "./ArchiveSurface";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Badge Archive could not start because the #root element is missing from index.html.");
}

createRoot(root).render(
  <StrictMode>
    <ArchiveSurface onShowStudio={() => undefined} />
  </StrictMode>,
);
