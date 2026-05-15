'use client';

import Header from "@/app/components/header";
import { ArrowLeft, Play, LibraryBig, Minus, SearchCheck, Text, Plus } from 'lucide-react';
import "@/app/styles/table.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/play.css";
import "@/app/styles/components.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import FormatText from "@/app/components/formatText";
import Message from "@/app/components/message";
import React from "react";
import StatusIndicator from "../components/statusIndicator";

type Status = 'started' | 'progress' | 'completed';

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

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  status: Status;
}

interface IDate {
    day: string;
    month: string;
    year: string;
}

interface ITask {
    id: number;
    text: string;
    percent: number;
    explanation: string;
    status: Status;
    finished: boolean;
    userSolution: string;
}

interface IElement {
    date: IDate;
    tasks: ITask[];
}

class ElementResponse {
    private elements: IElement[];

    constructor(elements: IElement[]) {
        this.elements = elements;
    }

    public getElements() {
        return this.elements;
    }

    public static truncateText(text: string, maxLength: number) {
        const blocks: string[] = [];
        const regex = /(\$\$.*?\$\$|\\\(.*?\\\)|\\\[.*?\\\])/gs;
        let lastIndex = 0;

        for (const match of text.matchAll(regex)) {
            const start = match.index!;
            if (start > lastIndex) {
                blocks.push(text.slice(lastIndex, start));
            }
            blocks.push(match[0]);
            lastIndex = start + match[0].length;
        }
        if (lastIndex < text.length) {
            blocks.push(text.slice(lastIndex));
        }

        let result = '';
        for (const block of blocks) {
            if (result.length + block.length > maxLength) {
                if (!/^(\$\$|\\\[|\\\()/.test(block)) {
                    result += block.slice(0, maxLength - result.length) + '...';
                } else {
                    result += '...';
                }
                break;
            } else {
                result += block;
            }
        }

        return result;
    }
}

export default function TasksPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const [topicPercent, setTopicPercent] = useState<number | null>(null);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);

  const [elementReponse, setElementResponse] = useState<ElementResponse | null>(null);

  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);

  const [literatures, setLiteratures] = useState<string[]>([]);

  const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

  const [topicNote, setTopicNote] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const [expandedSubtopics, setExpandedSubtopics] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState(false);

  const fetchInProgressRef = useRef(false);

  const [words, setWords] = useState<Word[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);

  const [wordsStatus, setWordsStatus] = useState<string | null>(null);
  const [wordsPercent, setWordsPercent] = useState<number | null>(null);

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [expandedWords, setExpandedWords] = useState<Record<number, boolean>>({});
  const [translatingWordIds, setTranslatingWordIds] = useState<Set<number>>(new Set());

  const controllersRef = useRef<AbortController[]>([]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
        const storedSubjectId = localStorage.getItem("subjectId");
        setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
        const storedSectionId = localStorage.getItem("sectionId");
        setSectionId(storedSectionId ? Number(storedSectionId) : null);
        const storedTopicId = localStorage.getItem("topicId");
        setTopicId(storedTopicId ? Number(storedTopicId) : null);
        const storedtype = localStorage.getItem("type");
        setType(storedtype ? String(storedtype) : null);
    }
  }, []);

  useEffect(() => {
    const handleUnload = () => {
        controllersRef.current.forEach(c => c.abort());
        controllersRef.current = [];
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const fetchSubtopics = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;
    
    if (!subjectId) {
      setLoading(false);
      fetchInProgressRef.current = false;
      showAlert(400, "Przedmiot nie został znaleziony");
      return;
    }

    if (!sectionId) {
      setLoading(false);
      fetchInProgressRef.current = false;
      showAlert(400, "Rozdział nie został znaleziony");
      return;
    }

    if (!topicId) {
      setLoading(false);
      fetchInProgressRef.current = false;
      showAlert(400, "Temat nie został znaleziony");
      return;
    }

    try {
      const response = await api.get<any>(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/subtopics`);

      if (response.data?.statusCode === 200) {
        const fetchedSubtopics: Subtopic[] = response.data.subtopics;
        setSubtopics(fetchedSubtopics);
        setTopicName(response.data.topic.name);
        setTopicPercent(response.data.topic.percent);
        setTopicStatus(response.data.topic.status);
        setTopicNote(response.data.topic.note);
        setLiteratures(response.data.topic.literatures);
      } else {
        setLoading(false);
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
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
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [subjectId, sectionId, topicId]);

  const fetchTasksByTopicId = useCallback(async () => {
      if (!subjectId) {
          setLoading(false);
          showAlert(400, "Przedmiot nie został znaleziony");
          return;
      }

      if (!sectionId) {
          setLoading(false);
          showAlert(400, "Rozdział nie został znaleziony");
          return;
      }

      if (!topicId) {
          setLoading(false);
          showAlert(400, "Temat nie został znaleziony");
          return;
      }

      try {
          const response = await api.get<any>(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks`);

          if (response.data?.statusCode === 200) {
            setElementResponse(new ElementResponse(response.data.elements));
          } else {
            showAlert(response.data.statusCode, response.data.message);
          }
      }
      catch (error) {
        setLoading(false);
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
  }, [subjectId, sectionId, topicId]);

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

  const handleExpandWord = useCallback(async (word: Word) => {
    setExpandedWords(prev => ({ ...prev, [word.id]: !prev[word.id] }));
    
    if (!expandedWords[word.id] && !word.translate && !translatingWordIds.has(word.id)) {
    await generateTranslation(word);
    }
  }, [expandedWords, generateTranslation, translatingWordIds]);

  useEffect(() => {
      if (!subjectId || !sectionId || !topicId) return;

      const loadData = async () => {
          setLoading(true);
          try {
            await fetchSubtopics();
            await fetchTasksByTopicId();
            await fetchWords();
          } finally {
            setLoading(false);
          }
      };

      loadData();
  }, [fetchSubtopics, fetchTasksByTopicId, fetchWords, subjectId, sectionId, topicId]);

  const handleTaskClick = useCallback(async (
      subjectId: number,
      sectionId: number,
      topicId: number,
      taskId: number,
      type: string
  ) => {
      if (!subjectId) {
          setLoading(false);
          showAlert(400, "Przedmiot nie został znaleziony");
          return;
      }

      if (!sectionId) {
          setLoading(false);
          showAlert(400, "Rozdział nie został znaleziony");
          return;
      }

      if (!topicId) {
          setLoading(false);
          showAlert(400, "Temat nie został znaleziony");
          return;
      }

      if (!taskId) {
          setLoading(false);
          showAlert(400, "Zadanie nie zostało znalezione");
          return;
      }

      localStorage.setItem("subjectId", String(subjectId));
      localStorage.setItem("sectionId", String(sectionId));
      localStorage.setItem("topicId", String(topicId));
      localStorage.setItem("taskId", String(taskId));

      if (type == "Stories") {
        router.push("/interactive-play");
      }
      else if (type == "Writing") {
        router.push("/writing-play");
      }
      else {
        router.push("/play");
      }
  }, []);

  function handleBackClick() {
    localStorage.removeItem("fetchWordIds");
    router.back();
  }

  const handleSubtopicsExpand = useCallback(() => {
    setExpandedSubtopics(prev => !prev);
  }, []);

  const handleTasksExpand = useCallback(() => {
    setExpandedTasks(prev => !prev);
  }, []);

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

      <main>
        {loading ? (
          <div className="spinner-wrapper">
              <Spinner noText />
          </div>
        ) : (
        <>
            <Message
                message={"Czy na pewno chcesz utworzyć nowe zadanie, ponieważ temat został już zamknięty?"}
                textConfirm="Tak"
                textCancel="Nie"
                onConfirm={() => {
                    setMsgPlayVisible(false);

                    if (type == "Stories") {
                        router.push("/interactive-play");
                    }
                    else {
                        router.push("/play");
                    }
                }}
                onClose={() => {
                    setMsgPlayVisible(false);
                }}
                visible={msgPlayVisible}
            />
            
            <div style={{
                width: "100%",
                padding: "0px 8px",
                margin: "12px 0px"
            }}>
                <div 
                    className="text-topic-note"
                    style={{
                        flexDirection: "column",
                        alignItems: "flex-start"
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <div className="element-name" style={{ fontSize: "20px" }}>
                            {subtopics.length !== 0 && (
                                <div
                                    className="btnOption"
                                    style={{
                                        fontWeight: "bold",
                                        marginRight: "12px"
                                    }}
                                    title={"Przełącz do listy słów"}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSubtopicsExpand();
                                    }}
                                >
                                    {expandedSubtopics ? <Minus size={28} color="white" /> : <SearchCheck size={28} color="white" />}
                                </div>
                            )}
                            <div className="text-title">
                                <FormatText content={topicName} />
                            </div>
                        </div>
                        <div className="element-options">
                            <div
                                className={`element-percent ${topicStatus}`}
                            >{topicPercent}%</div>
                        </div>
                    </div>

                    {expandedSubtopics && (<>
                        <div style={{ display: "flex", width: "100%" }}>
                            <div className="table" style={{ margin: "8px" }}>
                                {subtopics.flatMap((subtopic) => [
                                    <div
                                    className={`element element-subtopic`}
                                    style={{
                                        justifyContent: "space-between"
                                    }}
                                    key={`subtopic-${subtopic.id}`}
                                    >
                                    <div className="element-name">
                                        <FormatText
                                        content={`${subtopic.name}`}
                                        />
                                    </div>
                                    <div className="element-options">
                                        <div
                                        className={`element-percent ${subtopic.status}`}
                                        >{subtopic.percent}%</div>
                                    </div>
                                </div>
                                ])}
                            </div>
                        </div>
                    </>)}

                    {elementReponse?.getElements().length !== 0 && (<div className="element-name">
                        <div
                            className="btnOption" 
                            style={{
                                marginRight: "12px",
                                fontWeight: "bold"
                            }}
                            title={"Przełącz do zadań"}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleTasksExpand();
                            }}
                            >
                            {expandedTasks ? <Minus size={28} color="white" /> : <Text size={28} color="white" />}
                        </div>
                        <div className="text-title">Zadania</div>
                    </div>)}

                    {expandedTasks && elementReponse?.getElements().map((element, index) => (<div key={index} style={{ display: "flex", width: "100%" }}>
                        <div style={{ display: "flex", width: "100%" }}>
                            <div key={index} className="table" style={{ margin: "8px" }}>
                                {element.tasks.map(task => (
                                <div
                                    className={`element element-task ${!task.finished ? "not-finished" : ""}`}
                                    style={{
                                    justifyContent: "space-between"
                                    }}
                                    onClick={() => 
                                        handleTaskClick(
                                            subjectId ?? 0,
                                            sectionId ?? 0,
                                            topicId ?? 0,
                                            task.id,
                                            type ?? ""
                                        )
                                    }
                                    key={task.id}
                                >
                                <div className="element-name" style={{
                                    flexDirection: "column",
                                    alignItems: "flex-start"
                                }}>
                                    <div style={{ display: "flex", marginBottom: "8px", }}>
                                        {type !== "Stories" ? (
                                            <FormatText content={task.text ?? ""} />
                                        ) : !task.finished ? (
                                            <FormatText content={"Tekst do nagrania..."} />
                                        ) : (
                                            ElementResponse.truncateText(task.text, 300)
                                        )}
                                    </div>
                                </div>
                                <div className="element-options" style={{
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "flex-start"
                                }}>
                                    <div className={`element-percent ${task.status}`}>
                                        {task.finished ? Math.round(task.percent) : 0}%
                                    </div>
                                </div>
                                </div>))}
                            </div>
                        </div>
                    </div>))}

                    {literatures.length > 0 ? (
                        <>
                            <div className="element-name">
                                <div
                                    className="btnOption"
                                    style={{
                                        marginRight: "12px",
                                        fontWeight: "bold"
                                    }}
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    if (literatures.length === 1) {
                                        localStorage.setItem("literature", literatures[0]);
                                        router.push('/literature');
                                    }
                                    else {
                                        localStorage.setItem("literatures", JSON.stringify(literatures));
                                        router.push('/literatures');
                                    }
                                }}>
                                    <LibraryBig size={26} />
                                </div>
                                <div className="text-title">
                                    {literatures.length === 1 ? "Streszczenie" : "Streszczenia"}
                                </div>
                            </div>
                        </>
                    ) : null}

                    {topicNote ? (
                        <div className="topic-note">
                            <br />
                            <FormatText content={topicNote} />
                        </div>
                    ) : words.length === 0 ? (
                        <span style={{ color: "#514e4e", margin: "auto", display: "block", textAlign: "center", padding: "20px", width: "100%" }}>
                            Brak słow lub wyrazów...
                        </span>
                    ) : (
                        <div style={{ padding: "0px 12px", paddingBottom: "12px", width: "100%" }}>
                            <div style={{ padding: "8px 0px", width: "100%" }}>
                                <div className="text-title text-topic-note">
                                    <div className="element-name" style={{ margin: "0px" }}>{topicName}</div>
                                    {!localStorage.getItem("fetchWordIds") && (
                                        <div className="element-options">
                                            <div className={`element-percent ${wordsStatus}`}>{wordsPercent}%</div>
                                        </div>
                                    )}
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
                                        style={{ 
                                            alignItems: "start", 
                                            border: "1px solid rgb(191, 191, 191)", 
                                            borderBottom: "none", 
                                            fontWeight: isSelected ? "bold" : "normal", 
                                            cursor: "pointer" 
                                        }}
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
                </div>
            </div>
        </>)}
      </main>
    </>
  );
}