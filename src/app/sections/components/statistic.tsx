import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MoreHorizontal } from "lucide-react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import CirclePieChart from "@/app/components/circlePieChart";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { setMainHeight } from "@/app/scripts/mainHeight";

interface Topic {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
  topics?: Topic[];
}

export default function Statistics() {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("subjectId");
      setSubjectId(stored ? Number(stored) : null);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    if (!subjectId) {
      setLoading(false);
      showAlert(400, "Przedmiot nie został znaleziony");
      return;
    }

    try {
      const response = await api.get(`/subjects/${subjectId}/sections`);
      if (response.data?.statusCode === 200) {
        const fetchedSections: Section[] = response.data.sections;
        setSections(fetchedSections);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
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
      setLoading(false);
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

  function handleTopicDetails(sectionId: number, topicId: number) {
    console.log(sectionId, topicId);
  }

  return (
    <>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <>
          <CirclePieChart percents={[40, 30, 20, 10]} />
          <br />
          <div className="table">
            {sections.flatMap((section) => [
              <div className="element element-section" id="withOptions" key={`section-${section.id}`}>
                <div className="options">
                    <div className="percentages-wrapper">
                        <div className="percent">100%</div>
                        <div className="green">+10%</div>
                    </div>
                    <button
                        className="btnElement"
                        onClick={() => handleTopicsExpand(section.id)}
                    >
                        {expandedSections[section.id] ? (
                        <ChevronUp size={28} color="#555" />
                        ) : (
                        <ChevronDown size={28} color="#555" />
                        )}
                    </button>
                </div>
                <div className="element-title">{section.name}</div>
              </div>,

              ...(expandedSections[section.id]
                ? section.topics?.map((topic) => (
                    <div className="element element-topic" id="withOptions" key={`${section.id}-${topic.id}`}>
                      <div className="options">
                        <div className="percentages-wrapper">
                            <div className="percent">100%</div>
                            <div className="red">-10%</div>
                        </div>
                        <button
                          className="btnElement"
                          onClick={() => handleTopicDetails(section.id, topic.id)}
                        >
                          <MoreHorizontal size={28} color="#555" />
                        </button>
                      </div>
                      <div className="element-title">{topic.name}</div>
                    </div>
                  )) ?? []
                : []),
            ])}
          </div>
        </>
      )}
    </>
  );
}