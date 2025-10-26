import { useCallback, useEffect, useState } from "react";
import { Plus, Minus, Play } from "lucide-react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { useRouter } from "next/navigation";
import FormatText from "@/app/components/formatText";

type Status = 'blocked' | 'started' | 'progress' | 'completed';
type DeltaStatus = 'completed' | 'error' | 'completed error';

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  delta: number;
  blocked: boolean;
  status: Status;
}

interface Topic {
  id: number;
  name: string;
  percent: number;
  blocked: boolean;
  delta: number;
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
  blocked: boolean;
  status: Status;
  process: Status;
  topics?: Topic[];
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

  const [statistics, setStatistics] = useState({
    solvedTasksCountCompleted: 0,
    solvedTasksCount: 0,
    closedSubtopicsCount: 0,
    closedTopicsCount: 0,
    weekLabel: "bieżący",
    prediction: null
  });

  const [total, setTotal] = useState<[number, number, number, number]>([0, 0, 0, 0]);

  useEffect(() => {
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
    if (sections.length === 0) return;
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
  }, [sections, sectionId, topicId]);

  const fetchSections = useCallback(async () => {
    if (!subjectId) {
      setLoading(false);
      showAlert(400, "Przedmiot nie został znaleziony");
      return;
    }

    try {
      const response = await api.get(`/subjects/${subjectId}/sections?weekOffset=${weekOffset}`);
      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedSections: Section[] = response.data.sections;
        setSections(fetchedSections);
        setStatistics(response.data.statistics);
        setTotal([
          Number(response.data.total.completed),
          Number(response.data.total.progress),
          Number(response.data.total.started),
          Number(response.data.total.blocked)
        ]);

        if (weekOffset !== 0) {
          const expanded: { [key: number]: boolean } = {};
          fetchedSections.forEach((section) => {
            expanded[section.id] = true;
          });
          setExpandedSections(expanded);
        }
        else {
          const collapsed: { [key: number]: boolean } = {};
          fetchedSections.forEach((section) => {
            collapsed[section.id] = false;
          });
          setExpandedSections(collapsed);
        }
      } else {
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
      showAlert(400, "Nie można przejść dalej – to jest bieżący tydzień");
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
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    if (subjectId !== null) {
      setLoading(true);
      fetchSections();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchSections, subjectId, weekOffset]);

  const handleTopicsExpand = (sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleTopicPlayClick = (sectionId: number, topic: Topic, sectionType: string) => {
    if (topic.blocked) return;

    setTopicId(topic.id);
    setSectionId(sectionId);
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topic.id));

    if (sectionType == "InteractiveQuestion") {
      router.push("/interactive-play");
    }
    else {
      router.push("/play");
    }
  };

  const handleTopicClick = (sectionId: number, topic: Topic, sectionType: string) => {
    if (topic.blocked) return;

    setTopicId(topic.id);
    setSectionId(sectionId);
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topic.id));

    if (sectionType == "InteractiveQuestion") {
      router.push("/subtopics/tasks");
    }
    else {
      router.push("/subtopics");
    }
  };

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <>
          <CirclePieChart percents={total} statistics={statistics} onPrev={decreaseWeekOffset} onNext={increaseWeekOffset} />
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
              >
                <div className="element-options">
                  {Array.isArray(section.topics) && section.topics.length > 0 && (
                    <button
                      className="btnElement"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTopicsExpand(section.id);
                      }}
                    >
                      {expandedSections[section.id] ? (
                        <Minus size={24} className={section.blocked ? "icon-blocked" : "icon-unblocked"} />
                      ) : (
                        <Plus size={24} className={section.blocked ? "icon-blocked" : "icon-unblocked"} />
                      )}
                    </button>
                  )}
                </div>

                <div className="element-name">
                  <FormatText content={section.name ?? ""} />
                </div>

                <div className="element-options">
                  {weekOffset === 0 ? (
                    <div
                      className={
                        weekOffset === 0
                          ? `element-percent ${section.status} ${section.process}`
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
                      <div className="element-name">
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
          <br />
        </>
      )}
    </>
  );
}