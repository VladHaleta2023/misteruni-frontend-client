'use client';

import "@/app/styles/table.css";
import "@/app/styles/components.css";
import "@/app/styles/globals.css";
import "@/app/styles/play.css";
import { useState, useEffect } from "react";
import LoginPage from "./components/login";
import RegisterPage from "./components/register";

export default function MainPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <>
      <main style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "0px", minHeight: "100dvh", height: "100dvh" }}>
        <img className="logo" src="logo.png" alt="logo" />
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", padding: "16px 24px", paddingBottom: "0px" }}>
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
      </main>
    </>
  );
}