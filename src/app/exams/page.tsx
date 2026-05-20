'use client';

import Header from "@/app/components/header";
import { ArrowLeft, BookOpen, Globe, LibraryBig, Minus, SearchCheck } from 'lucide-react';
import "@/app/styles/table.css";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/play.css";
import "@/app/styles/components.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import FormatText from "@/app/components/formatText";

type Status = 'started' | 'progress' | 'completed';

interface Task {
  id: number;
  text: string;
  finished: boolean;
  percent: number;
  status: Status;
  options: string[];
  userSolution: string;
  examId: number | undefined | null;
}

interface Topic {
    id: number;
    sectionId: number;
    subjectId: number;
    name: string;
    type: string;
    task: Task | null | undefined;
}

interface Exam {
    id: number;
    partId: number;
    finished: boolean;
    topics: Topic[];
    percent: number;
    status: Status;
    remainingExamTimeSeconds: number;
    createdAt: Date;
}

export default function ExamsPage() {
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState("");

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

  const fetchExamsBySubjectId = useCallback(async () => {
    if (!subjectId) {
        setLoading(false);
        showAlert(400, "Przedmiot nie został znaleziony");
        return;
    }

    try {
        const response = await api.get<any>(`/subjects/${subjectId}/exams`);
        setLoading(false);

        if (response.data?.statusCode === 200) {
            setExams(response.data.exams ?? []);
        } else {
            showAlert(response.data.statusCode, response.data.message);
        }
    }
    catch (error) {
        setLoading(false);
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
  }, [subjectId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
    }
  }, []);

  useEffect(() => {
      if (!subjectId) return;

      const loadExams = async () => {
          setLoading(true);
          try {
            await fetchExamsBySubjectId();
          } finally {
            setLoading(false);
          }
      };

      loadExams();
  }, [fetchExamsBySubjectId, subjectId]);

  function handleBackClick() {
    router.back();
  }

  function handleExamClick(subjectId: number, examId: number) {
    localStorage.setItem("subjectId", String(subjectId));
    localStorage.setItem("examId", String(examId));
    localStorage.setItem("isExamView", "true");
    router.push("exam");
  }

  const formatDate = (date: string | Date): string => {
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
  };

  return (
    <>
      <Header>
        <div className="menu-icons">
            <div
                className="menu-icon"
                title="Wrócić"
                onClick={handleBackClick}
                style={{ cursor: "pointer" }}
            >
                <ArrowLeft size={28} color="white" />
            </div>
        </div>
      </Header>

      <main>
        {loading ? (
            <div className="spinner-wrapper">
            <Spinner text={textLoading} />
            </div>
        ) : (
            <>
            {exams.length === 0 ? (
                <div
                style={{
                    color: "#514e4e",
                    display: "flex",
                    flexDirection: "column",
                    margin: "auto",
                }}
                >
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span>Brak arkuszów</span>
                </div>
                </div>
            ) : (
                <div className="table">
                {exams.map((exam) => (
                    <Fragment key={exam.id}>
                        <div
                            className={`element`}
                            style={{
                                backgroundColor: "#cccccc",
                                color: "#000000",
                                justifyContent: "center",
                                alignItems: "center",
                                fontSize: "18px"
                            }}
                        >
                            {formatDate(exam.createdAt)}
                        </div>
                        <div
                            className={`element element-task ${!exam.finished ? "not-finished" : ""}`}
                            style={{
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                            onClick={() =>
                                handleExamClick(
                                    subjectId ?? 0,
                                    exam.id
                                )
                            }
                        >
                            <div className="text-title">
                                {`Arkusz ${exam.partId}`}
                            </div>
                            <div className="element-options">
                                <div className={`element-percent ${exam.status}`}>
                                    {exam.percent ?? 0}%
                                </div>
                            </div>
                        </div>
                    </Fragment>
                ))}
                </div>
            )}
            </>
        )}
        </main>
    </>
  );
}