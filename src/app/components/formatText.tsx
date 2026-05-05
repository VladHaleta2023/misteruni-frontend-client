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
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x2F;/g, '/')
      .replace(/&#x60;/g, '`')
      .replace(/&#x3D;/g, '=');

    cleaned = cleaned
      .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>');

    cleaned = cleaned
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    const blockFormulas: string[] = [];
    cleaned = cleaned.replace(/\$\$([\s\S]+?)\$\$/g, (_, f) => {
      blockFormulas.push(f);
      return `%%BLOCK_FORMULA_${blockFormulas.length - 1}%%`;
    });

    const bracketFormulas: string[] = [];
    cleaned = cleaned.replace(/\\\[([\s\S]+?)\\\]/g, (_, f) => {
      bracketFormulas.push(f);
      return `%%BRACKET_FORMULA_${bracketFormulas.length - 1}%%`;
    });

    cleaned = cleaned.replace(/\n/g, '<br />');

    cleaned = cleaned.replace(/%%BLOCK_FORMULA_(\d+)%%/g, (_, i) => `$$${blockFormulas[i]}$$`);
    cleaned = cleaned.replace(/%%BRACKET_FORMULA_(\d+)%%/g, (_, i) => `\\[${bracketFormulas[i]}\\]`);

    ref.current.innerHTML = cleaned;

    try {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: false },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: false },
        ],
        throwOnError: false,
      });
    } catch (error) {
      console.error('KaTeX rendering error:', error);
    }
  }, [content]);

  return <div ref={ref} className="format-text" />;
}