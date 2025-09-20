'use client';

import { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';
import '@/app/styles/components.css';

interface FormatTextProps {
  content: string;
}

export default function FormatText({ content }: FormatTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = content;

      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false,
      });
    }
  }, [content]);

  return <div ref={ref} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />;
}