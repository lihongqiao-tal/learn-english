import { GoogleGenAI, Type } from "@google/genai";
import { Chunk, Proficiency } from "../types";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_API_KEY,
  httpOptions: {
    baseUrl: "http://localhost:5173/api/openai-compatible",
    apiVersion: "v1",
    // baseUrl: "https://generativelanguage.googleapis.com",
  },
});

export const generateTopicQuestions = async (
  keyword: string
): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash",
    contents: `Generate 5 engaging conversation questions about the topic: "${keyword}". The questions should encourage detailed English speaking practice.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [
      "What do you think about this topic?",
      "Can you tell me more about your experience?",
      "Why is this important to you?",
    ];
  }
};

export const optimizeAndExtract = async (
  transcription: string
): Promise<{ optimized: string; chunks: Chunk[] }> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash",
    contents: `Analyze this English transcription: "${transcription}". 
    1. Provide a more natural, native-sounding version of what the user tried to say.
    2. Extract 2-3 useful language 'chunks' (phrases or sentence patterns) that would help the user improve. 
    Format as JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optimized: { type: Type.STRING },
          chunks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                translation: { type: Type.STRING },
                exampleEn: { type: Type.STRING },
                exampleZh: { type: Type.STRING },
              },
              required: ["original", "translation", "exampleEn", "exampleZh"],
            },
          },
        },
        required: ["optimized", "chunks"],
      },
    },
  });

  const result = JSON.parse(response.text || "{}");
  const formattedChunks: Chunk[] = result.chunks.map((c: any) => ({
    ...c,
    id: Math.random().toString(36).substring(7),
    proficiency: Proficiency.BEGINNER,
  }));

  return { optimized: result.optimized, chunks: formattedChunks };
};

export const autoCompleteChunk = async (partial: {
  original?: string;
  translation?: string;
}): Promise<Partial<Chunk>> => {
  const prompt = partial.original
    ? `Complete this English language chunk: "${partial.original}". Provide a Chinese translation, an English example sentence, and its Chinese translation.`
    : `Find a common English phrase for: "${partial.translation}". Provide the English phrase, an English example sentence, and its Chinese translation.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          translation: { type: Type.STRING },
          exampleEn: { type: Type.STRING },
          exampleZh: { type: Type.STRING },
        },
      },
    },
  });
  return JSON.parse(response.text || "{}");
};

export const evaluateSentence = async (
  chunk: string,
  userSentence: string
): Promise<{
  natural: boolean;
  feedback: string;
  nextProficiency?: Proficiency;
}> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash",
    contents: `The user is practicing the chunk: "${chunk}". They said: "${userSentence}". 
    Evaluate their use of the chunk, grammar, and naturalness. 
    Determine if they have '掌握' (Mastered) or are still '生疏' (Unfamiliar).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          natural: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
          proficiency: { type: Type.STRING, enum: Object.values(Proficiency) },
        },
        required: ["natural", "feedback", "proficiency"],
      },
    },
  });
  const data = JSON.parse(response.text || "{}");
  return {
    natural: data.natural,
    feedback: data.feedback,
    nextProficiency: data.proficiency as Proficiency,
  };
};
