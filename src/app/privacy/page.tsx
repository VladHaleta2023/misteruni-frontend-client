'use client';

import "@/app/styles/table.css";
import "@/app/styles/components.css";
import "@/app/styles/globals.css";
import "@/app/styles/play.css";
import Header from "../components/header";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "0px", minHeight: "100dvh", height: "100dvh" }}>
        <br />
        <div>Polityka prywatności</div>
      </main>
    </>
  );
}