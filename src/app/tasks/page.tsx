'use client';

import Header from "@/app/components/header";
import { ArrowLeft, BookOpen, Globe, LibraryBig, Minus, SearchCheck } from 'lucide-react';
import "@/app/styles/table.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/play.css";
import "@/app/styles/components.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import FormatText from "@/app/components/formatText";
import Message from "@/app/components/message";
import { FaSearchPlus } from "react-icons/fa";

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
  const [taskId, setTaskId] = useState<number | null>(null);
  const [sectionType, setSectionType] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const [topicPercent, setTopicPercent] = useState<number | null>(null);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);

  const [literatures, setLiteratures] = useState<string[]>([]);

  const [textLoading, setTextLoading] = useState<string>("");

  const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

  const [elementReponse, setElementResponse] = useState<ElementResponse | null>(null);

  const [topicNote, setTopicNote] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const [weekOffset, setWeekOffset] = useState<number>(0);

  const [expandedTopicNote, setExpandedTopicNote] = useState(false);

  const [msgDeleteTaskVisible, setMsgDeleteTaskVisible] = useState<boolean>(false);

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
          const response = await api.get<any>(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks?weekOffset=${weekOffset}`);
          setLoading(false);

          if (response.data?.statusCode === 200) {
              setElementResponse(new ElementResponse(response.data.elements));
              setTopicNote(response.data.topic.note);
              setTopicName(response.data.topic.name);
              setTopicPercent(response.data.topic.percent);
              setTopicStatus(response.data.topic.status);
              setLiteratures(response.data.topic.literatures);
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

      loadTasks();
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

  function handleBackClick() {
    router.back();
  }

  function handleTopicVocabluaryClick() {
    router.push("/topic-vocabluary");
  }

  const handleTopicNoteExpand = useCallback(() => {
    setExpandedTopicNote(prev => !prev);
  }, []);

  const handleDeleteTask = useCallback(async() => {
    try {
        setLoading(true);
        const response = await api.delete<any>(`/subjects/${subjectId}/tasks/${taskId}`);

        if (response.data?.statusCode === 200) {
            showAlert(response.data.statusCode, response.data.message);
            await fetchTasksByTopicId();
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
    finally {
        setLoading(false);
        setTextLoading("");
        setMsgDeleteTaskVisible(false);
        setTaskId(null);
    }
  }, [subjectId, taskId, fetchTasksByTopicId]);

  function handleSubtopicsClick() {
    router.push("/subtopics");
  }

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
        message={"Czy na pewno chcesz usunąć zadanie?"}
        textConfirm="Tak"
        textCancel="Nie"
        onConfirm={() => {
            setMsgDeleteTaskVisible(false);

            if (!loading)
                setTextLoading("Trwa Usuwanie Zadania...");

            setLoading(true);
            if (taskId) {
                handleDeleteTask();
            }
            else
                showAlert(400, "Błąd usuwania zadania");

            setTaskId(null);
        }}
        onClose={() => {
            setMsgDeleteTaskVisible(false);
            setTaskId(null);
        }}
        visible={msgDeleteTaskVisible}
    />

      <main>
        {loading ? (
          <div className="spinner-wrapper">
              <Spinner text={textLoading} />
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
                width: "100%",
                padding: "0px 8px",
                margin: "12px 0px"
            }}>
                <div 
                    className="text-title text-topic-note"
                    style={{
                        flexDirection: "column",
                        alignItems: "flex-start"
                    }}
                    onClick={(e) => {
                        if (!topicNote || sectionType === "Stories")
                            return;

                        e.stopPropagation();
                        handleTopicNoteExpand();
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <div className="element-name" style={{ fontSize: "20px" }}>
                            <div
                                className="btnOption"
                                style={{
                                    fontWeight: "bold",
                                    marginRight: "12px"
                                }}
                                title={"Przełącz do listy słów"}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    handleTopicVocabluaryClick();
                                }}
                            >
                                <Globe size={28} color="white" />
                            </div>
                            <FormatText content={topicName} />
                        </div>
                        <div className="element-options">
                            <div
                                className={`element-percent ${topicStatus}`}
                            >{topicPercent}%</div>
                        </div>
                    </div>
                    <div className="element-name" style={{ margin: "0px 8px" }}>
                        {topicNote && sectionType !== "Stories" && (<>
                            <div
                                className="btnOption" 
                                style={{
                                    marginRight: "12px",
                                    fontWeight: "bold"
                                }}
                            >
                                {expandedTopicNote ? <Minus size={26} /> : <BookOpen size={26} />}
                            </div>
                        </>)}

                        {literatures.length > 0 ? (<div
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
                        </div>) : null}

                        {topicNote && sectionType !== "Stories" && (<>
                            <div 
                                className="btnOption" 
                                style={{
                                    fontWeight: "bold"
                                }}
                                title={"Przełącz do zadań"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    handleSubtopicsClick();
                                }}
                                >
                                <SearchCheck size={28} color="white" />
                            </div>
                        </>)}
                    </div>
                </div>
                {expandedTopicNote && (
                    <div className="topic-note">
                        <br />
                        <FormatText content={topicNote} />
                    </div>
                )}
            </div>

            {elementReponse?.getElements().length === 0 && !expandedTopicNote ? (
                <>
                    <div style={{
                        color: "#514e4e",
                        display: "flex",
                        flexDirection: "column",
                        margin: "auto"
                    }}>
                        {sectionType === "Stories" ? (
                        <>
                            <div>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <span>Naciśnij</span>
                                    <Globe size={28} color="black" />
                                </div>
                                <span>aby ćwiczyć słowy tematyczne</span>
                            </div>
                        </>) : (
                            <div>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <span>Brak zadań</span>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (<>
            {elementReponse?.getElements().map((element, index) => (
                <div key={index} className="table">
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
                              sectionType ?? ""
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
                      {/*<div
                        className="btnOption"
                        style={{ backgroundColor: "transparent", color: "black" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setTaskId(task.id);
                            setMsgDeleteTaskVisible(true);
                        }}>
                          <Trash2 size={26} />
                        </div>*/}
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