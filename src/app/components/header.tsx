'use client';

import React, { ReactNode } from "react";
import "@/app/styles/globals.css";
import "@/app/styles/header.css";

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className="header">
      <span style={{ fontSize: "24px" }}>MisterUni</span>
      {children}
    </header>
  );
}