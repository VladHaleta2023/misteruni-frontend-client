'use client';

import { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

interface FormatTextProps {
  content: string;
}

export default function FormatText({ content }: FormatTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    let cleaned = content;

    cleaned = cleaned
      .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>');

    cleaned = cleaned.replace(
      /(^\d+\.\s.*(\n\d+\.\s.*)*)/gm,
      (match) => {
        const items = match
          .trim()
          .split('\n')
          .map((line) => line.replace(/^\d+\.\s/, '<li>') + '</li>')
          .join('');
        return `<ol>${items}</ol>`;
      }
    );

    cleaned = cleaned.replace(
      /(^- .*(\n- .*)*)/gm,
      (match) => {
        const items = match
          .trim()
          .split('\n')
          .map((line) => line.replace(/^- /, '<li>') + '</li>')
          .join('');
        return `<ul>${items}</ul>`;
      }
    );

    cleaned = cleaned
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    cleaned = cleaned.replace(/(?<!<\/li>)\n/g, '<br />');

    ref.current.innerHTML = cleaned;

    try {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    } catch (error) {
      console.error('KaTeX rendering error:', error);
    }
  }, [content]);

  return <div ref={ref} className="format-text" />;
}