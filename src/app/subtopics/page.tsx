'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, ListCheck, Play } from 'lucide-react';
import "@/app/styles/table.css";
import Statistics from "@/app/subtopics/components/statistic";
import Message from "../components/message";
import api from "../utils/api";
import { showAlert } from "../scripts/showAlert";
import axios from "axios";

export default function SubtopicsPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sectionType, setSectionType] = useState<string | null>(null);

  const [msgPlayVisible, setMsgPlayVisible] = useState<boolean>(false);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

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
        const storedSectionType = localStorage.getItem("sectionType");
        setSectionType(storedSectionType ? String(storedSectionType) : null);
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

  const fetchTopicById = useCallback(async (
    subjectId: number,
    sectionId: number,
    topicId: number) => {
    
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

    try {
        const response = await api.get(
            `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}`
        );

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

  function handleBackClick() {
    router.back();
  }

  function handleTasksClick() {
    router.push("/tasks");
  }

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
              style={{ cursor: "pointer" }}
          >
              <ListCheck size={28} color="white" />
          </div>

          <div className="menu-icon" title="Play" style={{ marginLeft: 'auto' }}
            onClick={async (e) => {
                e.stopPropagation();

                if (!subjectId || !sectionId || !topicId) return;

                const completed = await fetchTopicById(subjectId, sectionId, topicId);

                if (completed) {
                    setMsgPlayVisible(true);
                    return;
                }

                if (sectionType == "Stories") {
                  router.push("/interactive-play");
                }
                else {
                  router.push("/play");
                }
            }}>
              <Play size={28} color="white" />
            </div>
        </div>
      </Header>

      <Message
        message={"Czy na pewno chcesz utworzyć nowe zadanie, ponieważ temat został już zamknięty?"}
        textConfirm="Tak"
        textCancel="Nie"
        onConfirm={() => {
            setMsgPlayVisible(false);

            if (sectionType == "Stories") {
                router.push("/interactive-play");
            }
            else {
                router.push("/play");
            }
        }}
        onClose={() => {
            setMsgPlayVisible(false);
        }}
        visible={msgPlayVisible}
      />

      <main>
        <Statistics />
      </main>
    </>
  );
}