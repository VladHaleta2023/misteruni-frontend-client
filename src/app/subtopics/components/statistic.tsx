import { useCallback, useEffect, useRef, useState } from "react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { setMainHeight } from "@/app/scripts/mainHeight";
import FormatText from "@/app/components/formatText";

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
  percent: number;
  status: Status;
  subtopics?: Subtopic[];
}

interface Section {
  id: number;
  name: string;
  percent: number;
  status: Status;
  topics?: Topic[];
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
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [subtopics, setSubtopics] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [chartData, setChartData] = useState<{
    total: [number, number, number];
    statistics: StatisticsData;
    hasData: boolean;
  } | null>(null);

  const fetchInProgressRef = useRef(false);

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
        const fetchedSubtopics: Section[] = response.data.subtopics;
        setSubtopics(fetchedSubtopics);
        
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

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <div style={{ minHeight: '200px' }}>
          <ChartComponent />
          <div className="table" style={{ marginTop: "12px" }}>
            {subtopics.flatMap((subtopic) => [
              <div
                className={`element element-subtopic`}
                style={{ justifyContent: "space-between" }}
                key={`section-${subtopic.id}`}
              >
                <div className="element-name">
                  <FormatText content={subtopic.name ?? ""} />
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
    </>
  );
}