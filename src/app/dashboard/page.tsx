"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Globe, LibraryBig, FileCheck, List, Minus, Plus } from "lucide-react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import api from "@/app/utils/api";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import DeltaBadge from "../components/deltaBadge";

interface VerificationStats {
  completed: number;
  progress: number;
  started: number;
  willNotFinish: number;
  totalCovered: number;
}

interface DailyProgressItem {
  date: string;
  dayOfWeek: string;
  deltaPercent: number;
  timeSpentMinutes: number;
  plannedMinutes: number;
}

interface StatisticSnapshot {
  date: string;
  remainingDaysToExam: number;
  examsCount: number;
  averageExamScore: number;
  totalCovered: number;
  predictedScore: number;
  checkedWordsCount: number;
  wordsCoveragePercent: number;
  audioTasksCount: number;
  averageAudioScore: number;
  writingTasksCount: number;
  averageWritingScore: number;
}

interface StatisticData {
  current: StatisticSnapshot;
  previous: StatisticSnapshot | null;
  verification: VerificationStats;
  dailyProgress: DailyProgressItem[];
  totalWordsCount: number;
}

export default function DashboardPage() {
  const router = useRouter();

  const [subjectType, setSubjectType] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [literatures, setLiteratures] = useState<string[]>([]);
  const [statistic, setStatistic] = useState<StatisticData | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<boolean>(false);
  const [expandedDailyProgress, setExpandedDailyProgress] = useState<boolean>(true);

  const handleDetailsExpand = useCallback(() => {
    setExpandedDetails(prev => !prev);
  }, []);

  const handleDailyProgressExpand = useCallback(() => {
    setExpandedDailyProgress(prev => !prev);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectType = localStorage.getItem("subjectType");
      setSubjectType(storedSubjectType ? String(storedSubjectType) : null);
    }
  }, []);

  function handleBackClick() {
    router.back();
  }

  function handleTopicVocabluaryClick() {
    router.push("/user-vocabluary");
  }

  function handleContentClick() {
    router.push("/content");
  }

  function handleExamClick() {
    router.push("/exam");
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
    }
  }, []);

  useEffect(() => {
    if (!subjectId) return;

    let mounted = true;

    const loadAll = async () => {
      setLoading(true);

      const [literaturesResult, statisticResult] = await Promise.all([
        api.get<any>(`/subjects/${subjectId}/literatures`).then(r => {
          if (r.data?.statusCode === 200) return r.data.literatures || [];
          showAlert(r.data.statusCode, r.data.message);
          return [];
        }).catch(error => {
          const err = error as any;
          if (err?.response) {
            showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
          } else if (error instanceof Error) {
            showAlert(500, error.message);
          } else {
            showAlert(500, "Unknown error");
          }
          return [];
        }),
        
        api.get<any>(`/subjects/${subjectId}/statistic`).then(r => {
          if (r.data?.statusCode === 200) return r.data.statistic;
          showAlert(r.data.statusCode, r.data.message);
          return null;
        }).catch(error => {
          const err = error as any;
          if (err?.response) {
            showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
          } else if (error instanceof Error) {
            showAlert(500, error.message);
          } else {
            showAlert(500, "Unknown error");
          }
          return null;
        })
      ]);

      if (mounted) {
        setLiteratures(literaturesResult);
        setStatistic(statisticResult);
        setLoading(false);
      }
    };

    loadAll();

    return () => {
      mounted = false;
    };
  }, [subjectId]);

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
          <div style={{
            width: "100%",
            padding: "12px 8px",
          }}>
            <div 
              className="text-topic-note"
              style={{
                  flexDirection: "column",
                  alignItems: "flex-start"
              }}
            >
              <div className="element-name" style={{ fontSize: "20px" }}>
                <div
                  className="btnOption"
                  style={{
                    fontWeight: "bold",
                    marginRight: "12px"
                  }}
                  title={"Przełącz do arkusza przedmiotu"}
                  onClick={() => handleExamClick()}
                >
                  <FileCheck size={28} color="white" />
                </div>
                <div className="text-title">
                  Arkusz
                </div>
              </div>

              <div className="element-name" style={{ fontSize: "20px" }}>
                <div
                  className="btnOption"
                  style={{
                    fontWeight: "bold",
                    marginRight: "12px"
                  }}
                  title={"Przełącz do treści przedmiotu"}
                  onClick={() => handleContentClick()}
                >
                  <List size={28} color="white" />
                </div>
                <div className="text-title">
                  Treść
                </div>
              </div>

              {literatures.length > 0 && (
              <div className="element-name" style={{ fontSize: "20px" }}>
                <div
                  className="btnOption"
                  style={{
                    fontWeight: "bold",
                    marginRight: "12px"
                  }}
                  title={"Przełącz do listy streszczeń"}
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
                  <LibraryBig size={28} color="white" />
                </div>
                <div className="text-title">
                  Streszczenia
                </div>
              </div>)}

              {subjectType === "Language" && (
              <div className="element-name" style={{ fontSize: "20px" }}>
                <div
                  className="btnOption"
                  style={{
                    fontWeight: "bold",
                    marginRight: "12px"
                  }}
                  title={"Przełącz do listy słów"}
                  onClick={() => handleTopicVocabluaryClick()}
                >
                  <Globe size={28} color="white" />
                </div>
                <div className="text-title">
                  Słownictwo
                </div>
              </div>)}
            </div>
          </div>

          <div style={{ padding: "8px", backgroundColor: "#e7e7e7"}}>
            <div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Pozostało czasu:
              </div>
              <div className="element-options element-bold">
                {statistic?.current.remainingDaysToExam} dni
              </div>
            </div>

            <div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Liczba arkuszy rozwiązanych:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.examsCount}
                  previousValue={statistic?.previous?.examsCount}
                  sufix=""
                />
              </div>
              <div className="element-options element-bold">
                {statistic?.current.examsCount} ark.
              </div>
            </div>

            <div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Średni procent arkuszy rozwiązanych:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.averageExamScore}
                  previousValue={statistic?.previous?.averageExamScore}
                  sufix="%"
                />
              </div>
              <div className="element-options element-bold">
                <div className={`element-percent`}>
                  {statistic?.current.averageExamScore}%
                </div>
              </div>
            </div>

            <div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Pokrycie treści przedmiotu:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.totalCovered}
                  previousValue={statistic?.previous?.totalCovered}
                  sufix="%"
                />
              </div>
              <div className="element-options element-bold">
                <div className={`element-percent`}>
                  {statistic?.current.totalCovered}%
                </div>
              </div>
            </div>

            <div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Przewidywana ocena na egzaminie:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.predictedScore}
                  previousValue={statistic?.previous?.predictedScore}
                  sufix="%"
                />
              </div>
              <div className="element-options element-bold">
                <div className={`element-percent`}>
                  {statistic?.current.predictedScore}%
                </div>
              </div>
            </div>
          </div>

          {(subjectType === "Language" || subjectType === "Humanistic") && (<div className={`element element-section`}>
            <button
              className="btnElement"
              onClick={(e) => {
                e.stopPropagation();
                handleDetailsExpand();
              }}
            >
              {expandedDetails ? (
                <Minus size={28} />
              ) : (
                <Plus size={28} />
              )}
            </button>
            <div className="element-name" style={{ fontWeight: "bold", fontSize: "18px" }}>
              Szczegóły
            </div>
          </div>)}

          {expandedDetails && (<div style={{ padding: "8px", backgroundColor: "#e7e7e7"}}>
            {subjectType === "Language" && (<div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Liczba sprawdzonych słów:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.checkedWordsCount}
                  previousValue={statistic?.previous?.checkedWordsCount}
                  sufix=""
                />
              </div>
              <div className="element-options element-bold">
                {statistic?.current.checkedWordsCount} sł.
              </div>
            </div>)}

            {subjectType === "Language" && (<div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Procent pokrycia słownictwa:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.wordsCoveragePercent}
                  previousValue={statistic?.previous?.wordsCoveragePercent}
                  sufix="%"
                />
              </div>
              <div className="element-options element-bold">
                <div className={`element-percent`}>
                  {statistic?.current.wordsCoveragePercent}%
                </div>
              </div>
            </div>)}

            {subjectType === "Language" && (<div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Liczba zadań audio:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.audioTasksCount}
                  previousValue={statistic?.previous?.audioTasksCount}
                  sufix=""
                />
              </div>
              <div className="element-options element-bold">
                {statistic?.current.audioTasksCount} zad.
              </div>
            </div>)}

            {subjectType === "Language" && (<div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                Średni procent zadań audio:
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.averageAudioScore}
                  previousValue={statistic?.previous?.averageAudioScore}
                  sufix="%"
                />
              </div>
              <div className="element-options element-bold">
                <div className={`element-percent`}>
                  {statistic?.current.averageAudioScore}%
                </div>
              </div>
            </div>)}

            {(subjectType === "Language" || subjectType === "Humanistic") && (<div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                {subjectType === "Language" ? `Liczba zadań writing:` : `Liczba wypracowań:`}
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.writingTasksCount}
                  previousValue={statistic?.previous?.writingTasksCount}
                  sufix=""
                />
              </div>
              <div className="element-options element-bold">
                {statistic?.current.writingTasksCount} zad.
              </div>
            </div>)}

            {(subjectType === "Language" || subjectType === "Humanistic") && (<div className="element element-statistic" style={{ borderBottom: "none" }}>
              <div className="element-name">
                {subjectType === "Language" ? `Średni procent zadań writing:` : `Średni procent wypracowań:`}
              </div>
              <div className="element-options">
                <DeltaBadge
                  currentValue={statistic?.current.averageWritingScore}
                  previousValue={statistic?.previous?.averageWritingScore}
                  sufix="%"
                />
              </div>
              <div className="element-options element-bold">
                <div className={`element-percent`}>
                  {statistic?.current.averageWritingScore}%
                </div>
              </div>
            </div>)}
          </div>)}
          
          {statistic?.dailyProgress && statistic?.dailyProgress.length > 0 && (<div className="table">
            <div className={`element element-section`}>
              <button
                className="btnElement"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDailyProgressExpand();
                }}
              >
                {expandedDailyProgress ? (
                  <Minus size={28} />
                ) : (
                  <Plus size={28} />
                )}
              </button>
              <div className="element-name" style={{ fontWeight: "bold", fontSize: "18px" }}>
                Wykonanie normy
              </div>
            </div>
            {expandedDailyProgress && statistic?.dailyProgress.map((item) => (
              <div
                key={item.date}
                className="element element-topic"
                style={{ justifyContent: "space-between" }}
              >
                <div className="element-name">
                  {item.dayOfWeek} {item.date}
                </div>

                <div className="element-options">
                  <div className={`element-percent ${item.deltaPercent < 0 ? "not-finished" : "completed"}`}>
                    {item.deltaPercent === -100
                      ? "nieobecność"
                      : item.deltaPercent > 0
                      ? `+${item.deltaPercent}%`
                      : `${item.deltaPercent}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>)}
        </>
      )}
    </main>
  </>);
}