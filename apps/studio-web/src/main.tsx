import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";
import "./studio-header.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Badge Studio could not start because the #root element is missing from index.html.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
