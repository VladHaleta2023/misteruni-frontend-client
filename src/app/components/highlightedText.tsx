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

      const wordPattern = validWords
        .map(word => `${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
        .join('|');
      
      const regex = new RegExp(`(${wordPattern})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        if (!part) return null;
        
        const isBold = validWords.some(validWord => 
          part.toLowerCase().includes(validWord.toLowerCase())
        );
        
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