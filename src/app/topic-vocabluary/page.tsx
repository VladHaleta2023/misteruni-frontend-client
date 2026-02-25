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
import api from "../utils/api";
import axios from "axios";
import React from "react";
import { Status } from "../scripts/task";

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
  const [topicId, setTopicId] = useState<number | null>(null);

  const [words, setWords] = useState<Word[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  const [topicName, setTopicName] = useState<string | null>(null);
  const [wordsStatus, setWordsStatus] = useState<string | null>(null);
  const [wordsPercent, setWordsPercent] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [expandedWords, setExpandedWords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      const storedTopicId = localStorage.getItem("topicId");

      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      setTopicId(storedTopicId ? Number(storedTopicId) : null);
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

      const response = await api.post(`/subjects/${subjectId}/words`, {
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
        setSelectedWordIds([]);

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  }, [subjectId, topicId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    if (subjectId !== null) fetchWords();
    else setLoading(false);

    return () => window.removeEventListener("resize", setMainHeight);
  }, [fetchWords, subjectId, topicId]);

  function handleBackClick() {
    localStorage.removeItem("fetchWordIds");
    router.back();
  }

  function handleApiError(error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_CANCELED") return;
      if (error.response) showAlert(error.response.status, error.response.data?.message || "Server error");
      else showAlert(500, `Server error: ${error.message}`);
    } else if (error instanceof DOMException && error.name === "AbortError") return;
    else if (error instanceof Error) showAlert(500, `Server error: ${error.message}`);
    else showAlert(500, "Unknown error");
  }

  const handleWordClick = (wordId: number, isChecked: boolean) => {
    setSelectedWordIds(prev => isChecked ? [...prev, wordId] : prev.filter(id => id !== wordId));
  };

  const handleStoryClick = (taskId: number) => {
    localStorage.setItem("taskId", String(taskId));
    router.push("/interactive-play");
  };

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
    const handleUnload = () => {
      controllersRef.current.forEach(c => c.abort());
      controllersRef.current = [];
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  return (
    <>
      <Header>
        <div className="menu-icons">
          <div className="menu-icon" title="Wrócić" onClick={handleBackClick} style={{ cursor: "pointer" }}>
            <ArrowLeft size={28} color="white" />
          </div>
          <div className="menu-icon" title="Play" style={{ marginLeft: "auto", cursor: "pointer" }} onClick={handlePlayClick}>
            <Play size={28} color="white" />
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
                <div className="element-options">
                  <div className={`element-percent ${wordsStatus}`}>{wordsPercent}%</div>
                </div>
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
                      onClick={(e) => { e.stopPropagation(); handleWordClick(word.id, !isSelected); }}
                    >
                      <div className="element-word" style={{ flex: "0 0 auto", width: "32px" }}>
                        {word.tasks.length > 0 && (
                          <button className="btnElement" onClick={(e) => { e.stopPropagation(); setExpandedWords(prev => ({ ...prev, [word.id]: !prev[word.id] })); }}>
                            {expandedWords[word.id] ? <Minus size={24} /> : <Plus size={24} />}
                          </button>
                        )}
                      </div>

                      <div className="element-frequency" style={{ color: "#888888" }}>{word.frequency}</div>
                      <div className="element-word">{word.text}</div>

                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                        <div className="element-word stats-column">{word.totalCorrectCount} ({word.totalAttemptCount})</div>
                        <div className="element-word stats-column">
                          <div className={`element-percent ${word.status}`} style={{ padding: "0px 5px", minWidth: "30px" }}>{word.percent}%</div>
                        </div>
                      </div>
                    </div>

                    {expandedWords[word.id] && (
                      <div className="element" style={{ alignItems: "start", border: "1px solid rgb(191, 191, 191)", borderBottom: "none" }} key={`${word.id}-details`}>
                        {word.tasks.map(task => (
                          <div key={task.id} style={{ display: "block", padding: "8px 12px", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); handleStoryClick(task.id); }}>
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
        )}
      </main>
    </>
  );
}