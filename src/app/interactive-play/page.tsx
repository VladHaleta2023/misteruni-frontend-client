'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Plus, Text, Type, Trash2 } from 'lucide-react';
import "@/app/styles/play.css";
import "@/app/styles/message.css";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import { ITask } from "../scripts/task";
import api from "@/app/utils/api";
import axios from "axios";
import FormatText from "../components/formatText";
import React from "react";
import { setMainHeight } from "../scripts/mainHeight";
import Message from "../components/message";
import RadioMessageOK from "../components/radioMessageOK";

enum PlayBackRateOption {
    Normal = 'Normal',
    Slow = 'Slow',
}

export default function InteractivePlayPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [textLoading, setTextLoading] = useState<string>("");

    const [isPlaying, setIsPlaying] = useState(false);

    const [playBackRateOption, setPlayBackRateOption] = useState<PlayBackRateOption>(PlayBackRateOption.Normal);

    const [msgVisible, setMsgVisible] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [sentences, setSentences] = useState<string[]>([]);
    const [isOriginal, setIsOriginal] = useState<boolean>(true);
    const [isSentences, setIsSentences] = useState<boolean>(true);
    const [userOptionIndices, setUserOptionIndices] = useState<number[]>([]);
    const [words, setWords] = useState<string[]>([]);

    const [task, setTask] = useState<ITask>({
            id: 0,
            stage: 0,
            text: "",
            note: "",
            topicNote: "",
            explanation: "",
            percent: 0,
            status: "started",
            solution: "",
            options: [],
            explanations: [],
            subtopics: [],
            answered: false,
            finished: false,
            userOptionIndex: 0,
            userSolution: "",
            subTasks: [],
            audioFiles: []
        }
    );
    
    const containerRef = useRef<HTMLDivElement>(null);

    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [sectionId, setSectionId] = useState<number | null>(null);
    const [topicId, setTopicId] = useState<number | null>(null);
    const [audioRepeat, setAudioRepeat] = useState<number>(0);

    const [selectedWords, setSelectedWords] = useState<number[]>([0]);

    const [progress, setProgress] = useState(0);
    const [durations, setDurations] = useState<number[]>([]);
    const [currentTimeFormatted, setCurrentTimeFormatted] = useState("0:00");
    const [totalTimeFormatted, setTotalTimeFormatted] = useState("0:00");

    const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);

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

    const handleInteractiveTextGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, signal?: AbortSignal) => {
            setTextLoading("Generowanie treści zadania");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let text = "";
                let translate = "";
                let errors: string[] = [];
                const MAX_ATTEMPTS = 1;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { text: "", translate: "" };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/interactive-task-generate`,
                        { changed, errors, attempt, text, translate },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { text: "", translate: "" };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        translate = response.data.translate;
                        attempt = response.data.attempt;
                        console.log(`Generowanie treści zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować treści zadania");
                        break;
                    }
                }

                return { text, translate };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { text: "", translate: "" };
                handleApiError(error);
                return { text: "", translate: "" };
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleQuestionsTaskGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, text: string, signal?: AbortSignal) => {
            setTextLoading("Generowanie pytań etapowych zadania");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let questions: string[] = [];
                let errors: string[] = [];
                const MAX_ATTEMPTS = 1;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return [];

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/questions-task-generate`,
                        { changed, errors, attempt, text, questions },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return [];

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        questions = response.data.questions;
                        attempt = response.data.attempt;
                        console.log(`Generowanie pytań etapowych zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować pytań etapowych zadania");
                        break;
                    }
                }

                return questions;
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return [];
                handleApiError(error);
                return [];
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleOptionsGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, text: string, solution: string, currentsubTaskIndex: number, allSubTasks: number, signal?: AbortSignal) => {
            setTextLoading(`Generowanie wariantów zadania pytania etapowego ${currentsubTaskIndex}/${allSubTasks}`);

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let options: string[] = [];
                let explanations: string[] = [];
                const MAX_ATTEMPTS = 1;
                const random1: number = Math.floor(Math.random() * 4);
                const random2 = 3 - random1;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { options: [], explanations: [] };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/options-generate`,
                        { changed, errors, attempt, subtopics: [], text, solution, options, explanations, random1, random2 },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { options: [], explanations: [] };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        solution = response.data.solution;
                        options = response.data.options;
                        explanations = response.data.explanations;
                        attempt = response.data.attempt;
                        console.log(`Generowanie wariantów zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się wygenerować wariantów zadania");
                        break;
                    }
                }

                return { options, explanations };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { options: [], explanations: [] };
                handleApiError(error);
                return { options: [], explanations: [] };
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
        explanations: string[],
        taskSubtopics: string[],
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
                    solution,
                    options,
                    explanations,
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

    const handleSaveSubTasksTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        tasks: {
            stage: number,
            text: string,
            solution: string,
            options: string[],
            explanations: string[],
            taskSubtopics: string[],
            correctOptionIndex: number,
            id?: number
        }[],
        text: string,
        solution: string,
        signal?: AbortSignal
    ) => {
        try {
            const response = await api.post(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/questions-task-transaction`,
                {
                    tasks
                },
                { signal }
            );

            if (response.data?.statusCode === 200) {
                await handleSaveTaskTransaction(
                    subjectId,
                    sectionId,
                    topicId,
                    2,
                    text,
                    solution,
                    [],
                    [],
                    [],
                    signal,
                    taskId
                );
                showAlert(200, "Pytania etapowe zapisane pomyślnie");
            } else {
                setLoading(false);
                showAlert(400, "Nie udało się zapisać pytań etapowych");
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
    }, []);

    const handleSaveAudioTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        text: string,
        stage: number,
        language: string,
        signal?: AbortSignal
    ) => {
        try {
            setTextLoading("Generowanie audio zadania");

            const response = await api.post(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/audio-transaction`,
                {
                    text,
                    stage,
                    language
                },
                { signal }
            );

            if (response.data?.statusCode === 200) {
                showAlert(200, "Audio zapisane pomyślnie");
            } else {
                setLoading(false);
                showAlert(400, "Nie udało się zapisać audio");
            }
        }
        catch (error: unknown) {
            setLoading(false);
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
            let translate: string = "";
            let questions: string[] = [];

            if (stage < 1) {
                const taskResult = await handleInteractiveTextGenerate(subjectId, sectionId, topicId, signal);
                text = taskResult?.text ?? "";
                translate = taskResult?.translate ?? "";

                if (!text) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować treści zadania");
                    return;
                }

                stage = 1;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, translate, [], [], [], signal);
            }

            let newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            
            if (!newTask) {
                return;
            }

            const taskId = newTask.id;
            localStorage.setItem("taskId", taskId);
            text = newTask.text ?? "";
            translate = newTask.solution ?? "";

            if (stage < 2) {
                questions = await handleQuestionsTaskGenerate(subjectId, sectionId, topicId, text, signal);
                
                if (!questions) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować pytań etapowych zadania");
                    return;
                }

                stage = 2;

                const tasks = questions.map((text) => ({
                    text,
                    stage,
                    solution: text,
                    taskSubtopics: [],
                    options: [],
                    explanations: [],
                    correctOptionIndex: 0
                }));

                await handleSaveSubTasksTransaction(subjectId, sectionId, topicId, taskId, tasks, text, translate, signal);
            }

            newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                return;
            }

            text = newTask.text ?? "";
            translate = newTask.solution ?? "";
            const subTasks = newTask.subTasks ?? [];

            if (stage < 3) {
                for (let i = 0; i < subTasks.length; i++) {
                    if (subTasks[i].stage < 3) {
                        const optionsResult = await handleOptionsGenerate(subjectId, sectionId, topicId, subTasks[i].text, text, i + 1, subTasks.length, signal);
                        const options = optionsResult.options ?? [];
                        const explanations = optionsResult.explanations ?? [];

                        if (!options.length || options.length != 4) {
                            setLoading(false);
                            showAlert(400, "Nie udało się wygenerować wariantów odpowiedzi");
                            return;
                        }

                        subTasks[i].options = options;
                        subTasks[i].explanations = explanations;
                        subTasks[i].stage = 3;
                        
                        await handleSaveSubTasksTransaction(
                            subjectId,
                            sectionId,
                            topicId,
                            taskId,
                            subTasks,
                            text,
                            translate,
                            signal
                        );
                    }
                }

                await handleSaveTaskTransaction(
                    subjectId,
                    sectionId,
                    topicId,
                    3,
                    text,
                    translate,
                    [],
                    [],
                    [],
                    signal,
                    taskId
                );
            }

            if (stage < 4) {
                await handleSaveAudioTransaction(
                    subjectId,
                    sectionId,
                    topicId,
                    taskId,
                    text,
                    4,
                    "en",
                    signal
                );
            }
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        }
    }, [handleInteractiveTextGenerate, handleQuestionsTaskGenerate, handleOptionsGenerate, handleSaveTaskTransaction, handleSaveSubTasksTransaction]);

    const splitIntoSentences = async (text: string, language = "en"): Promise<string[]> => {
        try {
            const response = await api.post("/options/split-into-sentences", { 
                text,
                language
            });

            const sentences = response.data?.sentences;

            if (Array.isArray(sentences) && sentences.every(item => typeof item === 'string')) {
                return sentences;
            }

            return [];
        } catch {
            return [];
        }
    };

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

        const audioRepeatNum = Number(localStorage.getItem("audioRepeat"));

        if (audioRepeatNum)
            setAudioRepeat(audioRepeatNum);
        else {
            setAudioRepeat(0)
            localStorage.setItem("audioRepeat", String(0));
        }
    }, []);

    useEffect(() => {
        setMainHeight();

        const handleResize = () => {
            setMainHeight();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const controllerRef = useRef<AbortController | null>(null);
    const controllersRef = useRef<AbortController[]>([]);

    function extractWords(text: string): string[] {
        return text
            .match(/\p{L}+/gu) || []; 
    }

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

                    if (task) {
                        setTask(task);
                        setSentences(await splitIntoSentences(task.text));
                        setWords(extractWords(task.text));
                    } else {
                        showAlert(400, "Nie udało się pobrać zadania");
                    }

                    if (task.finished) {
                        setLoading(false);
                        return;
                    }
                }

                if (task && task.id && !localStorage.getItem("taskId"))
                    localStorage.setItem("taskId", task.id);

                if (!task || stage < 4) {
                    await loadTask(subjectId, sectionId, topicId, stage, signal);
                    if (signal.aborted) return;
                }

                task = await fetchPendingTask(subjectId, sectionId, topicId, signal);
                if (signal.aborted) return;

                if (task) {
                    setTask(task);
                    setSentences(await splitIntoSentences(task.text));
                    setWords(extractWords(task.text));
                } else {
                    showAlert(400, "Nie udało się pobrać zadania");
                }
                
                setLoading(false);
            } catch (error) {
                if ((error as DOMException)?.name === "AbortError") return;
                setSentences([]);
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

    const firstLoadRef = useRef(true);

    useEffect(() => {
        if (!containerRef.current) return;

        if (firstLoadRef.current && !loading) {
            firstLoadRef.current = false;
            return;
        }

        if (!loading)
            containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }, [loading]);

    const handleBackClick = () => {
        localStorage.removeItem("answerText");
        localStorage.removeItem("taskId");
        localStorage.removeItem("audioRepeat");

        router.back();
    };

    const handlePlayPause = () => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        setIsPlaying(prev => !prev);
    };

    const handleNext = () => {
        if (!task.audioFiles || task.audioFiles.length === 0) return;

        setCurrentIndex(prev => (prev + 1) % task.audioFiles.length);
    };

    const handlePrev = () => {
        if (!task.audioFiles || task.audioFiles.length === 0) return;

        setCurrentIndex(prev => (prev === 0 ? 0 : prev - 1));
    };

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const playAudio = async () => {
            try {
                if (isPlaying) {
                    audioEl.playbackRate = playBackRateOption === PlayBackRateOption.Normal ? 1 : 0.5;
                    await audioEl.play();
                } else {
                    audioEl.pause();
                }
            } catch (err) {
                console.log("Audio play blocked by browser", err);
            }
        };

        playAudio();
    }, [currentIndex, isPlaying]);

    const shuffledOptionsBySubTask = useMemo(() => {
        return (task?.subTasks ?? []).map(subTask => {
            const optionsWithIndex = (subTask.options ?? []).map((option, i) => ({
                option,
                originalIndex: i
            }));

            for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
            }

            return optionsWithIndex;
        });
    }, [task?.subTasks]);

    useEffect(() => {
        if (!task?.subTasks || !shuffledOptionsBySubTask) return;

        const initialIndices = task.subTasks.map((subTask, subTaskIndex) => {
            const shuffled = shuffledOptionsBySubTask[subTaskIndex];
            if (shuffled && shuffled.length > 0) {
                return shuffled[0].originalIndex;
            }
            return -1;
        });

        setUserOptionIndices(initialIndices);
    }, [task?.subTasks, shuffledOptionsBySubTask]);

    const handleSubmitTaskClick = useCallback(async () => {
        if (!subjectId || !sectionId || !topicId) return;

        setLoading(true);
        setTextLoading("Obliczanie procentów tematu");

        const controller = new AbortController();
        controllerRef.current = controller;
        controllersRef.current.push(controller);
        const signal = controller.signal;

        try {
            const result = await api.put(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${task.id}/percents`,
            {
                userOptions: userOptionIndices
            },
            { signal }
            );

            if (result.data?.statusCode !== 200) {
                setLoading(false);
                showAlert(400, `Nie udało się zapisać odpowiedź`);
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
        finally {
            const newTask = await fetchTaskById(subjectId, sectionId, topicId, task.id, signal);

            setTask(newTask);
            setSentences(await splitIntoSentences(newTask.text));
            setWords(extractWords(newTask.text));

            containerRef.current?.scrollTo({ top: 0, behavior: 'auto' });

            setLoading(false);
        }
    }, [subjectId, sectionId, topicId, task, userOptionIndices]);

    async function handleTranslateclick() {
        if (isOriginal) {
            setIsOriginal(false);
            setSentences(await splitIntoSentences(task.solution, "pl"));
        }
        else {
            setIsOriginal(true);
            setSentences(await splitIntoSentences(task.text));
        }
    }

    function handleTextOptionСlick() {
        setSelectedWords([0]);
        firstClickRef.current = true;

        if (isSentences)
            setIsSentences(false);
        else
            setIsSentences(true);
    }

    const handleAddWord = useCallback(async () => {
        const text = selectedWords.map(index => words[index]).join(" ");

        if (!text || text == "") {
            showAlert(400, "Nieprawidłowo wybrane słowy");
            return;
        }

        if (!subjectId || !sectionId || !topicId) return;

        setLoading(true);
        setTextLoading("Dodawanie słowa lub wyrazu do słownika");

        const controller = new AbortController();
        controllerRef.current = controller;
        controllersRef.current.push(controller);
        const signal = controller.signal;

        try {
            const result = await api.post(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${task.id}/words`,
            {
                text
            },
            { signal }
            );

            if (result.data?.statusCode === 200) {
                setLoading(false);
                showAlert(200, `Dodawanie słowa lub wyrazu udane`);
            }
            else {
                setLoading(false);
                showAlert(400, `Nie udało się dodać słowo lub wyraz`);
            }
        }
        catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        }
        finally {
            setSelectedWords([0]);
            setLoading(false);
        }
    }, [subjectId, sectionId, topicId, task, selectedWords, words]);

    const firstClickRef = useRef(true);

    const handleWordClick = (index: number) => {
        setSelectedWords(prev => {
            let newSelected = prev.includes(index)
            ? prev.filter(i => i !== index)
            : [...prev, index];

            if (firstClickRef.current) {
                if (index !== 0) {
                    newSelected = newSelected.filter(i => i !== 0);
                }
                firstClickRef.current = false;
            }

            return newSelected;
        });
    };

    useEffect(() => {
        const loadDurations = async () => {
            const promises = task.audioFiles.map(
                (src: string) =>
                new Promise<number>((resolve) => {
                    const audio = new Audio(src);
                    audio.onloadedmetadata = () => resolve(audio.duration);
                })
            );
            const results = await Promise.all(promises);
            setDurations(results);

            const total = results.reduce((sum, d) => sum + d, 0);
            setTotalTimeFormatted(formatTime(total));
        };

        loadDurations();
    }, [task.audioFiles]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!audioRef.current) return;
            const currentTime = audioRef.current.currentTime;
            const previousTime = durations
                .slice(0, currentIndex)
                .reduce((sum, d) => sum + d, 0);
            const totalTime = durations.reduce((sum, d) => sum + d, 0);
            const percent = totalTime ? ((previousTime + currentTime) / totalTime) * 100 : 0;
            setProgress(percent);

            setCurrentTimeFormatted(formatTime(previousTime + currentTime));
        }, 200);

        return () => clearInterval(interval);
    }, [currentIndex, durations]);

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    const handleStoriesClick = useCallback(async () => {
        if (task.id)
            router.push("/vocabluary");
        else
            showAlert(400, "Brak ID zadania");
    }, [task.id]);

    const handleDeleteTask = useCallback(async() => {
        try {
            const response = await api.delete(`/subjects/${subjectId}/tasks/${task.id}`);

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
    }, [subjectId, task.id]);

    const handlePlayBackRateOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayBackRateOption(e.target.value as PlayBackRateOption);
    };

    return (
        <>
            <Header>
                <div className="menu-icons">
                    <div className="menu-icon" title="Wróć" onClick={handleBackClick} style={{ cursor: "pointer" }}>
                        <ArrowLeft size={28} color="white" />
                    </div>
                    <div className="menu-icon" title="Słownik" onClick={(e) => {
                        e.stopPropagation();
                        setMsgDeleteVisible(true);
                    }} style={{ cursor: "pointer" }}>
                        <Trash2 size={28} color="white" />
                    </div>
                    <div className="menu-icon" title="Słownik" onClick={handleStoriesClick} style={{ cursor: "pointer", marginLeft: "auto" }}>
                        <Text size={28} color="white" />
                    </div>
                </div>
            </Header>

            <main>
                <RadioMessageOK 
                    message={`Prędkość odtwarzania audio`}
                    textConfirm="Zatwierdź"
                    onConfirm={() => {
                        setMsgVisible(false);
                        handlePlayPause();
                    }}
                    visible={msgVisible}
                    btnsWidth="140px"
                >
                <div className="radio-group">
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="playBackRateOption"
                            value={PlayBackRateOption.Normal}
                            checked={playBackRateOption === PlayBackRateOption.Normal}
                            onChange={handlePlayBackRateOptionChange}
                        />
                        <span>{PlayBackRateOption.Normal}</span>
                    </label>

                    <label className="radio-option">
                        <input
                            type="radio"
                            name="playBackRateOption"
                            value={PlayBackRateOption.Slow}
                            checked={playBackRateOption === PlayBackRateOption.Slow}
                            onChange={handlePlayBackRateOptionChange}
                        />
                        <span>{PlayBackRateOption.Slow}</span>
                    </label>

                    </div>
                </RadioMessageOK>

                <Message
                    message={"Czy na pewno chcesz usunąć zadanie?"}
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={() => {
                        setMsgDeleteVisible(false);
                        setTextLoading("Trwa usuwanie zadania");
                        setLoading(true);
                        if (task.id) {
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
                        setMsgDeleteVisible(false);
                    }}
                    visible={msgDeleteVisible}
                />
                {(loading) ? (
                    <div className="spinner-wrapper">
                        <Spinner visible={true} text={textLoading ?? ""} />
                    </div>
                ) : (
                    <div className="play-container" ref={containerRef}>
                        <div className="chat">
                            {task.finished ? (<div className={`message human ${task.status}`}>
                                <div className="text-title">
                                    <FormatText content={`Ocena: ${task.percent}%`} />
                                </div>
                            </div>): null}
                            <div className="message robot">
                                {!task.finished ? (<div className="text-title">
                                    {audioRepeat}/3
                                </div>) : null}
                                {task.finished ? (<div className={`sentences context`}>
                                    <div  className="text-title" style={{ marginBottom: "12px" }}>Opowiadanie:</div>
                                    <div className="text-audio">
                                        {isSentences ? (
                                            sentences.map((sentence, i) => (
                                                <span
                                                key={i}
                                                className={`sentence ${i === currentIndex ? "active" : ""}`}
                                                >
                                                {sentence}
                                                </span>
                                            ))
                                            ) : (
                                            words.map((word, i) => {
                                                const isSelected = selectedWords.includes(i);
                                                return (
                                                <span
                                                    key={i}
                                                    className={`sentence word ${isSelected ? "active" : ""}`}
                                                    onClick={() => handleWordClick(i)}
                                                >
                                                    {word}
                                                </span>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>) : null}
                                <div className="options">
                                    {task.finished && isSentences ? (<button className="btnOption" onClick={handlePrev}>
                                        <ChevronLeft size={24} />
                                    </button>) : null}
                                    {isSentences ? (<button
                                        className="btnOption"
                                        onClick={() => {
                                            if (isPlaying) {
                                                handlePlayPause();
                                            }
                                            else
                                                setMsgVisible(true);
                                        }}
                                        disabled={(!task.finished && audioRepeat >= 3) ? true : false}>
                                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                    </button>) : null}
                                    {task.finished && isSentences ? (<button className="btnOption" onClick={handleNext}>
                                        <ChevronRight size={24} />
                                    </button>) : null}
                                    <div style={{
                                        display: "flex",
                                        gap: "6px",
                                        marginLeft: "auto"}}
                                    >
                                        {task.finished ? (<button
                                            className={isSentences ? `btnOption disabled` : `btnOption`}
                                            onClick={handleTextOptionСlick}
                                        >
                                            <Type size={24} />
                                        </button>) : null}
                                        {task.finished && isSentences ? (<button
                                            className="btnOption"
                                            style={{minWidth: "48px"}}
                                            onClick={handleTranslateclick}
                                        >
                                            {isOriginal ? "RU" : "EN"}
                                        </button>) : null}
                                        {!isSentences ? (<button
                                            className="btnOption"
                                            onClick={handleAddWord}
                                        >
                                            <Plus size={24} />
                                        </button>) : null}
                                    </div>
                                    {!task.finished ? (<div style={{marginLeft: "8px", flexGrow: 1}}>
                                        <progress
                                            value={progress}
                                            max={100}
                                            className="progress-bar"
                                            style={{width: "100%"}}
                                        />
                                        <div style={{fontSize: "14px"}}>
                                            {currentTimeFormatted} / {totalTimeFormatted}
                                        </div>
                                    </div>) : null}
                                    <audio
                                        ref={audioRef}
                                        src={task.audioFiles[currentIndex] || ''}
                                        onEnded={() => {
                                            setCurrentIndex(prev => {
                                                if (!task.audioFiles || prev + 1 >= task.audioFiles.length) {
                                                    setIsPlaying(false);
                                                    setAudioRepeat(audioRepeat + 1);
                                                    localStorage.setItem("audioRepeat", String(audioRepeat + 1));
                                                    return 0;
                                                } else {
                                                    setIsPlaying(true);
                                                    return prev + 1;
                                                }
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                            <br />
                            <div style={{ fontWeight: "bold", marginBottom: "12px" }}>Pytania sprawdzające:</div>
                            {task.subTasks.map((subTask, subTaskIndex) => (
                                <div key={subTask.id} style={{display: "flex", flexDirection: "column"}}>
                                    <div className="message robot">
                                        <FormatText content={subTask.text ? `${subTaskIndex + 1}. ${subTask.text}` : ""} />
                                    </div>
                                    <div className="message human">
                                        <div style={{ margin: "0px"}} className="radio-group">
                                        {shuffledOptionsBySubTask[subTaskIndex]?.map(({ option, originalIndex }) => (
                                            <div key={originalIndex}>
                                                <label
                                                    className={`radio-option ${subTask.finished ? "finished" : ""} ${originalIndex === 0 ? "correct" : ""}`}
                                                    style={{ marginBottom: "12px" }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`userOption-${subTaskIndex}`}
                                                        value={originalIndex}
                                                        checked={
                                                            task.finished ?
                                                            task.subTasks[subTaskIndex].userOptionIndex == originalIndex :
                                                            userOptionIndices[subTaskIndex] === originalIndex
                                                        }
                                                        onChange={() => {
                                                            const newIndices = [...userOptionIndices];
                                                            newIndices[subTaskIndex] = originalIndex;
                                                            setUserOptionIndices(newIndices);
                                                        }}
                                                        disabled={subTask.finished}
                                                    />
                                                    <span><FormatText content={option ?? ""} /></span>
                                                </label>

                                                {subTask.finished ? (
                                                    <div style={{ marginLeft: "32px" }}>
                                                        <div className="text-title">Explanation:</div>
                                                        <div>
                                                            <span><FormatText content={subTask.explanations[originalIndex] ?? ""} /></span>
                                                        </div>
                                                        <br />
                                                    </div>) : null}
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!task.finished ? (<div style={{
                                display: "flex",
                                justifyContent: "center"
                            }}>
                                <button
                                    onClick={handleSubmitTaskClick}
                                    className="btnSubmit"
                                >
                                    Podtwierdź
                                </button>
                            </div>) : null}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}