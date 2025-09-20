'use client';

import React, { ReactNode } from "react";
import "@/app/styles/globals.css";
import "@/app/styles/header.css";
import "@/app/styles/play.css";

interface HeaderProps {
  children?: ReactNode;
}

export default function Header({ children }: HeaderProps) {
  return (
    <header className="header">
      <span className="misterUniLogo">MisterUni</span>
      {children}
    </header>
  );
}