'use client';

import "@/app/styles/table.css";
import "@/app/styles/components.css";
import "@/app/styles/globals.css";
import "@/app/styles/play.css";
import { useState } from "react";
import LoginPage from "./components/login";
import RegisterPage from "./components/register";

export default function MainPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <>
      <main style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "0px", minHeight: "100dvh", height: "100dvh" }}>
        <img className="logo" src="logo.png" alt="logo" />
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          width: "100%",
          padding: "0px 24px",
          maxWidth: "600px",
          margin: "0 auto"
        }}>
          <button
            className="btnOption"
            style={{
              padding: "4px 12px",
              backgroundColor: "#c2c2c2",
              color: "#333333",
              gap: "12px",
              justifyContent: "flex-start"
            }}
            onClick={toggleMode}
          >
            {mode === "login" ? "Rejestracja" : "Logowanie"}
          </button>
        </div>
        {mode === "login" 
          ? <LoginPage /> 
          : <RegisterPage />
        }
        <div style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: "16px 24px",
          fontSize: "16px",
          maxWidth: "600px",
          margin: "0 auto"
        }}>
          <a href="/privacy" target="_blank" className="custom-link">- Polityka prywatności</a>
          <a href="/terms" target="_blank" className="custom-link">- Regulamin</a>
        </div>
        <h1 className="visually-hidden">MaturaGo</h1>
        <p className="visually-hidden">
          Witaj w aplikacji MaturaGo! Nasza platforma pomaga w przygotowaniu do matury.
        </p>
        <p className="visually-hidden">
          Kontakt: <a href="mailto:vladhaleta2023@gmail.com">vladhaleta2023@gmail.com</a>
        </p>
      </main>
    </>
  );
}