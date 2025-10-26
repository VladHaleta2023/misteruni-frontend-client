'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Trash2 } from 'lucide-react';
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
  finished: boolean;
}

export default function VocabluaryPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [wordId, setWordId] = useState<number | null>(null);

  const [wordsVerified, setWordsVerified] = useState<boolean>(false);

  const [words, setWords] = useState<Word[]>([]);

  const [loading, setLoading] = useState(true);

  const [textLoading, setTextLoading] = useState("");

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [textValues, setTextValues] = useState<[number, string][]>([]);

  const [msgDeleteVisible, setMsgDeleteVisible] = useState<boolean>(false);

  const [outputText, setOutputText] = useState<string>("");

  const [text, setText] = useState<string>("");

  const handleInput = (index: number, id: number, value: string) => {
    setValueById(id, value);

    const textarea = textareaRefs.current[index];
    if (textarea) {
      adjustTextareaRows(textarea);
    }
  };

  const getValueById = (id: number) => {
    const found = textValues.find(([wordId]) => wordId === id);
    return found ? found[1] : "";
  };

  const setValueById = (id: number, value: string) => {
    setTextValues(prev => {
      const updated = prev.filter(([wordId]) => wordId !== id);
      return [...updated, [id, value]];
    });
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
    try {
      const response = await api.get(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/words`);
      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);
        setText(response.data.task.text ?? "");

        setTextValues(prev => {
          return fetchedWords.map(word => {
            const existing = prev.find(([id]) => id === word.id);
            return [word.id, existing?.[1] || ""];
          });
        });

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
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

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    localStorage.removeItem("wordsVerified");
    router.back();
  }

  const handleDeleteWord = useCallback(async () => {
    try {
      const response = await api.delete(`/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/words/${wordId}`);

      setLoading(false);
      if (response.data?.statusCode === 200) {
        if (wordId !== null) {
          setTextValues(prev => prev.filter(([id]) => id !== wordId));
        }

        showAlert(response.data.statusCode, response.data.message);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    } finally {
      setLoading(false);
      setTextLoading("");
      setMsgDeleteVisible(false);
      await fetchWords();
    }
  }, [subjectId, sectionId, topicId, taskId, wordId]);

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

  const controllersRef = useRef<AbortController[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
      const sId = Number(localStorage.getItem("subjectId"));
      const secId = Number(localStorage.getItem("sectionId"));
      const tId = Number(localStorage.getItem("topicId"));
      const taskIdNum = Number(localStorage.getItem("taskId"));

      if (sId && secId && tId && taskIdNum) {
          setSubjectId(sId);
          setSectionId(secId);
          setTopicId(tId);
          setTaskId(taskIdNum);
      } else {
          showAlert(400, "Nie udało się pobrać ID lub ID jest niepoprawne");
      }
  }, []);

  useEffect(() => {
    const handleUnload = () => {
        controllersRef.current.forEach((controller: AbortController) => controller.abort());
        controllersRef.current = [];
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const handleWordsVerifyGenerate = useCallback(
    async (words: [string, string][], signal?: AbortSignal) => {
      setTextLoading("Weryfikacja słów lub wyrazów zadania");

      const controller = !signal ? new AbortController() : null;
      if (controller) controllersRef.current.push(controller);
      const activeSignal = signal ?? controller?.signal;

      try {
          let changed = "true";
          let attempt = 0;
          let outputText = "";
          let outputWords: string[] = [];
          let errors: string[] = [];
          const MAX_ATTEMPTS = 2;

          while (changed === "true" && attempt <= MAX_ATTEMPTS) {
              if (activeSignal?.aborted) return { text: "", outputSubtopics: [] };

              const response = await api.post(
                  `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/words-generate`,
                  { changed, errors, attempt, outputText, outputWords, words },
                  { signal: activeSignal }
              );

              if (activeSignal?.aborted) return { outputText: "", outputWords: [] };

              if (response.data?.statusCode === 201) {
                  changed = response.data.changed;
                  errors = response.data.errors;
                  outputText = response.data.outputText;
                  outputWords = response.data.outputWords;
                  attempt = response.data.attempt;
                  console.log(`Weryfikacja słów lub wyrazów zadania: Próba ${attempt}`);
              } else {
                  showAlert(400, "Nie udało się zweryfikować słów lub wyrazów zadania");
                  break;
              }
          }

          return { outputText, outputWords };
        } catch (error: unknown) {
          if ((error as DOMException)?.name === "AbortError") return { outputText: "", outputWords: [] };
          handleApiError(error);
          return { outputText: "", outputWords: [] };
        } finally {
          if (controller) controllersRef.current = controllersRef.current.filter(c => c !== controller);
        }
    }, [subjectId, sectionId, topicId, taskId, controllersRef]
  );

  const handleUpdateWords = useCallback(
    async (outputWords: string[], outputText: string,  signal?: AbortSignal) => {
      setTextLoading("Aktualizacja słów lub wyrazów zadania");

      if (!outputText) {
        setLoading(false);
        showAlert(400, "Nie udało się zaktualizować słów lub wyrazów zadania");
        return;
      }

      try {
          const response = await api.put(
          `/subjects/${subjectId}/sections/${sectionId}/topics/${topicId}/tasks/${taskId}/words`,
              {
                  outputText,
                  outputWords
              },
              { signal }
          );

          if (response.data?.statusCode === 200) {
            setLoading(false);
            showAlert(200, "Weryfikacja słów lub wyrazów zapisane pomyślnie");
          } else {
            setLoading(false);
            showAlert(400, "Nie udało się zapisać weryfikacji słów lub wyrazów");
          }
      }
      catch (error: unknown) {
        setLoading(false);
        handleApiError(error);
      }
      finally {
        setLoading(false);
      }
    }, [subjectId, sectionId, topicId, taskId]
  );

  const handleVerifyWords = useCallback(async () => {
    if (words.length === 0) {
      showAlert(400, "Proszę dodać słowo lub wyraz do sprawdzenia");
      return;
    }

    const emptyIndex = words.findIndex(
      word => !word.finished && !getValueById(word.id).trim()
    );

    if (emptyIndex !== -1) {
      showAlert(400, "Proszę wypełnić wszystkie pola dla słów nieukończonych!");
      return;
    }

    const filledPairs: [string, string][] = words
      .map(word => {
        const value = getValueById(word.id);
        return value.trim() ? [word.text, value.trim()] : null;
      })
      .filter(Boolean) as [string, string][];

    if (!subjectId || !sectionId || !topicId || !taskId) return;

    if (filledPairs.length === 0) {
      showAlert(400, "Nie ma słów lub wyrazów do weryfikacji");
      return;
    }

    setLoading(true);

    if (controllerRef.current) controllerRef.current.abort();

    const controller = new AbortController();
    controllersRef.current.push(controller);
    const signal = controller.signal;

    try {
      const result = await handleWordsVerifyGenerate(filledPairs, signal);

      if (!result || !result.outputText || !Array.isArray(result.outputWords)) {
        setLoading(false);
        showAlert(400, "Nie udało się zweryfikować słów lub wyrazów zadania");
        return;
      }

      const { outputText, outputWords } = result;

      await handleUpdateWords(outputWords, outputText, signal);

      setWordsVerified(true);
      setOutputText(outputText);

      await fetchWords();
    } catch (error: unknown) {
      if ((error as DOMException)?.name === "AbortError") return;
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [words, textValues, subjectId, sectionId, topicId, taskId]);

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
              <Spinner text={textLoading} />
          </div>
        ) : (
        <>
          {words.length === 0 ? (
            <span style={{
                color: "#514e4e",
                margin: "auto"
            }}>Nie ma słow lub wyrazów...</span>
          ) : (
          <>
          <Message
            message={"Czy na pewno chcesz usunąć słowo lub wyraz?"}
            textConfirm="Tak"
            textCancel="Nie"
            onConfirm={() => {
              setTextLoading("Trwa usuwanie słowa lub wyrazu");
              setLoading(true);
              handleDeleteWord().then(async () => {
                  await fetchWords();
              });
            }}
            onClose={() => {
                setMsgDeleteVisible(false);
            }}
            visible={msgDeleteVisible}
          />
          <div style={{
            padding: "12px"
          }}>
            <div className="text-audio">
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Opowiadanie:</div>
              {text}
            </div>
            <div>
              <div className="table" style={{
                border: "2px solid rgb(191, 191, 191)"
              }}>
                <div className="element element-section" style={{
                  fontSize: "16px"
                }}>
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
                    <div className={`element ${
                        word.finished
                          ? "success"
                          : wordsVerified
                          ? "error"
                          : "word-default"
                      }`} key={word.id}>
                      <div
                        className="element-word"
                        style={{
                          borderRight: "2px solid #bfbfbf"
                        }}
                      >
                        <div style={{
                          marginRight: "8px"
                        }}>{word.text}</div>
                        <Trash2 size={20} style={{
                          minWidth: "20px",
                          marginLeft: "auto"
                        }} color="#000000" onClick={(e) => {
                            e.stopPropagation();
                            setWordId(word.id);
                            setMsgDeleteVisible(true);
                        }} />
                      </div>
                      <div className="element-word">
                        <textarea
                          ref={(el) => {
                            textareaRefs.current[index] = el;
                          }}
                          placeholder="Wpisz tłumaczenie..."
                          onInput={(e) =>
                            handleInput(index, word.id, (e.target as HTMLTextAreaElement).value)
                          }
                          className="answer-block"
                          style={{ margin: "0px" }}
                          value={getValueById(word.id)}
                          rows={1}
                          name={`userSolution-${word.id}`}
                          id={`userSolution-${word.id}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{
                marginTop: "12px"
              }}>
                {wordsVerified && outputText ? (
                  <>
                    <div className="wordsDescription">
                      {outputText}
                    </div>
                  </>
                ) : null}
                <button
                  onClick={handleVerifyWords}
                  className="btnSubmit"
                  style={{
                    margin: "0px auto"
                  }}
                >
                  Sprawdź
                </button>
              </div>
            </div>
          </div>
          </>)}

        </>
        )}
      </main>
    </>
  );
}