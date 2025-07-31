'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { Home, ArrowLeft, Mic, Type, Play, Pause, X, ArrowUp } from 'lucide-react';
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import RadioMessage from "@/app/components/radioMessage";
import Message from "../components/message";

// setTimeout -> x

enum InsertPosition {
    None = 'None',
    Przed = 'Przed',
    Zamiast = 'Zamiast',
    Po = 'Po',
}

export default function PlayPage() {
    const router = useRouter();
    const [transcribeLoading, setTranscribeLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [insertPosition, setInsertPosition] = useState<InsertPosition>(InsertPosition.None);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

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

    const maxHeight = 180;
    const maxHeightMobile = 120;

    const scrollToBottom = () => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    };

    const fixHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const isMobile = window.innerWidth <= 768;
        const height = isMobile ? maxHeightMobile : maxHeight;

        textarea.style.height = `${height}px`;
        textarea.style.overflowY = 'scroll';
    };

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

        setTimeout(() => {
            setLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        if (!transcribeLoading) {
            scrollToBottom();
            fixHeight();
        }
    }, [transcribes, transcribeLoading]);

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

    const handleHomeClick = () => {
        localStorage.removeItem("subjectId");
        localStorage.removeItem("answerText");
        router.push("/");
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
                <div className="menu-icons" style={{ justifyContent: "flex-start" }}>
                    <div className="menu-icon" title="Strona Główna" onClick={handleHomeClick} style={{ cursor: "pointer" }}>
                        <Home size={28} color="white" />
                    </div>
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
                        <Spinner visible={true} text={transcribeLoading ? "Przetwarzanie audio na tekst..." : ""} />
                    </div>
                ) : (
                    <div className="play-container">
                        <div className="chat" ref={chatRef}>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
                            <div className="message robot">Zadanie od ChatGPT</div>
                            <div className="message human">Rozwiązanie zadania od ChatGPT</div>
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
                                    onClick={() => {}}
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