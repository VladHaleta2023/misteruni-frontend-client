'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import Message from "@/app/components/message";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import axios from "axios";

type Word = {
    id: number;
    text: string;
}

export default function TasksPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [wordId, setWordId] = useState<number | null>(null);

  const [words, setWords] = useState<Word[]>([]);

  const [loading, setLoading] = useState(true);

  const [textLoading, setTextLoading] = useState("");

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [textValues, setTextValues] = useState<string[]>([]);

  const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);

  const handleInput = (index: number, value: string) => {
    const newValues = [...textValues];
    newValues[index] = value;
    setTextValues(newValues);

    const textarea = textareaRefs.current[index];
    if (textarea) {
      adjustTextareaRows(textarea);
    }
  };

  const adjustTextareaRows = (textarea: HTMLTextAreaElement) => {
    textarea.rows = 1;
    const fontSize = 20;
    const lineHeight = fontSize * 1.4;
    const lines = Math.ceil(textarea.scrollHeight / lineHeight);
    textarea.rows = lines;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSubjectId = localStorage.getItem("subjectId");
      setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
      const storedSectionId = localStorage.getItem("sectionId");
      setSectionId(storedSectionId ? Number(storedSectionId) : null);
      const storedTopicId = localStorage.getItem("topicId");
      setTopicId(storedTopicId ? Number(storedTopicId) : null);
      const storedTaskId = localStorage.getItem("taskId");
      setTaskId(storedTaskId ? Number(storedTaskId) : null);
    }
  }, []);

  const fetchWords = useCallback(async () => {
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

    if (!taskId) {
      setLoading(false);
      showAlert(400, "Zadanie nie zostało znalezione");
      return;
    }

    try {
      const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/words`);
      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);
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
  }, [subjectId, sectionId, topicId, taskId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    if (subjectId !== null) {
      setLoading(true);
      fetchWords();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchWords, subjectId]);

  console.log(words);
  console.log(textValues);

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

  const handleDeleteWord = useCallback(async() => {
    try {
        const response = await api.delete(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/words/${wordId}`);

        setLoading(false);
        if (response.data?.statusCode === 200) {
            showAlert(response.data.statusCode, response.data.message);
        } else {
            showAlert(response.data.statusCode, response.data.message);
        }
    }
    catch (error) {
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
    finally {
      setLoading(false);
      setTextLoading("");
      setMsgDeleteVisible(false);
    }
  }, [subjectId, sectionId, topicId, taskId, wordId]);

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
        {loading ? (
          <div className="spinner-wrapper">
              <Spinner text={textLoading} />
          </div>
        ) : (
        <>
          <Message
            message={"Czy na pewno chcesz usunąć słowo lub wyraz?"}
            textConfirm="Tak"
            textCancel="Nie"
            onConfirm={() => {
              setTextLoading("Trwa usuwanie słowa lub wyrazu");
              setLoading(true);
              handleDeleteWord().then(() => {
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              });
            }}
            onClose={() => {
                setMsgDeleteVisible(false);
            }}
            visible={msgDeleteVisible}
          />
          <div className="table">
            <div className="element element-section">
              <div className="element-word" style={{
                borderRight: "2px solid #bfbfbf",
                fontWeight: "bold"
              }}>
                Angielski
              </div>
              <div className="element-word" style={{
                fontWeight: "bold"
              }}>Polski</div>
            </div>
            {words.map((word, index) => {
              return (
                <div className="element" key={word.id}>
                  <div
                    className="element-word success"
                    style={{
                      borderRight: "2px solid #bfbfbf",
                      flexDirection: "column"
                    }}
                  >
                    <div>{word.text}</div>
                    <button
                      className="btnOption"
                      onClick={(e) => {
                          e.stopPropagation();
                          setWordId(word.id);
                          setMsgDeleteVisible(true);
                      }}
                      style={{
                        minWidth: "48px",
                        marginLeft: "auto"
                      }}
                  >
                      <X size={28} color="white" />
                  </button>
                  </div>
                  <div className="element-word error">
                    <textarea
                      ref={(el) => {
                        textareaRefs.current[index] = el;
                      }}
                      placeholder="Wpisz tłumaczenie..."
                      onInput={(e) =>
                        handleInput(index, (e.target as HTMLTextAreaElement).value)
                      }
                      className="answer-block"
                      style={{ margin: "0px" }}
                      value={textValues[index] || ""}
                      rows={1}
                      name={`userSolution-${word.id}`}
                      id={`userSolution-${word.id}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => { console.log("Generacja!!!") }}
            className="btnSubmit"
            style={{
              margin: "12px auto"
            }}
          >
            Sprawdź
          </button>
        </>
        )}
      </main>
    </>
  );
}