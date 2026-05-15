'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import Header from "@/app/components/header";
import "@/app/styles/components.css";
import api from "@/app/utils/api";
import { showAlert } from "@/app/scripts/showAlert";
import Spinner from "@/app/components/spinner";
import { useRouter } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import Select from "react-select";

enum SubjectDetailLevel {
  BASIC = "BASIC",
  EXPANDED = "EXPANDED",
  ACADEMIC = "ACADEMIC"
}

type Subject = {
  id: number;
  name: string;
  minDetailLevel: string;
  examDate: Date;
}

type OptionType = {
  value: number;
  label: string;
}

type DetailLevelOption = {
  value: SubjectDetailLevel;
  label: string;
}

const MONTHS: OptionType[] = [
  { value: 1, label: "Styczeń" },
  { value: 2, label: "Luty" },
  { value: 3, label: "Marzec" },
  { value: 4, label: "Kwiecień" },
  { value: 5, label: "Maj" },
  { value: 6, label: "Czerwiec" },
  { value: 7, label: "Lipiec" },
  { value: 8, label: "Sierpień" },
  { value: 9, label: "Wrzesień" },
  { value: 10, label: "Październik" },
  { value: 11, label: "Listopad" },
  { value: 12, label: "Grudzień" }
]

export default function UpdatePage() {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [spinnerText, setSpinnerText] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [threshold, setThreshold] = useState(50);
  const [detailLevel, setDetailLevel] = useState<SubjectDetailLevel>(SubjectDetailLevel.BASIC);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState<number>(60);
  const [examMonth, setExamMonth] = useState<number>(new Date().getMonth() + 1);
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear());

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  const subjectOptions = useMemo<OptionType[]>(() => 
    subjects.map(subject => ({
      value: subject.id,
      label: subject.name
    })), 
    [subjects]
  );

  const detailLevelOptions = useMemo<DetailLevelOption[]>(() => {
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    const minLevel = selectedSubject?.minDetailLevel as SubjectDetailLevel | undefined;

    if (!minLevel || minLevel === SubjectDetailLevel.BASIC) {
      return [
        { value: SubjectDetailLevel.BASIC, label: "Podstawowy" },
        { value: SubjectDetailLevel.EXPANDED, label: "Rozszerzony" },
        { value: SubjectDetailLevel.ACADEMIC, label: "Akademicki" }
      ];
    }

    if (minLevel === SubjectDetailLevel.EXPANDED) {
      return [
        { value: SubjectDetailLevel.EXPANDED, label: "Obowiązkowy" },
        { value: SubjectDetailLevel.ACADEMIC, label: "Pożądany" }
      ];
    }

    return [
      { value: SubjectDetailLevel.ACADEMIC, label: "Obowiązkowy" }
    ];
  }, [subjects, selectedSubjectId]);

  const dailyStudyOptions: OptionType[] = [
    { value: 30, label: "30 minut" },
    { value: 60, label: "1 godzina" },
    { value: 90, label: "1 godzina 30 minut" },
    { value: 120, label: "2 godziny" },
    { value: 150, label: "2 godziny 30 minut" },
    { value: 180, label: "3 godziny" },
  ];

  const selectedSubjectOption = useMemo<OptionType | null>(() => 
    selectedSubjectId !== null 
      ? subjectOptions.find(option => option.value === selectedSubjectId) || null
      : null,
    [selectedSubjectId, subjectOptions]
  );

  const selectedDetailLevelOption = useMemo<DetailLevelOption | null>(() => 
    detailLevelOptions.find(option => option.value === detailLevel) || null,
    [detailLevel, detailLevelOptions]
  );

  const selectedDailyStudyOption = useMemo<OptionType | null>(() => 
    dailyStudyOptions.find(option => option.value === dailyStudyMinutes) || null,
    [dailyStudyMinutes]
  );

  const selectedMonthOption = useMemo<OptionType | null>(() => 
    MONTHS.find(month => month.value === examMonth) || null,
    [examMonth]
  );

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<any>(`/subjects/available`);

      if (response.data?.statusCode === 200) {
        const subjectsData: Subject[] = response.data.subjects;
        setSubjects(subjectsData);

        if (subjectsData.length > 0) {
          const firstSubject = subjectsData[0];
          setSelectedSubjectId(firstSubject.id);
          setDetailLevel(firstSubject.minDetailLevel as SubjectDetailLevel);
        } else {
          setSelectedSubjectId(null);
          setDetailLevel(SubjectDetailLevel.BASIC);
        }

        setDailyStudyMinutes(60);
        setThreshold(50);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      const err = error as any;
      if (err?.response) {
        showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
      } 
      else if (error instanceof Error) {
        showAlert(500, error.message);
      }
      else {
        showAlert(500, "Unknown error");
      }
    }
  }, []);

  const fetchSubjectById = useCallback(async (subjectId: number) => {
    setLoading(true);
    try {
      const response = await api.get<any>(`/user-subjects/${subjectId}`);

      if (response.data?.statusCode === 200) {
        const subj = response.data.subject.subject;

        setSubjects([{
          id: subj.id,
          name: subj.name,
          minDetailLevel: subj.minDetailLevel,
          examDate: subj.examDate
        }]);

        setThreshold(response.data.subject.threshold ?? 50);
        setDetailLevel(response.data.subject.detailLevel ?? (subj.minDetailLevel as SubjectDetailLevel));
        setDailyStudyMinutes(response.data.subject.dailyStudyMinutes ?? 60);

        const examDate = new Date(response.data.subject.examDate ?? Date.now());

        setExamMonth(examDate.getMonth() + 1);
        setExamYear(examDate.getFullYear());
        
        setSelectedSubjectId(subj.id);
        setSubjectId(subj.id);
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      const err = error as any;
      if (err?.response) {
        showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
      } 
      else if (error instanceof Error) {
        showAlert(500, error.message);
      }
      else {
        showAlert(500, "Unknown error");
      }
    }
  }, []);

  useEffect(() => {
    const storedSubjectId = localStorage.getItem("subjectId");
    
    if (storedSubjectId) {
      const subjectId = Number(storedSubjectId) || 0;
      fetchSubjectById(subjectId);
    } else {
      fetchSubjects();
    }
  }, [fetchSubjectById, fetchSubjects]);

  function handleBackClick() {
    router.back();
  }

  async function handleSubjectEditSubmit() {
    setLoading(true);
    setSpinnerText("Aktualizacja przedmiotu");

    if (threshold < 50 || threshold > 100 || isNaN(threshold)) {
      setLoading(false);
      showAlert(400, "Próg musi być liczbą od 50 do 100");
      return;
    }

    if (examYear < new Date(Date.now()).getFullYear()) {
      setLoading(false);
      showAlert(400, "Rok Egzaminu nie może być mniejszy niż dzisiejszy");
      return;
    }

    try {
      const response = await api.put<any>(`/user-subjects/${selectedSubjectOption?.value}`, {
        threshold,
        detailLevel: selectedDetailLevelOption?.value ?? SubjectDetailLevel.BASIC,
        dailyStudyMinutes,
        month: examMonth,
        year: examYear
      });

      setLoading(false);
      showAlert(response.data.statusCode, response.data.message);

      if (response.data?.statusCode === 200) {
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error) {
      setLoading(false);
      const err = error as any;
      if (err?.response) {
        showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
      } 
      else if (error instanceof Error) {
        showAlert(500, error.message);
      }
      else {
        showAlert(500, "Unknown error");
      }
    }
  }

  async function handleSubjectCreateSubmit() {
    setLoading(true);
    setSpinnerText("Dodawanie przedmiotu");

    if (!selectedSubjectOption) {
      setLoading(false);
      showAlert(400, "Proszę wybrać przedmiot");
      return;
    }

    if (threshold < 50 || threshold > 100 || isNaN(threshold)) {
      setLoading(false);
      showAlert(400, "Próg musi być liczbą od 50 do 100");
      return;
    }

    if (examYear < new Date(Date.now()).getFullYear()) {
      setLoading(false);
      showAlert(400, "Rok Egzaminu nie może być mniejszy niż dzisiejszy");
      return;
    }

    try {
      const response = await api.post<any>(`/user-subjects/${selectedSubjectOption?.value}`, {
        threshold,
        detailLevel: selectedDetailLevelOption?.value ?? SubjectDetailLevel.BASIC,
        dailyStudyMinutes,
        month: examMonth,
        year: examYear
      });

      setLoading(false);
      showAlert(response.data.statusCode, response.data.message);

      if (response.data?.statusCode === 200) {
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error) {
      setLoading(false);
      const err = error as any;
      if (err?.response) {
        showAlert(err.response.status || 500, err.response.data?.message || err.message || "Server error");
      } 
      else if (error instanceof Error) {
        showAlert(500, error.message);
      }
      else {
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
            title="Wróć" 
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
            <Spinner text={spinnerText} />
          </div>
        ) : (
          <div className="form-container">
            <div className="options-container" style={{ marginTop: "12px" }}>
              <label htmlFor="subject-select" className="label">Przedmiot:</label>
              <Select
                id="subject-select"
                value={selectedSubjectOption}
                onChange={(selectedOption) => {
                  const newSubjectId = selectedOption?.value ?? null;
                  setSelectedSubjectId(newSubjectId);

                  const selectedSubject = subjects.find(s => s.id === newSubjectId);

                  if (subjectId === null && selectedSubject) {
                    setDetailLevel(selectedSubject.minDetailLevel as SubjectDetailLevel);
                    setDailyStudyMinutes(60);
                    setThreshold(50);
                  }
                }}
                classNamePrefix="react-select"
                options={subjectOptions}
                placeholder="Wybierz przedmiot..."
                isClearable={false}
                isSearchable={false}
                noOptionsMessage={() => "Brak dostępnych przedmiotów"}
                isDisabled={subjectId !== null}
              />
            </div>
            <div className="options-container" style={{ marginTop: "12px" }}>
              <label htmlFor="threshold" className="label">Próg:</label>
              <div style={{ marginTop: '4px' }}>
                <input
                  type="text"
                  id="threshold"
                  name="text-container"
                  value={threshold}
                  onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                          let numValue = value === '' ? 0 : Number(value);
                          if (numValue < 0) numValue = 0;
                          if (numValue > 100) numValue = 100;
                          setThreshold(numValue);
                      }
                  }}
                  onKeyDown={(e) => {
                      const allowedKeys = ['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','Tab','ArrowLeft','ArrowRight'];
                      if (threshold >= 100 && /^[0-9]$/.test(e.key)) {
                          setThreshold(Number(e.key));
                          e.preventDefault();
                          return;
                      }
                      if (!allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
                  }}
                  onFocus={(e) => e.target.select()}
                  className="input-container"
                  style={{ width: "100px", fontSize: "18px", padding: "6px 12px", border: "none", borderRadius: "6px" }}
                  placeholder="Proszę napisać próg..."
                />
                <div style={{ fontSize: '16px', color: '#6b7280', marginTop: '4px', marginLeft: '4px' }}>
                  Wartość od 50 do 100
                </div>
              </div>
            </div>
            <div className="options-container" style={{ marginTop: "12px" }}>
              <label htmlFor="detail-level" className="label">Poziom szczegółowości:</label>
              <Select
                id="detail-level"
                value={selectedDetailLevelOption}
                onChange={(selectedOption) => setDetailLevel(selectedOption?.value || SubjectDetailLevel.BASIC)}
                classNamePrefix="react-select"
                options={detailLevelOptions}
                isSearchable={false}
                isClearable={false}
              />
            </div>
            <div className="options-container" style={{ marginTop: "12px" }}>
              <label htmlFor="daily-study" className="label">Czas nauki dziennie:</label>
              <Select
                id="daily-study"
                value={selectedDailyStudyOption}
                onChange={(selectedOption) => setDailyStudyMinutes(selectedOption?.value ?? 60)}
                classNamePrefix="react-select"
                options={dailyStudyOptions}
                isSearchable={false}
                isClearable={false}
              />
            </div>
            <div className="options-container" style={{ marginTop: "12px" }}>
              <label htmlFor="exam-month" className="label">Data Egzaminu:</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ width: "200px" }}>
                  <Select
                    id="exam-month"
                    value={selectedMonthOption}
                    onChange={(selectedOption) => setExamMonth(selectedOption?.value ?? 1)}
                    classNamePrefix="react-select"
                    options={MONTHS}
                    isSearchable={false}
                    isClearable={false}
                    placeholder="Wybierz miesiąc..."
                  />
                </div>
                <input
                  type="text"
                  id="exam-year"
                  value={examYear}
                  onChange={(e) => {
                    const year = Number(e.target.value);

                    if (e.target.value === "" || !year) {
                      setLoading(false);
                      showAlert(400, "Proszę podać poprawny rok egzaminu");
                      setExamYear(0);
                    }
                    else
                      setExamYear(year);
                  }}
                  className="input-container"
                  style={{ 
                    width: "100px", 
                    fontSize: "18px", 
                    padding: "6px 12px", 
                    border: "none", 
                    borderRadius: "6px" 
                  }}
                  placeholder="Rok"
                />
              </div>
            </div>
            <div style={{ display: "flex", marginTop: "24px" }}>
              <button
                className="button"
                style={{ padding: "12px 24px", marginRight: "12px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={async () => {
                  if (subjectId !== null) await handleSubjectEditSubmit();
                  else await handleSubjectCreateSubmit();
                }}
                disabled={selectedSubjectId === -1}
              >
                {subjectId !== null ? "Aktualizować" : "Dodać"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}