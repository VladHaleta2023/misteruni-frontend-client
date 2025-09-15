'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft } from 'lucide-react';
import "@/app/styles/table.css";
import Tasks from "./components/tasks";

export default function TasksPage() {
  const router = useRouter();

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    router.back();
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
        </div>
      </Header>

      <main style={{ padding: "0px" }}>
        <Tasks />
      </main>
    </>
  );
}