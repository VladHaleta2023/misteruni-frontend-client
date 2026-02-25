'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import "@/app/styles/table.css";
import "@/app/styles/components.css";
import api from "@/app/utils/api";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import Spinner from "@/app/components/spinner";
import { LogOut, Plus, Settings, Trash2 } from "lucide-react";
import Message from "../components/message";

enum SubjectDetailLevel {
  MANDATORY = "MANDATORY",
  DESIRABLE = "DESIRABLE",
  OPTIONAL = "OPTIONAL"
}

interface Subject {
  id: number;
  name: string;
  type: string;
  url: string;
  prompt: string;
}

interface UserSubject {
  id: number,
  subjectId: number,
  threshold: number;
  detailLevel: SubjectDetailLevel;
  subject: Subject
}

export default function SubjectPage() {
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgDeleteSubjectVisible, setMsgDeleteTaskVisible] = useState(false);
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
      const response = await api.get("/user-subjects");
      if (response.data?.statusCode === 200) {
        const fetchedUserSubjects: UserSubject[] = response.data.subjects;
        setSubjects(fetchedUserSubjects);

        const fetchedSubjects = fetchedUserSubjects.map(userSubject => userSubject.subject);

        if (fetchedSubjects.length === 0 || fetchedSubjects.every((subj: Subject) => !subj.url)) {
          setLoading(false);
        } else {
          preloadImages(fetchedSubjects);
          setLoading(false);
        }
      } else {
        showAlert(response.data.statusCode, response.data.message);
        setLoading(false);
      }
    }
    catch (error: unknown) {
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
  }, [preloadImages]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    fetchSubjects();

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchSubjects]);

  const handleSubjectClick = (subjectId: number, subjectType: string) => {
    localStorage.setItem("weekOffset", "0");
    localStorage.setItem("subjectId", subjectId.toString());
    localStorage.setItem("subjectType", subjectType);
    router.push('/sections');
  };

  function handleSubjectEdit(id: number) {
    localStorage.setItem("subjectId", String(id));
    router.push("/update");
  }

  const handleLogout = async () => {
    setLoading(true);

    try {
      const response = await api.post("/auth/logout");

      if (response.data?.statusCode === 200) {
        localStorage.removeItem("weekOffset");
        localStorage.removeItem("subjectId");
        localStorage.removeItem("subjectType");

        showAlert(response.data.statusCode, response.data.message);
        
        setTimeout(() => {
          router.push("/");
        }, 1500);
      }
    } catch (error: unknown) {
      setLoading(false);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          showAlert(error.response.status, error.response.data?.message || "Server error");
        } else {
          showAlert(500, `Server error: ${error.message}`);
        }
      } else if (error instanceof Error) {
        showAlert(500, error.message);
      } else {
        showAlert(500, "Unknown error");
      }
    }
  }

  const handleAddSubject = () => {
    localStorage.removeItem("subjectId");
    router.push("/update");
  }

  const handleSubjectDelete = async (id: number) => {
    try {
      const response = await api.delete(`/user-subjects/${id}`);

      if (response.data?.statusCode === 200) {
        showAlert(response.data.statusCode, response.data.message);
        setSubjects(prev => prev.filter(subj => subj.subject.id !== id));
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          showAlert(error.response.status, error.response.data?.message || "Server error");
        } else {
          showAlert(500, `Server error: ${error.message}`);
        }
      } else if (error instanceof Error) {
        showAlert(500, error.message);
      } else {
        showAlert(500, "Unknown error");
      }
    }
  }

  return (
    <>
      <Header>
        <div className="menu-icons">
          <div
            className="menu-icon"
            style={{ border: "3px solid white", borderRadius: "50%" }}
            onClick={handleAddSubject}
            title={"Dodaj Przedmiot"}
          >
            <Plus size={28} color="white" />
          </div>
          <div
            className="menu-icon"
            onClick={handleLogout}
            style={{ marginLeft: "auto" }}
            title={"Wyloguj się"}
          >
            <LogOut size={28} color="white" />
          </div>
        </div>
      </Header>

      <Message
        message={"Czy na pewno chcesz usunąć dany przedmiot?"}
        textConfirm="Tak"
        textCancel="Nie"
        onConfirm={async () => {
          setMsgDeleteTaskVisible(false);
          const subjectId = localStorage.getItem("subjectId");

          await handleSubjectDelete(Number(subjectId));

          localStorage.removeItem("subjectId");
        }}
        onClose={() => {
          setMsgDeleteTaskVisible(false);
          localStorage.removeItem("subjectId");
        }}
        visible={msgDeleteSubjectVisible}
    />

      <main>
        {loading ? (
          <div className="spinner-wrapper">
            <Spinner noText />
          </div>
        ) : (
          <>
            {subjects.length === 0 ? (
              <div style={{
                  color: "#514e4e",
                  display: "flex",
                  flexDirection: "column",
                  margin: "auto"
              }}>
                <div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span>Naciśnij</span>
                  <div
                    className="menu-icon"
                    style={{ border: "3px solid #514e4e", borderRadius: "50%" }}
                    onClick={handleAddSubject}
                    title={"Dodaj Przedmiot"}
                  >
                    <Plus strokeWidth={4} />
                  </div>
                </div>
                <span>aby dodać nowy przedmiot</span>
                </div>
                <br />
                <div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <span>Naciśnij</span>
                        <LogOut strokeWidth={4} />
                    </div>
                    <span>aby wylogować się</span>
                </div>
              </div>
            ) : (<>
            <div className="table" id="subject">
              {subjects.map((userSubject) => (
                <div
                  key={userSubject.subject.id}
                  className="element element-subject"
                  id={`${userSubject.subject.id}`}
                  onClick={() => handleSubjectClick(userSubject.subject.id, userSubject.subject.type)}
                  style={{ cursor: "pointer" }}
                >
                  {userSubject.subject.url ? (
                  <img
                      src={userSubject.subject.url}
                      alt={userSubject.subject.name}
                      className="element-icon"
                    />
                  ) : null}
                  <div className="element-subject-options">
                    <div>
                      <div className="element-title">{userSubject.subject.name}</div>
                      <div>Próg: {userSubject.threshold}%</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      <button
                        id={String(userSubject.subject.id)}
                        className="button btnSubjectOptionsEdit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubjectEdit(Number(e.currentTarget.id))
                        }}
                      >
                        <Settings size={24} color="white" />
                      </button>
                      <button
                        id={String(userSubject.subject.id)}
                        className="button btnSubjectOptionsEdit"
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem("subjectId", String(e.currentTarget.id));
                          setMsgDeleteTaskVisible(true);
                        }}
                      >
                        <Trash2 size={24} color="white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>)}
          </>
        )}
      </main>
    </>
  );
}