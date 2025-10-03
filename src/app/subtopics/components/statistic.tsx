import { useCallback, useEffect, useState } from "react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { setMainHeight } from "@/app/scripts/mainHeight";
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
  percent: number;
  blocked: boolean;
  status: Status;
  topics?: Topic[];
}

export default function Statistics() {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [subtopics, setSubtopics] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [total, setTotal] = useState<[number, number, number, number]>([0, 0, 0, 0]);

  const [weekOffset, setWeekOffset] = useState<number>(0);

  const [statistics, setStatistics] = useState({
    solvedTasksCountCompleted: 0,
    solvedTasksCount: 0,
    closedSubtopicsCount: null,
    closedTopicsCount: null,
    weekLabel: "bieżący",
    prediction: null
  });

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

  const fetchSubtopics = useCallback(async () => {
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
      const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/subtopics?weekOffset=${weekOffset}`);
      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedSubtopics: Section[] = response.data.subtopics;
        setSubtopics(fetchedSubtopics);
        setStatistics(response.data.statistics);
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
  }, [subjectId, sectionId, topicId, weekOffset]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    if (subjectId !== null) {
      setLoading(true);
      fetchSubtopics();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchSubtopics, subjectId, weekOffset]);

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <>
          <CirclePieChart percents={total} statistics={statistics} />
          <div className="table" style={{
            marginTop: "12px"
          }}>
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
                  >{Math.round(subtopic.percent)}%</div>
                </div>
              </div>
            ])}
          </div>
          <br />
        </>
      )}
    </>
  );
}