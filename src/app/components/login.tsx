'use client';

import React, { useState } from "react";
import "@/app/styles/components.css";
import { FcGoogle } from "react-icons/fc";
import { useRouter } from "next/navigation";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import Spinner from "./spinner";
import { Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface LoginResponse {
  statusCode: number;
  token: string;
}

export default function LoginPage() {
  const router = useRouter();
  
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    try {
      if (!login || !password) {
        showAlert(400, "Wszystkie pola są wymagane");
        return;
      }

      const response = await api.post<LoginResponse>("/auth/login", { login, password });

      if (response.data?.statusCode === 200) {
        localStorage.setItem("accessToken", response.data.token);
        router.push("/subjects");
      }
    } catch (error: unknown) {
      handleApiError(error);
    }
  };

  function handleApiError(error: any) {
    const err = error as any;

    if (err?.response) {
      showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
    } 
    else if (error instanceof Error) {
      showAlert(500, error.message);
    }
    else {
      showAlert(500, "Unknown error");
    }
  }

  const handleOAuthRedirect = (provider: "google") => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <>
      <div className="form-container" style={{ maxWidth: "600px", padding: "0px 24px" }}>
        <div className="options-container">
          <label htmlFor="login" className="label">Login:</label>
          <input
            id="login"
            name="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="input-container"
            spellCheck={true}
            placeholder="Użytkownik lub Email..."
          />
        </div>

        <div className="options-container" style={{ marginTop: "4px", position: "relative" }}>
          <label htmlFor="password" className="label">Hasło:</label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-container"
            spellCheck={true}
            placeholder="Hasło..."
          />
          <div
            style={{ position: "absolute", right: "10px", top: "36px", cursor: "pointer" }}
            onClick={() => setShowPassword(prev => !prev)}
          >
            {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
          </div>
        </div>

        <div className="options-container" style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
          <button
            className="btnOption"
            onClick={handleLogin}
            style={{ width: "180px" }}
          >
            Zaloguj się
          </button>
        </div>

        <div className="options-container" style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
          <button
            className="btnOption"
            onClick={() => handleOAuthRedirect("google")}
            style={{
              width: "260px",
              backgroundColor: "#c2c2c2",
              color: "#333333",
              gap: "12px",
              justifyContent: "flex-start"
            }}
          >
            <FcGoogle size={24} />
            <span>Kontynuuj z Google</span>
          </button>
        </div>
      </div>
    </>
  );
}