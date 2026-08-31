import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./host-loading.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Badge could not start because the root application element is missing from index.html.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
