'use client';

import { useMemo } from 'react';

interface HighlightedTextProps {
  word: string;
  text: string;
}

export default function HighlightedText({ word, text }: HighlightedTextProps) {
  const highlightedContent = useMemo(() => {
    if (!text?.trim()) return <>{text}</>;
    if (!word?.trim()) return <>{text}</>;

    try {
      const validWords = word.split(/\s+/).filter(Boolean);
      if (!validWords.length) return <>{text}</>;

      const wordSet = new Set(validWords.map(w => w.toLowerCase()));
      
      const parts = text.split(/(\W+)/);
      
      return parts.map((part, index) => {
        if (!part) return null;
        
        const isWord = /\w+/.test(part);
        const isBold = isWord && wordSet.has(part.toLowerCase());
        
        return isBold ? (
          <span key={index} style={{ fontWeight: "bold" }}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      }).filter(Boolean);

    } catch {
      return <>{text}</>;
    }
  }, [word, text]);

  return <>{highlightedContent}</>;
};