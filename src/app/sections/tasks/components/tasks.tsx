'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/app/styles/table.css";
import "@/app/styles/play.css";
import Spinner from "@/app/components/spinner";
import { showAlert } from "@/app/scripts/showAlert";
import axios from "axios";
import { setMainHeight } from "@/app/scripts/mainHeight";
import api from "@/app/utils/api";
import FormatText from "@/app/components/formatText";
import { Text } from "lucide-react";

type Status = 'blocked' | 'started' | 'progress' | 'completed';

interface IDate {
    day: string;
    month: string;
    year: string;
}

interface ITask {
    id: number;
    text: string;
    percent: number;
    status: Status;
    finished: boolean;
    topic: {
        id: number,
        name: string
    };
    section: {
        id: number,
        name: string,
        type: string
    };
}

interface IElement {
    date: IDate;
    tasks: ITask[];
}

class ElementResponse {
    private elements: IElement[];

    constructor(elements: IElement[]) {
        this.elements = elements;
    }

    public getElements() {
        return this.elements;
    }

    public static truncateText(text: string, maxLength: number) {
        const blocks: string[] = [];
        const regex = /(\$\$.*?\$\$|\\\(.*?\\\)|\\\[.*?\\\])/gs;
        let lastIndex = 0;

        for (const match of text.matchAll(regex)) {
            const start = match.index!;
            if (start > lastIndex) {
                blocks.push(text.slice(lastIndex, start));
            }
            blocks.push(match[0]);
            lastIndex = start + match[0].length;
        }
        if (lastIndex < text.length) {
            blocks.push(text.slice(lastIndex));
        }

        let result = '';
        for (const block of blocks) {
            if (result.length + block.length > maxLength) {
                if (!/^(\$\$|\\\[|\\\()/.test(block)) {
                    result += block.slice(0, maxLength - result.length) + '...';
                } else {
                    result += '...';
                }
                break;
            } else {
                result += block;
            }
        }

        return result;
    }
}

export default function Tasks() {
    const router = useRouter();

    const [subjectId, setSubjectId] = useState<number | null>(null);

    const [elementReponse, setElementResponse] = useState<ElementResponse | null>(null);

    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedSubjectId = localStorage.getItem("subjectId");
            setSubjectId(storedSubjectId ? Number(storedSubjectId) : null);
        }
    }, []);

    const fetchTasksBySubjectId = useCallback(async () => {
        if (!subjectId) {
            setLoading(false);
            showAlert(400, "Przedmiot nie został znaleziony");
            return;
        }

        try {
            const response = await api.get(`/subjects/${subjectId}/tasks`);
            setLoading(false);

            if (response.data?.statusCode === 200) {
                setElementResponse(new ElementResponse(response.data.elements));
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
    }, [subjectId]);

    useEffect(() => {
        if (subjectId === null) return;

        const loadTasks = async () => {
            setLoading(true);
            try {
                await fetchTasksBySubjectId();
            } finally {
                setLoading(false);
            }
        };

        setMainHeight();
        window.addEventListener("resize", setMainHeight);

        loadTasks();

        return () => {
            window.removeEventListener("resize", setMainHeight);
        };
    }, [fetchTasksBySubjectId, subjectId]);

    const handleTaskClick = useCallback(async (
        subjectId: number,
        sectionId: number,
        topicId: number,
        taskId: number,
        sectionType: string
    ) => {
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

        localStorage.setItem("subjectId", String(subjectId));
        localStorage.setItem("sectionId", String(sectionId));
        localStorage.setItem("topicId", String(topicId));
        localStorage.setItem("taskId", String(taskId));

        if (sectionType == "InteractiveQuestion") {
            router.push("/interactive-play");
        }
        else {
            router.push("/play");
        }
    }, []);

    return (
    <>
        {loading ? (
        <div className="spinner-wrapper">
            <Spinner noText />
        </div>
        ) : (
        <>
            {elementReponse?.getElements().map((element, index) => (
                <div key={index} className="table">
                    <div
                        className="element element-section"
                        style={{
                            justifyContent: "center"
                        }}
                    >
                        {`${element.date.day}-${element.date.month}-${element.date.year}`}
                    </div>
                    {element.tasks.map(task => (
                    <div
                        className={`element element-subtopic ${!task.finished ? "not-finished" : ""}`}
                        style={{
                            justifyContent: "space-between"
                        }}
                        onClick={() => 
                            handleTaskClick(
                                subjectId ?? 0,
                                task.section.id,
                                task.topic.id,
                                task.id,
                                task.section.type
                            )
                        }
                        key={task.id}
                    >
                    <div className="element-name" style={{
                        flexDirection: "column",
                        alignItems: "flex-start"
                    }}>
                        <div style={{ display: "flex" }}>
                            <FormatText
                                content={ElementResponse.truncateText(task.text, 240) ?? ""}
                            />
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                flexWrap: "nowrap",
                                gap: "12px",
                                overflowWrap: "break-word",
                            }}
                        >
                            <div style={{
                                flexShrink: 0,
                                fontWeight: "bold"
                                }}>Rozdział:</div>
                                <div style={{ flex: 1 }}>
                                    <FormatText content={task.section.name ?? ""} />
                                </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                flexWrap: "nowrap",
                                gap: "12px",
                                overflowWrap: "break-word",
                            }}
                        >
                            <div style={{
                                flexShrink: 0,
                                fontWeight: "bold"
                            }}>Temat:</div>
                            <div style={{ flex: 1 }}>
                                <FormatText content={task.topic.name ?? ""} />
                            </div>
                        </div>
                    </div>

                    <div className="element-options" style={{
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}>
                        <div className={`element-percent ${task.status}`}>
                            {task.finished ? Math.round(task.percent) : 0}%
                        </div>
                        {task.section.type == "InteractiveQuestion" ? (<button
                            className="btnOption"
                            style={{minWidth: "48px"}}
                        >
                            <Text size={28} color="white" />
                        </button>) : null}
                    </div>
                </div>))}
            </div>))}
            <br />
            </>
        )}</>
    );
}