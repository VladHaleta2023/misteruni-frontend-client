export type MarkerType = 'AI_ANSWER' | 'AI_QUESTION' | 'AI_USER_SOLUTION' | 'STUDENT_ANSWER' | 'STUDENT_QUESTION';

export interface ChatBlock {
  type: MarkerType;
  content: string;
  title: string;
  isUser: boolean;
}

export type ParseChatResult = ChatBlock[];

type TitlesMap = Record<MarkerType, string>;

export function parseChat(chatText: string): ParseChatResult {
  const blocks: ChatBlock[] = [];
  
  if (!chatText?.trim()) return blocks;

  const lines = chatText.split('\n');
  let currentType: MarkerType | '' = '';
  let currentContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('[AI_ANSWER]') || 
        line.startsWith('[AI_QUESTION]') || 
        line.startsWith('[AI_USER_SOLUTION]') || 
        line.startsWith('[STUDENT_ANSWER]') || 
        line.startsWith('[STUDENT_QUESTION]')) {
      
      if (currentType) {
        saveBlock(currentType as MarkerType, currentContent.trim(), blocks);
      }
      
      const markerEnd = line.indexOf(']') + 1;
      const marker = line.substring(1, markerEnd - 1) as MarkerType;
      currentType = marker;
      currentContent = line.substring(markerEnd);
    } 
    else if (currentType) {
      currentContent += '\n' + line;
    }
  }
  
  if (currentType) {
    saveBlock(currentType as MarkerType, currentContent.trim(), blocks);
  }
  
  return blocks;
}

function saveBlock(type: MarkerType, content: string, blocks: ChatBlock[]) {
  if (!content) return;
  
  const isUser = type === 'STUDENT_ANSWER' || type === 'STUDENT_QUESTION';
  const title = getTitle(type);
  
  blocks.push({
    type,
    content,
    title,
    isUser
  });
}

function getTitle(marker: MarkerType): string {
  const titles: TitlesMap = {
    'AI_ANSWER': 'Polecenie:',
    'AI_QUESTION': 'Pytanie dodatkowe:',
    'AI_USER_SOLUTION': 'Nowe Rozwiązanie Ucznia:',
    'STUDENT_ANSWER': 'Moja Odpowiedź:',
    'STUDENT_QUESTION': 'Moje Pytanie:'
  };
  
  return titles[marker] || '';
}

export function getLastMarker(chatText: string): MarkerType | null {
  if (!chatText?.trim()) return null;
  
  const lines = chatText.split('\n');
  let lastMarker: MarkerType | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('[AI_ANSWER]')) {
      lastMarker = 'AI_ANSWER';
    } else if (line.startsWith('[AI_QUESTION]')) {
      lastMarker = 'AI_QUESTION';
    } else if (line.startsWith('[AI_USER_SOLUTION]')) {
      lastMarker = 'AI_USER_SOLUTION';
    } else if (line.startsWith('[STUDENT_ANSWER]')) {
      lastMarker = 'STUDENT_ANSWER';
    } else if (line.startsWith('[STUDENT_QUESTION]')) {
      lastMarker = 'STUDENT_QUESTION';
    }
  }
  
  return lastMarker;
}

export function removeLastBlockOptimal(chatText: string): string {
  if (!chatText?.trim()) return '';
  
  const blocks = parseChat(chatText);
  
  if (blocks.length === 0) {
    return '';
  }
  
  if (blocks.length === 1) {
    return '';
  }

  const remainingBlocks = blocks.slice(0, -1);
  
  let result = '';
  
  for (const block of remainingBlocks) {
    const marker = `[${block.type}]`;
    
    if (result) {
      result += '\n';
    }
    
    result += marker + block.content;
  }
  
  return result;
}