'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Check, Trash2, Minus, Plus, BookOpen } from 'lucide-react';
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import Message from "../components/message";
import FormatText from "../components/formatText";
import axios from "axios";
import "@/app/styles/table.css";
import { getSubtopicTexts, ITask } from "../scripts/task";
import { ChatBlock, getLastMarker, parseChat, removeLastBlockOptimal } from "../scripts/chat";
import StatusIndicator from "../components/statusIndicator";
import { BsQuestion } from "react-icons/bs"; 

enum ChatMode {
  STUDENT_ANSWER = "STUDENT_ANSWER",
  STUDENT_QUESTION = "STUDENT_QUESTION"
}

interface Subtopic {
    name: string;
    percent: number;
    importance?: number;
}

export default function PlayPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);

    const [isChatEnd, setIsChatEnd] = useState(false);
    
    const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);

    const [chatTextValue, setChatTextValue] = useState("");
    const [chatBlocks, setChatBlocks] = useState<ChatBlock[]>([]);

    const [msgChatVisible, setMsgChatVisible] = useState<boolean>(false);
    const [msgDeleteTaskVisible, setMsgDeleteTaskVisible] = useState<boolean>(false);
    const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

    const [topicNoteExpanded, setTopicNoteExpanded] = useState(false);
    const [solutionExpanded, setSolutionExpanded] = useState(false);
    const [problemsExpanded, setProblemsExpanded] = useState(true);
    const [optionExplanationsExpanded, setOptionExplanationsExpanded] = useState<Record<number, boolean>>({});

    const [userOptionIndex, setUserOptionIndex] = useState<number | null>(null);

    const [textLoading, setTextLoading] = useState<string>("");
    const [task, setTask] = useState<ITask>(
        {
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
            explanations: [],
            subtopics: [],
            answered: false,
            finished: false,
            chatFinished: false,
            chat: "",
            mode: ChatMode.STUDENT_ANSWER,
            userOptionIndex: 0,
            correctOptionIndex: 0,
            userSolution: "",
            audioFiles: [],
            words: [],
            literatures: [],
            wordsCompleted: false
        }
    );

    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [sectionId, setSectionId] = useState<number | null>(null);
    const [topicId, setTopicId] = useState<number | null>(null);

    const [tempTypingBlocks, setTempTypingBlocks] = useState<ChatBlock[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isProcessingChat, setIsProcessingChat] = useState(false);
    const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
    const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypedBlockIndexRef = useRef<number>(-1);

    const shouldScrollRef = useRef(true);

    const [showFinalBlocks, setShowFinalBlocks] = useState(false);
    const [isExplanationTyping, setIsExplanationTyping] = useState(false);
    const [typedExplanation, setTypedExplanation] = useState("");
    const explanationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const getNewRobotBlocks = useCallback((allBlocks: ChatBlock[], existingBlocks: ChatBlock[]): ChatBlock[] => {
        const allRobotBlocks = allBlocks.filter(block => !block.isUser);
        const existingRobotBlocks = existingBlocks.filter(block => !block.isUser);
        
        return allRobotBlocks.slice(existingRobotBlocks.length);
    }, []);

    const simulateTypingForRobotBlocks = useCallback((newRobotBlocks: ChatBlock[]) => {
        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
        }

        setIsTyping(true);
        setChatLoading(false);
        setIsProcessingChat(false);
        lastTypedBlockIndexRef.current = -1;
        setTempTypingBlocks([]);

        let currentBlockIndex = 0;
        let currentCharIndex = 0;
        const blocksToType = [...newRobotBlocks];

        shouldScrollRef.current = true;
        
        requestAnimationFrame(() => {
            scrollToBottom(true);
        });

        typingIntervalRef.current = setInterval(() => {
            if (currentBlockIndex >= blocksToType.length) {
                if (typingIntervalRef.current) {
                    clearInterval(typingIntervalRef.current);
                    typingIntervalRef.current = null;
                }
                
                setChatBlocks(prev => {
                    const updatedBlocks = [...prev];
                    
                    let lastHumanIndex = -1;
                    for (let i = updatedBlocks.length - 1; i >= 0; i--) {
                        if (updatedBlocks[i].isUser) {
                            lastHumanIndex = i;
                            break;
                        }
                    }
                    
                    if (lastHumanIndex >= 0) {
                        updatedBlocks.splice(lastHumanIndex + 1, 0, ...blocksToType);
                    } else {
                        updatedBlocks.push(...blocksToType);
                    }
                    
                    return updatedBlocks;
                });
                
                setTempTypingBlocks([]);
                setIsTyping(false);
                
                shouldScrollRef.current = true;
                scrollToBottom(true);
                return;
            }

            const currentBlock = blocksToType[currentBlockIndex];
            
            if (currentCharIndex === 0 && currentBlockIndex > lastTypedBlockIndexRef.current) {
                lastTypedBlockIndexRef.current = currentBlockIndex;
                setTempTypingBlocks(prev => [...prev, {
                    ...currentBlock,
                    content: ""
                }]);
            }

            if (currentCharIndex < currentBlock.content.length) {
                setTempTypingBlocks(prev => {
                    const updated = [...prev];
                    updated[currentBlockIndex] = {
                        ...updated[currentBlockIndex],
                        content: currentBlock.content.substring(0, currentCharIndex + 1)
                    };
                    return updated;
                });
                currentCharIndex++;
                
                if (shouldScrollRef.current && currentCharIndex % 3 === 0) {
                    scrollToBottom(true);
                }
            } else {
                currentBlockIndex++;
                currentCharIndex = 0;
                
                shouldScrollRef.current = true;
                scrollToBottom(true);
            }
        }, 10);
    }, []);

    const simulateExplanationTyping = useCallback((explanation: string) => {
        if (explanationIntervalRef.current) {
            clearInterval(explanationIntervalRef.current);
            explanationIntervalRef.current = null;
        }

        setIsExplanationTyping(true);
        setTypedExplanation("");
        
        let currentIndex = 0;
        
        explanationIntervalRef.current = setInterval(() => {
            if (currentIndex >= explanation.length) {
                if (explanationIntervalRef.current) {
                    clearInterval(explanationIntervalRef.current);
                    explanationIntervalRef.current = null;
                }
                setIsExplanationTyping(false);
                
                shouldScrollRef.current = true;
                scrollToBottom(true);
                return;
            }

            setTypedExplanation(prev => prev + explanation[currentIndex]);
            currentIndex++;
            
            if (shouldScrollRef.current && currentIndex % 3 === 0) {
                scrollToBottom(true);
            }
        }, 10);
    }, []);

    const scrollToBottom = useCallback((instant = false) => {
        if (!mainRef.current || !shouldScrollRef.current) return;
        
        requestAnimationFrame(() => {
            if (mainRef.current) {
                if (instant) {
                    mainRef.current.scrollTop = mainRef.current.scrollHeight;
                } else {
                    mainRef.current.scrollTo({
                        top: mainRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }, []);

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
            setTextLoading("Generowanie Treści Zadania...");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let text = "";
                let errors: string[] = [];
                let outputSubtopics: string[] = [];
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { text: "", outputSubtopics: [] };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-generate`,
                        { changed, errors, attempt, text, outputSubtopics },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { text: "", outputSubtopics: [] };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        outputSubtopics = response.data.outputSubtopics;
                        attempt = response.data.attempt;
                        console.log(`Generowanie treści zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować treści zadania");
                        break;
                    }
                }

                return { text, outputSubtopics };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { text: "", outputSubtopics: [] };
                handleApiError(error);
                return { text: "", outputSubtopics: [] };
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleSolutionGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, subtopics: string[], text: string, signal?: AbortSignal) => {
            setTextLoading("Generowanie Rozwiązania Zadania...");

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
                        { changed, errors, attempt, subtopics, text, solution },
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
        async (subjectId: number, sectionId: number, topicId: number, subtopics: string[], text: string, solution: string, signal?: AbortSignal) => {
            setTextLoading("Generowanie Wariantów Zadania...");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let options: string[] = [];
                let correctOptionIndex: number = 0;
                let explanations: string[] = [];
                const MAX_ATTEMPTS = 2;
                const random1: number = Math.floor(Math.random() * 4);
                const randomOption: number = Math.floor(Math.random() * 4) + 1;
                const random2 = 3 - random1;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { options: [], explanations: [] };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/options-generate`,
                        { changed, errors, attempt, text, subtopics, solution, options, explanations, correctOptionIndex, random1, random2, randomOption },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { options: [], explanations: [], correctOptionIndex: 0 };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        solution = response.data.solution;
                        options = response.data.options;
                        correctOptionIndex = response.data.correctOptionIndex;
                        explanations = response.data.explanations;
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
        solution: string,
        options: string[],
        correctOptionIndex: number,
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
                    correctOptionIndex,
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

    const handleProblemsGenerate = useCallback(async (
            subjectId: number,
            sectionId: number,
            topicId: number,
            text: string,
            subtopics: Subtopic[],
            solution: string,
            options: string[],
            correctOption: string,
            userOption: string,
            userSolution: string,
            signal?: AbortSignal
        ): Promise<{
            outputSubtopics: string[];
            explanation: string;
        }> => {
            setTextLoading("Obliczanie Wyników...");

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
                        { changed, errors, attempt, text, solution, options, correctOption, userOption, userSolution, subtopics: taskSubtopics, outputSubtopics, explanation },
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

    const handleChatGenerate = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        text: string,
        solution: string,
        userSolution: string,
        options: string[],
        correctOption: string,
        userOption: string,
        chat: string,
        chatFinished: boolean,
        mode: ChatMode,
        subtopics: string[],
        signal?: AbortSignal
        ): Promise<{
        chat: string;
        userSolution: string;
        chatFinished: boolean;
    }> => {
        const controller = !signal ? new AbortController() : null;
        if (controller) controllersRef.current.push(controller);
        const activeSignal = signal ?? controller?.signal;

        try {
            let changed = "true";
            let attempt = 0;
            let errors: string[] = [];
            const MAX_ATTEMPTS = 2;

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                if (activeSignal?.aborted) return { chat, userSolution, chatFinished };

                const response = await api.post(
                    `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/chat-generate`,
                    { changed, errors, attempt, text, solution, chat, userSolution, chatFinished, mode, subtopics, options, userOption, correctOption },
                    { signal: activeSignal }
                );

                if (activeSignal?.aborted) return { chat, userSolution, chatFinished };

                if (response.data?.statusCode === 201) {
                    changed = response.data.changed;
                    errors = response.data.errors;
                    chat = response.data.chat;
                    chatFinished = response.data.chatFinished;
                    userSolution = response.data.userSolution;
                    attempt = response.data.attempt;
                    console.log(`Przetwarzanie Odpowiedzi AI: Próba ${attempt}`);
                } else {
                    showAlert(400, "Nie udało się przetworzyć odpowiedzi AI");
                    break;
                }
            }

            return { chat, userSolution, chatFinished };
        } catch (error: unknown) {
            setLoading(false);
            setChatLoading(false);
            if ((error as DOMException)?.name === "AbortError") return { chat, userSolution, chatFinished };
            handleApiError(error);
            return { chat, userSolution, chatFinished };
        } finally {
            if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
        }
    }, []);

    const handleUpdateChat = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        chat: string,
        chatFinished: boolean,
        userSolution: string,
        mode: ChatMode,
        signal?: AbortSignal,
    ) => {
        if (!taskId) {
            setLoading(false);
            setChatLoading(false);
            showAlert(400, "Zadanie nie jest dostępne");
            return;
        }

        try {
            const response = await api.put(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/chat`,
                {
                    chat,
                    chatFinished,
                    userSolution,
                    mode
                },
                { signal }
            );

            if (response.data?.statusCode !== 200) {
                setLoading(false);
                setChatLoading(false);
                showAlert(400, "Nie udało się zaktualizować czat");
            }
        } catch (error) {
            setLoading(false);
            setChatLoading(false);
            handleApiError(error);
        }
    }, []);

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
            setTextLoading("Zapisywanie Rozwiązania...");

            const taskUserSolutionResponse = await api.put(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/user-solution`,
            {
                userSolution,
                userOptionIndex
            },
            { signal }
            );

            if (taskUserSolutionResponse.data?.statusCode !== 200) {
                setChatLoading(false);
                showAlert(400, `Nie udało się zapisać odpowiedź`);
            }
        }
        catch (error: unknown) {
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

    const loadChat = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        signal?: AbortSignal
    ) => {
        if (!taskId) return;

        try {
            let newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);
            if (!newTask || signal?.aborted) return;

            if (newTask.answered && newTask.chatFinished && !newTask.finished) {
                const data = await handleProblemsGenerate(
                    subjectId,
                    sectionId,
                    topicId,
                    newTask.text ?? "",
                    newTask.subtopics ?? [],
                    newTask.solution ?? "",
                    newTask.options ?? [],
                    newTask.options[newTask.correctOptionIndex] ?? "",
                    newTask.options[newTask.userOptionIndex] ?? "",
                    newTask.userSolution ?? "",
                    signal
                );

                if (!data || signal?.aborted) return;

                const outputSubtopics = subtractPercents(
                    newTask.subtopics ?? [],
                    newTask.correctOptionIndex ?? 0,
                    newTask.userOptionIndex ?? 0,
                    data.outputSubtopics.map(([name, percent]) => ({
                        name,
                        percent: Number(percent)
                    }))
                );

                await handleSaveSubtopicsProgressTransaction(
                    subjectId,
                    sectionId,
                    topicId,
                    taskId,
                    outputSubtopics,
                    data.explanation ?? ""
                );

                if (signal?.aborted) return;

                newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);

                await handleUpdateChat(
                    subjectId,
                    sectionId,
                    topicId,
                    newTask.id,
                    newTask.chat,
                    newTask.chatFinished,
                    newTask.userSolution,
                    ChatMode.STUDENT_ANSWER,
                    signal
                );

                return;
            }

            const isEmptyChat = isEmptyString(newTask.chat);

            const shouldGenerateChat =
                getLastMarker(newTask.chat) === "STUDENT_ANSWER" ||
                getLastMarker(newTask.chat) === "STUDENT_QUESTION" ||
                isEmptyChat;

            if (shouldGenerateChat) {
                const mode = getLastMarker(newTask.chat) === "STUDENT_ANSWER"
                    ? ChatMode.STUDENT_ANSWER
                    : getLastMarker(newTask.chat) === "STUDENT_QUESTION"
                    ? ChatMode.STUDENT_QUESTION
                    : newTask.mode;

                const result = await handleChatGenerate(
                    subjectId,
                    sectionId,
                    topicId,
                    newTask.text,
                    newTask.solution,
                    newTask.userSolution,
                    newTask.options,
                    newTask.options[newTask.correctOptionIndex],
                    newTask.options[newTask.userOptionIndex],
                    newTask.chat,
                    newTask.chatFinished,
                    mode,
                    getSubtopicTexts(newTask.subtopics),
                    signal
                );

                if (signal?.aborted || !result) return;

                const { chat, chatFinished, userSolution } = result;

                if (chatFinished) {
                    newTask.chatFinished = chatFinished;

                    const data = await handleProblemsGenerate(
                        subjectId,
                        sectionId,
                        topicId,
                        newTask.text ?? "",
                        newTask.subtopics ?? [],
                        newTask.solution ?? "",
                        newTask.options ?? [],
                        newTask.options[newTask.correctOptionIndex] ?? "",
                        newTask.options[newTask.userOptionIndex] ?? "",
                        newTask.userSolution ?? "",
                        signal
                    );

                    if (!data || signal?.aborted) return;

                    const outputSubtopics = subtractPercents(
                        newTask.subtopics ?? [],
                        newTask.correctOptionIndex ?? 0,
                        newTask.userOptionIndex ?? 0,
                        data.outputSubtopics.map(([name, percent]) => ({
                            name,
                            percent: Number(percent)
                        }))
                    );

                    await handleSaveSubtopicsProgressTransaction(
                        subjectId,
                        sectionId,
                        topicId,
                        taskId,
                        outputSubtopics,
                        data.explanation ?? ""
                    );

                    if (signal?.aborted) return;

                    newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);

                    await handleUpdateChat(
                        subjectId,
                        sectionId,
                        topicId,
                        newTask.id,
                        newTask.chat,
                        chatFinished,
                        newTask.userSolution,
                        ChatMode.STUDENT_ANSWER,
                        signal
                    );

                    return;
                }

                let newChat = chat;
                if (!isEmptyChat)
                    newChat = newTask.chat + `\n${chat}`;

                await handleUpdateChat(
                    subjectId,
                    sectionId,
                    topicId,
                    taskId,
                    newChat,
                    chatFinished,
                    userSolution,
                    mode,
                    signal
                );

                setLoading(false);
                setChatLoading(false);
                setIsProcessingChat(false);
                
                const newChatBlocks = parseChat(newChat);
                const newRobotBlocks = getNewRobotBlocks(newChatBlocks, parseChat(newTask.chat));
                
                if (newRobotBlocks.length > 0)
                    simulateTypingForRobotBlocks(newRobotBlocks);
            }
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") return;
            setLoading(false);
            setChatLoading(false);
            setIsProcessingChat(false);
            handleApiError(error);
        }
    }, [handleChatGenerate, handleUpdateChat, handleSaveSubtopicsProgressTransaction, handleProblemsGenerate, getNewRobotBlocks, simulateTypingForRobotBlocks]);

    const loadTask = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        stage: number,
        signal?: AbortSignal
    ) => {
        try {
            let text: string = "";
            let taskSubtopics: string[] = [];

            if (stage < 1) {
                const taskResult = await handleTextGenerate(subjectId, sectionId, topicId, signal);
                text = taskResult?.text ?? "";
                taskSubtopics = taskResult?.outputSubtopics ?? [];

                if (!text) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować treści zadania");
                    return;
                }

                stage = 1;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, "", [], 0, [], taskSubtopics, signal);
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
                const solution = await handleSolutionGenerate(subjectId, sectionId, topicId, taskSubtopics, text, signal);

                if (!solution) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować rozwiązania");
                    return;
                }

                stage = 2;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, solution, [], 0, [], taskSubtopics, signal, taskId);
            }

            newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                return;
            }

            text = newTask.text ?? "";
            taskSubtopics = newTask.subtopics?.map((sub: Subtopic) => sub.name) ?? [];
            const solution = newTask.solution ?? "";

            if (stage < 3) {
                const optionsResult = await handleOptionsGenerate(subjectId, sectionId, topicId, taskSubtopics, text, solution, signal);
                const options = optionsResult.options ?? [];
                const explanations = optionsResult.explanations ?? [];
                const correctOptionIndex = optionsResult.correctOptionIndex ?? 0;

                if (!options.length || options.length != 4) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować wariantów odpowiedzi");
                    return;
                }

                stage = 3;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, solution, options, correctOptionIndex, explanations, taskSubtopics, signal, taskId);
            }
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        }
    }, [handleTextGenerate, handleSolutionGenerate, handleOptionsGenerate, handleSaveTaskTransaction]);

    const handleChatEnd = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        task: ITask,
        newChat: string,
        signal?: AbortSignal
    ) => {
        try {
            shouldScrollRef.current = true;
            scrollToBottom(true);

            setChatLoading(true);
            setTextLoading("Obliczanie Wyników...");

            await handleUpdateChat(
                subjectId ?? 0,
                sectionId ?? 0,
                topicId ?? 0,
                task.id,
                newChat,
                true,
                task.userSolution,
                task.mode,
                signal
            );

            await loadChat(
                subjectId ?? 0,
                sectionId ?? 0,
                topicId ?? 0,
                task.id,
                signal
            );

            const finalTask = await fetchTaskById(
                subjectId ?? 0,
                sectionId ?? 0,
                topicId ?? 0,
                task.id,
                signal
            );

            if (finalTask) {
                setTask(finalTask);
                setChatBlocks(parseChat(finalTask.chat));
                
                setShowFinalBlocks(true);
                
                if (finalTask.explanation) {
                    simulateExplanationTyping(finalTask.explanation);
                }
            }
        }
        catch (error) {
            setIsProcessingChat(false);
            setChatLoading(false);
            setChatTextValue("");
            handleApiError(error);
        }
        finally {
            setIsProcessingChat(false);
            setChatLoading(false);
            setChatTextValue("");
        }
    }, [handleUpdateChat, loadChat, fetchTaskById, simulateExplanationTyping]);

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

                    setUserOptionIndex(task.userOptionIndex ?? 0)
                    setTask(task);
                    setChatBlocks(parseChat(task.chat));

                    if (task.finished || (!task.answered && stage >= 3)) {
                        setLoading(false);
                        return;
                    }
                }

                if (task && task.id) {
                    localStorage.setItem("taskId", task.id);
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

                if (task.answered) {
                    setLoading(true);
                    setTextLoading("Pobieranie Czatu AI...");
                    await loadChat(subjectId, sectionId, topicId, task.id, signal);
                }

                task = await fetchTaskById(subjectId, sectionId, topicId, task.id, signal);
                setTask(task);
                localStorage.setItem("taskId", task.id);
                
                if (task.finished) {
                    setShowFinalBlocks(true);
                    setTypedExplanation(task.explanation || "");
                }
            } catch (error) {
                if ((error as DOMException)?.name === "AbortError") return;
                handleApiError(error);
            } finally {
                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                setLoading(false);
                setChatLoading(false);
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
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
            if (explanationIntervalRef.current) {
                clearInterval(explanationIntervalRef.current);
            }
        };
    }, []);

    const adjustChatTextareaRows = () => {
        if (chatTextareaRef.current) {
            const textarea = chatTextareaRef.current;
            const main = document.querySelector("main");
            const scrollTop = main?.scrollTop ?? window.scrollY;

            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";

            if (main) main.scrollTop = scrollTop;
            else window.scrollTo(0, scrollTop);
        }
    };

    useEffect(() => {
        setMsgChatVisible(false);

        setMainHeight();

        const handleResize = () => {
            setMainHeight();
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const handleChatInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setChatTextValue(newValue);
        adjustChatTextareaRows();
    };

    const handleBackClick = () => {
        localStorage.removeItem("taskId");

        router.back();
    };

    function subtractPercents(subtopics: Subtopic[], correctOptionIndex: number, userOptionIndex: number, outputSubtopics: Subtopic[]): Subtopic[] {
        const outputMap = new Map<string, number>(
            outputSubtopics.map(item => [item.name, item.percent])
        );

        const bonus = userOptionIndex === correctOptionIndex ? 20 : 0;

        return subtopics.map(item => {
            const subtractValue = outputMap.get(item.name) || 0;
            return {
                name: item.name,
                percent: (100 - subtractValue) * 0.80 + bonus
            };
        });
    }

    function isEmptyString(str: string): boolean {
        return /^\s*$/.test(str);
    }

    const handleSendMessage = useCallback(async (type: 'answer' | 'question') => {
        if (isTyping || isProcessingChat) return;

        setChatLoading(true);
        setIsProcessingChat(true);
        
        // Сохраняем текущие значения ДО асинхронных операций
        const currentChat = task.chat;
        const currentTaskId = task.id;
        const currentSubjectId = subjectId;
        const currentSectionId = sectionId;
        const currentTopicId = topicId;
        const currentUserSolution = task.userSolution;
        const currentChatFinished = task.chatFinished;
        const userMessage = chatTextValue;
        
        setChatTextValue("");

        if (controllerRef.current) controllerRef.current.abort();

        const controller = new AbortController();
        controllerRef.current = controller;
        controllersRef.current.push(controller);
        const signal = controller.signal;

        try {
            shouldScrollRef.current = true;
            scrollToBottom(true);

            setTextLoading("Przetwarzanie Czatu AI...");

            const userBlock: ChatBlock = {
                isUser: true,
                title: type === 'question' ? "Moje Pytanie:" : "Moja Odpowiedź:",
                content: userMessage,
                type: type === 'question' ? "STUDENT_QUESTION" : "STUDENT_ANSWER"
            };

            setChatBlocks(prev => [...prev, userBlock]);
            shouldScrollRef.current = true;
            scrollToBottom(true);

            const chatMode = type === 'question' ? ChatMode.STUDENT_QUESTION : ChatMode.STUDENT_ANSWER;
            const marker = type === 'question' ? 'STUDENT_QUESTION' : 'STUDENT_ANSWER';
            
            const newChat = currentChat + `\n\n[${marker}]\n${userMessage}`;
            
            await handleUpdateChat(
                currentSubjectId ?? 0,
                currentSectionId ?? 0,
                currentTopicId ?? 0,
                currentTaskId,
                newChat,
                currentChatFinished,
                currentUserSolution,
                chatMode,
                signal
            );

            await loadChat(
                currentSubjectId ?? 0,
                currentSectionId ?? 0,
                currentTopicId ?? 0,
                currentTaskId,
                signal
            );

            const updatedTask = await fetchTaskById(
                currentSubjectId ?? 0,
                currentSectionId ?? 0,
                currentTopicId ?? 0,
                currentTaskId,
                signal
            );

            if (updatedTask) {
                setTask(updatedTask);
            }

        } catch (error: unknown) {
            if ((error as DOMException)?.name === "AbortError") {
                setChatBlocks(prev => prev.filter(block => 
                    !block.isUser || block.content !== userMessage
                ));
                return;
            }
            setChatLoading(false);
            setIsProcessingChat(false);
            handleApiError(error);
        } finally {
            setChatLoading(false);
            setIsProcessingChat(false);

            controllersRef.current = controllersRef.current.filter(c => c !== controller);
            controllerRef.current = null;
        }
    }, [task.id, subjectId, sectionId, topicId, chatTextValue, handleUpdateChat, loadChat, fetchTaskById, isTyping, isProcessingChat]);

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
                shouldScrollRef.current = true;
                scrollToBottom(true);

                setChatLoading(true);
                setTextLoading("Zapisywanie rozwiązania...");

                // Сохраняем ID до асинхронных операций
                const currentTaskId = task.id;
                const currentSubjectId = subjectId;
                const currentSectionId = sectionId;
                const currentTopicId = topicId;
                const currentUserOptionIndex = userOptionIndex;

                // 1. Сохраняем ответ пользователя
                await handleTaskUserSolutionSave(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    currentTaskId ?? 0,
                    "",
                    currentUserOptionIndex ?? 0,
                    signal
                );

                if (signal.aborted) return;

                // 2. Немедленно обновляем UI
                setTask(prev => ({
                    ...prev,
                    answered: true,
                    userOptionIndex: currentUserOptionIndex ?? 0
                }));

                // 3. Получаем обновленную задачу
                const newTask = await fetchPendingTask(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    signal
                );

                if (signal.aborted || !newTask) {
                    showAlert(400, "Nie udało się pobrać zadania");
                    return;
                }

                setTextLoading("Przetwarzanie czatu AI...");

                // 4. Загружаем чат (обновит chatBlocks)
                await loadChat(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    newTask.id,
                    signal
                );

                // 5. Получаем полную обновленную задачу
                const finalTask = await fetchTaskById(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    newTask.id,
                    signal
                );

                if (finalTask) {
                    setTask(finalTask);
                }

            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return;
                setChatLoading(false);
                setIsProcessingChat(false);
                handleApiError(error);
            } finally {
                setChatLoading(false);
                setIsProcessingChat(false);
                setIsSubmittingAnswer(false);

                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                controllerRef.current = null;
            }
        }
    }, [task.id, task.answered, userOptionIndex, subjectId, sectionId, topicId, isSubmittingAnswer, handleTaskUserSolutionSave, fetchPendingTask, loadChat, fetchTaskById]);

    useEffect(() => {
        if (task?.options.length > 0 && task?.answered === false && task?.finished === false) {
            setUserOptionIndex(0);
        }
    }, [task?.options, task?.answered, task?.finished]);

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
            handleApiError(error);
        }
        finally {
            setLoading(false);
            setTextLoading("");
            setMsgDeleteTaskVisible(false);
        }
    }, [subjectId, task.id]);

    const allDisplayBlocks = useMemo(() => {
        const result = [...chatBlocks];
        
        if (tempTypingBlocks.length > 0) {
            let lastHumanIndex = -1;
            for (let i = result.length - 1; i >= 0; i--) {
                if (result[i].isUser) {
                    lastHumanIndex = i;
                    break;
                }
            }
            
            if (lastHumanIndex >= 0) {
                result.splice(lastHumanIndex + 1, 0, ...tempTypingBlocks);
            } else {
                result.push(...tempTypingBlocks);
            }
        }
        
        return result;
    }, [chatBlocks, tempTypingBlocks]);

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

            <main ref={mainRef}>
                <Message
                    message={"Czy na pewno chcesz usunąć zadanie?"}
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={() => {
                        setMsgDeleteTaskVisible(false);
                        setLoading(true);

                        if (!loading)
                            setTextLoading("Trwa usuwanie zadania...");

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
                        setMsgDeleteTaskVisible(false);
                    }}
                    visible={msgDeleteTaskVisible}
                />
                <Message
                    message={"Czy na pewno chcesz utworzyć nowe zadanie, ponieważ temat został już zamknięty?"}
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={() => {
                        setMsgPlayVisible(false);
                        
                        localStorage.removeItem("taskId");
                        window.location.reload();
                    }}
                    onClose={() => {
                        setMsgPlayVisible(false);
                    }}
                    visible={msgPlayVisible}
                />

                <Message 
                    message={`Czy na pewno zadanie było rozwiązane?`}
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={async () => {
                        setMsgChatVisible(false);
                        setIsChatEnd(true);
                        const newChat = removeLastBlockOptimal(task.chat)
                        setChatBlocks(parseChat(newChat));

                        if (controllerRef.current) controllerRef.current.abort();

                        const controller = new AbortController();
                        controllersRef.current.push(controller);
                        const signal = controller.signal;

                        await handleChatEnd(
                            subjectId ?? 0,
                            sectionId ?? 0,
                            topicId ?? 0,
                            task,
                            newChat,
                            signal
                        );
                    }}
                    onClose={() => {
                        setMsgChatVisible(false);
                    }}
                    visible={msgChatVisible}
                />

                {(loading) ? (
                    <div className="spinner-wrapper">
                        <Spinner visible={true} text={textLoading} />
                    </div>
                ) : (
                    <div className="play-container" ref={containerRef}>
                        <div className="chat">
                            <div className="message robot">
                                <div className="element-name" style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    justifyContent: "space-between"
                                }}
                                    onClick={() => setTopicNoteExpanded((prev) => !prev)}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                    }}>
                                        <div className="btnElement" style={{
                                            marginRight: "4px",
                                            fontWeight: "bold"
                                        }}>
                                            {topicNoteExpanded ? <Minus size={26} /> : <Plus size={26} />}
                                        </div>
                                        {task.topicName ?? ""}
                                    </div>
                                    {task.literatures.length > 0 ? (<div
                                        className="btnOption"
                                        onClick={(e) => {
                                        e.stopPropagation();
                                        
                                        if (task.literatures.length === 1) {
                                            localStorage.setItem("literature", task.literatures[0]);
                                            router.push('/literature');
                                        }
                                        else {
                                            localStorage.setItem("literatures", JSON.stringify(task.literatures));
                                            router.push('/literatures');
                                        }
                                        }}
                                    >
                                        <BookOpen size={26} />
                                    </div>) : null}
                                </div>
                                {topicNoteExpanded && (
                                    <div style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                        <FormatText content={task.topicNote ?? ""} />
                                    </div>
                                )}
                            </div>
                            <div className={`message human ${task.status}`}>
                                <div className="text-title" style={{ fontWeight: "bold" }}>
                                    {task.finished ? "Ocena:" : "Podtematy:"}
                                </div>
                                <div style={{ marginTop: "8px" }}>
                                    {task.subtopics.map((subtopic: Subtopic, index: number) => (
                                    <div key={index}>
                                        <FormatText
                                            content={
                                                task.finished
                                                ? `${index + 1}. ${subtopic.name}: <strong>${subtopic.percent}%</strong>`
                                                : `${index + 1}. ${subtopic.name}`
                                            }
                                        />
                                    </div>
                                    ))}
                                </div>
                            </div>
                            <div className="message robot">
                                <div className="text-title">Tekst Zadania:</div>
                                <div style={{paddingLeft: "20px", marginTop: "8px"}}><FormatText content={task.text ?? ""} /></div>
                            </div>
                            <div className="message human">
                                <div className="text-title">Warianty Odpowiedzi:</div>
                                <div style={{ margin: "12px"}} className="radio-group">
                                    {(task.options ?? []).map((option, index) => (
                                        <div key={index}>
                                            <label className={`radio-option finished ${
                                                task.answered ? (
                                                    index === task.correctOptionIndex 
                                                        ? "correct" 
                                                        : userOptionIndex === index 
                                                        ? "uncorrect" 
                                                        : ""
                                                ) : ""
                                            }`} style={{marginBottom: "12px"}}>
                                                <input
                                                    type="radio"
                                                    name="userOption"
                                                    value={index}
                                                    checked={userOptionIndex === index}
                                                    onChange={() => setUserOptionIndex(index)}
                                                    style={{
                                                        marginTop: "0.75px"
                                                    }}
                                                    disabled={task.answered}
                                                />
                                                <span><FormatText content={option ?? ""} /></span>
                                            </label>
                                            {task.finished ? (
                                                <div>
                                                    <div
                                                        className="text-title"
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            cursor: "pointer",
                                                            fontWeight: "bold"
                                                        }}
                                                        onClick={() => {
                                                            setOptionExplanationsExpanded(prev => ({
                                                                ...prev,
                                                                [index]: !prev[index]
                                                            }));
                                                        }}
                                                    >
                                                        <div
                                                            className="btnElement"
                                                            style={{
                                                                marginRight: "4px",
                                                                fontWeight: "bold"
                                                            }}
                                                        >
                                                            {optionExplanationsExpanded[index] ? <Minus size={26} /> : <Plus size={26} />}
                                                        </div>
                                                        Wyjaśnienie:
                                                    </div>
                                                    
                                                    {optionExplanationsExpanded[index] && (
                                                        <div style={{ marginTop: "8px", paddingLeft: "20px" }}>
                                                            <FormatText content={task.explanations[index] ?? ""} />
                                                        </div>
                                                    )}
                                                    <br />
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                                {!task.answered && !isSubmittingAnswer && (
                                    <div className="options" style={{
                                        display: "flex",
                                        cursor: "pointer",
                                    }}>
                                        <div style={{
                                            display: "flex",
                                            gap: "6px",
                                            marginLeft: "auto",
                                            cursor: "pointer"
                                        }}>
                                            <button
                                                className="btnOption"
                                                title={"Wysłać Odpowiedź"}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleSubmitTaskClick();
                                                }}
                                                disabled={isSubmittingAnswer}
                                            >
                                                <Check size={28} color="white" />
                                            </button>
                                        </div>
                                </div>)}
                            </div>
                            
                            {task.answered && (
                                <>
                                    {allDisplayBlocks?.map((block: ChatBlock, index: number) => (
                                        block.isUser ? (
                                            <div key={index} className="message human">
                                                <div className="text-title">{block.title}</div>
                                                <div className="answer-block readonly" style={{ marginTop: "8px" }}>
                                                    <FormatText content={block.content} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div key={index} className="message robot">
                                                <div className="text-title">{block.title}</div>
                                                <div style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                                    <FormatText content={block.content} />
                                                </div>
                                            </div>
                                        )
                                    ))}
                                    
                                    {(getLastMarker(task.chat) === "AI_QUESTION" && !isChatEnd && !task.chatFinished && chatBlocks.length > 0 && !isTyping && !isProcessingChat) && (
                                        <div className="message human">
                                            <textarea
                                                ref={chatTextareaRef}
                                                placeholder={`Zakończ, zapytaj, daj odpowiedź...`}
                                                className="answer-block"
                                                style={{ marginTop: "0px" }}
                                                value={chatTextValue}
                                                onInput={handleChatInput}
                                                rows={2}
                                                name="userSolution"
                                                id="userSolution"
                                            />
                                            {!isTyping && !chatLoading && !isProcessingChat && (
                                                <div className="options" style={{ display: "flex", cursor: "pointer", gap: "6px", marginTop: "8px" }}>
                                                    {isEmptyString(chatTextValue) && (<button
                                                        className={`btnOption darkgreen`}
                                                        style={{ height: "44px" }}
                                                        title={`Zakończ`}
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            setMsgChatVisible(true);
                                                        }}
                                                    >
                                                        Zakończ
                                                    </button>)}
                                                    <div style={{ display: "flex", gap: "6px", cursor: "pointer", marginLeft: "auto" }}>
                                                        <button
                                                            className="btnOption"
                                                            title="Zadaj Pytanie"
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                handleSendMessage('question');
                                                            }}
                                                        >
                                                            <BsQuestion size={28} color="white" />
                                                        </button>
                                                        <button
                                                            className={`btnOption`}
                                                            title={`Wyślij`}
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                handleSendMessage('answer');
                                                            }}
                                                        >
                                                            <Check size={28} color="white" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {chatLoading && (
                                <StatusIndicator text={textLoading} />
                            )}
                            
                            {(task.finished || showFinalBlocks) && (
                            <>
                                <br />
                                <div className="message robot">
                                    <div
                                        className="text-title"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            fontWeight: "bold"
                                        }}
                                        onClick={() => setSolutionExpanded(prev => !prev)}
                                    >
                                        <div
                                            className="btnElement"
                                            style={{
                                                marginRight: "4px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {solutionExpanded ? <Minus size={26} /> : <Plus size={26} />}
                                        </div>
                                        Prawidłowe rozwiązanie:
                                    </div>
                                    {solutionExpanded && (
                                        <div style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                            <FormatText content={task.solution} />
                                        </div>
                                    )}
                                </div>
                                <div className="message robot">
                                    <div
                                        className="text-title"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            fontWeight: "bold"
                                        }}
                                        onClick={() => setProblemsExpanded(prev => !prev)}
                                    >
                                        <div
                                            className="btnElement"
                                            style={{
                                                marginRight: "4px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {problemsExpanded ? <Minus size={26} /> : <Plus size={26} />}
                                        </div>
                                        Wyjaśnienie rozwiązania:
                                    </div>
                                    {(problemsExpanded || isExplanationTyping) && (
                                        <div style={{paddingLeft: "20px", marginTop: "8px"}}>
                                            {isExplanationTyping ? (
                                                <FormatText content={typedExplanation} />
                                            ) : (
                                                <FormatText content={task.explanation ?? ""} />
                                            )}
                                        </div>
                                    )}
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