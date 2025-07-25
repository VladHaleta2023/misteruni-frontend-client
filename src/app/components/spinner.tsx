'use client';

import React from "react";
import "@/app/styles/spinner.css";

interface SpinnerProps {
  visible?: boolean;
  text?: string;
  noText?: boolean;
}

export default function Spinner({ visible = true, text = "Loading...", noText = false }: SpinnerProps) {
  if (!visible) return null;

  return (
    <div className="spinner-container" aria-label="Loading...">
      <div className="spinner" />
      {!noText && <p className="spinner-text">{text}</p>}
    </div>
  );
}