'use client';

import Header from "@/app/components/header";
import { ArrowLeft, BookOpen, Globe, LibraryBig, Minus, SearchCheck, Text } from 'lucide-react';
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

type Status = 'started' | 'progress' | 'completed';

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

  useEffect(() => {
      if (!subjectId || !sectionId || !topicId) return;

      const loadData = async () => {
          setLoading(true);
          try {
            await fetchSubtopics();
            await fetchTasksByTopicId();
          } finally {
            setLoading(false);
          }
      };

      loadData();
  }, [fetchSubtopics, fetchTasksByTopicId, subjectId, sectionId, topicId]);

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
    router.back();
  }

  const handleSubtopicsExpand = useCallback(() => {
    setExpandedSubtopics(prev => !prev);
  }, []);

  const handleTasksExpand = useCallback(() => {
    setExpandedTasks(prev => !prev);
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

                    <div className="topic-note">
                        <br />
                        <FormatText content={topicNote} />
                    </div>
                </div>
            </div>
            </>
        )}
      </main>
    </>
  );
}