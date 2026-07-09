import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext.jsx";
import { MessageProvider } from "../context/MessageContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <MessageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MessageProvider>
    </AuthProvider>
  </StrictMode>,
);
