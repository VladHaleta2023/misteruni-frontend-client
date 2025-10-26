'use client';

import { useEffect, useState, useCallback } from "react";
// import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import "@/app/styles/components.css";
import api from "@/app/utils/api";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import Spinner from "@/app/components/spinner";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";

export default function MainPage() {
  const [subjectId, setSubjectId] = useState<number>(-1);
  const [spinnerText, setSpinnerText] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [difficultyText, setDifficultyText] = useState("");
  const [thresholdText, setThresholdText] = useState("");

  const fetchSubject = useCallback(async (id: number) => {
    try {
      const response = await api.get(`/subjects/${id}`);

      setLoading(false);

      if (response.data?.statusCode === 200) {
        setDifficultyText(response.data.subject.difficulty);
        setThresholdText(response.data.subject.threshold);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    }
    catch (error) {
      setLoading(false);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          showAlert(error.response.status, error.response.data.message || "Server error");
        } else {
          showAlert(500, `Server error: ${error.message}`);
        }
      } else if (error instanceof Error) {
        showAlert(500, `Server error: ${error.message}`);
      } else {
        showAlert(500, "Unknown error");
      }
    }
  }, []);

  useEffect(() => {
    const storedSubjectId = localStorage.getItem("subjectId");

    if (storedSubjectId) {
        const parsedSubjectId = Number(storedSubjectId);
        setSubjectId(!isNaN(parsedSubjectId) ? parsedSubjectId : -1);
    } else {
        setSubjectId(-1);
    }

    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
        window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  useEffect(() => {
    if (subjectId !== -1) {
        setSpinnerText("");
        setLoading(true);
        fetchSubject(subjectId);
    }
  }, [subjectId, fetchSubject]);

  function handleBackClick() {
    router.push("/");
  }

  async function handleSubjectEditSubmit() {
    setLoading(true);
    setSpinnerText("Altualizacja poziomu przedmiotu");

    try {
      const response = await api.put(`/subjects/${subjectId}`, {
        difficulty: Number(difficultyText),
        threshold: Number(thresholdText)
      });

      setLoading(false);
      showAlert(response.data.statusCode, response.data.message);

      if (response.data?.statusCode === 200)
          router.push("/");
    }
    catch (error) {
      setLoading(false);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          showAlert(error.response.status, error.response.data.message || "Server error");
        } else {
          showAlert(500, `Server error: ${error.message}`);
        }
      } else if (error instanceof Error) {
        showAlert(500, `Server error: ${error.message}`);
      } else {
        showAlert(500, "Unknown error");
      }
    }
  }

  return (
    <>
      <Header>
          <div className="menu-icons">

              <div className="menu-icon" title="Wróć" onClick={handleBackClick} style={{ cursor: "pointer" }}>
                  <ArrowLeft size={28} color="white" />
              </div>
          </div>
      </Header>
      <main>
        {loading ? (
          <div className="spinner-wrapper">
            <Spinner text={spinnerText} />
          </div>
        ) : (
            <div className="form-container">
                <div className="options-container">
                    <label htmlFor="difficulty" className="label">Trudność:</label>
                    <input
                        type="text"
                        id="difficulty"
                        name="text-container"
                        value={difficultyText}
                        onInput={(e) => setDifficultyText((e.target as HTMLTextAreaElement).value)}
                        className="text-container"
                        placeholder="Proszę napisać trudność..."
                    />
                </div>
                <div className="options-container" style={{ marginTop: "12px" }}>
                    <label htmlFor="threshold" className="label">Próg:</label>
                    <input
                        type="text"
                        id="threshold"
                        name="text-container"
                        value={thresholdText}
                        onInput={(e) => setThresholdText((e.target as HTMLTextAreaElement).value)}
                        className="text-container"
                        placeholder="Proszę napisać próg..."
                    />
                </div>
                <div style={{
                    display: "flex",
                    marginTop: "24px"
                }}>
                    <button
                        className="button"
                        style={{ padding: "10px 24px", marginRight: "12px" }}
                        onClick={handleSubjectEditSubmit}
                    >
                        Aktualizować
                    </button>
                </div>
            </div>
        )}
      </main>
    </>
  );
}