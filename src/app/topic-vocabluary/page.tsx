'use client';

import Header from "@/app/components/header";
import { ArrowLeft, Minus, Play, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import React from "react";
import { Status } from "../scripts/task";
import FormatText from "../components/formatText";
import StatusIndicator from "../components/statusIndicator";

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
}

export default function StoriesPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  const [topicName, setTopicName] = useState<string | null>(null);
  const [wordsStatus, setWordsStatus] = useState<string | null>(null);
  const [wordsPercent, setWordsPercent] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [expandedWords, setExpandedWords] = useState<Record<number, boolean>>({});

  const [translatingWordIds, setTranslatingWordIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      const storedTopicId = localStorage.getItem("topicId");
      const storedSectionId = localStorage.getItem("sectionId");

      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      setTopicId(storedTopicId ? Number(storedTopicId) : null);
      setSectionId(storedSectionId ? Number(storedSectionId) : null);
    }

    localStorage.removeItem("taskId");
  }, []);

  const fetchWords = useCallback(async () => {
    if (!subjectId) return;

    setLoading(true);

    try {
      let storedWordIds: number[] | undefined = undefined;
      const wordIdsStr = localStorage.getItem("fetchWordIds");
      if (wordIdsStr) {
        try {
          const parsed = JSON.parse(wordIdsStr);
          if (Array.isArray(parsed) && parsed.length > 0) storedWordIds = parsed;
        } catch {
          storedWordIds = undefined;
        }
      }

      const response = await api.post<any>(`/subjects/${subjectId}/words`, {
        topicId,
        wordIds: storedWordIds
      });

      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);
        setTopicName(response.data.topic?.name || "Personal Vocabulary");
        setWordsStatus(response.data.wordsStatus);
        setWordsPercent(response.data.wordsPercent);

        let initialSelected: number[] = [];
        const storedWordIds = localStorage.getItem("fetchWordIds");
        if (storedWordIds) {
            try {
                const parsed = JSON.parse(storedWordIds);
                if (Array.isArray(parsed)) initialSelected = parsed;
            } catch {}
        }
        setSelectedWordIds(initialSelected);

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
    } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  }, [subjectId, topicId]);

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
                },
                topicId: topicId ?? null,
                sectionId: sectionId ?? null,
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

  useEffect(() => {
    if (subjectId !== null) fetchWords();
    else setLoading(false);
  }, [fetchWords, subjectId, topicId]);

  function handleBackClick() {
    localStorage.removeItem("fetchWordIds");
    router.back();
  }

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
    setSelectedWordIds(prev => isChecked ? [...prev, wordId] : prev.filter(id => id !== wordId));
  };

  const handlePlayClick = async () => {
    if (selectedWordIds.length === 0) {
      showAlert(400, "Proszę wybrać przynajmniej jeden wyraz");
      return;
    }

    try {
      localStorage.setItem("wordIds", JSON.stringify(selectedWordIds));
      localStorage.removeItem("taskId");
      router.push('/vocabluary');
    } catch {
      showAlert(500, "Nie udało się zapisać wybranych wyrazów");
    }
  };

  const controllersRef = useRef<AbortController[]>([]);

  useEffect(() => {
    const handleUnload = () => {
      controllersRef.current.forEach(c => c.abort());
      controllersRef.current = [];
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const handleExpandWord = useCallback(async (word: Word) => {
    setExpandedWords(prev => ({ ...prev, [word.id]: !prev[word.id] }));
    
    if (!expandedWords[word.id] && !word.translate && !translatingWordIds.has(word.id)) {
      await generateTranslation(word);
    }
  }, [expandedWords, generateTranslation, translatingWordIds]);

  return (
    <>
      <Header>
        <div className="menu-icons">
          <div className="menu-icon" title="Wrócić" onClick={handleBackClick} style={{ cursor: "pointer" }}>
            <ArrowLeft size={28} color="white" />
          </div>
        </div>
      </Header>

      <main>
        {loading ? (
          <div className="spinner-wrapper"><Spinner noText /></div>
        ) : words.length === 0 ? (
          <span style={{ color: "#514e4e", margin: "auto", display: "block", textAlign: "center", padding: "20px" }}>
            Brak słow lub wyrazów...
          </span>
        ) : (
          <div style={{ padding: "0px 12px", paddingBottom: "12px" }}>
            <div style={{ padding: "8px 0px", width: "100%" }}>
              <div className="text-title text-topic-note">
                <div className="element-name" style={{ margin: "0px" }}>{topicName}</div>
                {!localStorage.getItem("fetchWordIds") && (<div className="element-options">
                  <div className={`element-percent ${wordsStatus}`}>{wordsPercent}%</div>
                </div>)}
                <button
                  className="btnElement"
                  style={{ backgroundColor: "#b0b0b0", border: "1px solid grey", padding: "6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayClick();
                  }}
                >
                  <Play size={28} color="black" />
                </button>
              </div>
            </div>

            <div className="table" style={{ border: "none" }}>
              {words.map(word => {
                const isSelected = selectedWordIds.includes(word.id);

                return (
                  <React.Fragment key={word.id}>
                    <div
                      className="element"
                      style={{ alignItems: "start", border: "1px solid rgb(191, 191, 191)", borderBottom: "none", fontWeight: isSelected ? "bold" : "normal", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordClick(word.id, !isSelected);
                      }}
                    >
                      <div className="element-word" style={{ flex: "0 0 auto", width: "32px" }}>
                        <button
                          className="btnElement"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleExpandWord(word);
                          }}
                        >
                          {expandedWords[word.id] ? <Minus size={24} /> : <Plus size={24} />}
                        </button>
                      </div>

                      <div className="element-word">{word.text}</div>

                      <div style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center"
                      }}>
                        <div className="element-word stats-column">{word.totalCorrectCount} ({word.totalAttemptCount})</div>
                        <div className="element-word stats-column">
                          <div className={`element-percent ${word.status}`} style={{ padding: "0px 5px", minWidth: "30px" }}>{word.percent}%</div>
                        </div>
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
        )}
      </main>
    </>
  );
}