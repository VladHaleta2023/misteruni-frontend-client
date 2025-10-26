'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Mic, Type, X, Check, Trash2 } from 'lucide-react';
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import RadioMessage from "@/app/components/radioMessage";
import Message from "../components/message";
import FormatText from "../components/formatText";
import axios from "axios";
import "@/app/styles/table.css";
import { ITask, Task } from "../scripts/task";

enum InsertPosition {
    None = 'None',
    Przed = 'Przed',
    Zamiast = 'Zamiast',
    Po = 'Po',
}

interface Subtopic {
    name: string;
    percent: number;
}

export default function PlayPage() {
    const router = useRouter();
    const [transcribeLoading, setTranscribeLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [insertPosition, setInsertPosition] = useState<InsertPosition>(InsertPosition.None);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isMicMode, setIsMicMode] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [transcribes, setTranscribes] = useState<string[]>([]);

    const [textValue, setTextValue] = useState("");
    const [sentences, setSentences] = useState<string[]>([]);
    const [selectedSentences, setSelectedSentences] = useState<number[]>([]);

    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [msgVisible, setMsgVisible] = useState<boolean>(false);
    const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);
    const [msgDeleteTaskVisible, setMsgDeleteTaskVisible] = useState<boolean>(false);
    const [selectedSentencesWasEmpty, setSelectedSentencesWasEmpty] = useState<boolean>(false);

    const [userOptionIndex, setUserOptionIndex] = useState<number | null>(null);

    const [textLoading, setTextLoading] = useState<string>("");
    const [task, setTask] = useState<Task>(
        new Task({
            id: 0,
            stage: 0,
            text: "",
            explanation: "",
            note: "",
            solution: "",
            percent: 0,
            status: "started",
            options: [],
            explanations: [],
            subtopics: [],
            correctOptionIndex: 0,
            answered: false,
            finished: false,
            userOptionIndex: 0,
            userSolution: "",
            audioFiles: [],
            subTasks: []
        })
    );

    const fullUpdateTask = (task: ITask) => {
        setTask(new Task(task));
    };

    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [sectionId, setSectionId] = useState<number | null>(null);
    const [topicId, setTopicId] = useState<number | null>(null);

    const scrollToBottom = () => {
        if (!containerRef.current) return;
        requestAnimationFrame(() => {
            if (containerRef.current) {
                containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
            }
        });
    };

    const scrollToTop = () => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }

    const fetchPendingTask = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        signal?: AbortSignal) => {
        
        if (!subjectId) {
            showAlert(400, "Przedmiot nie został znaleziony");
            return null;
        }

        if (!sectionId) {
            showAlert(400, "Rozdział nie został znaleziony");
            return null;
        }

        if (!topicId) {
            showAlert(400, "Temat nie został znaleziony");
            return null;
        }

        const controller = new AbortController();
        if (!signal) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller.signal;

        try {
            const response = await api.get(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/pending`,
                { signal: activeSignal }
            );

            if (activeSignal.aborted) return null;

            if (response.data?.statusCode === 200) {
                return response.data.task ?? null;
            }

            return null;
        } catch (error) {
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
        
        if (!subjectId) {
            showAlert(400, "Przedmiot nie został znaleziony");
            return null;
        }

        if (!sectionId) {
            showAlert(400, "Rozdział nie został znaleziony");
            return null;
        }

        if (!topicId) {
            showAlert(400, "Temat nie został znaleziony");
            return null;
        }

        if (!taskId) {
            showAlert(400, "Zadanie nie zostało znalezione");
            return null;
        }

        const controller = new AbortController();
        if (!signal) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller.signal;

        try {
            const response = await api.get(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}`,
                { signal: activeSignal }
            );

            if (activeSignal.aborted) return null;

            if (response.data?.statusCode === 200) {
                return response.data.task;
            }

            return null;
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") return null;
            handleApiError(error);
            return null;
        } finally {
            if (!signal) controllersRef.current = controllersRef.current.filter(c => c !== controller);
        }
    }, []);

    const handleTextGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, signal?: AbortSignal) => {
            setTextLoading("Generowanie treści zadania");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let text = "";
                let note = "";
                let errors: string[] = [];
                let outputSubtopics: string[] = [];
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { text: "", outputSubtopics: [] };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-generate`,
                        { changed, errors, attempt, text, note, outputSubtopics },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { text: "", note: "", outputSubtopics: [] };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        note = response.data.note;
                        outputSubtopics = response.data.outputSubtopics;
                        attempt = response.data.attempt;
                        console.log(`Generowanie treści zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować treści zadania");
                        break;
                    }
                }

                return { text, note, outputSubtopics };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { text: "", note: "", outputSubtopics: [] };
                handleApiError(error);
                return { text: "", note: "", outputSubtopics: [] };
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleSolutionGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, text: string, signal?: AbortSignal) => {
            setTextLoading("Generowanie rozwiązania zadania");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let solution = "";
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return "";

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/solution-generate`,
                        { changed, errors, attempt, text, solution },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return "";

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        solution = response.data.solution;
                        attempt = response.data.attempt;
                        console.log(`Generowanie rozwiązania zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować rozwiązania zadania");
                        break;
                    }
                }

                return solution;
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return "";
                handleApiError(error);
                return "";
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleOptionsGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, text: string, solution: string, signal?: AbortSignal) => {
            setTextLoading("Generowanie wariantów zadania");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let options: string[] = [];
                let explanations: string[] = [];
                let correctOptionIndex = 0;
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { options: [], explanations: [], correctOptionIndex: 0 };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/options-generate`,
                        { changed, errors, attempt, text, solution, options, explanations, correctOptionIndex },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { options: [], correctOptionIndex: 0 };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        solution = response.data.solution;
                        options = response.data.options;
                        explanations = response.data.explanations;
                        correctOptionIndex = response.data.correctOptionIndex;
                        attempt = response.data.attempt;
                        console.log(`Generowanie wariantów zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się wygenerować wariantów zadania");
                        break;
                    }
                }

                return { options, explanations, correctOptionIndex };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { options: [], explanations: [], correctOptionIndex: 0 };
                handleApiError(error);
                return { options: [], explanations: [], correctOptionIndex: 0 };
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
        note: string,
        solution: string,
        options: string[],
        explanations: string[],
        taskSubtopics: string[],
        correctOptionIndex: number,
        signal?: AbortSignal,
        id?: number
    ) => {
        try {
            const response = await api.post(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-transaction`,
                {
                    id,
                    stage,
                    text,
                    note,
                    solution,
                    options,
                    explanations,
                    correctOptionIndex,
                    taskSubtopics
                },
                { signal }
            );

            if (response.data?.statusCode === 200) {
                showAlert(200, "Zadanie zapisane pomyślnie");
            } else {
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
            subtopics: Subtopic[],
            solution: string,
            options: string[],
            correctOptionIndex: number,
            userSolution: string,
            userOptionIndex: number,
            signal?: AbortSignal
        ): Promise<{
            outputSubtopics: string[];
            explanation: string;
        }> => {
            setTextLoading("Obliczanie procentów podtematów");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let outputSubtopics: string[] = [];
                let explanation: string = "";
                const taskSubtopics = subtopics?.map(s => s.name) ?? [];
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { outputSubtopics: [], explanation: ""};

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/problems-generate`,
                        { changed, errors, attempt, text, solution, options, correctOptionIndex, userSolution, userOptionIndex, subtopics: taskSubtopics, outputSubtopics, explanation },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { outputSubtopics: [], explanation: ""};

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        outputSubtopics = response.data.outputSubtopics;
                        explanation = response.data.explanation;
                        attempt = response.data.attempt;
                        console.log(`Obliczanie procentów podtematów: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się obliczyć procentów podtematów");
                        break;
                    }
                }

                return { outputSubtopics, explanation };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { outputSubtopics: [], explanation: ""};
                handleApiError(error);
                return { outputSubtopics: [], explanation: "" }
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleTaskUserSolutionSave = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        userSolution: string,
        userOptionIndex: number,
        signal?: AbortSignal
    ) => {
        try {
            setTextLoading("Zapisywanie rozwiązania");

            const taskUserSolutionResponse = await api.put(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/user-solution`,
            {
                userSolution,
                userOptionIndex
            },
            { signal }
            );

            if (taskUserSolutionResponse.data?.statusCode !== 200) {
                setLoading(false);
                showAlert(400, `Nie udało się zapisać odpowiedź`);
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
    }, []);

    const handleSaveSubtopicsProgressTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        id: number,
        subtopics: Subtopic[],
        explanation: string,
        signal?: AbortSignal
    ) => {
        try {
            const response = await api.post(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${id}/subtopicsProgress-transaction`,
                {
                    subtopics,
                    explanation
                },
                { signal }
            );

            if (response.data?.statusCode === 200) {
                showAlert(200, "Podtematy zostały zapisane pomyślnie");
            } else {
                setLoading(false);
                showAlert(400, "Nie udało się zapisać podtematy zadania");
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
    }, []);

    function handleApiError(error: unknown) {
        if (axios.isAxiosError(error)) {
            if (error.code === "ERR_CANCELED") return;

            if (error.response) {
                showAlert(error.response.status, error.response.data?.message || "Server error");
            } else {
                showAlert(500, `Server error: ${error.message}`);
            }
        } else if (error instanceof DOMException && error.name === "AbortError") {
            return;
        } else if (error instanceof Error) {
            showAlert(500, `Server error: ${error.message}`);
        } else {
            showAlert(500, "Unknown error");
        }
    }

    const loadTask = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        stage: number,
        signal?: AbortSignal
    ) => {
        try {
            let note: string = "";
            let text: string = "";
            let taskSubtopics: string[] = [];

            if (stage < 1) {
                const taskResult = await handleTextGenerate(subjectId, sectionId, topicId, signal);
                text = taskResult?.text ?? "";
                taskSubtopics = taskResult?.outputSubtopics ?? [];
                note = taskResult?.note ?? "";

                if (!text || !note) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować treści zadania");
                    return;
                }

                stage = 1;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, note, "", [], [], taskSubtopics, 0, signal);
            }

            let newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                return;
            }

            const taskId = newTask.id;

            localStorage.setItem("taskId", taskId);

            text = newTask.text ?? "";
            taskSubtopics = newTask.subtopics?.map((sub: Subtopic) => sub.name) ?? [];

            if (stage < 2) {
                const solution = await handleSolutionGenerate(subjectId, sectionId, topicId, text, signal);

                if (!solution) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować rozwiązania");
                    return;
                }

                stage = 2;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, note, solution, [], [], taskSubtopics, 0, signal, taskId);
            }

            newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                return;
            }

            text = newTask.text ?? "";
            const solution = newTask.solution ?? "";

            if (stage < 3) {
                const optionsResult = await handleOptionsGenerate(subjectId, sectionId, topicId, text, solution, signal);
                const options = optionsResult.options ?? [];
                const explanations = optionsResult.explanations ?? [];
                const correctOptionIndex = optionsResult.correctOptionIndex ?? 0;

                if (!options.length || options.length != 4) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować wariantów odpowiedzi");
                    return;
                }

                stage = 3;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, note, solution, options, explanations, taskSubtopics, correctOptionIndex, signal, taskId);
            }
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        }
    }, [handleTextGenerate, handleSolutionGenerate, handleOptionsGenerate, handleSaveTaskTransaction]);

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
                setTextLoading("Pobieranie zadania");

                let task = await fetchPendingTask(subjectId, sectionId, topicId, signal);
                if (signal.aborted) return;

                const stage = task?.stage ?? 0;

                const taskId: number = Number(localStorage.getItem("taskId"));

                if (task && task.id)
                    localStorage.setItem("taskId", task.id);

                if (!task && taskId) {
                    task = await fetchTaskById(
                        subjectId,
                        sectionId,
                        topicId,
                        taskId,
                        signal
                    );

                    if (signal.aborted) return;

                    setUserOptionIndex(task.userOptionIndex ?? 0);

                    fullUpdateTask(task);

                    setLoading(false);
                    return;
                }

                if (!task || stage < 3) {
                    await loadTask(subjectId, sectionId, topicId, stage, signal);
                    if (signal.aborted) return;
                }

                task = await fetchPendingTask(subjectId, sectionId, topicId, signal);
                if (signal.aborted) return;

                if (!task) {
                    showAlert(400, "Nie udało się pobrać zadania");
                    setLoading(false);
                    return;
                }

                if (task.answered && !task.finished) {
                    setUserOptionIndex(task.userOptionIndex ?? 0);

                    fullUpdateTask(task);

                    const data = await handleProblemsGenerate(
                        subjectId ?? 0,
                        sectionId ?? 0,
                        topicId ?? 0,
                        task.text ?? "",
                        task.subtopics ?? [],
                        task.solution ?? "",
                        task.options ?? [],
                        task.correctOptionIndex ?? 0,
                        task.userSolution ?? "",
                        task.userOptionIndex ?? 0,
                        signal
                    );

                    if (signal.aborted || !data) return;

                    const outputSubtopics: Subtopic[] = subtractPercents(
                        task.subtopics ?? [],
                        data.outputSubtopics.map(([name, percent]) => ({ name, percent: Number(percent) })) ?? []
                    );

                    const explanation = data.explanation ?? "";

                    await handleSaveSubtopicsProgressTransaction(
                        subjectId ?? 0,
                        sectionId ?? 0,
                        topicId ?? 0,
                        task.id ?? 0,
                        outputSubtopics,
                        explanation
                    );

                    if (signal.aborted) return;

                    task = await fetchTaskById(subjectId, sectionId, topicId, task.id, signal);
                }
                
                fullUpdateTask(task);

                setLoading(false);
            } catch (error) {
                if ((error as DOMException)?.name === "AbortError") return;
                setLoading(false);
                handleApiError(error);
            } finally {
                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                setLoading(false);
            }
        };

        fetchAndLoadTask();

        return () => {
            controller.abort();
            controllerRef.current = null;
        };
    }, [subjectId, sectionId, topicId]);

    const adjustTextareaRows = (value: string) => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.value = value;
            textarea.rows = 1;
            const fontSize = 20;
            const lineHeight = fontSize * 1.4;
            const lines = Math.ceil(textarea.scrollHeight / lineHeight);
            textarea.rows = lines;
        }
    };

    useEffect(() => {
        setInsertPosition(InsertPosition.None);
        setMsgVisible(false);

        setMainHeight();

        const handleResize = () => {
            setMainHeight();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    useEffect(() => {
        const savedAnswer = localStorage.getItem("answerText");

        if (savedAnswer) {
            setTextValue(savedAnswer);
            adjustTextareaRows(savedAnswer);
            splitIntoSentences(savedAnswer)
                .then(sentences => setSentences(sentences))
                .catch(() => setSentences([]));
            setSelectedSentences([0]);
        }
    }, []);

    const firstLoadRef = useRef(true);

    useEffect(() => {
        if (!containerRef.current) return;

        if (firstLoadRef.current && !loading) {
            firstLoadRef.current = false;
            return;
        }

        if (loading) return;

        if (transcribeLoading) {
            scrollToBottom();
        } else {
            scrollToTop();
        }
    }, [sentences, transcribes, loading, transcribeLoading]);

    const splitIntoSentences = async (text: string): Promise<string[]> => {
        try {
            const response = await api.post("/options/split-into-sentences", { 
                text,
                language: "pl"
            });

            if (response.status !== 201) {
                showAlert(400, `Nie udało się podzielić tekstu na zdania`);
                return [];
            }

            const sentences = response.data?.sentences;

            if (Array.isArray(sentences) && sentences.every(item => typeof item === 'string')) {
                return sentences;
            }

            return [];
        } catch {
            showAlert(400, `Nie udało się podzielić tekstu na zdania`);
            return [];
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setTextValue(newValue);
        localStorage.setItem("answerText", newValue);
        adjustTextareaRows(newValue);
    };

    const handleBackClick = () => {
        localStorage.removeItem("answerText");
        localStorage.removeItem("taskId");

        router.back();
    };

    const toggleInputMode = () => {
        setIsMicMode(prev => !prev);
    };

    useEffect(() => {
        const savedAnswer = localStorage.getItem("answerText") || "";

        if (!isMicMode) {
            textareaRef.current?.focus({ preventScroll: true });
            setTextValue(savedAnswer);
            adjustTextareaRows(savedAnswer);
        }
        else {
            splitIntoSentences(savedAnswer)
                .then(sentences => setSentences(sentences))
                .catch(() => setSentences([]));
            setSelectedSentences([0]);
        }
    }, [isMicMode]);

    useEffect(() => {
        scrollToBottom();
    }, [sentences, textValue]);

    const handleSentenceSelect = (id: number) => {
        setSelectedSentences(prev => {
            if (prev.length === 0) return [id];
            const min = Math.min(...prev);
            const max = Math.max(...prev);
            if (id === min - 1 || id === max + 1) return [...prev, id].sort((a, b) => a - b);
            return [id];
        });
    };

    const handleSentenceDeselect = (id: number) => {
        setSelectedSentences(prev => {
            if (!prev.includes(id)) return prev;
            if (prev.length === 1) return [];
            const min = Math.min(...prev);
            const max = Math.max(...prev);
            if (id === min || id === max) return prev.filter(item => item !== id);
            return [id];
        });
    };

    const fetchAudioTranscribe = useCallback(async (part_id: number, file: File, subjectId?: number) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('part_id', part_id.toString());
            formData.append('language', "pl");

            const response = await api.post(`/options/${subjectId}/audio-transcribe`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data?.statusCode === 201) {
                return response.data.transcription;
            }

            return null;
        } catch (error) {
            console.error(`Błąd serwera podczas transkrypcji audio:`, error);
            return null;
        }
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                setTranscribeLoading(true);

                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], 'recorded.webm', { type: 'audio/webm' });

                const MAX_FILE_SIZE = 10 * 1024 * 1024;
                const totalSize = audioFile.size;
                let start = 0;
                let partId = 1;

                const subjectId = parseInt(localStorage.getItem("subjectId") || "") || undefined;
                const newTranscribes: string[] = [];
                const errors: string[] = [];

                while (start < totalSize) {
                    const end = Math.min(start + MAX_FILE_SIZE, totalSize);
                    const chunk = audioFile.slice(start, end);
                    const chunkFile = new File([chunk], `part_${partId}.webm`, { type: 'audio/webm' });

                    const transcription = await fetchAudioTranscribe(partId, chunkFile, subjectId);

                    if (transcription) {
                        newTranscribes.push(transcription);
                    } else {
                        errors.push(`Nie udało się zrobić transkrypcji części ${partId}`);
                    }

                    start = end;
                    partId += 1;
                }

                const newSentences = await splitIntoSentences(newTranscribes.join(" "));

                if (insertPosition === InsertPosition.None) {
                    const newTextValue = newSentences.join(" ");
                    setTranscribes(prev => [...prev, ...newTranscribes]);
                    setTextValue(newTextValue);
                    setSentences(newSentences);
                    setSelectedSentences(newSentences.map((_, i) => i)); // выделяем все вставленные
                    localStorage.setItem("answerText", newTextValue);
                }
                else if (insertPosition === InsertPosition.Przed) {
                    const minIndex = Math.min(...selectedSentences);
                    const updatedSentences = [...sentences];
                    updatedSentences.splice(minIndex, 0, ...newSentences);
                    const newTextValue = updatedSentences.join(" ");
                    setSentences(updatedSentences);
                    setTextValue(newTextValue);
                    setSelectedSentences(newSentences.map((_, i) => minIndex + i));
                    localStorage.setItem("answerText", newTextValue);
                }
                else if (insertPosition === InsertPosition.Zamiast) {
                    const minIndex = Math.min(...selectedSentences);
                    const maxIndex = Math.max(...selectedSentences);
                    const updatedSentences = [...sentences];
                    updatedSentences.splice(minIndex, maxIndex - minIndex + 1, ...newSentences);
                    const newTextValue = updatedSentences.join(" ");
                    setSentences(updatedSentences);
                    setTextValue(newTextValue);
                    setSelectedSentences(newSentences.map((_, i) => minIndex + i));
                    localStorage.setItem("answerText", newTextValue);
                }
                else if (insertPosition === InsertPosition.Po) {
                    const maxIndex = Math.max(...selectedSentences);
                    const updatedSentences = [...sentences];
                    updatedSentences.splice(maxIndex + 1, 0, ...newSentences);
                    const newTextValue = updatedSentences.join(" ");
                    setSentences(updatedSentences);
                    setTextValue(newTextValue);
                    setSelectedSentences(newSentences.map((_, i) => maxIndex + 1 + i));
                    localStorage.setItem("answerText", newTextValue);
                }

                setIsPlaying(prev => !prev);
                setTranscribeLoading(false);

                if (errors.length !== 0) 
                    showAlert(500, errors.join("\n"));
                else
                    showAlert(200, "Przetwarzanie audio na tekst udane");
            };

            recorder.start();
            setMediaRecorder(recorder);
        } catch (error) {
            console.error("Błąd podczas dostępu do mikrofonu:", error);
            showAlert(400, "Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia i spróbuj ponownie.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setMediaRecorder(null);
        }
    };

    const togglePlayPause = () => {
        if (!isMicMode) {
            toggleInputMode();
            return;
        }

        if (!isPlaying) {
            if (sentences.length !== 0) {
                if (selectedSentences.length === 0) {
                    setSelectedSentencesWasEmpty(true);

                    try {
                        for (let i = 0; i < sentences.length; i++)
                            selectedSentences.push(i);
                    }
                    catch {}
                }

                setInsertPosition(InsertPosition.Po);
                setMsgVisible(true);
            }
            else {
                setInsertPosition(InsertPosition.None);
                setIsPlaying(prev => !prev);
                startRecording();
            }
        }
        else {
            stopRecording();
        }
    };

    const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInsertPosition(e.target.value as InsertPosition);
    };

    const handleDeleteText = () => {
        if (isMicMode) {
            const newSentences = sentences.filter((_, index) => !selectedSentences.includes(index));
            const newTextValue = newSentences.join(" ");

            setTranscribes([]);

            if (newSentences.length !== 0) {
                setTextValue(newTextValue);
                localStorage.setItem("answerText", newTextValue);
                setSentences(newSentences);
                setSelectedSentences([]);
            }
            else {
                setTextValue("");
                localStorage.setItem("answerText", "");
                setSentences([]);
                setSelectedSentences([]);
            }
        }
        else {
            setTextValue("");
            setSentences([]);
            setSelectedSentences([]);
            setTranscribes([]);
            localStorage.setItem("answerText", "");
        }
    }

    function subtractPercents(subtopics: Subtopic[], outputSubtopics: Subtopic[]): Subtopic[] {
        const outputMap = new Map<string, number>(
            outputSubtopics.map(item => [item.name, item.percent])
        );

        console.log(userOptionIndex);

        const bonus = userOptionIndex === task.getTask().correctOptionIndex ? 25 : 0;

        return subtopics.map(item => {
            const subtractValue = outputMap.get(item.name) || 0;
            return {
                name: item.name,
                percent: (100 - subtractValue) * 0.75 + bonus
            };
        });
    }

    function isEmptyString(str: string): boolean {
        return /^\s*$/.test(str);
    }

    const handleSubmitTaskClick = useCallback(async () => {
        if (isEmptyString(textValue)) {
            showAlert(400, "Odpowiedź nie może być pusta");
            return;
        }

        if (controllerRef.current) {
            controllerRef.current.abort();
        }

        const controller = new AbortController();
        controllerRef.current = controller;
        controllersRef.current.push(controller);
        const signal = controller.signal;

        if (!task?.getTask().answered) {
            setLoading(true);
            try {
                localStorage.removeItem("answerText");
                setTextValue("");
                setSentences([]);
                setSelectedSentences([]);
                setTranscribes([]);

                await handleTaskUserSolutionSave(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    task?.getTask().id ?? 0,
                    textValue,
                    userOptionIndex ?? 0,
                    signal
                );

                if (signal.aborted) return;

                let newTask: ITask = await fetchPendingTask(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    signal
                );
                if (signal.aborted || !newTask) return showAlert(400, "Nie udało się pobrać zadania");

                fullUpdateTask(newTask);

                const data = await handleProblemsGenerate(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    newTask.text ?? "",
                    newTask.subtopics ?? [],
                    newTask.solution ?? "",
                    newTask.options ?? [],
                    newTask.correctOptionIndex ?? 0,
                    newTask.userSolution ?? "",
                    newTask.userOptionIndex ?? 0,
                    signal
                );

                if (signal.aborted || !data) return;

                const outputSubtopics: Subtopic[] = subtractPercents(
                    newTask.subtopics ?? [],
                    data.outputSubtopics.map(([name, percent]) => ({ name, percent: Number(percent) })) ?? []
                );

                const explanation = data.explanation ?? "";

                await handleSaveSubtopicsProgressTransaction(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    newTask.id ?? 0,
                    outputSubtopics,
                    explanation,
                    signal
                );

                if (signal.aborted) return;

                newTask = await fetchTaskById(
                    subjectId ?? 0,
                    sectionId ?? 0,
                    topicId ?? 0,
                    newTask.id,
                    signal
                );

                fullUpdateTask(newTask);
            }
            catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return;
                handleApiError(error);
            }
            finally {
                if (!signal.aborted) setLoading(false);
                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                controllerRef.current = null;
            }
        }
    }, [task, textValue, userOptionIndex, subjectId, sectionId, topicId]);

    const shuffledOptions = useMemo(() => {
        const optionsWithIndex = (task?.getTask().options ?? []).map((option, i) => ({
            option,
            originalIndex: i
        }));

        for (let i = optionsWithIndex.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
        }

        return optionsWithIndex;
    }, [task?.getTask().options]); 

    useEffect(() => {
        if (shuffledOptions.length > 0 && userOptionIndex === null) {
            setUserOptionIndex(shuffledOptions[0].originalIndex);
        }
    }, [shuffledOptions, userOptionIndex]);

    const handleDeleteTask = useCallback(async() => {
        try {
            const response = await api.delete(`/subjects/${subjectId}/tasks/${task?.getTask().id}`);

            setLoading(false);
            if (response.data?.statusCode === 200) {
                showAlert(response.data.statusCode, response.data.message);
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
        finally {
            setLoading(false);
            setTextLoading("");
            setMsgDeleteVisible(false);
        }
    }, [subjectId, task?.getTask().id]);

    return (
        <>
            <Header>
                <div className="menu-icons">
                    <div className="menu-icon" title="Słownik" onClick={(e) => {
                        e.stopPropagation();
                        setMsgDeleteTaskVisible(true);
                    }} style={{ cursor: "pointer" }}>
                        <Trash2 size={28} color="white" />
                    </div>
                    <div className="menu-icon" title="Wróć" onClick={handleBackClick} style={{ cursor: "pointer" }}>
                        <ArrowLeft size={28} color="white" />
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
                        setTextLoading("Trwa usuwanie zadania");
                        setLoading(true);
                        if (task?.getTask().id) {
                            handleDeleteTask().then(() => {
                                setTimeout(() => {
                                    handleBackClick();
                                }, 2000);
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
                <Message
                    message={
                        isMicMode ?
                        "Czy na pewno chcesz usunąć wybrany fragment tekstu?" :
                        "Czy na pewno chcesz usunąć cały tekst?"
                    }
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={() => {
                        handleDeleteText();
                        setMsgDeleteVisible(false);
                        setSelectedSentences([]);
                    }}
                    onClose={() => {
                        setMsgDeleteVisible(false);
                        if (selectedSentencesWasEmpty) {
                            setSelectedSentencesWasEmpty(false);
                            setSelectedSentences([]);
                        }
                    }}
                    visible={msgDeleteVisible}
                />
                <RadioMessage 
                    message={`Gdzie chcesz wstawić nowy fragment audio?`}
                    textConfirm="Zatwierdź"
                    textCancel="Anuluj"
                    onConfirm={() => {
                        setMsgVisible(false);
                        setIsPlaying(prev => !prev);
                        startRecording();
                    }}
                    onClose={() => {
                        setMsgVisible(false);
                        setInsertPosition(InsertPosition.None);
                        if (selectedSentencesWasEmpty) {
                            setSelectedSentencesWasEmpty(false);
                            setSelectedSentences([]);
                        }
                    }}
                    visible={msgVisible}
                    btnsWidth="140px"
                >
                <div className="radio-group">
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="insertPosition"
                            value={InsertPosition.Przed}
                            checked={insertPosition === InsertPosition.Przed}
                            onChange={handlePositionChange}
                        />
                        <span>{InsertPosition.Przed}</span>
                    </label>

                    <label className="radio-option">
                        <input
                            type="radio"
                            name="insertPosition"
                            value={InsertPosition.Zamiast}
                            checked={insertPosition === InsertPosition.Zamiast}
                            onChange={handlePositionChange}
                        />
                        <span>{InsertPosition.Zamiast}</span>
                    </label>

                    <label className="radio-option">
                        <input
                            type="radio"
                            name="insertPosition"
                            value={InsertPosition.Po}
                            checked={insertPosition === InsertPosition.Po}
                            onChange={handlePositionChange}
                        />
                        <span>{InsertPosition.Po}</span>
                    </label>
                    </div>
                </RadioMessage>

                {(loading || transcribeLoading) ? (
                    <div className="spinner-wrapper">
                        <Spinner visible={true} text={transcribeLoading ? "Przetwarzanie audio na tekst..." : textLoading} />
                    </div>
                ) : (
                    <div className="play-container" ref={containerRef}>
                        <div className="chat">
                            {task.getTask().finished ? (<div className={`message human ${task.getTask().status}`}>
                                <div className="text-title" style={{fontWeight: "bold", }}>Ocena:</div>
                                <div style={{paddingLeft: "20px", marginTop: "8px"}}>
                                    {task?.getTask().subtopics.map((subtopic: Subtopic, index: number) => (
                                        <div key={index}>
                                            <FormatText content={`${subtopic.name}: <strong>${subtopic.percent}%</strong>`} />
                                        </div>
                                    ))}
                                </div>
                            </div>) : null}
                            <div className="message robot">
                                <div className="text-title">Notatka:</div>
                                <div style={{paddingLeft: "20px", marginTop: "8px"}}><FormatText content={task?.getTask().note ?? ""} /></div>
                            </div>
                            <div className="message robot">
                                <div className="text-title">Tekst zadania:</div>
                                <div style={{paddingLeft: "20px", marginTop: "8px"}}><FormatText content={task?.getTask().text ?? ""} /></div>
                            </div>
                            <div className="message human">
                                <div className="text-title">Warianty odpowiedzi:</div>
                                <div style={{ margin: "12px"}} className="radio-group">
                                    {shuffledOptions.map(({ option, originalIndex }) => (
                                        <div key={originalIndex}>
                                            <label className={`radio-option ${task.getTask().finished ? "finished" : ""} ${originalIndex === task.getTask().correctOptionIndex ? "correct" : ""}`} style={{marginBottom: "12px"}}>
                                                <input
                                                    type="radio"
                                                    name="userOption"
                                                    value={originalIndex}
                                                    checked={userOptionIndex === originalIndex}
                                                    onChange={() => setUserOptionIndex(originalIndex)}
                                                    disabled={task.getTask().finished}
                                                    style={{
                                                        marginTop: "0.75px"
                                                    }}
                                                />
                                                <span><FormatText content={option ?? ""} /></span>
                                            </label>

                                            {task.getTask().finished ? (
                                                <div style={{ marginLeft: "32px" }}>
                                                <div className="text-title">Wyjaśnienie:</div>
                                                <div>
                                                    <span><FormatText content={task.getTask().explanations[originalIndex] ?? ""} /></span>
                                                </div>
                                                <br />
                                            </div>) : null}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-title">
                                    {task.getTask().finished ? "Moje rozwiązanie:" : "Rozwiązanie:"}
                                </div>
                                {!isMicMode ? (
                                    !task.getTask().finished ? (
                                    <textarea
                                        ref={textareaRef}
                                        placeholder="Wpisz rozwiązanie..."
                                        onInput={handleInput}
                                        className="answer-block"
                                        value={textValue}
                                        rows={1}
                                        name="userSolution"
                                        id="userSolution"
                                    />) : (
                                         <div className="answer-block readonly">
                                            {task.getTask().userSolution || ""}
                                        </div>
                                    )
                                ) : (
                                    !task.getTask().finished ? (
                                    <div className="sentences" style={{ marginTop: "8px" }}>
                                    {sentences.length > 0 ? (
                                        sentences.map((sentence, i) => {
                                        const isSelected = selectedSentences.includes(i);
                                        const handleClick = () => {
                                            if (isSelected) handleSentenceDeselect(i);
                                            else handleSentenceSelect(i);
                                        };
                                        return (
                                            <span
                                                key={i}
                                                className={`sentence ${isSelected ? 'active' : ''}`}
                                                onClick={handleClick}
                                                >
                                                {sentence}
                                            </span>
                                        );
                                        })
                                    ) : (
                                        <textarea placeholder="Powiedz rozwiązanie" rows={1} readOnly />
                                    )}
                                    </div>) : (
                                        <div className="answer-block readonly">
                                            {task.getTask().userSolution || ""}
                                        </div>
                                    )
                                )}
                                {!task.getTask().finished ? (<div className="options">
                                    <button
                                        className={isMicMode
                                            ? `btnOption ${isPlaying ? 'darkgreen' : ''}`
                                            : 'btnOption disabled'}
                                        title={isPlaying ? "Pauza" : "Start"}
                                        onClick={togglePlayPause}
                                    >
                                        <Mic size={28} color="white" />
                                    </button>
                                    <button
                                        className={isMicMode ? `btnOption disabled` : `btnOption`}
                                        title={isMicMode ? "Mikrofon (włączony)" : "Wpisz tekst"}
                                        onClick={toggleInputMode}
                                    >
                                        <Type size={28} color="white" />
                                    </button>
                                    <div style={{
                                        display: "flex",
                                        gap: "6px",
                                        marginLeft: "auto"
                                    }}>
                                        <button
                                            className="btnOption"
                                            title={"Wysłać Odpowiedź"}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleSubmitTaskClick();
                                            }}
                                        >
                                            <Check size={28} color="white" />
                                        </button>
                                        <button
                                            className="btnOption"
                                            title="Usuń"
                                            style={{
                                                cursor: "pointer"
                                            }}
                                            onClick={() => {
                                                if (isMicMode) {
                                                    if (sentences.length !== 0 && selectedSentences.length === 0) {
                                                        setSelectedSentencesWasEmpty(true);
                                                        const allIndexes = sentences.map((_, index) => index);
                                                        setSelectedSentences(allIndexes);
                                                    }
                                                }

                                                setMsgDeleteVisible(true);
                                            }}
                                        >
                                            <X size={28} color="white" />
                                        </button>
                                    </div>
                                </div>) : null}
                            </div>
                            {task?.getTask().finished && (
                            <>
                                <div className="message robot">
                                    <div className="text-title">Prawidłowe rozwiązanie:</div>
                                    <div style={{paddingLeft: "20px", marginTop: "8px"}}>
                                        <FormatText content={task?.getTask().solution} />
                                    </div>
                                </div>
                                <div className="message robot">
                                    <div className="text-title">Wyjaśnienie rozwiązania:</div>
                                    <div style={{paddingLeft: "20px", marginTop: "8px"}}><FormatText content={task?.getTask().explanation ?? ""} /></div>
                                </div>
                            </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}