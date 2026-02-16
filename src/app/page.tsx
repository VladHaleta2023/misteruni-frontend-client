'use client';

import Header from "@/app/components/header";
import "@/app/styles/table.css";
import "@/app/styles/components.css";
import "@/app/styles/globals.css";
import { LogIn, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import LoginPage from "./components/login";
import RegisterPage from "./components/register";
import { setMainHeight } from "./scripts/mainHeight";

export default function MainPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    setMainHeight();
    const handleResize = () => setMainHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <>
      <Header>
        <div className="menu-icons">
          <div
            className="menu-icon"
            onClick={toggleMode}
            style={{ marginLeft: 'auto' }}
            title={mode === "login" ? "Przełącz na rejestrację" : "Przełącz na logowanie"}
          >
            {mode === "login" ? <UserPlus size={28} color="white" /> : <LogIn size={28} color="white" />}
          </div>
        </div>
      </Header>

      <main>
        {mode === "login" 
          ? <LoginPage /> 
          : <RegisterPage />
        }
      </main>
    </>
  );
}