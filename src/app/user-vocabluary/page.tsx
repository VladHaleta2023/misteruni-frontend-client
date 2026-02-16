'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Minus, Play, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import axios from "axios";
import React from "react";
import Message from "../components/message";

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
  finished: boolean;
  streakCorrectCount: number;
  totalCorrectCount: number;
  totalAttemptCount: number;
  tasks: Task[]
}

export default function StoriesPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [wordId, setWordId] = useState<number | null>(null);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  const [wordsStatus, setWordsStatus] = useState<string | null>(null);
  const [wordsPercent, setWordsPercent] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  const [expandedWords, setExpandedWords] = useState<Record<number, boolean>>({});
  const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);

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
      const response = await api.post(`/subjects/${subjectId}/words`, {
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

    try {
        const response = await api.delete(`/subjects/${subjectId}/words/${wordId}`);

        if (response.data?.statusCode === 200) {
            showAlert(response.data.statusCode, response.data.message);
        } else {
            showAlert(response.data?.statusCode ?? 500, response.data?.message ?? "Błąd serwera");
        }
    } catch (error) {
        handleApiError(error);
    }
  }, [subjectId, wordId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    if (subjectId !== null) {
      setLoading(true);
      fetchWords();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchWords, subjectId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    localStorage.removeItem("wordIds");
    router.back();
  }

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
          <div 
            className="menu-icon" 
            title="Play" 
            style={{ marginLeft: "auto", cursor: "pointer" }}
            onClick={handlePlayClick}
          >
            <Play size={28} color="white" />
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
              <Spinner noText />
          </div>
        ) : (
        <>
          {words.length === 0 ? (
            <span style={{
                color: "#514e4e",
                margin: "auto"
            }}>Brak słow lub wyrazów...</span>
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
                    </div>
                </div>
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
                          {word.tasks.length > 0 && (<button
                            className="btnElement"
                            onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWords(prev => ({
                                ...prev,
                                [word.id]: !prev[word.id]
                            }));
                          }}>
                            {expandedWords[word.id] ? (
                            <Minus size={24} />
                            ) : (
                            <Plus size={24} />
                            )}
                          </button>)}
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
                              className={`element-percent ${
                                word.streakCorrectCount === 0
                                  ? ""
                                  : word.streakCorrectCount >= 3
                                  ? "completed"
                                  : "progress"
                              }`}
                              style={{
                                  padding: "0px 5px",
                                  minWidth: "30px"
                              }}
                              >
                              {word.streakCorrectCount}
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
                        <div
                          className="element"
                          style={{
                            alignItems: "start",
                            border: "1px solid rgb(191, 191, 191)",
                            borderBottom: "none",
                          }}
                          key={`${word.id}-details`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWordClick(word.id, !isSelected);
                          }}
                        >
                          {word.tasks.map((task) => (
                            <div
                              key={task.id}
                              style={{ display: "block", padding: "8px 12px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStoryClick(task.topic.sectionId, task.topic.id, task.id);
                              }}
                            >
                              {task.text}
                            </div>
                          ))}
                        </div>
                      )}
                  </React.Fragment>
              );
              })}
            </div>
          </div>
          </>)}

        </>
        )}
      </main>
    </>
  );
}