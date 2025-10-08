export interface ISubtopic {
    name: string;
    percent: number;
}

export interface ITask {
    id: number;
    stage: number;
    text: string;
    note: string;
    explanation: string;
    solution: string;
    options: string[];
    explanations: string[];
    subTasks: ITask[];
    audioFiles: string[];
    subtopics: ISubtopic[];
    correctOptionIndex: number;
    answered: boolean;
    finished: boolean;
    percent: number;
    userOptionIndex: number;
    userSolution: string;
}

export class Task {
    private task: ITask

    constructor(task: ITask) {
        this.task = task;
    }

    public getTask() {
        return this.task;
    }

    public updateTask(fields: Partial<ITask>) {
        this.task = { ...this.task, ...fields };
    }

    public setId(id: number) {
        this.task.id = id;
    }

    public setStage(stage: number) {
        this.task.stage = stage;
    }

    public setText(text: string) {
        this.task.text = text;
    }

    public setSolution(solution: string) {
        this.task.solution = solution;
    }

    public setOptions(options: string[]) {
        this.task.options = options;
    }

    public setSubtopics(subtopics: ISubtopic[]) {
        this.task.subtopics = subtopics;
    }

    public setCorrectOptionIndex(correctOptionIndex: number) {
        this.task.correctOptionIndex = correctOptionIndex;
    }

    public setAnswered(answered: boolean) {
        this.task.answered = answered;
    }

    public setFinished(finished: boolean) {
        this.task.finished = finished;
    }

    public setUserOptionIndex(userOptionIndex: number) {
        this.task.userOptionIndex = userOptionIndex;
    }

    public setUserSolution(userSolution: string) {
        this.task.userSolution = userSolution;
    }

    public setSubTasks(subTasks: ITask[]) {
        this.task.subTasks = subTasks;
    }

    public setAudioFiles(audioFiles: string[]) {
        this.task.audioFiles = audioFiles;
    }
}