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

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  blocked: boolean;
  status: Status;
}

interface Topic {
  id: number;
  name: string;
  percent: number;
  blocked: boolean;
  status: Status;
  subtopics?: Subtopic[];
}

interface Section {
  id: number;
  name: string;
  type: string;
  percent: number;
  blocked: boolean;
  status: Status;
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

  const [total, setTotal] = useState<[number, number, number, number]>([0, 0, 0, 0]);

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
      const response = await api.get(`/subjects/${subjectId}/sections`);
      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedSections: Section[] = response.data.sections;
        setSections(fetchedSections);
        setTotal([
          Math.round(Number(response.data.total.completed)),
          Math.round(Number(response.data.total.progress)),
          Math.round(Number(response.data.total.started)),
          Math.round(Number(response.data.total.blocked))
        ]);
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
  }, [subjectId]);

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
  }, [fetchSections, subjectId]);

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

  /*
  async function sectionBlocked(sectionId: number) {
    setLoading(true);

    try {
      const response = await api.post(/subjects/${subjectId}/sections/${sectionId}/blocked);
      
      showAlert(response.data.statusCode, response.data.message);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setLoading(false);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          showAlert(error.response.status, error.response.data.message || "Server error");
        } else {
          showAlert(500, Server error: ${error.message});
        }
      } else if (error instanceof Error) {
        showAlert(500, Server error: ${error.message});
      } else {
        showAlert(500, "Unknown error");
      }
    }
  }

  async function topicBlocked(sectionId: number, topicId: number) {
    setLoading(true);

    try {
      const response = await api.post(/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/blocked);
      
      showAlert(response.data.statusCode, response.data.message);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      setLoading(false);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          showAlert(error.response.status, error.response.data.message || "Server error");
        } else {
          showAlert(500, Server error: ${error.message});
        }
      } else if (error instanceof Error) {
        showAlert(500, Server error: ${error.message});
      } else {
        showAlert(500, "Unknown error");
      }
    }
  }
  */

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <>
          <CirclePieChart percents={total} />
          <div className="table" style={{
            marginTop: "12px"
          }}>
            {sections.flatMap((section) => [
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
                  <div
                    className={`element-percent ${section.status}`}
                  >{Math.round(section.percent)}%</div>
                </div>
              </div>,

              ...(expandedSections[section.id] && Array.isArray(section.topics)
                ? section.topics.flatMap((topic) => [
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
                        <div className={`element-percent ${topic.status}`}>{Math.round(topic.percent)}%</div>
                        <button
                          className="btnElement"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTopicPlayClick(section.id, topic, section.type);
                          }}
                        >
                          <Play size={32} color="black" />
                        </button>
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