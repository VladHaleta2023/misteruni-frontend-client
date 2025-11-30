import { useCallback, useEffect, useRef, useState } from "react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { useRouter } from "next/navigation";
import { setMainHeight } from "@/app/scripts/mainHeight";
import FormatText from "@/app/components/formatText";
import { Minus, Play, Plus } from "lucide-react";
import Message from "@/app/components/message";

type Status = 'started' | 'progress' | 'completed';

interface Task {
  id: number;
  text: string;
  percent: number;
  status: Status;
  date: string;
}

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  importance: number;
  status: Status;
  tasks: Task[];
}

interface StatisticsData {
  solvedTasksCountCompleted: number;
  solvedTasksCount: number;
  closedSubtopicsCount: number | null;
  closedTopicsCount: number | null;
  weekLabel: string;
  prediction: string;
}

export default function Statistics() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sectionType, setSectionType] = useState<string | null>(null);
  const [topicPercent, setTopicPercent] = useState<number | null>(null);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const [topicNote, setTopicNote] = useState<string>("");

  const [expandedTopicNote, setExpandedTopicNote] = useState(false);
  const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubtopics, setExpandedSubtopics] = useState<{ [key: number]: boolean }>({});
  
  const [chartData, setChartData] = useState<{
    total: [number, number, number];
    statistics: StatisticsData;
    hasData: boolean;
  } | null>(null);

  const fetchInProgressRef = useRef(false);

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
      const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/subtopics`);

      if (response.data?.statusCode === 200) {
        const fetchedSubtopics: Subtopic[] = response.data.subtopics;
        setSubtopics(fetchedSubtopics);
        setTopicName(response.data.topic.name);
        setTopicPercent(response.data.topic.percent);
        setTopicStatus(response.data.topic.status);
        setTopicNote(response.data.topic.note);
        
        const newTotal: [number, number, number] = [
          Number(response.data.total.completed),
          Number(response.data.total.progress),
          Number(response.data.total.started)
        ];
        
        const hasChartData = newTotal.some(percent => percent > 0);
        
        setChartData({
          total: newTotal,
          statistics: response.data.statistics,
          hasData: hasChartData
        });

        setLoading(false);
      } else {
        setLoading(false);
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
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
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [subjectId, sectionId, topicId]);

  useEffect(() => {
    if (subjectId !== null && sectionId !== null && topicId !== null) {
      setLoading(true);
      fetchSubtopics();
    }
  }, [subjectId, sectionId, topicId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  const handleSubtopicExpand = useCallback((subtopicId: number) => {
    setExpandedSubtopics((prev) => ({
      ...prev,
      [subtopicId]: !prev[subtopicId],
    }));
  }, []);

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

  const handleTopicNoteExpand = useCallback(() => {
    setExpandedTopicNote(prev => !prev);
  }, []);

  const ChartComponent = useCallback(() => {
    if (!chartData || !chartData.hasData) return null;
    
    return (
      <CirclePieChart 
        percents={chartData.total} 
        statistics={chartData.statistics} 
        key={`chart-${chartData.total.join('-')}`}
      />
    );
  }, [chartData]);

  const fetchTopicById = useCallback(async (
    subjectId: number,
    sectionId: number,
    topicId: number,
    signal?: AbortSignal) => {
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

    const controller = new AbortController();
    const activeSignal = signal ?? controller.signal;

    try {
      const response = await api.get(
          `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}`,
          { signal: activeSignal }
      );

      if (activeSignal.aborted) return null;

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

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        
        <div style={{ minHeight: '200px' }}>
          <Message
            message={"Czy na pewno chcesz utworzyć podobne zadanie, ponieważ temat został już zamknięty?"}
            textConfirm="Tak"
            textCancel="Nie"
            onConfirm={() => {
              setMsgPlayVisible(false);
              router.push("/play");
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

          <ChartComponent />
          <div className="table" style={{ marginTop: "12px" }}>
            {subtopics.flatMap((subtopic) => [
              <div
                className={`element element-section`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubtopicExpand(subtopic.id);
                }}
                style={{
                  justifyContent: "space-between"
                }}
                key={`subtopic-${subtopic.id}`}
              >
                <div className="element-options" style={{ justifyContent: "center", minWidth: "20px", width: "20px" }}>
                    {Array.isArray(subtopic.tasks) && subtopic.tasks.length > 0 &&
                    (<button
                      className="btnElement"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubtopicExpand(subtopic.id);
                      }}
                    >
                      {expandedSubtopics[subtopic.id] ? (
                        <Minus size={28} />
                      ) : (
                        <Plus size={28} />
                      )}
                    </button>)}
                </div>

                <div className="element-frequency" style={{ color: "#888888" }}>
                  {subtopic.importance}
                </div>

                <div className="element-name">
                  <FormatText
                    content={
                      `${subtopic.name} ${subtopic.tasks.length !== 0 ? `(${subtopic.tasks.length})` : ""}`
                    } />
                </div>

                <div className="element-options">
                  <div
                    className={`element-percent ${subtopic.status}`}
                  >{subtopic.percent}%</div>

                  <button
                    className="btnElement"
                    onClick={async (e) => {
                    e.stopPropagation();

                    if (!subjectId || !sectionId || !topicId) return;

                    localStorage.setItem("Mode", "strict");
                    localStorage.setItem("ModeSubtopic", JSON.stringify([subtopic.name, subtopic.percent, subtopic.importance]));

                    localStorage.removeItem("taskId");
                    localStorage.removeItem("answerText");

                    const completed = await fetchTopicById(subjectId, sectionId, topicId);

                    if (completed) {
                      setMsgPlayVisible(true);
                      return;
                    }
                    
                    router.push("/play");
                  }}
                >
                  <Play size={28} color="black" />
                </button>
                </div>
              </div>,

              ...(expandedSubtopics[subtopic.id] && Array.isArray(subtopic.tasks) && subtopic.tasks.length > 0
                ? subtopic.tasks.map((task) => (
                    <div
                      className="element element-task"
                      style={{ 
                        justifyContent: "space-between",
                        alignItems: "flex-start"
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
                      key={`task-${subtopic.id}-${task.id}`}
                    >
                      <div>
                        <div className="element-name date" style={{
                          color: "#888888"
                        }}>{task.date}</div>
                        <div className="element-name" style={{ paddingLeft: "56px", alignItems: "flex-start", margin: "8px 0px" }}>
                          <div style={{ paddingRight: "16px" }}>
                            <FormatText content={task.text ?? ""} />
                          </div>
                          {sectionType !== "Stories" && (
                          <div className="element-options">
                            <button
                              className="btnElement"
                              onClick={async (e) => {
                                e.stopPropagation();

                                if (!subjectId || !sectionId || !topicId) return;

                                localStorage.setItem("Mode", "strict");
                                localStorage.setItem("ModeTaskId", String(task.id));

                                localStorage.removeItem("taskId");
                                localStorage.removeItem("answerText");

                                const completed = await fetchTopicById(subjectId, sectionId, topicId);

                                if (completed) {
                                  setMsgPlayVisible(true);
                                  return;
                                }
                                
                                router.push("/play");
                              }}
                            >
                              <Play size={28} color="black" />
                            </button>
                            </div>)}
                        </div>
                      </div>
                    </div>
                  ))
                : [])
            ])}
          </div>
        </div>
      )}
    </>
  );
}