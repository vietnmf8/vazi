declare module 'node-nlp' {
    export class NlpManager {
        constructor(options?: { languages?: string[], forceNER?: boolean, autoSave?: boolean });
        addDocument(language: string, utterance: string, intent: string): void;
        addAnswer(language: string, intent: string, answer: string): void;
        train(): Promise<void>;
        process(language: string, utterance: string): Promise<any>;
        save(filename?: string): void;
        load(filename?: string): void;
    }
}
