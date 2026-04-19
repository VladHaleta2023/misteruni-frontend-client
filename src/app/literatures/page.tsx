"use client";

import { useEffect, useState } from "react";
import "@/app/styles/table.css";
import "@/app/styles/components.css";
import Spinner from "@/app/components/spinner";
import { useRouter } from "next/navigation";
import FormatText from "@/app/components/formatText";
import { ArrowLeft, BookOpen } from "lucide-react";
import Header from "@/app/components/header";

export default function LiteraturePage() {
  const router = useRouter();

  const [literatures, setLiteratures] = useState<string[]>([]);
  const [literatureText, setLiteratureText] = useState<string>("");

  const filteredLiteratures = literatures.filter(literature =>
    literature.toLowerCase().includes(literatureText.toLowerCase())
  );

  const [loading, setLoading] = useState(true);

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
          <Spinner noText />
        </div>
      ) : (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            margin: "12px"
          }}>
            <input
              type="text"
              id="threshold"
              name="text-container"
              value={literatureText}
              onChange={(e) => setLiteratureText(e.target.value)}
              className="input-container"
              style={{ fontSize: "18px", padding: "6px 12px", borderRadius: "6px" }}
              placeholder="Szukaj literaturę..."
            />
            <div className="table">
              {filteredLiteratures.flatMap((literature) => [
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
        </div>
      )}
      </main>
    </>
  );
}