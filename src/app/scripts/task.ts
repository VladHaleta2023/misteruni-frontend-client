export interface ISubtopic {
    name: string;
    percent: number;
}

export interface IWord {
    id: number,
    text: string;
}

export function getWordTexts(words: IWord[]): string[] {
    return words.map(word => word.text);
}

export function getSubtopicTexts(subtopics: ISubtopic[]): string[] {
    return subtopics.map(subtopic => subtopic.name);
}

export type Status = 'started' | 'progress' | 'completed';

export enum ChatMode {
  STUDENT_ANSWER = "STUDENT_ANSWER",
  STUDENT_QUESTION = "STUDENT_QUESTION"
}

export interface ITask {
    id: number;
    stage: number;
    text: string;
    topicName: string;
    topicNote: string;
    status: Status;
    explanation: string;
    solution: string;
    options: string[];
    explanations: string[];
    audioFiles: string[];
    subtopics: ISubtopic[];
    answered: boolean;
    finished: boolean;
    chatFinished: boolean;
    chat: string;
    mode: ChatMode;
    percent: number;
    percentAudio?: number;
    percentWords?: number;
    userOptionIndex: number;
    correctOptionIndex: number;
    userSolution: string;
    words: IWord[]
}