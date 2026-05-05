"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Minus, Play, AlertCircle, ArrowLeft, Globe, SquareChartGantt, UserPen, AudioLines, LibraryBig } from "lucide-react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import { useRouter } from "next/navigation";
import FormatText from "@/app/components/formatText";
import Header from "@/app/components/header";
import { GrLineChart } from "react-icons/gr";
import { IoSchoolSharp } from "react-icons/io5";
import { GrTooltip } from "react-icons/gr";

type Status = 'started' | 'progress' | 'completed';

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  status: Status;
}

interface Topic {
  id: number;
  name: string;
  type: string;
  percent: number;
  frequency: number;
  status: Status;
  subtopics?: Subtopic[];
}

interface Section {
  id: number;
  name: string;
  type: string;
  percent: number;
  status: Status;
  repeat: boolean;
  topics?: Topic[];
}

interface ChartData {
  total: [number, number, number];
  prediction: string;
  deltaDays: number;
  hasData: boolean;
}

export default function SectionsPage() {
   const router = useRouter();

  const [subjectType, setSubjectType] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [literatures, setLiteratures] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});

  const fetchInProgressRef = useRef(false);

  const [chartData, setChartData] = useState<ChartData | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
        const storedSubjectType = localStorage.getItem("subjectType");
        setSubjectType(storedSubjectType ? String(storedSubjectType) : null);
        
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

  function handleBackClick() {
    localStorage.removeItem("subjectId");
    localStorage.removeItem("sectionId");
    localStorage.removeItem("topicId");
    localStorage.removeItem("weekOffset");
    localStorage.removeItem("style");
    router.back();
  }

  function handleTopicVocabluaryClick() {
    localStorage.removeItem("sectionId");
    localStorage.removeItem("topicId");
    router.push("/user-vocabluary");
  }

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
      const response = await api.get<any>(`/subjects/${subjectId}/sections`);

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
          prediction: response.data.prediction,
          deltaDays: response.data.deltaDays,
          hasData: newTotal.some(percent => percent > 0)
        });

        setLiteratures(response.data.literatures);

        setLoading(false);
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
  }, [subjectId]);

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
  }, []);

  const handleTopicsExpand = useCallback((sectionId: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const handleTopicPlayClick = (sectionId: number, topic: Topic, type: string) => {
    setTopicId(topic.id);
    setSectionId(sectionId);
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topic.id));

    if (type == "Stories") {
      router.push("/interactive-play");
    }
    else if (type == "Writing") {
      router.push("/writing-play");
    }
    else {
      router.push("/play");
    }
  };

  const handleTopicClick = (sectionId: number, topic: Topic, type: string) => {
    setTopicId(topic.id);
    setSectionId(sectionId);
    localStorage.setItem("sectionId", String(sectionId));
    localStorage.setItem("topicId", String(topic.id));
    localStorage.setItem("type", String(type));
    localStorage.setItem("topicPercent", String(topic.percent));
    localStorage.setItem("topicStatus", String(topic.status));

    router.push("/tasks");
  };

  const ChartComponent = useCallback(() => {
    if (!chartData || !chartData.hasData) return null;
    
    return (
      <CirclePieChart 
        percents={chartData.total} 
        prediction={chartData.prediction}
        deltaDays={chartData.deltaDays}
      />
    );
  }, [chartData]);

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

        {/*
        <div className="menu-icon" title="Play" style={{
          marginLeft: "auto",
          backgroundColor: "darkgreen",
          padding: "8px 24px"
        }}
          onClick={async (e) => {
            e.stopPropagation();
            
            setLoading(true);

            await fetchFirstUnCompletedTopic();
          }}>
            <Play size={28} color="white" />
        </div>
        */}
      </div>
    </Header>
    
    <main style={{ gap: "12px" }}>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <>
          <ChartComponent />
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "0px 12px"
          }}>
            {subjectType === "Language" && weekOffset === 0 && (<div 
              className="btnOption"
              title={"Przełącz do listy słów"}
              onClick={handleTopicVocabluaryClick}
            >
              <Globe size={28} color="white" />
            </div>)}
            {literatures.length > 0 ? (<div
              className="btnOption"
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
          {/*<div
            className="btnOption" 
            title={"Tests"}
            onClick={() => { console.log("Tests") }}
          >
            <IoSchoolSharp size={28} color="white" />
          </div>
          <div
            className="btnOption" 
            title={"Ranking"}
            onClick={() => { console.log("Ranking") }}
          >
            <GrLineChart size={28} color="white" />
          </div>*/}
          </div>
          <div className="table">
            {sections
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
                <div className="element-options" style={{ justifyContent: "center", width: "40px", maxWidth: "40px" }}>
                  {Array.isArray(section.topics) && section.topics.length > 0 && (
                    <button
                      className="btnElement"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTopicsExpand(section.id);
                      }}
                    >
                      {expandedSections[section.id] ? (
                        <Minus size={28} />
                      ) : (
                        <Plus size={28} />
                      )}
                    </button>
                  )}
                </div>

                <div className="element-name">
                  <FormatText content={section.name ?? ""} />
                </div>

                <div className="element-options">
                  {Array.isArray(section.topics) && section.topics.length > 0 && section.repeat && (
                      <AlertCircle size={24} color="#800020" />
                  )}
                  <div className={`element-percent ${section.status}`}>
                    {section.percent}%
                  </div>
                  <button
                    className="btnElement"
                    style={{ padding: "5px" }}
                  >
                    {section.type == "Stories" ? (
                      <AudioLines size={28} color="grey" />
                    ) : section.type == "Writing" ? (
                      <UserPen size={28} color="grey" />
                    ) : (
                      <SquareChartGantt size={28} color="grey" />
                    )}
                  </button>
                </div>
              </div>,

              ...(expandedSections[section.id] && Array.isArray(section.topics)
                ? section.topics
                    .flatMap((topic) => [
                    <div
                      className={`element element-topic`}
                      onClick={(e) => {
                        e.stopPropagation();

                        const finalType = topic.type || section.type;

                        handleTopicClick(section.id, topic, finalType);
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
                        <div className={`element-percent ${topic.status}`}>
                          {topic.percent}%
                        </div>
                        <button
                          className="btnElement"
                          style={{ backgroundColor: "#d4d4d4", border: "1px solid grey", padding: "5px" }}
                          onClick={(e) => {
                            e.stopPropagation();

                            const finalType = topic.type || section.type;

                            handleTopicPlayClick(section.id, topic, finalType);
                          }}
                        >
                          <Play size={28} color="black" />
                        </button>
                      </div>
                    </div>
                  ])
                : []),
            ])}
          </div>
        </>
      )}
    </main>
    </>
  );
}