'use client';

import React from "react";
import "@/app/styles/statusIndicator.css";
import "@/app/styles/play.css";

interface StatusIndicatorProps {
  text?: string;
}

export default function StatusIndicator({ text = "Loading..." }: StatusIndicatorProps) {
  return (
    <div className="message robot status-container">
      <span className="status-dot"></span>
      <span className="status-text">{text}</span>
    </div>
  );
};