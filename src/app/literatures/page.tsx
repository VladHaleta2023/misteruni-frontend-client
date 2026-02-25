"use client";

import { useEffect, useState } from "react";
import "@/app/styles/table.css";
import Spinner from "@/app/components/spinner";
import { useRouter } from "next/navigation";
import { setMainHeight } from "@/app/scripts/mainHeight";
import FormatText from "@/app/components/formatText";
import { ArrowLeft, BookOpen } from "lucide-react";
import Header from "@/app/components/header";

export default function LiteraturePage() {
  const router = useRouter();

  const [literatures, setLiteratures] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
  }, []);

  function handleBackClick() {
    localStorage.removeItem("literatures");
    router.back();
  }

  useEffect(() => {
    setLoading(true);

    if (typeof window !== "undefined") {
      setLiteratures(JSON.parse(localStorage.getItem('literatures') || '[]'));
    }

    setLoading(false);
  }, [loading]);

  useEffect(() => {
    setMainHeight();
    window.addEventListener("resize", setMainHeight);

    return () => {
      window.removeEventListener("resize", setMainHeight);
    };
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

      <main style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
      {loading ? (
        <div className="spinner-wrapper">
          <Spinner noText />
        </div>
      ) : (
        <div className="table" style={{
            width: "80%"
        }}>
            {literatures.flatMap((literature) => [
                <div
                    className={`element element-section`}
                    style={{
                        justifyContent: "space-between"
                    }}
                    key={`subtopic-${literature}`}
                    onClick={(e) => {
                        e.stopPropagation();

                        localStorage.setItem("literature", literature);
                        router.push("/literature");
                    }}
                >
                    <div className="element-options">
                        <div
                        className="btnOption"
                        onClick={(e) => {
                          e.stopPropagation();

                          localStorage.setItem("literature", literature);
                          router.push("/literature");
                        }}
                      >
                        <BookOpen size={26} />
                      </div>
                    </div>
                    <div className="element-name" style={{ fontSize: "20px" }}>
                        <FormatText
                        content={`${literature}`}
                        />
                    </div>
                </div>
            ])}
            </div>
      )}
      </main>
    </>
  );
}