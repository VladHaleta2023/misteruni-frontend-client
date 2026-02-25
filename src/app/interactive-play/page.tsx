'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Plus, Type, Trash2, Text, Check, Minus } from 'lucide-react';
import "@/app/styles/play.css";
import "@/app/styles/message.css";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import { getSubtopicTexts, getWordTexts, ITask } from "../scripts/task";
import api from "@/app/utils/api";
import axios from "axios";
import FormatText from "../components/formatText";
import React from "react";
import { setMainHeight } from "../scripts/mainHeight";
import Message from "../components/message";
import RadioMessageOK from "../components/radioMessageOK";
import { ChatBlock, getLastMarker, parseChat, removeLastBlockOptimal } from "../scripts/chat";
import StatusIndicator from "../components/statusIndicator";
import { BsQuestion } from "react-icons/bs";

enum PlayBackRateOption {
    Normal = 'Normal',
    Slow = 'Slow',
}

enum ChatMode {
  STUDENT_ANSWER = "STUDENT_ANSWER",
  STUDENT_QUESTION = "STUDENT_QUESTION"
}

interface Subtopic {
    name: string;
    percent: number;
    importance?: number;
}

export default function InteractivePlayPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [textLoading, setTextLoading] = useState<string>("");
    const [chatLoading, setChatLoading] = useState(false);

    const [isChatEnd, setIsChatEnd] = useState(false);
    
    const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);

    const [chatTextValue, setChatTextValue] = useState("");
    const [chatBlocks, setChatBlocks] = useState<ChatBlock[]>([]);

    const [problemsExpanded, setProblemsExpanded] = useState(true);
    const [taskWordsExpanded, setTaskWordsExpanded] = useState(false);
    const [optionExplanationsExpanded, setOptionExplanationsExpanded] = useState<Record<number, boolean>>({});

    const [msgChatVisible, setMsgChatVisible] = useState<boolean>(false);
    const [msgDeleteTaskVisible, setMsgDeleteTaskVisible] = useState<boolean>(false);

    const [userOptionIndex, setUserOptionIndex] = useState<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [playBackRateOption, setPlayBackRateOption] = useState<PlayBackRateOption>(PlayBackRateOption.Normal);
    const [msgVisible, setMsgVisible] = useState<boolean>(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [sentences, setSentences] = useState<string[]>([]);
    const [isOriginal, setIsOriginal] = useState<boolean>(true);
    const [isSentences, setIsSentences] = useState<boolean>(true);
    const [words, setWords] = useState<string[]>([]);

    const [task, setTask] = useState<ITask>({
        id: 0,
        stage: 0,
        text: "",
        topicName: "",
        topicNote: "",
        explanation: "",
        percent: 0,
        percentAudio: 0,
        percentWords: 0,
        status: "started",
        solution: "",
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
    });

    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [sectionId, setSectionId] = useState<number | null>(null);
    const [topicId, setTopicId] = useState<number | null>(null);
    const [audioRepeat, setAudioRepeat] = useState<number>(0);
    const [selectedWords, setSelectedWords] = useState<number[]>([0]);

    const [progress, setProgress] = useState(0);
    const [durations, setDurations] = useState<number[]>([]);
    const [currentTimeFormatted, setCurrentTimeFormatted] = useState("0:00");
    const [totalTimeFormatted, setTotalTimeFormatted] = useState("0:00");

    const [tempTypingBlocks, setTempTypingBlocks] = useState<ChatBlock[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isProcessingChat, setIsProcessingChat] = useState(false);
    const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
    const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypedBlockIndexRef = useRef<number>(-1);

    const [showFinalBlocks, setShowFinalBlocks] = useState(false);
    const [isExplanationTyping, setIsExplanationTyping] = useState(false);
    const [typedExplanation, setTypedExplanation] = useState("");
    const explanationIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const shouldScrollRef = useRef(true);

    const controllerRef = useRef<AbortController | null>(null);
    const controllersRef = useRef<AbortController[]>([]);
    const firstClickRef = useRef(true);

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

    const handleScroll = useCallback(() => {
        if (!mainRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        
        shouldScrollRef.current = isAtBottom;
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
                let outputWords: string[] = [];
                let errors: string[] = [];
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { text: "", translate: "", outputWords: [] };

                    const response = await api.post(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/interactive-task-generate`,
                        { changed, errors, attempt, text, translate, outputWords },
                        { signal: activeSignal }
                    );

                    if (activeSignal?.aborted) return { text: "", translate: "", outputWords: [] };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        translate = response.data.translate;
                        outputWords = response.data.outputWords;
                        attempt = response.data.attempt;
                        console.log(`Generowanie treści zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować treści zadania");
                        break;
                    }
                }

                return { text, translate, outputWords };
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return { text: "", translate: "", outputWords: [] };
                handleApiError(error);
                return { text: "", translate: "", outputWords: [] };
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
                    if (activeSignal?.aborted) return { options: [], explanations: [], correctOptionIndex: 0 };

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
        words: string[],
        options: string[],
        correctOptionIndex: number,
        explanations: string[],
        taskSubtopics: string[],
        explanation: string,
        percent: number | null,
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
                    words,
                    percent,
                    options,
                    correctOptionIndex,
                    explanations,
                    explanation,
                    taskSubtopics
                },
                { signal }
            );

            if (response.data?.statusCode === 200) {
                showAlert(200, "Zadanie zapisane pomyślnie");
            } else {
                setLoading(false);
                showAlert(400, "Nie udało się zapisać zadanie");
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
                const subtopics: Subtopic[] = [
                    {
                        name: newTask.topicName ?? "",
                        percent: 0
                    }
                ];

                const data = await handleProblemsGenerate(
                    subjectId,
                    sectionId,
                    topicId,
                    newTask.text ?? "",
                    subtopics,
                    newTask.solution ?? "",
                    newTask.options ?? [],
                    newTask.options[newTask.correctOptionIndex] ?? "",
                    newTask.options[newTask.userOptionIndex] ?? "",
                    newTask.userSolution ?? "",
                    signal
                );

                if (!data || signal?.aborted) return;

                const outputSubtopics = subtractPercents(
                    subtopics,
                    newTask.correctOptionIndex ?? 0,
                    newTask.userOptionIndex ?? 0,
                    data.outputSubtopics.map(([name, percent]) => ({
                        name,
                        percent: Number(percent)
                    }))
                );

                const wordTexts = getWordTexts(newTask.words) || [];

                await handleSaveTaskTransaction(
                    subjectId,
                    sectionId,
                    topicId,
                    newTask.stage,
                    newTask.text,
                    newTask.solution,
                    wordTexts,
                    newTask.options,
                    newTask.correctOptionIndex,
                    newTask.explanations,
                    [],
                    data.explanation,
                    outputSubtopics[0].percent,
                    signal,
                    newTask.id
                );

                if (signal?.aborted) return;

                newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);
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

                const subtopics: Subtopic[] = [
                    {
                        name: newTask.topicName ?? "",
                        percent: 0
                    }
                ];

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
                    getSubtopicTexts(subtopics),
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
                        subtopics,
                        newTask.solution ?? "",
                        newTask.options ?? [],
                        newTask.options[newTask.correctOptionIndex] ?? "",
                        newTask.options[newTask.userOptionIndex] ?? "",
                        newTask.userSolution ?? "",
                        signal
                    );

                    if (!data || signal?.aborted) return;

                    const outputSubtopics = subtractPercents(
                        subtopics,
                        newTask.correctOptionIndex ?? 0,
                        newTask.userOptionIndex ?? 0,
                        data.outputSubtopics.map(([name, percent]) => ({
                            name,
                            percent: Number(percent)
                        }))
                    );

                    const wordTexts = getWordTexts(newTask.words) || [];

                    await handleSaveTaskTransaction(
                        subjectId,
                        sectionId,
                        topicId,
                        newTask.stage,
                        newTask.text,
                        newTask.solution,
                        wordTexts,
                        newTask.options,
                        newTask.correctOptionIndex,
                        newTask.explanations,
                        [],
                        data.explanation,
                        outputSubtopics[0].percent,
                        signal,
                        newTask.id
                    );

                    if (signal?.aborted) return;

                    newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);
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

                if (newRobotBlocks.length > 0) {
                    simulateTypingForRobotBlocks(newRobotBlocks);
                }
            }
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") return;
            setLoading(false);
            setChatLoading(false);
            setIsProcessingChat(false);
            handleApiError(error);   
        }
    }, [handleChatGenerate, handleUpdateChat, handleProblemsGenerate, handleSaveTaskTransaction, getNewRobotBlocks, simulateTypingForRobotBlocks]);

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
            let outputWords: string[] = [];
            let taskId: number | null = null;

            if (stage < 1) {
                const taskResult = await handleInteractiveTextGenerate(
                    subjectId, 
                    sectionId, 
                    topicId, 
                    signal
                );
                
                text = taskResult?.text ?? "";
                translate = taskResult?.translate ?? "";
                outputWords = taskResult?.outputWords ?? [];

                if (!text) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować treści zadania");
                    return;
                }

                stage = 1;

                await handleSaveTaskTransaction(
                    subjectId, 
                    sectionId, 
                    topicId, 
                    stage, 
                    text, 
                    translate, 
                    outputWords, 
                    [],
                    0,
                    [],
                    [],
                    "",
                    null, 
                    signal
                );

                const newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
                if (!newTask) {
                    setLoading(false);
                    showAlert(400, "Nie udało się pobrać nowo utworzonego zadania");
                    return;
                }

                taskId = newTask.id;
                localStorage.setItem("taskId", String(taskId));
                
                text = newTask.text ?? "";
                translate = newTask.solution ?? "";
                outputWords = getWordTexts(newTask.words) ?? [];
                stage = newTask.stage ?? 1;
            }

            let newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                setLoading(false);
                showAlert(400, "Nie udało się pobrać nowo utworzonego zadania");
                return;
            }

            taskId = newTask.id;
            localStorage.setItem("taskId", String(taskId));

            text = newTask.text ?? "";
            translate = newTask.solution ?? "";
            outputWords = getWordTexts(newTask.words) ?? [];
            stage = newTask.stage ?? stage;

            if (stage < 2) {
                const optionsResult = await handleOptionsGenerate(
                    subjectId,
                    sectionId,
                    topicId,
                    outputWords,
                    text,
                    translate,
                    signal
                );

                const options = optionsResult.options ?? [];
                const explanations = optionsResult.explanations ?? [];
                const correctOptionIndex = optionsResult.correctOptionIndex ?? 0;

                if (!options.length || options.length != 4) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować wariantów odpowiedzi");
                    return;
                }

                stage = 2;

                await handleSaveTaskTransaction(
                    subjectId, 
                    sectionId, 
                    topicId, 
                    stage, 
                    text, 
                    translate, 
                    outputWords, 
                    options, 
                    correctOptionIndex,
                    explanations, 
                    [], 
                    "",
                    null,
                    signal,
                    newTask.id
                );
            }

            newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                setLoading(false);
                showAlert(400, "Nie udało się pobrać nowo utworzonego zadania");
                return;
            }

            taskId = newTask.id;
            localStorage.setItem("taskId", String(taskId));

            if (stage < 3) {
                await handleSaveAudioTransaction(
                    subjectId,
                    sectionId,
                    topicId,
                    taskId ?? 0,
                    text,
                    3,
                    "en",
                    signal
                );
            }

            const finalTask = await fetchTaskById(
                subjectId,
                sectionId,
                topicId,
                taskId!,
                signal
            );

            if (!finalTask) {
                setLoading(false);
                showAlert(400, "Nie udało się pobrać ostateczną wersję zadania");
                return;
            }

            setTask(finalTask);
            setSentences(await splitIntoSentences(finalTask.text));
            setWords(extractWords(finalTask.text));
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        }
    }, [handleInteractiveTextGenerate, handleOptionsGenerate, handleSaveTaskTransaction]);

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

    const adjustChatTextareaRows = () => {
        if (chatTextareaRef.current) {
            const textarea = chatTextareaRef.current;
            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";
        }
    };

    const handleChatInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setChatTextValue(newValue);
        adjustChatTextareaRows();
    };

    function extractWords(text: string): string[] {
        return text.match(/\p{L}+/gu) || []; 
    }

    function isEmptyString(str: string): boolean {
        return /^\s*$/.test(str);
    }

    const formatTime = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, "0")}`;
    };

    const handleBackClick = () => {
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

    const handleTranslateclick = async () => {
        if (isOriginal) {
            setIsOriginal(false);
            setSentences(await splitIntoSentences(task.solution, "pl"));
        } else {
            setIsOriginal(true);
            setSentences(await splitIntoSentences(task.text));
        }
    };

    const handleTextOptionСlick = () => {
        setSelectedWords([0]);
        firstClickRef.current = true;
        setIsSentences(!isSentences);
    };

    const handleAddWord = useCallback(async () => {
        const text = selectedWords.map(index => words[index]).join(" ");

        if (!text || text == "") {
            showAlert(400, "Nieprawidłowo wybrane słowa");
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
            } else {
                setLoading(false);
                showAlert(400, `Nie udało się dodać słowo lub wyraz`);
            }
        } catch (error: unknown) {
            setLoading(false);
            handleApiError(error);
        } finally {
            setSelectedWords([0]);
            setLoading(false);
        }
    }, [subjectId, sectionId, topicId, task, selectedWords, words]);

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

    const handleDeleteTask = useCallback(async() => {
        try {
            const response = await api.delete(`/subjects/${subjectId}/tasks/${task.id}`);

            setLoading(false);
            if (response.data?.statusCode === 200) {
                showAlert(response.data.statusCode, response.data.message);
            } else {
                showAlert(response.data.statusCode, response.data.message);
            }
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        } finally {
            setLoading(false);
            setTextLoading("");
            setMsgDeleteTaskVisible(false);
        }
    }, [subjectId, task.id]);

    const handlePlayBackRateOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayBackRateOption(e.target.value as PlayBackRateOption);
    };

    const handleVocabluaryClick = useCallback(async() => {
        localStorage.setItem("fetchWordIds", JSON.stringify(task.words.map(word => word.id)));
        router.push('/topic-vocabluary');
    }, [task, router]);

    useEffect(() => {
        const handleUnload = () => {
            controllersRef.current.forEach((controller: AbortController) => controller.abort());
            controllersRef.current = [];
        };

        window.addEventListener("beforeunload", handleUnload);
        return () => window.removeEventListener("beforeunload", handleUnload);
    }, []);

    useEffect(() => {
        setMsgVisible(false);
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
        if (audioRepeatNum) {
            setAudioRepeat(audioRepeatNum);
        } else {
            setAudioRepeat(0);
            localStorage.setItem("audioRepeat", String(0));
        }
    }, []);

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

                    setUserOptionIndex(task.userOptionIndex ?? 0);
                    setTask(task);
                    setSentences(await splitIntoSentences(task.text));
                    setWords(extractWords(task.text));
                    setChatBlocks(parseChat(task.chat));
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
                setSentences(await splitIntoSentences(task.text));
                setWords(extractWords(task.text));
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
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const playAudio = async () => {
            try {
                if (isPlaying) {
                    audioEl.playbackRate = playBackRateOption === PlayBackRateOption.Normal ? 1 : 0.75;
                    await audioEl.play();
                } else {
                    audioEl.pause();
                }
            } catch (err) {
                console.log("Audio play blocked by browser", err);
            }
        };

        playAudio();
    }, [currentIndex, isPlaying, playBackRateOption]);

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

        if (task.audioFiles && task.audioFiles.length > 0) {
            loadDurations();
        }
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

    useEffect(() => {
        if (task?.options.length > 0 && task?.answered === false && task?.finished === false) {
            setUserOptionIndex(0);
        }
    }, [task?.options, task?.answered, task?.finished]);

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
                    <div className="menu-icon" title="Wróć" onClick={handleBackClick} style={{ cursor: "pointer" }}>
                        <ArrowLeft size={28} color="white" />
                    </div>
                    <div className="menu-icon" title="Usuń" onClick={(e) => {
                        e.stopPropagation();
                        setMsgDeleteTaskVisible(true);
                    }} style={{ cursor: "pointer" }}>
                        <Trash2 size={28} color="white" />
                    </div>
                    <div
                        className="menu-icon"
                        title="Przełącz do listy słów"
                        onClick={handleVocabluaryClick}
                        style={{ marginLeft: "auto", cursor: "pointer" }}
                    >
                        <Text size={28} color="white" />
                    </div>
                </div>
            </Header>

            <main ref={mainRef} onScroll={handleScroll}>
                <RadioMessageOK 
                    message="Prędkość odtwarzania audio"
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
                    message="Czy na pewno chcesz usunąć zadanie?"
                    textConfirm="Tak"
                    textCancel="Nie"
                    onConfirm={() => {
                        setMsgDeleteTaskVisible(false);
                        setTextLoading("Trwa usuwanie zadania");
                        setLoading(true);
                        if (task.id) {
                            handleDeleteTask().then(() => {
                                setTimeout(() => {
                                    handleBackClick();
                                }, 2000);
                            });
                        } else {
                            showAlert(400, "Błąd usuwania zadania");
                        }
                    }}
                    onClose={() => setMsgDeleteTaskVisible(false)}
                    visible={msgDeleteTaskVisible}
                />

                <Message 
                    message="Czy na pewno zadanie było rozwiązane?"
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
                    onClose={() => setMsgChatVisible(false)}
                    visible={msgChatVisible}
                />

                {loading ? (
                    <div className="spinner-wrapper">
                        <Spinner visible={true} text={textLoading} />
                    </div>
                ) : !task.wordsCompleted ? (
                    <>
                        <div className="play-container" ref={containerRef}>
                            <div className="chat">
                                <div className="message robot">
                                    <div className="element-name" style={{
                                        display: "flex",
                                        alignItems: "center",
                                        cursor: "pointer",
                                        fontWeight: "bold"
                                    }}>
                                        {task.topicName}
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                color: "#514e4e",
                                display: "flex",
                                flexDirection: "column",
                                margin: "auto"
                            }}>
                                <div>
                                    <span>Nie wszystkie słowa zostały jeszcze przećwiczone.</span>

                                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                        <span>Naciśnij</span>
                                        <Text strokeWidth={4} />
                                    </div>

                                    <span>aby ćwiczyć słowa tematyczne</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="play-container" ref={containerRef}>
                        <div className="chat">
                            <div className="message robot">
                                <div className="element-name" style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}>
                                    {task.topicName}
                                </div>
                            </div>
                            
                            {task.finished && (
                                <div className={`message human ${task.status}`}>
                                    <div>
                                        <FormatText content={`Słownictwo: ${task.percentWords}%`} />
                                        <FormatText content={`Opowiadanie: ${task.percentAudio}%`} />
                                    </div>
                                    <div className="text-title">
                                        <FormatText content={`Wynik: ${task.percent}%`} />
                                    </div>
                                </div>
                            )}
                            
                            <div className="message robot">
                                {task.words.length > 0 && (
                                    <>
                                        <div
                                            className="text-title"
                                            style={{
                                                marginBottom: "12px",
                                                display: "flex",
                                                alignItems: "center",
                                                cursor: "pointer",
                                                fontWeight: "bold"
                                            }}
                                            onClick={() => setTaskWordsExpanded(prev => !prev)}
                                        >
                                            <div className="btnElement" style={{ marginRight: "4px", fontWeight: "bold" }}>
                                                {taskWordsExpanded ? <Minus size={26} /> : <Plus size={26} />}
                                            </div>
                                            Słowy Opowiadania:
                                        </div>
                                        {taskWordsExpanded && (
                                            <div className="text-audio">
                                                {task.words.map((word, index) => (
                                                    <div key={index}>{word.text}</div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {!(audioRepeat >= 2 || task.finished) && (
                                    <div className="text-title">{audioRepeat}/2</div>
                                )}
                                
                                {(audioRepeat >= 2 || task.finished) ? (
                                    <div className="sentences context">
                                        <div className="text-title" style={{ marginBottom: "12px" }}>Opowiadanie:</div>
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
                                    </div>
                                ) : null}
                                
                                <div className="options">
                                    {(audioRepeat >= 2 || task.finished) && isSentences && (
                                        <button className="btnOption" onClick={handlePrev}>
                                            <ChevronLeft size={24} />
                                        </button>
                                    )}
                                    
                                    {isSentences && (
                                        <button
                                            className="btnOption"
                                            onClick={() => {
                                                if (isPlaying) {
                                                    handlePlayPause();
                                                } else {
                                                    setMsgVisible(true);
                                                }
                                            }}
                                        >
                                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                        </button>
                                    )}
                                    
                                    {(audioRepeat >= 2 || task.finished) && isSentences && (
                                        <button className="btnOption" onClick={handleNext}>
                                            <ChevronRight size={24} />
                                        </button>
                                    )}
                                    
                                    <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                                        {(audioRepeat >= 2 || task.finished) && (
                                            <button
                                                className={isSentences ? "btnOption disabled" : "btnOption"}
                                                onClick={handleTextOptionСlick}
                                            >
                                                <Type size={24} />
                                            </button>
                                        )}
                                        
                                        {(audioRepeat >= 2 || task.finished) && isSentences && (
                                            <button
                                                className="btnOption"
                                                style={{ minWidth: "48px" }}
                                                onClick={handleTranslateclick}
                                            >
                                                {isOriginal ? "PL" : "EN"}
                                            </button>
                                        )}
                                        
                                        {!isSentences && (
                                            <button className="btnOption" onClick={handleAddWord}>
                                                <Plus size={24} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {!(audioRepeat >= 2 || task.finished) && (
                                        <div style={{ marginLeft: "8px", flexGrow: 1 }}>
                                            <progress
                                                value={progress}
                                                max={100}
                                                className="progress-bar"
                                                style={{ width: "100%" }}
                                            />
                                            <div style={{ fontSize: "14px" }}>
                                                {currentTimeFormatted} / {totalTimeFormatted}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <audio
                                        ref={audioRef}
                                        src={task.audioFiles[currentIndex] || undefined}
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
                            
                            <div className="message human">
                                <div className="text-title">O czym chodzi:</div>
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
                                                    disabled={task.answered}
                                                    style={{
                                                        marginTop: "0.75px"
                                                    }}
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
                                    <div className="options" style={{ display: "flex", justifyContent: "flex-end", cursor: "pointer" }}>
                                        <button
                                            style={{ width: "64px" }}
                                            className="btnOption"
                                            title="Wysłać Odpowiedź"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleSubmitTaskClick();
                                            }}
                                            disabled={isSubmittingAnswer}
                                        >
                                            <Check size={28} color="white" />
                                        </button>
                                    </div>
                                )}
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