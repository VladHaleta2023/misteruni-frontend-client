'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Minus, Play, Plus } from 'lucide-react';
import "@/app/styles/table.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/play.css";
import "@/app/styles/components.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import FormatText from "@/app/components/formatText";
import { Text } from "lucide-react";
import Message from "@/app/components/message";

type Status = 'started' | 'progress' | 'completed';

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
    vocabluary: boolean;
    wordsCount: number;
    finished: boolean;
    note: string;
    topic: {
        id: number,
        name: string
    };
    section: {
        id: number,
        name: string,
        type: string
    };
    subtopics: string[];
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
  const [topicPercent, setTopicPercent] = useState<number | null>(null);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);
  const [sectionType, setSectionType] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("");

  const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

  const [elementReponse, setElementResponse] = useState<ElementResponse | null>(null);

  const [topicNote, setTopicNote] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState<number>(0);

  const [expandedNotes, setExpandedNotes] = useState<{[key: number]: boolean}>({});
  const [expandedExplanations, setExpandedExplanations] = useState<{[key: number]: boolean}>({});
  const [expandedSubtopics, setExpandedSubtopics] = useState<{[key: number]: boolean}>({});
  const [expandedTopicNote, setExpandedTopicNote] = useState(false);

  useEffect(() => {
    localStorage.removeItem("Mode");
    localStorage.removeItem("ModeTaskId");
    localStorage.removeItem("ModeSubtopic");

    if (typeof window !== "undefined") {
        const storedSubjectId = localStorage.getItem("subjectId");
        setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
        const storedSectionId = localStorage.getItem("sectionId");
        setSectionId(storedSectionId ? Number(storedSectionId) : null);
        const storedTopicId = localStorage.getItem("topicId");
        setTopicId(storedTopicId ? Number(storedTopicId) : null);
        const storedSectionType = localStorage.getItem("sectionType");
        setSectionType(storedSectionType ? String(storedSectionType) : null);
        
        const storedWeekOffset = localStorage.getItem("weekOffset");
        const parsedWeekOffset = Number(storedWeekOffset);

        if (!storedWeekOffset || isNaN(parsedWeekOffset) || Number(parsedWeekOffset) > 0) {
            setWeekOffset(0);
            localStorage.setItem("weekOffset", "0");
        } else {
            setWeekOffset(parsedWeekOffset);
        }
    }
  }, []);

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
          const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks?weekOffset=${weekOffset}`);
          setLoading(false);

          if (response.data?.statusCode === 200) {
              setElementResponse(new ElementResponse(response.data.elements));
              setTopicNote(response.data.topic.note);
              setTopicName(response.data.topic.name);
              setTopicPercent(response.data.topic.percent);
              setTopicStatus(response.data.topic.status);
          } else {
              showAlert(response.data.statusCode, response.data.message);
          }
      }
      catch (error) {
          setLoading(false);
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
  }, [subjectId, sectionId, topicId, weekOffset]);

  useEffect(() => {
      if (!subjectId || !sectionId || !topicId) return;

      const loadTasks = async () => {
          setLoading(true);
          try {
              await fetchTasksByTopicId();
          } finally {
              setLoading(false);
          }
      };

      setMainHeight();
      window.addEventListener("resize", setMainHeight);

      loadTasks();

      return () => {
          window.removeEventListener("resize", setMainHeight);
      };
  }, [fetchTasksByTopicId, subjectId, sectionId, topicId, weekOffset]);

  const handleTaskClick = useCallback(async (
      subjectId: number,
      sectionId: number,
      topicId: number,
      taskId: number,
      sectionType: string
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

      if (sectionType == "Stories") {
          router.push("/interactive-play");
      }
      else {
          router.push("/play");
      }
  }, []);

  const handleStoriesClick = useCallback(async (
      subjectId: number,
      sectionId: number,
      topicId: number,
      taskId: number
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

       router.push("/vocabluary");
  }, []);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
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

  const fetchTopicById = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number) => {
        
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
                `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}`
            );

            if (response.data?.statusCode === 200) {
                const completed = response.data.topic.completed ?? false;
                return completed;
            }

            return null;
        } catch (error) {
            if ((error as DOMException)?.name === "AbortError") return null;
            handleApiError(error);
            return null;
        }
    }, []);

  function handleBackClick() {
    router.back();
  }

  function handleTopicVocabluaryClick() {
    router.push("/topic-vocabluary");
  }

  const handleNoteExpand = useCallback((taskId: number) => {
    setExpandedNotes(prev => ({
        ...prev,
        [taskId]: !prev[taskId]
    }));
  }, []);

  const handleExplanationExpand = useCallback((taskId: number) => {
    setExpandedExplanations(prev => ({
        ...prev,
        [taskId]: !prev[taskId]
    }));
  }, []);

  const handleSubtopicsExpand = useCallback((taskId: number) => {
    setExpandedSubtopics(prev => ({
        ...prev,
        [taskId]: !prev[taskId]
    }));
  }, []);

  const handleTopicNoteExpand = useCallback(() => {
    setExpandedTopicNote(prev => !prev);
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
            <div style={{ marginLeft: 'auto', display: "flex", gap: "6px" }}>
                {sectionType === "Stories" && weekOffset === 0 ? (<div
                    className="menu-icon"
                    title={"Przełącz do listy słów"}
                    onClick={async (e) => {
                        e.stopPropagation();
                        handleTopicVocabluaryClick();
                    }}
                    style={{ cursor: "pointer" }}
                >
                    <Text size={28} color="white" />
                </div>) : null}
                <div className="menu-icon" title="Play"
                    onClick={async (e) => {
                        e.stopPropagation();

                        if (!subjectId || !sectionId || !topicId) return;

                        const completed = await fetchTopicById(subjectId, sectionId, topicId);

                        if (completed) {
                            setMsgPlayVisible(true);
                            return;
                        }

                        if (sectionType == "Stories") {
                            router.push("/interactive-play");
                        }
                        else {
                            router.push("/play");
                        }
                    }}>
                        <Play size={28} color="white" />
                </div>
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

                    if (sectionType == "Stories") {
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
                padding: "8px", 
                width: "100%",
            }}>
                <div 
                    className="text-title text-topic-note"
                    onClick={(e) => {
                        if (!topicNote || sectionType === "Stories")
                            return;

                        e.stopPropagation();
                        handleTopicNoteExpand();
                    }}
                >
                    <div className="element-name" style={{ margin: "0px" }}>
                        {topicNote && sectionType !== "Stories" && (
                            <div 
                                className="btnElement" 
                                style={{
                                    marginRight: "4px",
                                    fontWeight: "bold"
                                }}
                            >
                                {expandedTopicNote ? <Minus size={26} /> : <Plus size={26} />}
                            </div>
                        )}
                        {topicName}
                    </div>
                    <div className="element-options">
                        <div className={`element-percent ${topicStatus}`}>
                            {topicPercent}%
                        </div>
                    </div>
                </div>
                {expandedTopicNote && (
                    <div className="topic-note">
                        <FormatText content={topicNote} />
                    </div>
                )}
            </div>

            {elementReponse?.getElements().length === 0 && !expandedTopicNote ? (
                <>
                    <span style={{
                        color: "#514e4e",
                        margin: "auto"
                    }}>Nie ma zadań...</span>
                </>
            ) : (<>
            {elementReponse?.getElements().map((element, index) => (
                <div key={index} className="table">
                  <div
                      className="element element-section"
                      style={{
                          borderBottom: "2px solid #908f8f",
                          justifyContent: "center"
                      }}
                  >
                      {`${element.date.day}-${element.date.month}-${element.date.year}`}
                  </div>
                  {element.tasks.map(task => (
                  <div
                      className={`element element-task ${!task.finished ? "not-finished" : ""}`}
                      style={{
                        justifyContent: "space-between"
                      }}
                      onClick={() => 
                          handleTaskClick(
                              subjectId ?? 0,
                              task.section.id,
                              task.topic.id,
                              task.id,
                              task.section.type
                          )
                      }
                      key={task.id}
                  >
                  <div className="element-name" style={{
                    flexDirection: "column",
                    alignItems: "flex-start"
                  }}>
                    <div style={{ display: "flex", marginBottom: "8px", }}>
                        {sectionType !== "Stories" ? (
                          <FormatText content={task.text ?? ""} />
                        ) : (
                          ElementResponse.truncateText(task.text, 300)
                        )}
                    </div>

                    {task.subtopics && task.subtopics.length > 0 && (
                    <div style={{ 
                        marginBottom: "8px", 
                        width: "100%"
                    }}>
                        <div 
                            className="text-title" 
                            style={{
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSubtopicsExpand(task.id);
                            }}
                        >
                            <div 
                                className="btnElement" 
                                style={{
                                    marginRight: "4px",
                                    fontWeight: "bold"
                                }}
                            >
                                {expandedSubtopics[task.id] ? <Minus size={26} /> : <Plus size={26} />}
                            </div>
                            Podtematy:
                        </div>
                        {expandedSubtopics[task.id] && (
                        <div style={{
                            paddingLeft: "20px",
                            marginTop: "8px",
                            width: "100%"
                        }}>
                            {task.subtopics.map((name: string, index: number) => (
                            <div key={index} style={{ marginBottom: "8px" }}>
                                <FormatText
                                    content={
                                        `${index + 1}. ${name}`
                                    }
                                />
                            </div>
                            ))}
                        </div>)}
                    </div>)}

                    {task.note && (
                        <div style={{
                            marginBottom: "8px", 
                            width: "100%"
                        }}>
                            <div 
                                className="text-title" 
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer"
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNoteExpand(task.id);
                                }}
                            >
                                <div 
                                    className="btnElement" 
                                    style={{
                                        marginRight: "4px",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {expandedNotes[task.id] ? <Minus size={26} /> : <Plus size={26} />}
                                </div>
                                Notatka:
                            </div>
                            {expandedNotes[task.id] && (
                                <div style={{ 
                                    paddingLeft: "20px", 
                                    marginTop: "8px",
                                    width: "100%",
                                }}>
                                    <FormatText content={task.note} />
                                </div>
                            )}
                        </div>
                    )}

                    {task.explanation && (
                        <div style={{
                            marginBottom: "8px", 
                            width: "100%"
                        }}>
                            <div 
                                className="text-title" 
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    cursor: "pointer"
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleExplanationExpand(task.id);
                                }}
                            >
                                <div 
                                    className="btnElement" 
                                    style={{
                                        marginRight: "4px",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {expandedExplanations[task.id] ? <Minus size={26} /> : <Plus size={26} />}
                                </div>
                                Wyjaśnienie:
                            </div>
                            {expandedExplanations[task.id] && (
                                <div style={{ 
                                    paddingLeft: "20px", 
                                    marginTop: "8px",
                                    width: "100%",
                                }}>
                                    <FormatText content={task.explanation} />
                                </div>
                            )}
                        </div>
                    )}
                  </div>

                  <div className="element-options" style={{
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start"
                  }}>
                      <div className={`element-percent ${task.status}`}>
                          {task.finished ? Math.round(task.percent) : 0}%
                      </div>
                      <div>
                        {task.section.type == "Stories" && task.wordsCount != 0 ? (<button
                            className={`btnOption ${task.vocabluary ? "vocabluary" : "vocabluary-progress"}`}
                            style={{
                              minWidth: "48px",
                              marginBottom: "4px"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStoriesClick(
                                    subjectId ?? 0,
                                    task.section.id,
                                    task.topic.id,
                                    task.id
                                );
                            }}
                        >
                            <Text size={28} color="white" />
                        </button>) : null}
                      </div>
                  </div>
              </div>))}
              
          </div>))}
          </>)}
          </>
        )}
      </main>
    </>
  );
}