"use client";

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
import { ArrowLeft, ListCheck, Minus, Play, Plus, BookOpen } from "lucide-react";
import Header from "@/app/components/header";

type Status = 'started' | 'progress' | 'completed';

interface Subtopic {
  id: number;
  name: string;
  percent: number;
  status: Status;
}

export default function SubtopicsPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sectionType, setSectionType] = useState<string | null>(null);
  const [topicPercent, setTopicPercent] = useState<number | null>(null);
  const [topicStatus, setTopicStatus] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("");
  const [topicNote, setTopicNote] = useState<string>("");
  const [literatures, setLiteratures] = useState<string[]>([]);

  const [expandedTopicNote, setExpandedTopicNote] = useState(false);

  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chartData, setChartData] = useState<{
    total: [number, number, number];
    prediction: string;
    hasData: boolean;
  } | null>(null);

  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
        const storedSectionType = localStorage.getItem("sectionType");
        setSectionType(storedSectionType ? String(storedSectionType) : null);
    }
  }, []);

  function handleBackClick() {
    router.back();
  }

  function handleTasksClick() {
    router.push("/tasks");
  }

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
        setLiteratures(response.data.topic.literatures);
        
        const newTotal: [number, number, number] = [
          Number(response.data.total.completed),
          Number(response.data.total.progress),
          Number(response.data.total.started)
        ];
        
        const hasChartData = newTotal.some(percent => percent > 0);
        
        setChartData({
          total: newTotal,
          prediction: response.data.prediction,
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

  const handleTopicNoteExpand = useCallback(() => {
    setExpandedTopicNote(prev => !prev);
  }, []);

  const ChartComponent = useCallback(() => {
    if (!chartData || !chartData.hasData) return null;
    
    return (
      <CirclePieChart 
        percents={chartData.total} 
        prediction={chartData.prediction}
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
          <div
            className="menu-icon"
            title={"Przełącz do zadań"}
            onClick={handleTasksClick}
          >
            <ListCheck size={28} color="white" />
          </div>

          <div className="menu-icon" title="Play" style={{
            marginLeft: "auto",
            backgroundColor: "darkgreen",
            padding: "8px 24px"
          }}
            onClick={async (e) => {
                e.stopPropagation();

                localStorage.removeItem("taskId");
                localStorage.removeItem("answerText");

                router.push("/play");
            }}>
              <Play size={28} color="white" />
          </div>
        </div>
      </Header>

      <main>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <div style={{ minHeight: '200px' }}>
          <ChartComponent />
          <div style={{ 
              padding: "8px", 
              width: "100%",
              paddingBottom: "0px"
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
                        }}
                      >
                        <BookOpen size={26} />
                      </div>) : null}
                      <div className={`element-percent ${topicStatus}`}>
                        {topicPercent}%
                      </div>
                  </div>
              </div>
              {expandedTopicNote && (
                  <>
                    <br />
                    <div className="topic-note">
                        <FormatText content={topicNote} />
                    </div>
                  </>
              )}
          </div>

          <div className="table" style={{ marginTop: "12px" }}>
            {subtopics.flatMap((subtopic) => [
              <div
                className={`element element-section`}
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
      )}
      </main>
    </>
  );
}