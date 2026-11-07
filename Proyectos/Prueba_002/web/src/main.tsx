import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const elementoRaiz = document.getElementById("root");

if (!elementoRaiz) {
  throw new Error("No se encontró el elemento raíz de la aplicación.");
}

createRoot(elementoRaiz).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
