'use client';

import Header from "@/app/components/header";
import { ArrowLeft, Minus, Play, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import "@/app/styles/components.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import React from "react";
import Message from "../components/message";
import { Status } from "../scripts/task";
import FormatText from "../components/formatText";
import StatusIndicator from "../components/statusIndicator";

type Topic = {
  id: number;
  sectionId: number;
  subjectId: number;
}

type Task = {
  id: number;
  text: string;
  topic: Topic;
}

type Word = {
  id: number;
  text: string;
  translate: string;
  finished: boolean;
  frequency: number;
  percent: number;
  status: Status;
  totalCorrectCount: number;
  totalAttemptCount: number;
  tasks: Task[]
}

export default function StoriesPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [textLoading, setTextLoading] = useState<string>("");
  const [wordText, setWordText] = useState<string>("");

  const [words, setWords] = useState<Word[]>([]);
  const [wordId, setWordId] = useState<number | null>(null);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  const [wordsStatus, setWordsStatus] = useState<string | null>(null);
  const [wordsPercent, setWordsPercent] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  const [expandedWords, setExpandedWords] = useState<Record<number, boolean>>({});
  const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);
  
  const [translatingWordIds, setTranslatingWordIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
    }

    localStorage.removeItem("taskId");
    localStorage.removeItem("sectionId");
    localStorage.removeItem("topicId");
  }, []);

  const fetchWords = useCallback(async () => {
    try {
      const response = await api.post<any>(`/subjects/${subjectId}/words`, {
        topicId: null
      });

      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);
        setWordsStatus(response.data.wordsStatus);
        setWordsPercent(response.data.wordsPercent);
        setSelectedWordIds([]);

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  }, [subjectId]);

  const handleDeleteWord = useCallback(async () => {
    if (!wordId || !subjectId) return;

    setLoading(true);
    setTextLoading("Usuwanie słowa lub wyrazu do słownika");

    const controller = new AbortController();
    controllersRef.current.push(controller);
    const signal = controller.signal;

    try {
        const response = await api.delete<any>(`/subjects/${subjectId}/words/${wordId}`, { signal } as any);

        if (response.data?.statusCode === 200) {
          showAlert(response.data.statusCode, response.data.message);
        } else {
          showAlert(response.data?.statusCode ?? 500, response.data?.message ?? "Błąd serwera");
        }
    } catch (error) {
      handleApiError(error);
    }
    finally {
      setTextLoading("");
    }
  }, [subjectId, wordId]);

  useEffect(() => {
    if (subjectId !== null) {
      setLoading(true);
      fetchWords();
    } else {
      setLoading(false);
    }
  }, [fetchWords, subjectId]);

  function handleBackClick() {
    localStorage.removeItem("wordIds");
    router.back();
  }

  const handleAddWord = useCallback(async () => {
      if (!subjectId) return;

      setLoading(true);
      setTextLoading("Dodawanie słowa lub wyrazu do słownika");

      const controller = new AbortController();
      controllersRef.current.push(controller);
      const signal = controller.signal;

      try {
        const response = await api.post<any>(
          `/subjects/${subjectId}/words/create`,
          {
            text: wordText
          },
          { signal } as any
        );

        if (response.data?.statusCode === 200) {
          showAlert(response.data.statusCode, response.data.message);
        } else {
          showAlert(response.data?.statusCode ?? 500, response.data?.message ?? "Błąd serwera");
        }
      } catch (error: unknown) {
        handleApiError(error);
      }
      finally {
        setTextLoading("");
        setWordText("");
      }
    }, [subjectId, wordText]);

  function handleApiError(error: unknown) {
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

  const handleWordClick = (wordId: number, isChecked: boolean) => {
    setSelectedWordIds(prev => {
      if (isChecked) {
        return [...prev, wordId];
      } else {
        return prev.filter(id => id !== wordId);
      }
    });
  };

  const handleStoryClick = (sectionId: number, topicId: number, taskId: number) => {
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topicId));
    localStorage.setItem("taskId", String(taskId));

    router.push("/interactive-play");
  }

  const handlePlayClick = async () => {
    if (selectedWordIds.length === 0) {
      showAlert(400, "Proszę wybrać przynajmniej jedno słowo");
      return;
    }

    try {
        localStorage.setItem("wordIds", JSON.stringify(selectedWordIds));
        
        localStorage.removeItem("taskId");
        
        router.push('/vocabluary');
        
    } catch {
        showAlert(500, "Nie udało się zapisać wybranych słów");
    }
 };

  const generateTranslation = useCallback(async (word: Word) => {
    if (word.translate) return;
    if (translatingWordIds.has(word.id)) return;
    
    setTranslatingWordIds(prev => new Set(prev).add(word.id));
    
    const controller = new AbortController();
    controllersRef.current.push(controller);
    const signal = controller.signal;
    
    try {
        let changed = "true";
        let attempt = 0;
        let errors: string[] = [];
        let translate = "";
        const MAX_ATTEMPTS = 2;
        
        while (changed === "true" && attempt <= MAX_ATTEMPTS) {
            if (signal.aborted) return;
            
            const response = await api.post<any>(
              `/subjects/${subjectId}/words/vocabluary-guide-generate`,
              {
                data: {
                  text: word.text,
                  translate: translate,
                  changed: changed,
                  attempt: attempt,
                  errors: errors,
                  prompt: null
                },
                topicId: null,
                sectionId: null,
              },
              { signal } as any
            );
            
            if (signal.aborted) return;
            
            if (response.data?.statusCode === 200 || response.data?.statusCode === 201) {
              changed = response.data.changed;
              errors = response.data.errors;
              translate = response.data.translate;
              attempt = response.data.attempt;
              console.log(`Generowanie tłumaczenia: Próba ${attempt}`);
            } else {
              showAlert(400, "Nie udało się zgenerować tłumaczenia");
              break;
            }
        }
        
        if (translate && translate !== "") {
          await api.put(
            `/subjects/${subjectId}/words/${word.id}/translate`,
            { translate: translate },
            { signal } as any
          );
          
          if (!signal.aborted) {
            setWords(prev => prev.map(w =>
              w.id === word.id ? { ...w, translate: translate } : w
            ));
          }
        }
    } catch (error) {
        if ((error as DOMException)?.name !== "AbortError") {
          console.error(`Błąd generowania tłumaczenia dla ${word.text}:`, error);
        }
    } finally {
      setTranslatingWordIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(word.id);
        return newSet;
      });
      controllersRef.current = controllersRef.current.filter(c => c !== controller);
    }
  }, [subjectId, translatingWordIds]);

  const handleExpandWord = useCallback(async (word: Word) => {
    setExpandedWords(prev => ({ ...prev, [word.id]: !prev[word.id] }));
    
    if (!expandedWords[word.id] && !word.translate && !translatingWordIds.has(word.id)) {
      await generateTranslation(word);
    }
  }, [expandedWords, generateTranslation, translatingWordIds]);

  const controllersRef = useRef<AbortController[]>([]);
  
  useEffect(() => {
      const sId = Number(localStorage.getItem("subjectId"));

      if (sId) {
        setSubjectId(sId);
      }
      else {
        showAlert(400, "Nie udało się pobrać ID Przedmiotu");
      }
  }, []);

  useEffect(() => {
    const handleUnload = () => {
        controllersRef.current.forEach((controller: AbortController) => controller.abort());
        controllersRef.current = [];
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

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

      <Message
        message={"Czy na pewno chcesz usunąć słowo lub wyraz?"}
        textConfirm="Tak"
        textCancel="Nie"
        onConfirm={async () => {
            setMsgDeleteVisible(false);

            try {
              await handleDeleteWord();
              await fetchWords();
            } catch (error) {
              console.error(error);
            }
        }}
        onClose={() => setMsgDeleteVisible(false)}
        visible={msgDeleteVisible}
      />

      <main>
        {loading ? (
          <div className="spinner-wrapper">
              <Spinner text={textLoading} />
          </div>
        ) : (
        <>
          <div style={{ padding: "0px 12px", paddingBottom: "12px" }}>
            <div style={{ padding: "8px 0px", width: "100%"}}>
                <div className="text-title text-topic-note">
                    <div className="element-name" style={{ margin: "0px" }}>
                        Personal Vocabulary
                    </div>
                    <div className="element-options">
                        <div className={`element-percent ${wordsStatus}`}>
                            {wordsPercent}%
                        </div>
                        {words.length != 0 && (<button 
                          className="btnElement" 
                          title="Play"
                          style={{ backgroundColor: "#b0b0b0", border: "1px solid grey", padding: "6px" }}
                          onClick={handlePlayClick}
                        >
                          <Play size={28} color="black" />
                        </button>)}
                    </div>
                </div>
            </div>
            <div style={{
              display: "flex",
              gap: "6px",
              marginBottom: "12px"
            }}>
              <input
                type="text"
                id="threshold"
                name="text-container"
                value={wordText}
                onChange={(e) => setWordText(e.target.value)}
                className="input-container"
                style={{ fontSize: "18px", padding: "6px 12px", borderRadius: "6px" }}
                placeholder="Wpisz nowy wyraz..."
              />
              <button className="btnOption" onClick={async () => {
                try {
                  await handleAddWord();
                  await fetchWords();
                } catch (error) {
                  console.error(error);
                }
              }}>
                <Plus size={24} />
              </button>
            </div>
            <div className="table" style={{ border: "none" }}>
              {words.map((word) => {
                const isSelected = selectedWordIds.includes(word.id);
                
                return (
                  <React.Fragment key={word.id}>
                      <div
                          className={`element`}
                          style={{
                              alignItems: "start",
                              border: "1px solid rgb(191, 191, 191)",
                              borderBottom: "none",
                              fontWeight: selectedWordIds.includes(word.id) ? "bold" : "normal",
                          }}
                          onClick={(e) => {
                          e.stopPropagation();
                          handleWordClick(word.id, !isSelected);
                      }}>
                        <div
                          className="element-word"
                          style={{
                            flex: "0 0 auto",
                            cursor: "pointer",
                            paddingRight: "0px",
                            width: "32px"
                          }}
                          >
                          <button
                            className="btnElement"
                            onClick={(e) => {
                            e.stopPropagation();
                            handleExpandWord(word);
                          }}>
                            {expandedWords[word.id] ? (
                            <Minus size={24} />
                            ) : (
                            <Plus size={24} />
                            )}
                          </button>
                        </div>
                        <div className="element-word">
                            {word.text}
                        </div>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                          <div className="element-word stats-column">
                              {word.totalCorrectCount} ({word.totalAttemptCount})
                          </div>
                          <div className="element-word stats-column">
                              <div
                              className={`element-percent ${word.status}`}
                              style={{
                                  padding: "0px 5px",
                                  minWidth: "30px"
                              }}
                              >
                              {word.percent}%
                              </div>
                          </div>
                          <Trash2 size={24} style={{
                            minWidth: "24px",
                            marginLeft: "auto",
                            marginTop: "2px"
                          }} color="#000000" onClick={(e) => {
                              e.stopPropagation();
                              setWordId(word.id);
                              setMsgDeleteVisible(true);
                          }} />
                        </div>
                      </div>
                      {expandedWords[word.id] && (
                        <div className="element" style={{ alignItems: "start", border: "1px solid rgb(191, 191, 191)", borderBottom: "none", padding: "0px" }} key={`${word.id}-details`}>
                          {word.translate !== "" ? (
                            <div className="topic-note" style={{ margin: "0px", marginLeft: "42px", padding: "8px", fontSize: "16px", backgroundColor: "#ccc" }}>
                              <FormatText content={word.translate} />
                            </div>
                          ) : (
                            <div className="topic-note" style={{ margin: "0px", marginLeft: "42px", padding: "8px", fontSize: "16px", backgroundColor: "#ccc" }}>
                              <StatusIndicator text="Przetwarzanie tłumaczenia..." />
                            </div>
                          )}
                        </div>
                      )}
                  </React.Fragment>
              );
              })}
            </div>
          </div>
        </>
        )}
      </main>
    </>
  );
}