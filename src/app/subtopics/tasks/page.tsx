'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, X } from 'lucide-react';
import "@/app/styles/table.css";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import FormatText from "@/app/components/formatText";
import { Text } from "lucide-react";
import Message from "@/app/components/message";

type Status = 'blocked' | 'started' | 'progress' | 'completed';

interface IDate {
    day: string;
    month: string;
    year: string;
}

interface ITask {
    id: number;
    text: string;
    percent: number;
    status: Status;
    finished: boolean;
    topic: {
        id: number,
        name: string
    };
    section: {
        id: number,
        name: string,
        type: string
    };
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

  const [elementReponse, setElementResponse] = useState<ElementResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [taskId, setTaskId] = useState(0);

  const [textLoading, setTextLoading] = useState("");

  const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);

  useEffect(() => {
      if (typeof window !== "undefined") {
          const storedSubjectId = localStorage.getItem("subjectId");
          setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
          const storedSectionId = localStorage.getItem("sectionId");
          setSectionId(storedSectionId ? Number(storedSectionId) : null);
          const storedTopicId = localStorage.getItem("topicId");
          setTopicId(storedTopicId ? Number(storedTopicId) : null);
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
          const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks`);
          setLoading(false);

          if (response.data?.statusCode === 200) {
              setElementResponse(new ElementResponse(response.data.elements));
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
  }, [subjectId, sectionId, topicId]);

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
  }, [fetchTasksByTopicId, subjectId, sectionId, topicId]);

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

      if (sectionType == "InteractiveQuestion") {
          router.push("/interactive-play");
      }
      else {
          router.push("/play");
      }
  }, []);

  const handleVocabluaryClick = useCallback(async (
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

  const handleDeleteTask = useCallback(async() => {
    try {
        const response = await api.delete(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}`);

        setLoading(false);
        if (response.data?.statusCode === 200) {
            showAlert(response.data.statusCode, response.data.message);
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
    finally {
      setLoading(false);
      setTextLoading("");
      setMsgDeleteVisible(false);
    }
  }, [subjectId, sectionId, topicId, taskId]);

  function handleBackClick() {
    router.back();
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

      <main style={{ padding: "0px" }}>
        {loading ? (
          <div className="spinner-wrapper">
              <Spinner text={textLoading} />
          </div>
        ) : (
        <>
          <Message
            message={"Czy na pewno chcesz usunąć zadanie?"}
            textConfirm="Tak"
            textCancel="Nie"
            onConfirm={() => {
              setTextLoading("Trwa usuwanie zadania");
              setLoading(true);
              handleDeleteTask().then(() => {
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              });
            }}
            onClose={() => {
                setMsgDeleteVisible(false);
            }}
            visible={msgDeleteVisible}
          />
          {elementReponse?.getElements().map((element, index) => (
              <div key={index} className="table">
                  <div
                      className="element element-section"
                      style={{
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
                      <div style={{ display: "flex" }}>
                          <FormatText
                              content={ElementResponse.truncateText(task.text, 240) ?? ""}
                          />
                      </div>
                      <div
                          style={{
                              display: "flex",
                              alignItems: "flex-start",
                              flexWrap: "nowrap",
                              gap: "12px",
                              overflowWrap: "break-word",
                          }}
                      >
                          <div style={{
                              flexShrink: 0,
                              fontWeight: "bold"
                              }}>Rozdział:</div>
                              <div style={{ flex: 1 }}>
                                  <FormatText content={task.section.name ?? ""} />
                              </div>
                      </div>
                      <div
                          style={{
                              display: "flex",
                              alignItems: "flex-start",
                              flexWrap: "nowrap",
                              gap: "12px",
                              overflowWrap: "break-word",
                          }}
                      >
                          <div style={{
                              flexShrink: 0,
                              fontWeight: "bold"
                          }}>Temat:</div>
                          <div style={{ flex: 1 }}>
                              <FormatText content={task.topic.name ?? ""} />
                          </div>
                      </div>
                  </div>

                  <div className="element-options" style={{
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "space-between"
                  }}>
                      <div className={`element-percent ${task.status}`}>
                          {task.finished ? Math.round(task.percent) : 0}%
                      </div>
                      <div>
                        {task.section.type == "InteractiveQuestion" ? (<button
                            className="btnOption"
                            style={{
                              minWidth: "48px",
                              marginBottom: "4px"
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleVocabluaryClick(
                                    subjectId ?? 0,
                                    task.section.id,
                                    task.topic.id,
                                    task.id
                                );
                            }}
                        >
                            <Text size={28} color="white" />
                        </button>) : null}
                        <button
                            className="btnOption"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTaskId(task.id);
                                setMsgDeleteVisible(true);
                            }}
                            style={{minWidth: "48px"}}
                        >
                            <X size={28} color="white" />
                        </button>
                      </div>
                  </div>
              </div>))}
          </div>))}
          <br />
          </>
        )}
      </main>
    </>
  );
}