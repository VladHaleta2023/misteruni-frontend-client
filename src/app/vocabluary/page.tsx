'use client';

import Header from "@/app/components/header";
import { setMainHeight } from "@/app/scripts/mainHeight";
import { ArrowLeft, Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "../scripts/showAlert";
import api from "../utils/api";
import axios from "axios";
import FormatText from "../components/formatText";

type Word = {
  id: number;
  text: string;
  finished: boolean;
}

export default function StoriesPage() {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);

  const [wordsVerified, setWordsVerified] = useState<boolean>(false);

  const [words, setWords] = useState<Word[]>([]);
  const [wordIds, setWordIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);

  const [textLoading, setTextLoading] = useState("");

  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [textValues, setTextValues] = useState<[number, string][]>([]);

  const [verificationCompleted, setVerificationCompleted] = useState(false);

  const [outputText, setOutputText] = useState<string>("");

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

      const storedWordIds = localStorage.getItem("wordIds");
      let wordIdsArray: number[] = [];
      try {
        if (storedWordIds) {
          const parsed = JSON.parse(storedWordIds);
          if (Array.isArray(parsed)) {
            wordIdsArray = parsed.map((id) => Number(id));
          }
        }
      } catch (e) {
        console.error("Failed to parse wordIds from localStorage:", e);
      }

      setWordIds(wordIdsArray);

      const storedVerification = localStorage.getItem("verificationCompleted");
      if (storedVerification === "true") {
        setVerificationCompleted(true);
      }

      const storedWordsVerified = localStorage.getItem("wordsVerified");
      if (storedWordsVerified === "true") {
        setWordsVerified(true);
      }

      const outputText = localStorage.getItem("outputText");
      if (outputText) {
        setOutputText(outputText);
      }
    }
  }, []);

  const saveTextValuesToStorage = useCallback((values: [number, string][]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("textValues", JSON.stringify(values));
    }
  }, [wordIds]);

  const loadTextValuesFromStorage = useCallback((): [number, string][] => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("textValues");
      if (stored)
        return JSON.parse(stored) || []; 
    }
    return [];
  }, [wordIds]);

  const fetchWords = useCallback(async () => {
    try {
      const response = await api.post(`/subjects/${subjectId}/words`, {
        topicId: topicId
      });

      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);

        setTextValues(loadTextValuesFromStorage());

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  }, [subjectId, sectionId, topicId, loadTextValuesFromStorage]);

  const findWords = useCallback(async () => {
    try {
      const response = await api.post(`/subjects/${subjectId}/words/find`, {
        wordIds
      });

      setLoading(false);

      if (response.data?.statusCode === 200) {
        const fetchedWords: Word[] = response.data.words;
        setWords(fetchedWords);

        setTextValues(loadTextValuesFromStorage());

        textareaRefs.current = new Array(fetchedWords.length).fill(null);
      } else {
        showAlert(response.data.statusCode, response.data.message);
      }
    } catch (error) {
      setLoading(false);
      handleApiError(error);
    }
  }, [subjectId, sectionId, topicId, wordIds]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    if (subjectId !== null) {
      setLoading(true);
      findWords();
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, [fetchWords, findWords, subjectId]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    localStorage.removeItem("wordsVerified");
    localStorage.removeItem("verificationCompleted");
    localStorage.removeItem("outputText");
    localStorage.removeItem("textValues");
    router.back();
  }

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
          if (activeSignal?.aborted) return { outputText: "", outputWords: [] };

          const response = await api.post(
            `/subjects/${subjectId}/words/vocabluary-generate`,
            {
              sectionId,
              topicId,
              data: {
                changed,
                errors,
                attempt,
                outputText,
                outputWords,
                words,
              },
            },
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
    },
    [subjectId, sectionId, topicId, controllersRef]
  );

  // Подумать
  const handleUpdateWords = useCallback(
    async (outputWords: string[], verifiedWordIds: number[], signal?: AbortSignal) => {
      setTextLoading("Aktualizacja słów lub wyrazów zadania");

      try {
        const response = await api.put(
          `/subjects/${subjectId}/words/update`,
          { outputWords, wordIds: verifiedWordIds },
          { signal }
        );

        if (response.data?.statusCode === 200) {
          setLoading(false);
          showAlert(200, "Weryfikacja słów lub wyrazów zapisane pomyślnie");
        } else {
          setLoading(false);
          showAlert(400, "Nie udało się zapisać weryfikacji słów lub wyrazów");
        }
      } catch (error: unknown) {
        setLoading(false);
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    },
    [subjectId, sectionId, topicId]
  );

  const handleVerifyWords = useCallback(async () => {
    if (words.length === 0) {
      showAlert(400, "Proszę napisać tłumaczenie słowa lub wyrazu do sprawdzenia");
      return;
    }

    const filledPairsWithIds = words
      .map(word => {
        const value = getValueById(word.id);
        if (!value.trim()) return null;
        return { 
          id: word.id, 
          text: word.text, 
          translation: value.trim() 
        };
      })
      .filter(Boolean) as { id: number, text: string, translation: string }[];

    if (filledPairsWithIds.length === 0) {
      showAlert(400, "Nie ma słów lub wyrazów do weryfikacji");
      return;
    }

    const filledPairs: [string, string][] = filledPairsWithIds.map(item => [item.text, item.translation]);
    const verifiedWordIds = filledPairsWithIds.map(item => item.id);

    setLoading(true);
    setVerificationCompleted(false);

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

      setOutputText(outputText);
      localStorage.setItem('outputText', outputText);

      await handleUpdateWords(outputWords, verifiedWordIds, signal);

      setWordsVerified(true);
      setOutputText(outputText);
      setVerificationCompleted(true);

      localStorage.setItem("wordsVerified", "true");
      localStorage.setItem("verificationCompleted", "true");

      saveTextValuesToStorage(textValues);

      await findWords();

      setWords(prevWords => {
        const sortedWords = [...prevWords].sort((a, b) => {
          const aValue = getValueById(a.id);
          const bValue = getValueById(b.id);
          const aHasTranslation = aValue.trim() !== "";
          const bHasTranslation = bValue.trim() !== "";
          
          const getPriority = (word: Word, hasTranslation: boolean) => {
            if (!word.finished && hasTranslation) return 1;
            if (word.finished && hasTranslation) return 2;
            if (hasTranslation) return 3;
            return 4;
          };
          
          const aPriority = getPriority(a, aHasTranslation);
          const bPriority = getPriority(b, bHasTranslation);
          
          return aPriority - bPriority;
        });
        
        return sortedWords;
      });

    } catch (error: unknown) {
      if ((error as DOMException)?.name === "AbortError") return;
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [words, textValues, subjectId, sectionId, topicId, fetchWords, findWords]);

  useEffect(() => {
      const sId = Number(localStorage.getItem("subjectId"));
      const secId = Number(localStorage.getItem("sectionId"));
      const tId = Number(localStorage.getItem("topicId"));

      if (!sId && !secId && !tId)
        showAlert(400, "Nie udało się pobrać ID lub ID jest niepoprawne");

      if (sId)
        setSubjectId(sId);

      if (secId)
        setSectionId(secId);

      if (tId)
        setTopicId(tId);
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
              <Spinner text={textLoading} />
          </div>
        ) : (
        <>
          {words.length === 0 ? (
            <span style={{
                color: "#514e4e",
                margin: "auto"
            }}>Brak słow lub wyrazów...</span>
          ) : (
          <>
          <div style={{
            padding: "12px"
          }}>
            <div>
              <div className="table" style={{
                border: "1px solid rgb(191, 191, 191)"
              }}>
                {words.map((word, index) => {
                  return (
                    <div className={`element`} key={word.id}>
                      <div
                        className="element-word"
                        style={{
                          borderRight: "2px solid #bfbfbf",
                          width: "50%"
                        }}
                      >
                        <div style={{
                          marginRight: "8px"
                        }}>{word.text}</div>
                      </div>
                      <div className="element-word" style={{ width: "50%" }}>
                        <textarea
                          ref={(el) => {
                            textareaRefs.current[index] = el;
                          }}
                          placeholder="Wpisz tłumaczenie..."
                          onInput={(e) =>
                            handleInput(index, word.id, (e.target as HTMLTextAreaElement).value)
                          }
                          className="answer-block"
                          style={{
                            margin: "0px"
                          }}
                          value={getValueById(word.id)}
                          rows={1}
                          name={`userSolution-${word.id}`}
                          id={`userSolution-${word.id}`}
                        />
                      </div>
                      <div className="element-word" style={{ width: "38px" }}>
                        {verificationCompleted && getValueById(word.id).trim() !== "" ? (
                          word.finished ? (
                            <Check size={28} strokeWidth={3} style={{ color: "#556b4f" }} />
                          ) : (
                            <X size={28} strokeWidth={3} style={{ color: "#804141" }} />
                          )
                        ) : null}
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
                      <FormatText content={outputText} />
                    </div>
                  </>
                ) : null}
                {!verificationCompleted && (
                  <button
                    onClick={handleVerifyWords}
                    className="btnSubmit"
                    style={{
                      margin: "0px auto"
                    }}
                  >
                    Sprawdź
                  </button>
                )}
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