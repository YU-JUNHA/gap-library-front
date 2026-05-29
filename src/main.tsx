import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";
import "@/styles/globals.css";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
