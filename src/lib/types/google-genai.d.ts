declare module '@google/genai' {
  export class GoogleGenAI {
    constructor(opts: { apiKey?: string });
    models: {
      generateContent: (opts: any) => Promise<{ text?: string; [k: string]: any }>;
    };
  }
  export const Type: {
    OBJECT: string;
    ARRAY: string;
    STRING: string;
  };
}
