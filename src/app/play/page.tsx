'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Mic, Type, Play, Pause, X, ArrowUp } from 'lucide-react';
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import RadioMessage from "@/app/components/radioMessage";
import Message from "../components/message";
import FormatText from "../components/formatText";
import axios from "axios";

// subTask Add

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

interface Task {
    text: string;
    solution: string;
    options: string[];
    subtopics: Subtopic[];
    correctOptionIndex: number;
    userOptionIndex: number;
    userSolution: string;
}

export default function PlayPage() {
    const router = useRouter();
    const [transcribeLoading, setTranscribeLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [insertPosition, setInsertPosition] = useState<InsertPosition>(InsertPosition.None);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    const [isMicMode, setIsMicMode] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [transcribes, setTranscribes] = useState<string[]>([]);

    const [textValue, setTextValue] = useState("");
    const [sentences, setSentences] = useState<string[]>([]);
    const [selectedSentences, setSelectedSentences] = useState<number[]>([]);

    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [msgVisible, setMsgVisible] = useState<boolean>(false);
    const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);
    const [selectedSentencesWasEmpty, setSelectedSentencesWasEmpty] = useState<boolean>(false);

    const [userOptionIndex, setUserOptionIndex] = useState(0);

    const maxHeight = 180;
    const maxHeightMobile = 120;

    const [textLoading, setTextLoading] = useState<string>("");

    const [task, setTask] = useState<Task>();

    const scrollToBottom = () => {
        if (!containerRef.current) return;
        requestAnimationFrame(() => {
            if (containerRef.current) {
                containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
            }
        });
    };

    const fixHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const isMobile = window.innerWidth <= 768;
        const height = isMobile ? maxHeightMobile : maxHeight;

        textarea.style.height = `${height}px`;
        textarea.style.overflowY = 'scroll';
    };

   const fetchPendingTask = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, signal?: AbortSignal) => {
        setTextLoading("Pobieranie zadania");

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

        try {
            const response = await api.get(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/pending`,
                { signal }
            );

            if (response.data?.statusCode === 200) {
                return response.data.task ?? null;
            }

            return null;
        } catch (error) {
            console.error(error);
            handleApiError(error);
            return null;
        }
    }, []);

    const handleTextGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, signal?: AbortSignal) => {
        setTextLoading("Generowanie treści zadania");

        try {
            let changed: string = "true";
            let attempt: number = 0;
            let text: string = "";
            let errors: string[] = [];
            let outputSubtopics: string[] = [];
            const MAX_ATTEMPTS = 2; // Модно поменять на 10

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                const taskTextResponse = await api.post(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-generate`,
                {
                    changed,
                    errors,
                    attempt,
                    text,
                    outputSubtopics,
                },
                { signal }
                );

                if (taskTextResponse.data?.statusCode === 201) {
                    changed = taskTextResponse.data.changed;
                    errors = taskTextResponse.data.errors;
                    text = taskTextResponse.data.text;
                    outputSubtopics = taskTextResponse.data.outputSubtopics;
                    attempt = taskTextResponse.data.attempt;
                    console.log(`Generowanie treści zadania: Próba ${attempt}`);
                } else {
                    showAlert(400, `Nie udało się zgenerować treści zadania`);
                    break;
                }
            }

            return {
                text,
                outputSubtopics
            }
        }
        catch (error: unknown) {
            console.log(error);
            handleApiError(error);
            return {
                text: "",
                outputSubtopics: []
            }
        }
    },[]);

    const handleSolutionGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, text: string, signal?: AbortSignal) => {
        setTextLoading("Generowanie rozwiązania zadania");

        try {
            let changed: string = "true";
            let attempt: number = 0;
            let errors: string[] = [];
            let solution: string = "";
            const MAX_ATTEMPTS = 2; // Модно поменять на 10

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                const taskSolutionResponse = await api.post(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/solution-generate`,
                {
                    changed,
                    errors,
                    attempt,
                    text,
                    solution
                },
                { signal }
                );

                if (taskSolutionResponse.data?.statusCode === 201) {
                    changed = taskSolutionResponse.data.changed;
                    errors = taskSolutionResponse.data.errors;
                    text = taskSolutionResponse.data.text;
                    solution = taskSolutionResponse.data.solution;
                    attempt = taskSolutionResponse.data.attempt;
                    console.log(`Generowanie rozwiązania zadania: Próba ${attempt}`);
                } else {
                    showAlert(400, `Nie udało się zgenerować rozwiązania zadania`);
                    break;
                }
            }

            return solution;
        }
        catch (error: unknown) {
            handleApiError(error);
            console.log(error);
            return "";
        }
    },[]);

    const handleOptionsGenerate = useCallback(
        async (subjectId: number, sectionId: number, topicId: number, text: string, solution: string, signal?: AbortSignal) => {
        setTextLoading("Generowanie wariantów zadania");

        try {
            let changed: string = "true";
            let attempt: number = 0;
            let errors: string[] = [];
            let options: string[] = [];
            let correctOptionIndex: number = 0;
            const MAX_ATTEMPTS = 2; // Модно поменять на 10

            while (changed === "true" && attempt <= MAX_ATTEMPTS) {
                const taskOptionsResponse = await api.post(
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/options-generate`,
                {
                    changed,
                    errors,
                    attempt,
                    text,
                    solution,
                    options,
                    correctOptionIndex
                },
                { signal }
                );

                if (taskOptionsResponse.data?.statusCode === 201) {
                    changed = taskOptionsResponse.data.changed;
                    errors = taskOptionsResponse.data.errors;
                    text = taskOptionsResponse.data.text;
                    solution = taskOptionsResponse.data.solution;
                    options = taskOptionsResponse.data.options;
                    correctOptionIndex = taskOptionsResponse.data.correctOptionIndex;
                    solution = taskOptionsResponse.data.solution;
                    attempt = taskOptionsResponse.data.attempt;
                    console.log(`Generowanie wariantów zadania: Próba ${attempt}`);
                } else {
                    showAlert(400, `Nie udało się zgenerować wariantów zadania`);
                    break;
                }
            }

            return {
                options,
                correctOptionIndex
            };
        }
        catch (error: unknown) {
            handleApiError(error);
            console.log(error);
            return {
                options: [],
                correctOptionIndex: 0
            };
        }
    },[]);

    const handleSaveTaskTransaction = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        text: string,
        solution: string,
        options: string[],
        taskSubtopics: string[],
        correctOptionIndex: number,
        signal?: AbortSignal
    ) => {
        setTextLoading("Generowanie wariantów zadania");

        try {
            const response = await api.post(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/task-transaction`,
                {
                    text,
                    solution,
                    options,
                    correctOptionIndex,
                    taskSubtopics
                },
                { signal }
            );

            if (response.data?.statusCode === 201) {
                showAlert(200, "Zadanie zapisane pomyślnie");
            } else {
                showAlert(400, "Nie udało się zapisać zadania");
            }
        }
        catch (error: unknown) {
            handleApiError(error);
            console.log(error);
        }
    }, []);

    function handleApiError(error: unknown) {
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

    const loadTask = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        signal?: AbortSignal
    ) => {
        try {
            const taskResult = await handleTextGenerate(
                subjectId,
                sectionId,
                topicId,
                signal
            );
            const text: string = taskResult?.text ?? "";
            const taskSubtopics: string[] = taskResult?.outputSubtopics ?? [];

            if (!text) {
                showAlert(400, "Nie udało się wygenerować treści zadania");
                return;
            }

            const solution: string = await handleSolutionGenerate(
                subjectId,
                sectionId,
                topicId,
                text,
                signal
            );
            
            if (!solution) {
                showAlert(400, "Nie udało się wygenerować rozwiązania");
                return;
            }

            const optionsResult = await handleOptionsGenerate(
                subjectId,
                sectionId,
                topicId,
                text,
                solution,
                signal
            );
            const options: string[] = optionsResult.options ?? [];
            const correctOptionIndex: number = optionsResult.correctOptionIndex ?? 0;

            if (!options.length) {
                showAlert(400, "Nie udało się wygenerować wariantów odpowiedzi");
                return;
            }

            await handleSaveTaskTransaction(
                subjectId,
                sectionId,
                topicId,
                text,
                solution,
                options,
                taskSubtopics,
                correctOptionIndex,
                signal
            );
        } catch (error) {
            handleApiError(error);
            console.error(error);
        }
    }, [handleTextGenerate, handleSolutionGenerate, handleOptionsGenerate, handleSaveTaskTransaction]);

    useEffect(() => {
        setLoading(true);

        if (loadedRef.current) return;
        loadedRef.current = true;

        if (typeof window === "undefined") return;

        const sId = localStorage.getItem("subjectId");
        const secId = localStorage.getItem("sectionId");
        const tId = localStorage.getItem("topicId");

        if (!sId || !secId || !tId) {
            showAlert(400, "Nie udało się pobrać ID");
            return;
        }

        const subjectId = Number(sId);
        const sectionId = Number(secId);
        const topicId = Number(tId);

        const controller = new AbortController();

        const fetchTask = async () => {
            const task = await fetchPendingTask(
                subjectId,
                sectionId,
                topicId,
                controller.signal
            );

            if (task) {
                setTask({
                    text: task.text ?? "",
                    solution: task.solution ?? "",
                    options: task.options ?? [],
                    correctOptionIndex: task.correctOptionIndex ?? 0,
                    subtopics: task.subtopics ?? [],
                    userSolution: "",
                    userOptionIndex: 0
                });
            } else {
                await loadTask(subjectId, sectionId, topicId, controller.signal);
                const newTask = await fetchPendingTask(subjectId, sectionId, topicId, controller.signal);
                if (newTask) {
                    setTask({
                        text: newTask.text ?? "",
                        solution: newTask.solution ?? "",
                        options: newTask.options ?? [],
                        correctOptionIndex: newTask.correctOptionIndex ?? 0,
                        subtopics: newTask.subtopics ?? [],
                        userSolution: "",
                        userOptionIndex: 0
                    });
                }
                else {
                    setTask({
                        text: "",
                        solution: "",
                        options: [],
                        correctOptionIndex: 0,
                        subtopics: [],
                        userSolution: "",
                        userOptionIndex: 0
                    });
                }
            }

            setLoading(false);
        };

        fetchTask();
    }, [fetchPendingTask, loadTask]);

    useEffect(() => {
        setInsertPosition(InsertPosition.None);
        setMsgVisible(false);

        setMainHeight();
        fixHeight();

        const handleResize = () => {
            setMainHeight();
            fixHeight();
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
            splitIntoSentences(savedAnswer)
                .then(sentences => setSentences(sentences))
                .catch(() => setSentences([]));
            setSelectedSentences([0]);
        }
    }, []);

    useEffect(() => {
        if (containerRef.current && !loading && !transcribeLoading) {
            scrollToBottom();
        }
    }, [sentences, transcribes, loading, transcribeLoading]);

    const splitIntoSentences = async (text: string): Promise<string[]> => {
        try {
            const response = await api.post("/options/split-into-sentences", { text });

            const sentences = response.data?.sentences;

            if (Array.isArray(sentences) && sentences.every(item => typeof item === 'string')) {
                return sentences;
            }

            return [];
        } catch {
            return [];
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setTextValue(newValue);
        splitIntoSentences(newValue)
            .then(sentences => setSentences(sentences))
            .catch(() => setSentences([]));
        fixHeight();
        localStorage.setItem("answerText", newValue);
    };

    const handleBackClick = () => {
        router.push("/sections");
    };

    const toggleInputMode = () => {
        setIsMicMode(prev => !prev);
        const savedAnswer = localStorage.getItem("answerText");

        if (savedAnswer) {
            setTextValue(savedAnswer);
            splitIntoSentences(savedAnswer)
                .then(sentences => setSentences(sentences))
                .catch(() => setSentences([]));
            setSelectedSentences([0]);
        }
        else {
            setTextValue("");
            setSentences([]);
            setSelectedSentences([]);
        }
    };

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

                if (insertPosition === InsertPosition.None) {
                    const newTextValue = newTranscribes.join(" ");
                    setTranscribes(prev => [...prev, ...newTranscribes]);
                    setTextValue(newTextValue);
                    splitIntoSentences(newTextValue)
                        .then(sentences => setSentences(sentences))
                        .catch(() => setSentences([]));
                    fixHeight();
                    localStorage.setItem("answerText", newTextValue);
                }
                else if (insertPosition === InsertPosition.Przed) {
                    const newSentences = await splitIntoSentences(newTranscribes.join(" "));
                    setTranscribes(prev => [...prev, ...newTranscribes]);
                    const minIndex = Math.min(...selectedSentences);
                    const updatedSentences = [...sentences];
                    updatedSentences.splice(minIndex, 0, ...newSentences);
                    const newTextValue = updatedSentences.join(" ");
                    setSentences(updatedSentences);
                    setTextValue(newTextValue);
                    fixHeight();
                    localStorage.setItem("answerText", newTextValue);
                }
                else if (insertPosition === InsertPosition.Zamiast) {
                    const newSentences = await splitIntoSentences(newTranscribes.join(" "));
                    setTranscribes(prev => [...prev, ...newTranscribes]);
                    const minIndex = Math.min(...selectedSentences);
                    const maxIndex = Math.max(...selectedSentences);
                    const updatedSentences = [...sentences];
                    updatedSentences.splice(minIndex, maxIndex - minIndex + 1, ...newSentences);
                    const newTextValue = updatedSentences.join(" ");
                    setSentences(updatedSentences);
                    setTextValue(newTextValue);
                    fixHeight();
                    localStorage.setItem("answerText", newTextValue);
                    setSelectedSentences([0]);
                }
                else if (insertPosition === InsertPosition.Po) {
                    const newSentences = await splitIntoSentences(newTranscribes.join(" "));
                    setTranscribes(prev => [...prev, ...newTranscribes]);
                    const maxIndex = Math.max(...selectedSentences);
                    const updatedSentences = [...sentences];
                    updatedSentences.splice(maxIndex + 1, 0, ...newSentences);
                    const newTextValue = updatedSentences.join(" ");
                    setSentences(updatedSentences);
                    setTextValue(newTextValue);
                    fixHeight();
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
        if (!isMicMode) return;

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
                            <div className="message robot">
                                <br />
                                <div style={{fontWeight: "bold"}}>Tekst zadania:</div>
                                <br />
                                <div style={{paddingLeft: "20px"}}><FormatText content={task?.text ?? ""} /></div>
                                <br />
                                <div style={{fontWeight: "bold"}}>Warianty odpowiedzi:</div>
                                <br />
                                <div style={{paddingLeft: "20px", margin: "0px"}} className="radio-group">
                                    {task?.options?.map((option, i) => (
                                        <label key={i} className="radio-option" style={{marginBottom: "12px"}}>
                                            <input
                                                type="radio"
                                                name="userOption"
                                                value={i}
                                                checked={userOptionIndex === i}
                                                onChange={() => setUserOptionIndex(i)}
                                            />
                                            <span><FormatText content={option ?? ""} /></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="message human">Nie chcę tego rozwiązać!</div>
                        </div>

                        <div className="answer-block">
                            {!isMicMode ? (
                                <textarea
                                    ref={textareaRef}
                                    className="message answer"
                                    placeholder="Wpisz rozwiązanie..."
                                    onInput={handleInput}
                                    value={textValue}
                                    rows={1}
                                />
                            ) : (
                                <div className="message answer sentences">
                                    {sentences.map((sentence, i) => {
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
                                    })}
                                </div>
                            )}
                            <div className="bottom-bar">
                                <div className="bottom-bar-options">
                                    <div
                                        className="bottom-icon-button"
                                        title={isMicMode ? "Mikrofon (włączony)" : "Wpisz tekst"}
                                        onClick={toggleInputMode}
                                    >
                                        {isMicMode ? <Mic size={28} color="white" /> : <Type size={28} color="white" />}
                                    </div>
                                    <div
                                        className={`bottom-icon-button ${!isMicMode ? "disabled" : ""}`}
                                        title={isPlaying ? "Pauza" : "Start"}
                                        onClick={togglePlayPause}
                                        style={{ cursor: isMicMode ? "pointer" : "not-allowed" }}
                                    >
                                        {isPlaying ? <Pause size={28} color="white" /> : <Play size={28} color="white" />}
                                    </div>
                                    <div
                                        className="bottom-icon-button"
                                        title="Usuń"
                                        style={{ cursor: "pointer" }}
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
                                    </div>
                                </div>
                                <div
                                    className="bottom-icon-button"
                                    title={"Wysłać Odpowiedź"}
                                    onClick={() => {
                                        scrollToBottom();
                                    }}
                                >
                                    <ArrowUp size={28} color="white" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}