'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { Home, ClipboardList, ArrowLeft, Play, MessageSquare } from 'lucide-react';
import "@/app/styles/table.css";
import Statistics from "@/app/sections/components/statistic";
import Tasks from "@/app/sections/components/tasks";
// AlignLeft FileText FileCheck HelpCircle MessageSquare

export default function SectionsPage() {
  const [showStatsIcon, setShowStatsIcon] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleHomeClick() {
    localStorage.removeItem("subjectId");
    router.push("/");
  }

  function handleBackClick() {
    localStorage.removeItem("subjectId");
    router.push("/");
  }

  function handlePlayClick() {
    router.push("/play");
  }

  function handleToggleIconClick() {
    setShowStatsIcon(prev => !prev);
  }

  return (
    <>
      <Header>
        <div className="menu-icons">
          <div
            className="menu-icon"
            title="Strona Główna"
            onClick={handleHomeClick}
            style={{ cursor: "pointer" }}
          >
            <Home size={28} color="white" />
          </div>

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
            title={showStatsIcon ? "Przełącz do zadań" : "Przełącz do statystyki"}
            onClick={handleToggleIconClick}
            style={{ cursor: "pointer" }}
          >
            {showStatsIcon ? (
              <MessageSquare size={28} color="white" />
            ) : (
              <ClipboardList size={28} color="white" />
            )}
          </div>

          <div
            className="menu-icon"
            title="Zacząć testowanie"
            onClick={handlePlayClick}
          >
            <Play size={28} color="white" />
          </div>
        </div>
      </Header>

      <main>
        {showStatsIcon ? (
          <Statistics />
        ) : (
          <Tasks />
        )}
      </main>
    </>
  );
}