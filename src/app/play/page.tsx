'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { ArrowLeft, Check, Trash2, Minus, Plus, BookOpen, LibraryBig, Lightbulb } from 'lucide-react';
import "@/app/styles/play.css";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import Message from "../components/message";
import FormatText from "../components/formatText";
import "@/app/styles/table.css";
import { getSubtopicTexts, ITask } from "../scripts/task";
import { ChatBlock, getLastMarker, parseChat, removeLastBlockOptimal } from "../scripts/chat";
import StatusIndicator from "../components/statusIndicator";
import { BsQuestion } from "react-icons/bs";
import Spinner from "../components/spinner";

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
    const [poradnikLoading, setPoradnikLoading] = useState(true);
    const [spinnerLoading, setSpinnerLoading] = useState(false);

    const [isChatEnd, setIsChatEnd] = useState(false);
    
    const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);

    const [chatTextValue, setChatTextValue] = useState("");
    const [chatBlocks, setChatBlocks] = useState<ChatBlock[]>([]);

    const [msgChatVisible, setMsgChatVisible] = useState<boolean>(false);
    const [msgDeleteTaskVisible, setMsgDeleteTaskVisible] = useState<boolean>(false);
    const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

    const [subtopicsExpanded, setSubtopicsExpanded] = useState(false);
    const [topicNoteExpanded, setTopicNoteExpanded] = useState(false);
    const [solutionGuideExpanded, setSolutionGuideExpanded] = useState(false);
    const [problemsExpanded, setProblemsExpanded] = useState(true);
    const [userOptionIndex, setUserOptionIndex] = useState<number | null>(null);

    const [textLoading, setTextLoading] = useState<string>("Pobieranie Zadania...");
    const [textGuideLoading, setTextGuideLoading] = useState<string>("Generowanie AI: Poradnika Rozwiązania Zadania...");
    const [solutionGuide, setSolutionGuide] = useState<string>("");
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
    const typingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTypedBlockIndexRef = useRef<number>(-1);

    const shouldScrollRef = useRef(true);

    const [showFinalBlocks, setShowFinalBlocks] = useState(false);
    const [isExplanationTyping, setIsExplanationTyping] = useState(false);
    const [typedExplanation, setTypedExplanation] = useState("");
    const [isTaskTextTyping, setIsTaskTextTyping] = useState(false);
    const [typedTaskText, setTypedTaskText] = useState("");
    const [isOptionsTyping, setIsOptionsTyping] = useState(false);
    const [typedOptions, setTypedOptions] = useState<string[]>([]);
    const explanationIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const taskTextIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const optionsIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setLoading(false);
        setIsProcessingChat(false);
        lastTypedBlockIndexRef.current = -1;
        setTempTypingBlocks([]);

        let currentBlockIndex = 0;
        let currentCharIndex = 0;
        const blocksToType = [...newRobotBlocks];
        
        const CHARS_PER_INTERVAL = 2;
        const TYPING_INTERVAL_MS = 8;

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
                const endIndex = Math.min(
                    currentCharIndex + CHARS_PER_INTERVAL, 
                    currentBlock.content.length
                );
                
                setTempTypingBlocks(prev => {
                    const updated = [...prev];
                    updated[currentBlockIndex] = {
                        ...updated[currentBlockIndex],
                        content: currentBlock.content.substring(0, endIndex)
                    };
                    return updated;
                });
                
                currentCharIndex = endIndex;
                
                if (shouldScrollRef.current && currentCharIndex % 20 === 0) {
                    scrollToBottom(true);
                }
            } else {
                currentBlockIndex++;
                currentCharIndex = 0;
                
                shouldScrollRef.current = true;
                scrollToBottom(true);
            }
        }, TYPING_INTERVAL_MS);
    }, []);

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
                    shouldScrollRef.current = true;
                    scrollToBottom(true);
                    resolve();  // ← Promise выполняется, печать окончена
                    return;
                }

                const endIndex = Math.min(currentIndex + CHARS_PER_INTERVAL, taskText.length);
                setTypedTaskText(taskText.substring(0, endIndex));
                currentIndex = endIndex;
                
                if (shouldScrollRef.current && currentIndex % 30 === 0) {
                    scrollToBottom(true);
                }
            }, TYPING_INTERVAL_MS);
        });
    }, []);

    const simulateOptionsTyping = useCallback((options: string[]) => {
        return new Promise<void>((resolve) => {
            if (optionsIntervalRef.current) {
                clearInterval(optionsIntervalRef.current);
                optionsIntervalRef.current = null;
            }

            setIsOptionsTyping(true);
            setTypedOptions(new Array(options.length).fill(""));
            
            let currentOptionIndex = 0;
            
            const CHARS_PER_INTERVAL = 2;
            const TYPING_INTERVAL_MS = 15;
            
            const typeNextOption = () => {
                if (currentOptionIndex >= options.length) {
                    setIsOptionsTyping(false);
                    shouldScrollRef.current = true;
                    scrollToBottom(true);
                    resolve();  // ← Promise выполняется, все варианты напечатаны
                    return;
                }
                
                const currentOption = options[currentOptionIndex];
                let currentCharIndex = 0;
                
                const typeOption = setInterval(() => {
                    if (currentCharIndex >= currentOption.length) {
                        clearInterval(typeOption);
                        currentOptionIndex++;
                        
                        setTimeout(typeNextOption, 200);
                        return;
                    }
                    
                    const endIndex = Math.min(currentCharIndex + CHARS_PER_INTERVAL, currentOption.length);
                    setTypedOptions(prev => {
                        const updated = [...prev];
                        updated[currentOptionIndex] = currentOption.substring(0, endIndex);
                        return updated;
                    });
                    
                    currentCharIndex = endIndex;
                    
                    if (shouldScrollRef.current && currentCharIndex % 30 === 0) {
                        scrollToBottom(true);
                    }
                }, TYPING_INTERVAL_MS);
            };
            
            typeNextOption();
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
                    
                    shouldScrollRef.current = true;
                    scrollToBottom(true);
                    resolve();
                    return;
                }

                const endIndex = Math.min(currentIndex + CHARS_PER_INTERVAL, explanation.length);
                setTypedExplanation(explanation.substring(0, endIndex));
                currentIndex = endIndex;
                
                if (shouldScrollRef.current && currentIndex % 30 === 0) {
                    scrollToBottom(true);
                }
            }, TYPING_INTERVAL_MS);
        });
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
                let outputSubtopics: string[] = [];
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { text: "", outputSubtopics: [] };

                    const response = await api.post<any>(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-generate`,
                        { changed, errors, attempt, text, outputSubtopics },
                        { signal: activeSignal } as any
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
                setLoading(false);
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
            setLoading(true);
            setTextLoading("Generowanie AI: Rozwiązania Zadania...");

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

                    const response = await api.post<any>(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/solution-generate`,
                        { changed, errors, attempt, subtopics, text, solution },
                        { signal: activeSignal } as any
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
                setLoading(false);
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
            setLoading(true);
            setTextLoading("Generowanie AI: Wariantów Zadania...");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let options: string[] = [];
                let correctOptionIndex: number = 0;
                const MAX_ATTEMPTS = 0;
                const randomOption: number = Math.floor(Math.random() * 4) + 1;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { options: [] };

                    const response = await api.post<any>(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/options-generate`,
                        { changed, errors, attempt, text, subtopics, solution, options, correctOptionIndex, randomOption },
                        { signal: activeSignal } as any
                    );

                    if (activeSignal?.aborted) return { options: [], correctOptionIndex: 0 };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        text = response.data.text;
                        solution = response.data.solution;
                        options = response.data.options;
                        correctOptionIndex = response.data.correctOptionIndex;
                        attempt = response.data.attempt;
                        console.log(`Generowanie wariantów zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się wygenerować wariantów zadania");
                        break;
                    }
                }

                return { options, correctOptionIndex };
            } catch (error: unknown) {
                setLoading(false);
                if ((error as DOMException)?.name === "AbortError") return { options: [], correctOptionIndex: 0 };
                handleApiError(error);
                return { options: [], correctOptionIndex: 0 };
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
                    taskSubtopics
                },
                { signal } as any
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
            setLoading(true);
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

                    const response = await api.post<any>(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/problems-generate`,
                        { changed, errors, attempt, text, solution, options, correctOption, userOption, userSolution, subtopics: taskSubtopics, outputSubtopics, explanation },
                        { signal: activeSignal } as any
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
                setLoading(false);
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
        taskId: number,
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

        const style = localStorage.getItem('style') === 'true' ? true : false;

        try {
            let changed = "true";
            let attempt = 0;
            let errors: string[] = [];
            const MAX_ATTEMPTS = 2;

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                if (activeSignal?.aborted) return { chat, userSolution, chatFinished };

                const response = await api.post<any>(
                    `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/chat-generate`,
                    { changed, errors, attempt, text, solution, chat, userSolution, chatFinished, mode, subtopics, options, userOption, correctOption, style },
                    { signal: activeSignal } as any
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
            showAlert(400, "Zadanie nie jest dostępne");
            return;
        }

        try {
            const response = await api.put<any>(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/chat`,
                {
                    chat,
                    chatFinished,
                    userSolution,
                    mode
                },
                { signal } as any
            );

            if (response.data?.statusCode !== 200) {
                setLoading(false);
                showAlert(400, "Nie udało się zaktualizować czat");
            }
        } catch (error) {
            setLoading(false);
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
            setLoading(true);
            setTextLoading("Zapisywanie Rozwiązania...");

            const taskUserSolutionResponse = await api.put<any>(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/user-solution`,
            {
                userSolution,
                userOptionIndex
            },
            { signal } as any
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
            const response = await api.post<any>(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${id}/subtopicsProgress-transaction`,
                {
                    subtopics,
                    explanation
                },
                { signal } as any
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

    const handleTaskFinishedTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        id: number,
        signal?: AbortSignal
    ) => {
        try {
            const response = await api.put<any>(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${id}/finished`, { signal } as any);

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

    const handleSolutionGuideGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, taskId: number, signal?: AbortSignal) => {
            setPoradnikLoading(true);
            setTextGuideLoading("Generowanie AI: Poradnika Rozwiązania Zadania...");

            const controller = !signal ? new AbortController() : null;
            if (controller) controllersRef.current.push(controller);
            const activeSignal = signal ?? controller?.signal;

            try {
                let changed = "true";
                let attempt = 0;
                let errors: string[] = [];
                let solutionGuide: string = "";
                const MAX_ATTEMPTS = 2;

                while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                    if (activeSignal?.aborted) return { solutionGuide: "" };

                    const response = await api.post<any>(
                        `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/solution-guide-generate`,
                        { changed, errors, attempt, solutionGuide },
                        { signal: activeSignal } as any
                    );

                    if (activeSignal?.aborted) return { text: "", outputSubtopics: [] };

                    if (response.data?.statusCode === 201) {
                        changed = response.data.changed;
                        errors = response.data.errors;
                        solutionGuide = response.data.solutionGuide;
                        attempt = response.data.attempt;
                        console.log(`Generowanie poradnika rozwiązania zadania: Próba ${attempt}`);
                    } else {
                        showAlert(400, "Nie udało się zgenerować treści zadania");
                        break;
                    }
                }

                return { solutionGuide };
            } catch (error: unknown) {
                setPoradnikLoading(false);
                if ((error as DOMException)?.name === "AbortError") return { solutionGuide: "" };
                handleApiError(error);
                return { solutionGuide: "" };
            } finally {
                if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
            }
        }, []
    );

    const handleTaskSolutionGuideSave = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        solutionGuide: string,
        signal?: AbortSignal
    ) => {
        try {
            setPoradnikLoading(true);
            setTextGuideLoading("Zapisywanie Poradnika Rozwiązania Zadania...");

            const taskSolutionGuideResponse = await api.put<any>(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/solution-guide`,
                {
                    solutionGuide
                },
                { signal } as any
            );

            if (taskSolutionGuideResponse.data?.statusCode !== 200) {
                showAlert(400, `Nie udało się zapisać poradnik`);
            }
        }
        catch (error: unknown) {
            setPoradnikLoading(false);
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
                    newTask.id,
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
                    userSolution,
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

                setLoading(false);
                setIsProcessingChat(false);
                
                const newChatBlocks = parseChat(newChat);
                const newRobotBlocks = getNewRobotBlocks(newChatBlocks, parseChat(newTask.chat));
                
                if (newRobotBlocks.length > 0)
                    simulateTypingForRobotBlocks(newRobotBlocks);

                newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);
                setTask(prev => ({
                    ...prev,
                    explanation: newTask.explanation,
                    percent: newTask.percent,
                    subtopics: newTask.subtopics
                }));
            }
            
            if (newTask.chatFinished) {
                await handleTaskFinishedTransaction(subjectId, sectionId, topicId, newTask.id);

                if (signal?.aborted) return;
        
                newTask = await fetchTaskById(subjectId, sectionId, topicId, taskId, signal);
                setTask(newTask);

                return;
            }
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") return;
            setLoading(false);
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

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, "", [], 0, taskSubtopics, signal);
            }

            let newTask = await fetchPendingTask(subjectId, sectionId, topicId, signal);
            if (!newTask) {
                return;
            }

            const taskId = newTask.id;

            localStorage.setItem("taskId", taskId);

            text = newTask.text ?? "";
            taskSubtopics = newTask.subtopics?.map((sub: Subtopic) => sub.name) ?? [];

            setTask(newTask);

            if (text) {
                setLoading(false);
                await simulateTaskTextTyping(text);
            }

            if (stage < 2) {
                const solution = await handleSolutionGenerate(subjectId, sectionId, topicId, taskSubtopics, text, signal);

                if (!solution) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować rozwiązania");
                    return;
                }

                stage = 2;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, solution, [], 0, taskSubtopics, signal, taskId);
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
                const correctOptionIndex = optionsResult.correctOptionIndex ?? 0;

                if (!options.length || options.length != 4) {
                    setLoading(false);
                    showAlert(400, "Nie udało się wygenerować wariantów odpowiedzi");
                    return;
                }

                stage = 3;

                await handleSaveTaskTransaction(subjectId, sectionId, topicId, stage, text, solution, options, correctOptionIndex, taskSubtopics, signal, taskId);
            
                setTask(prev => ({
                    ...prev,
                    options: options,
                    correctOptionIndex: correctOptionIndex
                }));

                if (options) {
                    setLoading(false);
                    await simulateOptionsTyping(options);
                }
            }
        } catch (error) {
            setLoading(false);
            handleApiError(error);
        }
    }, [handleTextGenerate, handleSolutionGenerate, handleOptionsGenerate, handleSaveTaskTransaction, simulateTaskTextTyping, simulateOptionsTyping]);

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

            setLoading(true);
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
                setSolutionGuide(finalTask.solutionGuide ?? "");
                setChatBlocks(parseChat(finalTask.chat));
                
                setShowFinalBlocks(true);
                
                if (finalTask.explanation) {
                    setLoading(false);
                    await simulateExplanationTyping(finalTask.explanation);
                }
            }
        }
        catch (error) {
            setIsProcessingChat(false);
            setLoading(false);
            setChatTextValue("");
            handleApiError(error);
        }
        finally {
            setLoading(false);
            setIsProcessingChat(false);
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

                    if (!task) {
                        localStorage.removeItem("taskId");
                        return;
                    }

                    setUserOptionIndex(task.userOptionIndex ?? 0)
                    setTask(task);
                    setSolutionGuide(task.solutionGuide ?? "");
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
                setSolutionGuide(task.solutionGuide ?? "");
                setUserOptionIndex(task.userOptionIndex ?? 0);
                setChatBlocks(parseChat(task.chat));

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
            if (taskTextIntervalRef.current) {
                clearInterval(taskTextIntervalRef.current);
            }
            if (optionsIntervalRef.current) {
                clearInterval(optionsIntervalRef.current);
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

    const adjustTextareaRows = () => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const main = document.querySelector("main");
            const scrollTop = main?.scrollTop ?? window.scrollY;

            textarea.style.height = "auto";
            textarea.style.height = textarea.scrollHeight + "px";

            if (main) main.scrollTop = scrollTop;
            else window.scrollTo(0, scrollTop);
        }
    };

    const handleChatInput = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        setChatTextValue(target.value);
        adjustChatTextareaRows();
    };

    const handleUserSolutionInput = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        setTask(prev => ({
            ...prev,
            userSolution: target.value
        }));
        adjustTextareaRows();
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

        setLoading(true);
        setIsProcessingChat(true);
        
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
                setSolutionGuide(updatedTask.solutionGuide ?? "");
            }

        } catch (error: unknown) {
            if ((error as DOMException)?.name === "AbortError") {
                setChatBlocks(prev => prev.filter(block => 
                    !block.isUser || block.content !== userMessage
                ));
                return;
            }
            setLoading(false);
            setIsProcessingChat(false);
            handleApiError(error);
        } finally {
            setLoading(false);
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

                setLoading(true);
                setTextLoading("Zapisywanie rozwiązania...");

                const currentTaskId = task.id;
                const currentSubjectId = subjectId;
                const currentSectionId = sectionId;
                const currentTopicId = topicId;
                const currentUserOptionIndex = userOptionIndex;

                await handleTaskUserSolutionSave(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    currentTaskId ?? 0,
                    task.userSolution,
                    currentUserOptionIndex ?? 0,
                    signal
                );

                if (signal.aborted) return;

                setTask(prev => ({
                    ...prev,
                    answered: true,
                    userOptionIndex: currentUserOptionIndex ?? 0
                }));

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

                setLoading(true);
                setTextLoading("Przetwarzanie Czatu AI...");

                await loadChat(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    newTask.id,
                    signal
                );

                const finalTask = await fetchTaskById(
                    currentSubjectId ?? 0,
                    currentSectionId ?? 0,
                    currentTopicId ?? 0,
                    newTask.id,
                    signal
                );

                if (finalTask) {
                    setTask(finalTask);
                    setSolutionGuide(finalTask.solutionGuide ?? "");
                }
            } catch (error: unknown) {
                if ((error as DOMException)?.name === "AbortError") return;
                setLoading(false);
                setIsProcessingChat(false);
                handleApiError(error);
            } finally {
                setIsProcessingChat(false);
                setIsSubmittingAnswer(false);

                controllersRef.current = controllersRef.current.filter(c => c !== controller);
                controllerRef.current = null;
            }
        }
    }, [task.id, task.answered, task.userSolution, userOptionIndex, subjectId, sectionId, topicId, isSubmittingAnswer, handleTaskUserSolutionSave, fetchPendingTask, loadChat, fetchTaskById]);

    useEffect(() => {
        if (task?.options.length > 0 && task?.answered === false && task?.finished === false) {
            setUserOptionIndex(0);
        }
    }, [task?.options, task?.answered, task?.finished]);

    const handleDeleteTask = useCallback(async() => {
        try {
            const response = await api.delete<any>(`/subjects/${subjectId}/tasks/${task.id}`);

            if (response.data?.statusCode === 200) {
                showAlert(response.data.statusCode, response.data.message);
            } else {
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

                {spinnerLoading ? (
                    <div className="spinner-wrapper">
                        <Spinner text={textLoading} />
                    </div>
                ) : (
                    <div className="play-container" ref={containerRef}>
                        <div className="chat">
                            {task.subtopics.length > 0 && (
                                <div className={`message human ${task.status}`}>
                                    <div
                                        className="text-title"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            fontWeight: "bold"
                                        }}
                                        onClick={() => setSubtopicsExpanded(prev => !prev)}
                                    >
                                        <div
                                            className="btnElement"
                                            style={{
                                                marginRight: "4px",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {subtopicsExpanded ? <Minus size={26} /> : <Plus size={26} />}
                                        </div>
                                        {task.finished ? (
                                            <div className="text-title">
                                                <FormatText content={`Ocena: ${task.percent}%`} />
                                            </div>
                                        ) : "Podtematy:"}
                                    </div>
                                    {subtopicsExpanded && (
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
                                    )}
                                </div>
                            )}
                            {task.topicNote != "" && (
                            <div className="message robot" style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                            }}>
                                <div className="element-name" style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    flexDirection: "column",
                                    gap: "6px"
                                }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                        }}>
                                        <div
                                            className="btnOption"
                                            style={{
                                                marginRight: "12px",
                                                fontWeight: "bold",
                                            }}
                                            onClick={() => setTopicNoteExpanded((prev) => !prev)}
                                        >
                                            {topicNoteExpanded ? <Minus size={26} /> : <BookOpen size={26} />}
                                        </div>
                                        {task.topicName ?? ""}
                                    </div>
                                </div>
                                {topicNoteExpanded && (
                                    <div className="topic-note" style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                        <br />
                                        <FormatText content={task.topicNote ?? ""} />
                                        <br />
                                    </div>
                                )}
                                {task.literatures.length > 0 ? (
                                    <div className="element-name" style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                        flexDirection: "column",
                                        gap: "6px"
                                    }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}
                                        >
                                            <div
                                                className="btnOption"
                                                style={{
                                                    marginRight: "12px",
                                                    fontWeight: "bold",
                                                }}
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
                                                <LibraryBig size={26} />
                                            </div>
                                            {"Streszczenie"}
                                        </div>
                                </div>) : null}
                                {task.text != "" && (<div className="element-name"  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    flexDirection: "column",
                                    gap: "6px"
                                }} onClick={async () => {
                                    setSolutionGuideExpanded(prev => !prev);

                                    if (solutionGuide === "") {
                                        if (controllerRef.current) controllerRef.current.abort();

                                        const controller = new AbortController();
                                        controllersRef.current.push(controller);
                                        const signal = controller.signal;

                                        const solutionGuideResult = await handleSolutionGuideGenerate(
                                            subjectId ?? 0,
                                            sectionId ?? 0,
                                            topicId ?? 0,
                                            task.id,
                                            signal
                                        );

                                        const newSolutionGuide = solutionGuideResult?.solutionGuide ?? "";

                                        await handleTaskSolutionGuideSave(
                                            subjectId ?? 0,
                                            sectionId ?? 0,
                                            topicId ?? 0,
                                            task.id,
                                            newSolutionGuide,
                                            signal
                                        );

                                        setSolutionGuide(newSolutionGuide);
                                    }

                                    setPoradnikLoading(false);
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px"
                                    }}>
                                        <div className="btnOption" style={{
                                            marginRight: "12px",
                                            fontWeight: "bold",
                                            backgroundColor: "darkgreen"
                                        }}>
                                            {solutionGuideExpanded ? <Minus size={26} /> : <Lightbulb size={26} />}
                                        </div>
                                        Poradnik Rozwiązania Zadania:
                                    </div>
                                </div>)}
                                {solutionGuideExpanded && (<>
                                    {solutionGuide !== "" ? (
                                        <div className="topic-note" style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                            <br />
                                            <FormatText content={solutionGuide ?? ""} />
                                            <br />
                                        </div>
                                    ) : (
                                        <div className="topic-note" style={{ paddingLeft: "20px", marginTop: "8px" }}>
                                            <br />
                                            <StatusIndicator text={textGuideLoading} />
                                            <br />
                                        </div>
                                    )}
                                </>)}
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
                            {task.options.length != 0 && (<div className="message human">
                                <div className="text-title" style={{ fontSize: "20px" }}>Warianty:</div>
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
                                                <span>
                                                    {isOptionsTyping ? (
                                                        <FormatText content={typedOptions[index] || ""} />
                                                    ) : (
                                                        <FormatText content={option ?? ""} />
                                                    )}
                                                </span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {!task.answered ? (
                                    <>
                                        <div className="text-title">Rozwiązanie:</div>
                                        <textarea
                                            ref={textareaRef}
                                            placeholder={`Napisz rozwiązanie...`}
                                            className="answer-block"
                                            style={{ marginTop: "0px" }}
                                            value={task.userSolution}
                                            onInput={handleUserSolutionInput}
                                            rows={1}
                                            name="userSolution"
                                            id="userSolution"
                                        />
                                    </>
                                ) : !isEmptyString(task.userSolution) && (<>
                                    <div className="text-title">Rozwiązanie:</div>
                                    <div className="answer-block readonly" style={{ marginTop: "8px" }}>
                                        <FormatText content={task.userSolution} />
                                    </div>
                                </>)}
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
                            </div>)}
                            
                            {task.answered && allDisplayBlocks.length != 0 && (
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
                                            {!isTyping && !loading && !isProcessingChat && (
                                                <div className="options" style={{ display: "flex", cursor: "pointer", gap: "6px", marginTop: "8px" }}>                            
                                                    {isEmptyString(chatTextValue) && (<button
                                                        className={`btnOption ${task.status == "completed" ? "completed" : "progress"}`}
                                                        style={{
                                                            height: "44px",
                                                            fontSize: "16px",
                                                            border: "1px solid black"
                                                        }}
                                                        title={`Zakończ`}
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            setMsgChatVisible(true);
                                                        }}
                                                    >
                                                        {`Zakończ ${Math.round(task.percent)}%`}
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
                                                            className={`btnOption darkgreen`}
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
                            
                            {loading && (
                                <StatusIndicator text={textLoading} />
                            )}
                            
                            {(task.finished || showFinalBlocks) && (
                            <>
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
                            </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}