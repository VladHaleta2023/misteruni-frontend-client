'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { ArrowLeft, Check, Minus, Plus, Trash2 } from 'lucide-react';
import "@/app/styles/play.css";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import Message from "../components/message";
import FormatText from "../components/formatText";
import "@/app/styles/table.css";
import { ITask } from "../scripts/task";
import StatusIndicator from "../components/statusIndicator";
import Spinner from "../components/spinner";

interface Subtopic {
    name: string;
    percent: number;
}

function subtractPercents(
    subtopics: Subtopic[], 
    outputSubtopics: { name: string; percent: number }[]
): Subtopic[] {
    const outputMap = new Map<string, number>(
        outputSubtopics.map(item => [item.name, item.percent])
    );

    return subtopics.map(item => {
        const subtractValue = outputMap.get(item.name) || 0;
        return {
            name: item.name,
            percent: Math.round(100 - subtractValue)
        };
    });
}

export default function PlayPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [spinnerLoading, setSpinnerLoading] = useState(false);
    const [textLoading, setTextLoading] = useState<string>("Pobieranie Zadania...");

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

    const [msgDeleteTaskVisible, setMsgDeleteTaskVisible] = useState<boolean>(false);
    const [problemsExpanded, setProblemsExpanded] = useState(true);

    const [task, setTask] = useState<ITask>({
        id: 0,
        stage: 0,
        text: "",
        explanation: "",
        topicName: "",
        topicNote: "",
        solution: "",
        percent: 0,
        status: "started",
        options: [],
        subtopics: [],
        answered: false,
        finished: false,
        chatFinished: false,
        chat: "",
        userOptionIndex: 0,
        correctOptionIndex: 0,
        userSolution: "",
        audioFiles: [],
        words: [],
        literatures: [],
        wordsCompleted: false
    });

    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [sectionId, setSectionId] = useState<number | null>(null);
    const [topicId, setTopicId] = useState<number | null>(null);

    const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

    const [isExplanationTyping, setIsExplanationTyping] = useState(false);
    const [typedExplanation, setTypedExplanation] = useState("");
    const [isTaskTextTyping, setIsTaskTextTyping] = useState(false);
    const [typedTaskText, setTypedTaskText] = useState("");
    const explanationIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const taskTextIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const simulateTaskTextTyping = useCallback((taskText: string) => {
        return new Promise<void>((resolve) => {
            if (taskTextIntervalRef.current) {
                clearInterval(taskTextIntervalRef.current);
                taskTextIntervalRef.current = null;
            }

            setIsTaskTextTyping(true);
            setTypedTaskText("");
            
            let currentIndex = 0;
            
            const CHARS_PER_INTERVAL = 2;
            const TYPING_INTERVAL_MS = 15;
            
            taskTextIntervalRef.current = setInterval(() => {
                if (currentIndex >= taskText.length) {
                    if (taskTextIntervalRef.current) {
                        clearInterval(taskTextIntervalRef.current);
                        taskTextIntervalRef.current = null;
                    }
                    setIsTaskTextTyping(false);
                    scrollToBottom();
                    resolve();
                    return;
                }

                const endIndex = Math.min(currentIndex + CHARS_PER_INTERVAL, taskText.length);
                setTypedTaskText(taskText.substring(0, endIndex));
                currentIndex = endIndex;
            }, TYPING_INTERVAL_MS);
        });
    }, []);

    const simulateExplanationTyping = useCallback((explanation: string): Promise<void> => {
        return new Promise((resolve) => {
            if (explanationIntervalRef.current) {
                clearInterval(explanationIntervalRef.current);
                explanationIntervalRef.current = null;
            }

            setIsExplanationTyping(true);
            setTypedExplanation("");
            
            let currentIndex = 0;
            
            const CHARS_PER_INTERVAL = 2;
            const TYPING_INTERVAL_MS = 8;
            
            explanationIntervalRef.current = setInterval(() => {
                if (currentIndex >= explanation.length) {
                    if (explanationIntervalRef.current) {
                        clearInterval(explanationIntervalRef.current);
                        explanationIntervalRef.current = null;
                    }
                    setIsExplanationTyping(false);
                    scrollToBottom();
                    resolve();
                    return;
                }

                const endIndex = Math.min(currentIndex + CHARS_PER_INTERVAL, explanation.length);
                setTypedExplanation(explanation.substring(0, endIndex));
                currentIndex = endIndex;
            }, TYPING_INTERVAL_MS);
        });
    }, []);

    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scrollToBottom = useCallback(() => {
        if (scrollTimeout.current) return;

        scrollTimeout.current = setTimeout(() => {
            chatRef.current?.scrollTo({
                top: chatRef.current.scrollHeight,
                behavior: "auto"
            });

            scrollTimeout.current = null;
        }, 40);
    }, []);

    const updatePlaceholder = () => {
        const el = textareaRef.current as any;
        if (!el) return;
        
        const isEmpty = el.innerText.trim() === "";
        const hasPlaceholder = el.hasAttribute("data-placeholder-active");
        
        if (isEmpty && !hasPlaceholder) {
            el.setAttribute("data-placeholder-active", "true");
            el.innerText = "";
        } else if (!isEmpty && hasPlaceholder) {
            el.removeAttribute("data-placeholder-active");
        }
    };

    const fetchPendingTask = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        signal?: AbortSignal) => {
        
        const controller = new AbortController();
        if (!signal) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller.signal;

        try {
            const response = await api.get<any>(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/pending`,
                { signal: activeSignal } as any
            );

            if (activeSignal.aborted) return null;

            if (response.data?.statusCode === 200) {
                return response.data.task ?? null;
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

    const fetchTaskById = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        signal?: AbortSignal) => {
        
        const controller = new AbortController();
        if (!signal) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller.signal;

        try {
            const response = await api.get<any>(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}`,
                { signal: activeSignal } as any
            );

            if (activeSignal.aborted) return null;

            if (response.data?.statusCode === 200) {
                return response.data.task;
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

    const handleTextGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, signal?: AbortSignal) => {
            setLoading(true);
            setTextLoading("Generowanie AI: Treści Zadania...");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let text = "";
                let errors: string[] = [];
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { text: "" };

                    const response = await api.post<any>(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/writing-generate`,
                        { changed, errors, attempt, text },
                        { signal: activeSignal } as any
                    );

                    if (activeSignal?.aborted) return { text: "" };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        attempt = response.data.attempt;
                        console.log(`Generowanie treści zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować treści zadania");
                        break;
                    }
                }

                return { text };
            } catch (error: unknown) {
                setLoading(false);
                if ((error as DOMException)?.name === "AbortError") return { text: "" };
                handleApiError(error);
                return { text: "" };
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleSaveTaskTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        stage: number,
        text: string,
        solution: string,
        options: string[],
        correctOptionIndex: number,
        taskSubtopics: string[],
        explanation: string,
        percent: number | null,
        signal?: AbortSignal,
        id?: number
    ) => {
        try {
            const response = await api.post<any>(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-transaction`,
                {
                    id,
                    stage,
                    text,
                    solution,
                    options,
                    correctOptionIndex,
                    taskSubtopics,
                    explanation,
                    percent
                },
                { signal } as any
            );

            if (response.data?.statusCode !== 200) {
                setLoading(false);
                showAlert(400, "Nie udało się zapisać zadania");
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
    }, []);

    const handleProblemsGenerate = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        text: string,
        userSolution: string,
        subtopics: string[],
        chat: string,
        signal?: AbortSignal
    ): Promise<{
        outputSubtopics: { name: string; percent: number }[];
        explanation: string;
    }> => {
        setLoading(true);
        setTextLoading("Sprawdzanie Rozwiązania...");

        const controller = !signal ? new AbortController() : null;
        if (controller) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller?.signal;

        try {
            let changed = "true";
            let attempt = 0;
            let errors: string[] = [];
            let explanation: string = "";
            let outputSubtopics: { name: string; percent: number }[] = [];
            const MAX_ATTEMPTS = 2;

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                if (activeSignal?.aborted) return { outputSubtopics: [], explanation: "" };

                const response = await api.post<any>(
                    `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/problems-generate`,
                    { 
                        changed, 
                        errors, 
                        attempt, 
                        text, 
                        solution: "",
                        options: [], 
                        correctOption: "", 
                        userOption: "", 
                        userSolution,
                        subtopics: subtopics,
                        outputSubtopics: outputSubtopics.map(s => [s.name, s.percent]),
                        explanation,
                        chat
                    },
                    { signal: activeSignal } as any
                );

                if (activeSignal?.aborted) return { outputSubtopics: [], explanation: "" };

                if (response.data?.statusCode === 201) {
                    changed = response.data.changed;
                    errors = response.data.errors;
                    explanation = response.data.explanation;
                    outputSubtopics = response.data.outputSubtopics?.map((item: any) => ({
                        name: item[0],
                        percent: item[1]
                    })) || [];
                    attempt = response.data.attempt;
                    console.log(`Sprawdzanie rozwiązania: Próba ${attempt}`);
                } else {
                    showAlert(400, "Nie udało się sprawdzić rozwiązania");
                    break;
                }
            }

            return { outputSubtopics, explanation };
        } catch (error: unknown) {
            setLoading(false);
            if ((error as DOMException)?.name === "AbortError") return { outputSubtopics: [], explanation: "" };
            handleApiError(error);
            return { outputSubtopics: [], explanation: "" };
        } finally {
            if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
        }
    }, []);

    const handleTaskFinishedTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        id: number,
        explanation: string,
        percent: number,
        signal?: AbortSignal
    ) => {
        try {
            const response = await api.put<any>(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${id}/finished`,
                { explanation, percent },
                { signal } as any
            );

            if (response.data?.statusCode !== 200) {
                setLoading(false);
                showAlert(400, "Nie udało się zakończyć zadanie");
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
    }, []);

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

    const handleTaskUserSolutionSave = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        userSolution: string,
        signal?: AbortSignal
    ) => {
        try {
            const taskUserSolutionResponse = await api.put<any>(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/user-solution`,
                {
                    userSolution,
                    userOptionIndex: 0
                },
                { signal } as any
            );

            if (taskUserSolutionResponse.data?.statusCode !== 200) {
                showAlert(400, `Nie udało się zapisać odpowiedź`);
            }
        }
        catch (error: unknown) {
            handleApiError(error);
        }
    }, []);

    const loadTask = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        stage: number,
        signal?: AbortSignal
    ) => {
        try {
            let text: string = "";

            if (stage < 1) {
                const taskResult = await handleTextGenerate(subjectId, sectionId, topicId, signal);
                text = taskResult?.text ?? "";

                if (!text) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować treści zadania");
                    return;
                }

                stage = 1;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, "", [], 0, [], "", null, signal);
            }

            let newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                return;
            }

            const taskId = newTask.id;
            localStorage.setItem("taskId", String(taskId));

            text = newTask.text ?? "";
            setTask(newTask);

            if (text) {
                setLoading(false);
                await simulateTaskTextTyping(text);
            }

            newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);
            setTask(newTask);
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        }
    }, [handleTextGenerate, handleSaveTaskTransaction, simulateTaskTextTyping]);

    const handleSubmitTaskClick = useCallback(async () => {
        if (isSubmittingAnswer) return;
        
        setIsSubmittingAnswer(true);

        if (controllerRef.current) controllerRef.current.abort();

        const controller = new AbortController();
        controllerRef.current = controller;
        controllersRef.current.push(controller);
        const signal = controller.signal;

        if (!task.answered) {
            try {
                scrollToBottom();
                setLoading(true);
                setTextLoading("Zapisywanie rozwiązania...");

                const currentTaskId = task.id;
                const currentSubjectId = subjectId;
                const currentSectionId = sectionId;
                const currentTopicId = topicId;

                await handleTaskUserSolutionSave(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    currentTaskId ?? 0,
                    task.userSolution,
                    signal
                );

                if (signal.aborted) return;

                setTask(prev => ({
                    ...prev,
                    answered: true
                }));

                const currentSubtopics: Subtopic[] = task.subtopics.length > 0 
                    ? task.subtopics 
                    : [{ name: task.topicName ?? "", percent: 0 }];

                const data = await handleProblemsGenerate(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    task.text ?? "",
                    task.userSolution,
                    currentSubtopics.map(s => s.name),
                    task.chat ?? "",
                    signal
                );

                if (!data || signal?.aborted) return;

                const updatedSubtopics = subtractPercents(currentSubtopics, data.outputSubtopics);
                const finalPercent = updatedSubtopics[0]?.percent || 0;

                await handleSaveTaskTransaction(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    task.stage,
                    task.text,
                    "",
                    [],
                    0,
                    [],
                    data.explanation,
                    finalPercent,
                    signal,
                    task.id
                );

                await handleTaskFinishedTransaction(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    task.id ?? 0,
                    data.explanation,
                    finalPercent,
                    signal
                );

                if (signal?.aborted) return;

                const finalTask = await fetchTaskById(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    task.id ?? 0,
                    signal
                );

                if (finalTask) {
                    setTask({
                        ...finalTask,
                        subtopics: updatedSubtopics,
                        explanation: data.explanation,
                        percent: finalPercent
                    });
                    setLoading(false);
                    
                    if (data.explanation) {
                        await simulateExplanationTyping(data.explanation);
                    }
                }
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return;
                setLoading(false);
                handleApiError(error);
            } finally {
                setLoading(false);
                setIsSubmittingAnswer(false);

                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                controllerRef.current = null;
            }
        }
    }, [task.id, task.answered, task.userSolution, task.subtopics, task.stage, task.text, task.solution, task.options, task.correctOptionIndex, subjectId, sectionId, topicId, isSubmittingAnswer, handleTaskUserSolutionSave, handleProblemsGenerate, handleSaveTaskTransaction, handleTaskFinishedTransaction, fetchTaskById, simulateExplanationTyping]);

    const handleBackClick = () => {
        localStorage.removeItem("taskId");
        router.back();
    };

    function isEmptyString(str: string): boolean {
        return /^\s*$/.test(str);
    }

    useEffect(() => {
        const handleUnload = () => {
            controllersRef.current.forEach((controller: AbortController) => controller.abort());
            controllersRef.current = [];
        };

        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, []);

    useEffect(() => {
        const sId = Number(localStorage.getItem("subjectId"));
        const secId = Number(localStorage.getItem("sectionId"));
        const tId = Number(localStorage.getItem("topicId"));

        if (sId && secId && tId) {
            setSubjectId(sId);
            setSectionId(secId);
            setTopicId(tId);
        } else {
            showAlert(400, "Nie udało się pobrać ID lub ID jest niepoprawne");
        }
    }, []);

    const controllerRef = useRef<AbortController | null>(null);
    const controllersRef = useRef<AbortController[]>([]);

    useEffect(() => {
        if (!subjectId || !sectionId || !topicId) return;

        setLoading(true);

        if (controllerRef.current) controllerRef.current.abort();

        const controller = new AbortController();
        controllersRef.current.push(controller);
        const signal = controller.signal;

        const fetchAndLoadTask = async () => {
            try {
                setTextLoading("Pobieranie Zadania...");

                let task = await fetchPendingTask(subjectId, sectionId, topicId, signal);
                if (signal.aborted) return;

                const stage = task?.stage ?? 0;

                if (localStorage.getItem("taskId")) {
                    const taskId: number = Number(localStorage.getItem("taskId"));

                    task = await fetchTaskById(
                        subjectId,
                        sectionId,
                        topicId,
                        taskId,
                        signal
                    );

                    if (signal.aborted) return;

                    if (!task) {
                        localStorage.removeItem("taskId");
                        return;
                    }

                    setTask(task);

                    if (task.finished || (!task.answered && stage >= 1)) {
                        setLoading(false);
                        return;
                    }
                }

                if (task && task.id) {
                    localStorage.setItem("taskId", String(task.id));
                }

                if (!task || stage < 1) {
                    await loadTask(subjectId, sectionId, topicId, stage, signal);
                    if (signal.aborted) return;
                }

                task = await fetchPendingTask(subjectId, sectionId, topicId, signal);
                setTask(task);

                localStorage.setItem("taskId", String(task.id));
                
                if (task.answered && !task.finished) {
                    setLoading(true);
                    setTextLoading("Obliczanie Wyników...");

                    const currentSubtopics: Subtopic[] = task.subtopics.length > 0 
                        ? task.subtopics 
                        : [{ name: task.topicName ?? "", percent: 0 }];

                    const data = await handleProblemsGenerate(
                        subjectId ?? 0,
                        sectionId ?? 0,
                        topicId ?? 0,
                        task.text ?? "",
                        task.userSolution,
                        currentSubtopics.map(s => s.name),
                        task.chat ?? "",
                        signal
                    );

                    if (!data || signal?.aborted) return;

                    const updatedSubtopics = subtractPercents(currentSubtopics, data.outputSubtopics);
                    const finalPercent = updatedSubtopics[0]?.percent || 0;

                    await handleSaveTaskTransaction(
                        subjectId ?? 0,
                        sectionId ?? 0,
                        topicId ?? 0,
                        task.stage,
                        task.text,
                        "",
                        [],
                        0,
                        [],
                        data.explanation,
                        finalPercent,
                        signal,
                        task.id
                    );

                    await handleTaskFinishedTransaction(
                        subjectId ?? 0,
                        sectionId ?? 0,
                        topicId ?? 0,
                        task.id ?? 0,
                        data.explanation,
                        finalPercent,
                        signal
                    );

                    if (signal?.aborted) return;

                    const finalTask = await fetchTaskById(
                        subjectId ?? 0,
                        sectionId ?? 0,
                        topicId ?? 0,
                        task.id ?? 0,
                        signal
                    );

                    if (finalTask) {
                        setTask({
                            ...finalTask,
                            subtopics: updatedSubtopics,
                            explanation: data.explanation,
                            percent: finalPercent
                        });
                        setLoading(false);
                        
                        if (data.explanation) {
                            await simulateExplanationTyping(data.explanation);
                        }
                    }
                }

                if (task.finished) {
                    setTypedExplanation(task.explanation || "");
                }
            } catch (error) {
                if ((error as DOMException)?.name === "AbortError") return;
                handleApiError(error);
            } finally {
                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                setLoading(false);
                setTextLoading("");
            }
        };

        fetchAndLoadTask();

        return () => {
            controller.abort();
            controllerRef.current = null;
        };
    }, [subjectId, sectionId, topicId]);

    useEffect(() => {
        return () => {
            if (explanationIntervalRef.current) {
                clearInterval(explanationIntervalRef.current);
            }
            if (taskTextIntervalRef.current) {
                clearInterval(taskTextIntervalRef.current);
            }
        };
    }, []);

    const handleDeleteTask = useCallback(async() => {
        try {
            const response = await api.delete<any>(`/subjects/${subjectId}/tasks/${task.id}`);

            if (response.data?.statusCode !== 200) {
                showAlert(response.data.statusCode, response.data.message);
            }
        }
        catch (error) {
            setSpinnerLoading(false);
            handleApiError(error);
        }
        finally {
            setTextLoading("");
            setMsgDeleteTaskVisible(false);
        }
    }, [subjectId, task.id]);

    return (
        <>
            <Header>
                <div className="menu-icons">
                    <div className="menu-icon" title="Wróć" onClick={handleBackClick}>
                        <ArrowLeft size={28} color="white" />
                    </div>
                    <div className="menu-icon" title="Usuń" onClick={(e) => {
                        e.stopPropagation();
                        setMsgDeleteTaskVisible(true);
                    }}>
                        <Trash2 size={28} color="white" />
                    </div>
                </div>
            </Header>

            <main>
                <Message
                    message={"Czy na pewno chcesz usunąć zadanie?"}
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={() => {
                        setMsgDeleteTaskVisible(false);
                        setSpinnerLoading(true);

                        if (!loading)
                            setTextLoading("Trwa Usuwanie Zadania...");

                        setSpinnerLoading(true);
                        if (task.id) {
                            handleDeleteTask().then(() => {
                                handleBackClick();
                            });
                        }
                        else
                            showAlert(400, "Błąd usuwania zadania");
                    }}
                    onClose={() => {
                        setMsgDeleteTaskVisible(false);
                    }}
                    visible={msgDeleteTaskVisible}
                />

                {spinnerLoading ? (
                    <div className="spinner-wrapper">
                        <Spinner text={textLoading} />
                    </div>
                ) : (
                    <div className="play-container" ref={containerRef}>
                        <div className="chat" ref={chatRef}>
                            {task.topicName && (<div className="message robot">
                                <div className="element-name" style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "20px"
                                }}>
                                    {task.topicName}
                                    <div className={`element-percent ${task.status}`}>
                                        {task.percent}%
                                    </div>
                                </div>
                            </div>)}
                            
                            {task.text != "" && (
                                <div className="message robot">
                                    <div className="text-title" style={{ fontSize: "20px" }}>
                                        Zadanie:
                                    </div>
                                    <div style={{paddingLeft: "20px", marginTop: "8px"}}>
                                        {isTaskTextTyping ? (
                                            <FormatText content={typedTaskText} />
                                        ) : (
                                            <FormatText content={task.text ?? ""} />
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {!task.answered && task.stage >= 1 && (
                                <div className="message human">
                                    <div className="text-title">Moje Rozwiązanie:</div>

                                    <div
                                        ref={textareaRef as any}
                                        data-placeholder="Napisz wypracowanie..."
                                        contentEditable={!task.answered}
                                        suppressContentEditableWarning
                                        className="answer-block"
                                        onInput={(e) => {
                                            const el = e.currentTarget;

                                            if (el.hasAttribute("data-placeholder-active")) {
                                                el.removeAttribute("data-placeholder-active");
                                            }

                                            const value = el.innerText;
                                            setTask(prev => ({
                                                ...prev,
                                                originalSolution: value,
                                                userSolution: value
                                            }));

                                            requestAnimationFrame(() => {
                                                el.style.height = "auto";
                                                el.style.height = `${el.scrollHeight}px`;
                                            });
                                        }}
                                        onBlur={() => updatePlaceholder()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Backspace" || e.key === "Delete") {
                                                setTimeout(() => updatePlaceholder(), 0);
                                            }
                                        }}
                                    />

                                    <div
                                        className="options"
                                        style={{
                                            display: "flex",
                                            cursor: "pointer",
                                            marginTop: "12px"
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                gap: "6px",
                                                marginLeft: "auto",
                                                cursor: "pointer"
                                            }}
                                        >
                                            <button
                                                className="btnOption"
                                                title={"Sprawdź i zakończ"}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const text = task.userSolution?.trim();
                                                    if (!text) {
                                                        showAlert(400, "Odpowiedź nie może być pusta");
                                                        return;
                                                    }
                                                    handleSubmitTaskClick();
                                                }}
                                                disabled={isSubmittingAnswer}
                                            >
                                                <Check size={28} color="white" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {task.answered && !isEmptyString(task.userSolution) && (
                                <div className="message human">
                                    <div className="text-title">Moje Rozwiązanie:</div>
                                    <div className="answer-block readonly" style={{ marginTop: "8px" }}>
                                        <FormatText content={task.userSolution} />
                                    </div>
                                </div>
                            )}
                            
                            {loading && (
                                <StatusIndicator text={textLoading} />
                            )}
                            
                            {task.finished && (
                                <div className="message robot">
                                    <div
                                        className="text-title"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            cursor: "pointer",
                                            fontWeight: "bold",
                                            fontSize: "20px"
                                        }}
                                        onClick={() => setProblemsExpanded(prev => !prev)}
                                    >
                                        <div style={{
                                            display: "flex"
                                        }}>
                                            <div
                                                className="btnElement"
                                                style={{
                                                    marginRight: "4px",
                                                    fontWeight: "bold",
                                                }}
                                            >
                                                {problemsExpanded ? <Minus size={26} /> : <Plus size={26} />}
                                            </div>
                                            Wyjaśnienie:
                                        </div>
                                        <div className={`element-percent ${task.status}`}>
                                            {task.percent}%
                                        </div>
                                    </div>
                                    {(problemsExpanded || isExplanationTyping) && (
                                        <>
                                            <br />
                                            <div style={{paddingLeft: "20px"}}>
                                                {isExplanationTyping ? (
                                                    <FormatText content={typedExplanation} />
                                                ) : (
                                                    <FormatText content={task.explanation ?? ""} />
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}