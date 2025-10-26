'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, ListCheck } from 'lucide-react';
import "@/app/styles/table.css";
import Statistics from "@/app/sections/components/statistic";
// AlignLeft FileText FileCheck HelpCircle MessageSquare

export default function SectionsPage() {
  const router = useRouter();

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    localStorage.removeItem("subjectId");
    localStorage.removeItem("sectionId");
    localStorage.removeItem("topicId");
    localStorage.removeItem("weekOffset");
    router.push("/");
  }

  function handleTasksClick() {
    localStorage.removeItem("topicId");
    localStorage.removeItem("sectionId");
    router.push("/sections/tasks");
  }

  return (
    <>
      <Header>
        <div className="menu-icons">
          <div
            className="menu-icon"
            title={"Przełącz do zadań"}
            onClick={handleTasksClick}
            style={{ cursor: "pointer" }}
          >
            <ListCheck size={28} color="white" />
          </div>
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
        <Statistics />
      </main>
    </>
  );
}