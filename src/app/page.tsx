'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import "@/app/styles/table.css";
import Image from 'next/image';
import api from "@/app/utils/api";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import Spinner from "@/app/components/spinner";

interface Subject {
  id: number;
  name: string;
  url: string;
  prompt: string;
}

export default function MainPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const preloadImages = useCallback((subjects: Subject[]) => {
    let loaded = 0;
    const imagesToLoad = subjects.filter((subj: Subject) => subj.url).length;

    if (imagesToLoad === 0) {
      setLoading(false);
      return;
    }

    subjects.forEach((subject: Subject) => {
      if (!subject.url) return;

      const img = new window.Image();
      img.src = subject.url;
      img.onload = img.onerror = () => {
        loaded += 1;
        if (loaded === imagesToLoad) {
          setLoading(false);
        }
      };
    });
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await api.get("/subjects?withSections=false");
      if (response.data?.statusCode === 200) {
        const fetchedSubjects: Subject[] = response.data.subjects;
        setSubjects(fetchedSubjects);

        if (fetchedSubjects.length === 0 || fetchedSubjects.every((subj: Subject) => !subj.url)) {
          setLoading(false);
        } else {
          preloadImages(fetchedSubjects);
        }
      } else {
        showAlert(response.data.statusCode, response.data.message);
        setLoading(false);
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
      setLoading(false);
    }
  }, [preloadImages]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    fetchSubjects();

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchSubjects]);

  const handleSubjectClick = (subjectId: number) => {
    localStorage.setItem("subjectId", subjectId.toString());
    router.push('/sections');
  };

  return (
    <>
      <Header />

      <main>
        {loading ? (
          <div className="spinner-wrapper">
            <Spinner noText />
          </div>
        ) : (
          <div className="table">
            {subjects.map((subject: Subject) => (
              <div
                key={subject.id}
                className="element element-subject"
                id={`${subject.id}`}
                onClick={() => handleSubjectClick(subject.id)}
                style={{ cursor: "pointer" }}
              >
                {subject.url ? (
                  <Image
                    src={subject.url}
                    alt={subject.name}
                    className="element-icon"
                    width={100}
                    height={100}
                    priority
                    unoptimized
                  />
                ) : null}
                <div className="element-title">{subject.name}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}