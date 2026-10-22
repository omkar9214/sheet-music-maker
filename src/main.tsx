import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// Leland and Edwin are MuseScore 4's music and text fonts, the fonts his reference PDF was set in.
import "@vexflow-fonts/leland/index.css";
import "@vexflow-fonts/edwin/index.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
