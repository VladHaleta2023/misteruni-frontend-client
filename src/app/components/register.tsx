'use client';

import React, { useState } from "react";
import "@/app/styles/components.css";
import { useRouter } from "next/navigation";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import { Eye, EyeOff } from "lucide-react";

interface AuthResponse {
  statusCode: number;
  token?: string;
  message?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async () => {
    try {
        if (!email || !username || !password || !confirmPassword) {
            showAlert(400, "Wszystkie pola są wymagane");
            return;
        }

        if (!isValidEmail(email)) {
            showAlert(400, "Nieprawidłowy adres email");
            return;
        }

        if (password !== confirmPassword) {
            showAlert(400, "Hasła nie są takie same");
            return;
        }

        const response = await api.post<AuthResponse>("/auth/register", {
            email: email.trim().toLowerCase(),
            username: username.trim(),
            password,
            confirmPassword,
        });

        if (response.data?.statusCode === 201) {
            router.push("/subjects");
        }
    } catch (error: unknown) {
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
  };

  return (
  <>
    <div className="form-container" style={{ maxWidth: "600px", padding: "16px 24px" }}>
        <div className="options-container">
        <label htmlFor="email" className="label">Email:</label>
        <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                if (!username && value.includes("@")) {
                    setUsername(value.split("@")[0]);
                }
            }}
            className="input-container"
            spellCheck={true}
            placeholder="Wpisz Email..."
        />
        </div>

        <div className="options-container" style={{ marginTop: "16px" }}>
        <label htmlFor="username" className="label">Użytkownik:</label>
        <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-container"
            spellCheck={true}
            placeholder="Wpisz Użytkownika..."
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
            placeholder="Wpisz Hasło..."
        />
        <div
            style={{ position: "absolute", right: "10px", top: "36px", cursor: "pointer" }}
            onClick={() => setShowPassword(prev => !prev)}
        >
            {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
        </div>
        </div>

        <div className="options-container" style={{ marginTop: "16px", position: "relative" }}>
        <label htmlFor="confirmPassword" className="label">Potwierdź Hasło:</label>
        <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-container"
            spellCheck={true}
            placeholder="Potwierdź Hasło..."
        />
        <div
            style={{ position: "absolute", right: "10px", top: "36px", cursor: "pointer" }}
            onClick={() => setShowConfirmPassword(prev => !prev)}
        >
            {showConfirmPassword ? <EyeOff size={24} /> : <Eye size={24} />}
        </div>
        </div>

        <div className="options-container" style={{ marginTop: "32px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <button
            className="btnOption"
            style={{ width: "180px" }}
            onClick={handleRegister}
        >
            Zarejestruj się
        </button>
        </div>
    </div>
  </>);
}