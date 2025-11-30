'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Minus, Play, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "../scripts/showAlert";
import HighlightedText from "@/app/components/highlightedText";
import api from "../utils/api";
import axios from "axios";
import React from "react";

type Word = {
  id: number;
  text: string;
  finished: boolean;
  streakCorrectCount: number;
  totalCorrectCount: number;
  totalAttemptCount: number;
  task: {
    id: number,
    text: string
  }
}

export default function StoriesPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  const [expandedWords, setExpandedWords] = useState<Record<number, boolean>>({});

  const [selectedInit, setSelectedInit] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      const storedSectionId = localStorage.getItem("sectionId");
      setSectionId(storedSectionId ? Number(storedSectionId) : null);
      const storedTopicId = localStorage.getItem("topicId");
      setTopicId(storedTopicId ? Number(storedTopicId) : null);
    }

    localStorage.removeItem("taskId");
  }, []);

  const fetchWords = useCallback(async () => {
    try {
      const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/words`);
      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);
        setSelectedWordIds(fetchedWords.map(word => word.id));

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  }, [subjectId, sectionId, topicId]);

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
      if (selectedInit) {
        setSelectedInit(false);
        return [wordId];
      } else {
        if (isChecked) {
            return [...prev, wordId];
        } else {
            return prev.filter(id => id !== wordId);
        }
      }
    });
  };

  const handleStoryClick = (taskId: number) => {
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
      const secId = Number(localStorage.getItem("sectionId"));
      const tId = Number(localStorage.getItem("topicId"));

      if (sId && secId && tId) {
        setSubjectId(sId);
        setSectionId(secId);
        setTopicId(tId);
      }
      else {
        showAlert(400, "Nie udało się pobrać ID lub ID jest niepoprawne");
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
            }}>Nie ma słow lub wyrazów...</span>
          ) : (
          <>
          <div style={{
            padding: "12px"
          }}>
            <div>
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
                            }}
                        >
                            <div
                            className="element-word"
                            style={{
                                flex: "0 0 auto",
                                cursor: "pointer",
                                paddingRight: "0px"
                            }}
                            >
                            <button
                                className="btnElement"
                                onClick={(e) => {
                                e.stopPropagation();
                                setExpandedWords(prev => ({
                                    ...prev,
                                    [word.id]: !prev[word.id]
                                }));
                                }}
                            >
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
                                className={`element-percent ${word.streakCorrectCount >= 3 ? "completed" : "progress"}`}
                                style={{
                                    padding: "0px 5px",
                                    minWidth: "30px"
                                }}
                                >
                                {word.streakCorrectCount}
                                </div>
                            </div>
                            </div>
                        </div>
                        {expandedWords[word.id] && (
                        <div
                            className={`element`}
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
                                <div
                                    style={{ display: 'block', padding: "8px 12px" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStoryClick(word.task.id);
                                    }}
                                >
                                    <HighlightedText 
                                        word={word.text}
                                        text={word.task.text}
                                    />
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
                })}
              </div>
            </div>
          </div>
          </>)}

        </>
        )}
      </main>
    </>
  );
}