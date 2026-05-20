"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, ArrowLeft, SquareChartGantt, UserPen, AudioLines, Text, BookOpen } from "lucide-react";
import "@/app/styles/table.css";
import "@/app/styles/components.css";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import { useRouter } from "next/navigation";
import FormatText from "@/app/components/formatText";
import Header from "@/app/components/header";
import StatusIndicator from "../components/statusIndicator";

type Status = 'started' | 'progress' | 'completed';

interface Task {
  id: number;
  text: string;
  finished: boolean;
  answered: boolean;
  percent: number;
  status: Status;
  options: string[];
  userOptionIndex: number;
  correctOptionIndex: number;
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

export default function ExamPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [isExamView, setIsExamView] = useState<boolean>(false);

  const [exam, setExam] = useState<Exam | null>(null);

  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState("");

  const controllerRef = useRef<AbortController | null>(null);
  const controllersRef = useRef<AbortController[]>([]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      const storedIsExamView = localStorage.getItem("isExamView");
      setIsExamView(storedIsExamView ? true : false);
    }
  }, []);

  const fetchPendingExam = useCallback(async (
    subjectId: number,
    signal?: AbortSignal
  ) => {
    if (!subjectId) {
        showAlert(400, "Przedmiot nie został znaleziony");
        return null;
    }

    const controller = new AbortController();
    if (!signal) controllersRef.current.push(controller);
    const activeSignal = signal ?? controller.signal;

    try {
        const response = await api.get<any>(
            `/subjects/${subjectId}/exams/pending`,
            { signal: activeSignal } as any
        );

        if (activeSignal.aborted) return null;

        if (response.data?.statusCode === 200) {
            return response.data.exam ?? null;
        }

        return null;
    } catch (error) {
        setLoading(false);
        if ((error as DOMException)?.name === "AbortError") return null;
        handleApiError(error);
        return null;
    } finally {
        if (!signal) controllersRef.current = controllersRef.current.filter(c => c !== controller);
    }
  }, []);

  const fetchExamById = useCallback(async (
    subjectId: number,
    examId: number,
    signal?: AbortSignal
  ) => {
    if (!subjectId) {
        showAlert(400, "Przedmiot nie został znaleziony");
        return null;
    }

    if (!examId) {
        showAlert(400, "Egzamin nie został znaleziony");
        return null;
    }

    const controller = new AbortController();
    if (!signal) controllersRef.current.push(controller);
    const activeSignal = signal ?? controller.signal;

    try {
        const response = await api.get<any>(
            `/subjects/${subjectId}/exams/${examId}`,
            { signal: activeSignal } as any
        );

        if (activeSignal.aborted) return null;

        if (response.data?.statusCode === 200) {
            return response.data.exam ?? null;
        }

        return null;
    } catch (error) {
        setLoading(false);
        if ((error as DOMException)?.name === "AbortError") return null;
        handleApiError(error);
        return null;
    } finally {
        if (!signal) controllersRef.current = controllersRef.current.filter(c => c !== controller);
    }
  }, []);

  const handleExamGenerate = useCallback(
    async (subjectId: number, signal?: AbortSignal) => {
        setLoading(true);
        setTextLoading("Generowanie AI: Arkusz Przedmiotu...");

        const controller = !signal ? new AbortController() : null;
        if (controller) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller?.signal;

        try {
            let changed = "true";
            let attempt = 0;
            let errors: string[] = [];
            let outputTopics: string[] = [];
            const MAX_ATTEMPTS = 2;

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                if (activeSignal?.aborted) return { outputTopics: [] };

                const response = await api.post<any>(
                    `/subjects/${subjectId}/exams/exam-generate`,
                    { changed, errors, attempt, outputTopics },
                    { signal: activeSignal } as any
                );

                if (activeSignal?.aborted) return { outputTopics: [] };

                if (response.data?.statusCode === 201) {
                    changed = response.data.changed;
                    errors = response.data.errors;
                    outputTopics = response.data.outputTopics;
                    attempt = response.data.attempt;
                    console.log(`Generowanie arkusza przedmiotu: Próba ${attempt}`);
                } else {
                    showAlert(400, "Nie udało się zgenerować arkusza przedmiotu");
                    break;
                }
            }

            return { outputTopics };
        } catch (error: unknown) {
            setLoading(false);
            if ((error as DOMException)?.name === "AbortError") return { outputTopics: [] };
            handleApiError(error);
            return { outputTopics: [] };
        } finally {
            if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
        }
    }, []
  );

  const handleSaveExamTransaction = useCallback(async (
    subjectId: number,
    topics: string[],
    signal?: AbortSignal
  ) => {
    try {
        const response = await api.post<any>(
        `/subjects/${subjectId}/exams/exam-transaction`,
            {
                topics
            },
            { signal } as any
        );

        if (response.data?.statusCode !== 200) {
            setLoading(false);
            showAlert(400, "Nie udało się zapisać arkusz przedmiotu");
        }
    }
    catch (error: unknown) {
        setLoading(false);
        handleApiError(error);
    }
  }, []);

  function handleBackClick() {
    localStorage.removeItem("sectionId");
    localStorage.removeItem("topicId");
    localStorage.removeItem("examId");
    localStorage.removeItem("isExamView");
    router.back();
  }

  function handleExamsClick() {
    localStorage.removeItem("examId");
    router.push("exams");
  }

  const handleTopicPlayClick = (sectionId: number, topicId: number, type: string) => {
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topicId));

    if (type == "Stories") {
      router.push("/interactive-play");
    }
    else if (type == "Writing") {
      router.push("/writing-play");
    }
    else {
      router.push("/play");
    }
  };

  const handleTopicClick = (sectionId: number, topicId: number, type: string) => {
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topicId));
    localStorage.setItem("type", String(type));

    router.push("/topic");
  };

  const handleExamPlayClick = useCallback(async (
    subjectId: number,
    signal?: AbortSignal
  ) => {
    try {
        const { outputTopics } = await handleExamGenerate(subjectId, signal);

        if (outputTopics.length != 0)
            await handleSaveExamTransaction(subjectId, outputTopics, signal);
        else
            showAlert(400, "Nie udało się zgenerować arkusza przedmiotu");
    }
    catch (error: unknown) {
        setLoading(false);
        handleApiError(error);
    }
    finally {
        return await fetchPendingExam(subjectId, signal);
    }
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    if (controllerRef.current) controllerRef.current.abort();

    const controller = new AbortController();
    controllersRef.current.push(controller);
    const signal = controller.signal;

    const loadExam = async () => {
        try {
            setLoading(true);
            setTextLoading("Pobieranie Arkuszu...");

            const storedExamId = localStorage.getItem("examId");

            let exam = null

            if (storedExamId) {
                exam = await fetchExamById(
                    subjectId,
                    Number(storedExamId),
                    signal
                );

                if (exam) {
                    setExam(exam);
                    localStorage.setItem("examId", exam.id);
                    return;
                }
            }

            exam = await fetchPendingExam(subjectId, signal);
            if (signal.aborted) return;

            if (!exam) {
                exam = await handleExamPlayClick(subjectId, signal);
                if (signal.aborted) return;
            }

            setExam(exam);
            localStorage.setItem("examId", exam.id);
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") return;
            handleApiError(error);
        } finally {
            controllersRef.current = controllersRef.current.filter(c => c !== controller);
            setLoading(false);
            setTextLoading("");
        }
    };

    loadExam();

    return () => {
        controller.abort();
        controllerRef.current = null;
    };
  }, [subjectId, handleExamPlayClick, fetchPendingExam, fetchExamById]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
    ].join(':');
  };

  const formatDate = (date: string | Date): string => {
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
  };

  const getOptionClass = (index: number, task: Task | undefined | null) => {
    if (!task || !task.answered) return "";

    const isCorrect = task.correctOptionIndex === index;
    const isUser = task.userOptionIndex === index;

    if (isCorrect) return "check correct";
    if (isUser) return "check uncorrect";

    return "";
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
        {!isExamView && (<div 
          className="menu-icon"
          title={"Przełącz do treści przedmiotu"}
          style={{
            marginLeft: "auto"
          }}
          onClick={(e) => {
            e.stopPropagation();
            localStorage.removeItem("examId");
            router.push("sections");
          }}
        >
          <BookOpen size={28} color="white" />
        </div>)}
      </div>
    </Header>
    
    <main>
        {exam && (<>
            <div style={{
                width: "100%",
                padding: "12px"
            }}>
                <div className="text-title text-topic-note">
                    <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
                        <button
                            className="element-frequency"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleExamsClick();
                            }}
                            style={{ padding: "5px", cursor: "pointer" }}
                        >
                            <Text size={28} color="gray" />
                        </button>
                        <div className="element-name" style={{ fontSize: "20px" }}>
                            <FormatText content={`Arkusz ${exam.partId}`} />
                        </div>
                        <div className="element-options">
                            <div className={`element-percent ${exam.status}`}>
                                {exam.percent}%
                            </div>
                            {exam.finished && (<button
                                className="btnElement"
                                style={{ backgroundColor: "transparent", padding: "6px" }}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const examResult = await handleExamPlayClick(subjectId ?? 0);
                                    setExam(examResult);
                                    localStorage.setItem("examId", examResult.id);
                                }}
                            >
                                <Play
                                    size={28}
                                    color="#7e2ba9"
                                    fill="#7e2ba9"
                                    stroke="#7e2ba9"
                                />
                            </button>)}
                        </div>
                    </div>
                </div>
                <div style={{ padding: "12px", gap: "6px", display: "flex", flexDirection: "column", width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: "bold" }}>
                            Czas:
                        </div>
                        {formatTime(exam.remainingExamTimeSeconds)}
                    </div>
                     <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: "bold" }}>
                            Data:
                        </div>
                        {formatDate(exam.createdAt)}
                    </div>
                </div>
            </div>
            <div className="table">
                {exam.topics && exam.topics.map((topic, index) => (
                    <div
                        className={`element element-topic ${topic.task && !topic.task.finished ? "not-finished" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleTopicClick(topic.sectionId, topic.id, topic.type);
                        }}
                        style={{
                            justifyContent: "space-between",
                            alignItems: `${topic.task ? "flex-start" : "center"}`
                        }}
                        key={`topic-${index}`}
                    >
                        {!topic.task && (<>
                            <button
                                className="element-frequency"
                                style={{ padding: "5px" }}
                            >
                                {topic.type == "Stories" ? (
                                    <AudioLines size={28} color="grey" />
                                ) : topic.type == "Writing" ? (
                                    <UserPen size={28} color="grey" />
                                ) : (
                                    <SquareChartGantt size={28} color="grey" />
                                )}
                            </button>
                            <div className="element-name">
                                <FormatText content={topic.name ?? ""} />
                            </div>
                        </>)}
                        {topic.task && (<>
                            <div className="element-name" style={{
                                flexDirection: "column",
                                fontSize: "16px",
                                alignItems: "flex-start"
                            }}>
                                <FormatText content={topic.task.text ?? ""} />
                                {topic.task.options.map((option, index) => (
                                <div
                                    key={index}
                                    style={{ display: "flex", alignItems: "center" }}
                                >
                                    <strong className={`option-letter ${getOptionClass(index, topic.task)}`}>
                                        {String.fromCharCode(65 + index)}.
                                    </strong>

                                    <FormatText content={option} />
                                </div>
                                ))}
                                <FormatText content={topic.task.userSolution ?? ""} />
                            </div>
                        </>)}
                        <div className="element-options">
                            {topic.task?.finished ? (<div className={`element-percent ${topic.task && topic.task.status}`}>
                                {topic.task && topic.task.percent}%
                            </div>) : !exam.finished &&
                            (<button
                                className="btnElement"
                                style={{ backgroundColor: "transparent", padding: "5px" }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTopicPlayClick(topic.sectionId, topic.id, topic.type);
                                }}
                            >
                                <Play
                                    size={28}
                                    color="#7e2ba9"
                                    fill="#7e2ba9"
                                    stroke="#7e2ba9"
                                />
                            </button>)}
                        </div>
                    </div>
                ))}
            </div>
        </>)}

        {loading && (
            <div style={{ padding: "16px" }}>
                <StatusIndicator text={textLoading} />
            </div>
        )}
    </main>
    </>
  );
}