import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, Play } from "lucide-react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { useRouter } from "next/navigation";
import FormatText from "@/app/components/formatText";

type Status = 'started' | 'progress' | 'completed';
type DeltaStatus = 'completed' | 'error' | 'completed error';

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  delta: number;
  status: Status;
}

interface Topic {
  id: number;
  name: string;
  percent: number;
  delta: number;
  frequency: number;
  deltaStatus: DeltaStatus;
  status: Status;
  subtopics?: Subtopic[];
}

interface Section {
  id: number;
  name: string;
  type: string;
  percent: number;
  delta: number;
  deltaStatus: DeltaStatus;
  status: Status;
  topics?: Topic[];
}

interface StatisticsData {
  solvedTasksCountCompleted: number;
  solvedTasksCount: number;
  closedSubtopicsCount: number;
  closedTopicsCount: number;
  weekLabel: string;
  prediction: string;
}

interface ChartData {
  total: [number, number, number];
  statistics: StatisticsData;
  hasData: boolean;
}

export default function Statistics() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const fetchInProgressRef = useRef(false);

  const [chartData, setChartData] = useState<ChartData | null>(null);

  useEffect(() => {
    localStorage.removeItem("Mode");
    localStorage.removeItem("ModeTaskId");

    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      const storedSectionId = localStorage.getItem("sectionId");
      setSectionId(storedSectionId ? Number(storedSectionId) : null);
      const storedTopicId = localStorage.getItem("topicId");
      setTopicId(storedTopicId ? Number(storedTopicId) : null);
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

  useEffect(() => {
    if (sections.length === 0 || loading) return;
    if (typeof window === "undefined") return;

    if (
      sectionId === null ||
      topicId === null ||
      !sections.find(sec => sec.id === sectionId) ||
      !sections.find(sec => sec.id === sectionId)?.topics?.find(t => t.id === topicId)
    ) {
      const firstSection = sections[0];
      const firstTopic = firstSection.topics && firstSection.topics.length > 0 ? firstSection.topics[0] : null;

      if (firstSection) {
        setSectionId(firstSection.id);
        localStorage.setItem("sectionId", String(firstSection.id));
      }
      if (firstTopic) {
        setTopicId(firstTopic.id);
        localStorage.setItem("topicId", String(firstTopic.id));
      } else {
        setTopicId(null);
        localStorage.removeItem("topicId");
      }
    }
  }, [sections, sectionId, topicId, loading]);

  const fetchSections = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    fetchInProgressRef.current = true;
    
    if (!subjectId) {
      setLoading(false);
      fetchInProgressRef.current = false;
      showAlert(400, "Przedmiot nie został znaleziony");
      return;
    }

    try {
      const response = await api.get(`/subjects/${subjectId}/sections?weekOffset=${weekOffset}`);

      if (response.data?.statusCode === 200) {
        const fetchedSections: Section[] = response.data.sections;
        
        setSections(fetchedSections);
        
        const newTotal: [number, number, number] = [
          Number(response.data.total.completed),
          Number(response.data.total.progress),
          Number(response.data.total.started)
        ];
        
        setChartData({
          total: newTotal,
          statistics: response.data.statistics,
          hasData: newTotal.some(percent => percent > 0)
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
  }, [subjectId, weekOffset]);

  const increaseWeekOffset = () => {
    setWeekOffset(prev => {
      if (prev === 0) {
        return prev;
      }
      const newValue = prev + 1;
      localStorage.setItem("weekOffset", String(newValue));
      return newValue;
    });

    if (weekOffset === 0) {
      showAlert(400, "Nie można przejść dalej");
    }
  };

  const decreaseWeekOffset = () => {
    setWeekOffset(prev => {
      const newValue = prev - 1;
      localStorage.setItem("weekOffset", String(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (subjectId !== null && mounted) {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        await fetchSections();
      } else if (mounted) {
        setLoading(false);
      }
    };

    if (subjectId !== null) {
      initialize();
    }

    return () => {
      mounted = false;
    };
  }, [subjectId]);

  useEffect(() => {
    if (subjectId !== null && !loading) {
      setLoading(true);
      fetchSections();
    }
  }, [weekOffset]);

  useEffect(() => {
    if (sections.length === 0) return;
    
    const newExpandedState: { [key: number]: boolean } = {};
    
    sections.forEach((section) => {
      newExpandedState[section.id] = weekOffset !== 0;
    });
    
    setExpandedSections(newExpandedState);
  }, [weekOffset, sections]);

  const handleTopicsExpand = useCallback((sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const handleTopicPlayClick = (sectionId: number, topic: Topic, sectionType: string) => {
    setTopicId(topic.id);
    setSectionId(sectionId);
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topic.id));

    if (sectionType == "Stories") {
      router.push("/interactive-play");
    }
    else {
      router.push("/play");
    }
  };

  const handleTopicClick = (sectionId: number, topic: Topic, sectionType: string) => {
    setTopicId(topic.id);
    setSectionId(sectionId);
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topic.id));
    localStorage.setItem("sectionType", String(sectionType));

    router.push("/tasks");
  };

  const ChartComponent = useCallback(() => {
    if (!chartData || !chartData.hasData) return null;
    
    return (
      <CirclePieChart 
        percents={chartData.total} 
        statistics={chartData.statistics} 
        onPrev={decreaseWeekOffset} 
        onNext={increaseWeekOffset}
        key={`chart-${chartData.total.join('-')}-${weekOffset}`}
      />
    );
  }, [chartData, weekOffset]);

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <>
          <ChartComponent />
          <div className="table" style={{
            marginTop: "12px"
          }}>
            {sections
              .filter(section => !(weekOffset !== 0 && section.delta === 0))
              .flatMap((section) => [
              <div
                className={`element element-section`}
                style={{ justifyContent: "space-between" }}
                key={`section-${section.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTopicsExpand(section.id);
                }}
              >
                <div className="element-options" style={{ width: "40px", maxWidth: "40px", justifyContent: "center" }}>
                  {Array.isArray(section.topics) && section.topics.length > 0 && (
                    <button
                      className="btnElement"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTopicsExpand(section.id);
                      }}
                    >
                      {expandedSections[section.id] ? (
                        <Minus size={24} />
                      ) : (
                        <Plus size={24} />
                      )}
                    </button>
                  )}
                </div>

                <div className="element-name" style={{ marginLeft: "0px" }}>
                  <FormatText content={section.name ?? ""} />
                </div>

                <div className="element-options">
                  {weekOffset === 0 ? (
                    <div
                      className={
                        weekOffset === 0
                          ? `element-percent ${section.status}`
                          : `element-percent ${section.deltaStatus}`
                      }
                    >
                      {section.delta >= 0 && weekOffset !== 0 ? "+" : ""}{weekOffset === 0 ? section.percent : Math.round(section.delta)}%
                    </div>
                  ) : null}
                </div>
              </div>,

              ...(expandedSections[section.id] && Array.isArray(section.topics)
                ? section.topics
                    .filter(topic => !(weekOffset !== 0 && topic.delta === 0))
                    .flatMap((topic) => [
                    <div
                      className={`element element-topic`}
                      onClick={(e) => {
                          e.stopPropagation();
                          handleTopicClick(section.id, topic, section.type);
                        }}
                      style={{ justifyContent: "space-between" }}
                      key={`topic-${section.id}-${topic.id}`}
                    >
                      <div className="element-frequency" style={{ color: "#888888" }}>
                        {section.type !== "Stories" ? topic.frequency : ""}
                      </div>
                      <div className="element-name" style={{ marginLeft: "0px" }}>
                        <FormatText content={topic.name ?? ""} />
                      </div>
                      <div className="element-options">
                        <div
                          className={
                            weekOffset === 0
                              ? `element-percent ${topic.status}`
                              : `element-percent ${topic.deltaStatus}`
                          }
                        >
                          {topic.delta >= 0 && weekOffset !== 0 ? "+" : ""}{weekOffset === 0 ? topic.percent : Math.round(topic.delta)}%
                        </div>
                        {weekOffset === 0 ? (<button
                          className="btnElement"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTopicPlayClick(section.id, topic, section.type);
                          }}
                        >
                          <Play size={32} color="black" />
                        </button>): null}
                      </div>
                    </div>
                  ])
                : []),
            ])}
          </div>
        </>
      )}
    </>
  );
}