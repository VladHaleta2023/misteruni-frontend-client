'use client';

import React, { useState } from "react";
import "@/app/styles/components.css";
import { useRouter } from "next/navigation";
import axios from "axios";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import { Eye, EyeOff } from "lucide-react";
import Spinner from "./spinner";

export default function RegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    try {
        if (!email || !username || !password || !confirmPassword) {
            setLoading(false);
            showAlert(400, "Wszystkie pola są wymagane");
            return;
        }

        if (!isValidEmail(email)) {
            setLoading(false);
            showAlert(400, "Nieprawidłowy adres email");
            return;
        }

        if (password !== confirmPassword) {
            setLoading(false);
            showAlert(400, "Hasła nie są takie same");
            return;
        }

        const response = await api.post("/auth/register", {
            email: email.trim().toLowerCase(),
            username: username.trim(),
            password,
            confirmPassword,
        });

        if (response.data?.statusCode === 201) {
            router.push("/subjects");
        }
    } catch (error: unknown) {
        setLoading(false);

        if (axios.isAxiosError(error)) {
            if (error.response) {
                showAlert(
                    error.response.status,
                    error.response.data?.message || "Server error"
                );
            }
            else {
                showAlert(500, `Server error: ${error.message}`);
            }
        }
        else if (error instanceof Error) {
            showAlert(500, error.message);
        }
        else {
            showAlert(500, "Unknown error");
        }
    }
  };

  return (<>
    {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
    ) : (
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
    )}</>
  );
}