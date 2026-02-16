'use client';

import React, { useState } from "react";
import "@/app/styles/components.css";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import axios from "axios";
import Spinner from "./spinner";
import { Eye, EyeOff } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    
    try {
      if (!login || !password) {
        showAlert(400, "Wszystkie pola są wymagane");
        setLoading(false);
        return;
      }

      const response = await api.post("/auth/login", { login, password });

      if (response.data?.statusCode === 200) {
        router.push("/subjects");
      }
    } catch (error: unknown) {
      setLoading(false);
      handleApiError(error);
    }
  };

  function handleApiError(error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        showAlert(error.response.status, error.response.data?.message || "Server error");
      } else {
        showAlert(500, `Server error: ${error.message}`);
      }
    } else if (error instanceof Error) {
      showAlert(500, `Server error: ${error.message}`);
    } else {
      showAlert(500, "Unknown error");
    }
  }

  const handleOAuthRedirect = (provider: "google" | "facebook") => {
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <div className="form-container" style={{ maxWidth: "600px", padding: "16px 24px" }}>
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

          <div className="options-container" style={{ marginTop: "16px", position: "relative" }}>
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

          <div className="options-container" style={{ marginTop: "32px", display: "flex", justifyContent: "center" }}>
            <button
              className="btnOption"
              onClick={handleLogin}
              style={{ width: "180px" }}
            >
              Zaloguj się
            </button>
          </div>

          <div className="options-container" style={{ marginTop: "32px", display: "flex", justifyContent: "center" }}>
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

          <div className="options-container" style={{ marginTop: "12px", display: "flex", justifyContent: "center" }}>
            <button
              className="btnOption"
              onClick={() => handleOAuthRedirect("facebook")}
              style={{
                width: "260px",
                backgroundColor: "#c2c2c2",
                color: "#333333",
                gap: "12px",
                justifyContent: "flex-start"
              }}
            >
              <FaFacebook size={24} />
              <span>Kontynuuj z Facebook</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}