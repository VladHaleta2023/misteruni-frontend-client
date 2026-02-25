"use client";

import { useCallback, useEffect, useState } from "react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import api from "@/app/utils/api";
import { useRouter } from "next/navigation";
import { setMainHeight } from "@/app/scripts/mainHeight";
import FormatText from "@/app/components/formatText";
import { ArrowLeft } from "lucide-react";
import Header from "@/app/components/header";

export default function LiteraturePage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [literature, setLiterature] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    localStorage.removeItem("literature");
    router.back();
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      const storedSectionId = localStorage.getItem("sectionId");
      setSectionId(storedSectionId ? Number(storedSectionId) : null);
      const storedTopicId = localStorage.getItem("topicId");
      setTopicId(storedTopicId ? Number(storedTopicId) : null);
      const storedLiterature = localStorage.getItem("literature");
      setLiterature(storedLiterature ? String(storedLiterature) : "");
    }
  }, []);

  const fetchLiterature = useCallback(async () => {
    try {
      const response = await api.get(`/subjects/${subjectId}/literature?name=${literature}`);

      if (response.data?.statusCode === 200) {
        setNote(response.data?.literature?.note ?? "");
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
    }
  }, [subjectId, sectionId, topicId]);

  useEffect(() => {
    if (subjectId !== null && sectionId !== null && topicId !== null) {
      setLoading(true);
      fetchLiterature();
    }
  }, [subjectId, sectionId, topicId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

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
        <div style={{ minHeight: '200px', padding: "12px 24px" }}>
          <br />
          <div className="text-title" style={{ fontSize: "20px" }}>{literature}</div>
          <br />
          <FormatText content={note} />
          <br />
        </div>
      )}
      </main>
    </>
  );
}