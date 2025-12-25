import { Chunk, Proficiency } from "../types";

// 使用自己的大模型服务（OpenAI 兼容接口）
const API_BASE_URL = "/api/openai-compatible/v1/chat/completions";
const TAL_MLOPS_APP_ID = import.meta.env.VITE_TAL_MLOPS_APP_ID;
const TAL_MLOPS_APP_KEY = import.meta.env.VITE_TAL_MLOPS_APP_KEY;

// 清理 Markdown 代码块标记
function cleanMarkdownJson(text: string): string {
  // 移除 ```json 或 ``` 标记
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  return cleaned.trim();
}

// 通用的 API 调用函数
async function callLLM(prompt: string, responseFormat?: any) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": `${TAL_MLOPS_APP_ID}:${TAL_MLOPS_APP_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-3-flash", // 根据你的模型名称调整
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      ...(responseFormat && { response_format: responseFormat }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error Response:", errorText);
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("API Response:", data); // 调试日志
  
  // 尝试多种可能的响应格式
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message?.content || data.choices[0].text || "";
  }
  
  // 如果是直接返回文本
  if (data.text) {
    return data.text;
  }
  
  // 如果是直接返回 content
  if (data.content) {
    return data.content;
  }
  
  console.error("Unexpected API response format:", data);
  throw new Error("无法解析 API 响应格式");
}

export const generateTopicQuestions = async (
  keyword: string
): Promise<string[]> => {
  try {
    const prompt = `Generate 5 engaging conversation questions about the topic: "${keyword}". The questions should encourage detailed English speaking practice. Return ONLY a JSON array of strings, without any markdown formatting.`;
    const responseText = await callLLM(prompt, { type: "json_object" });
    const cleanedText = cleanMarkdownJson(responseText);
    const parsed = JSON.parse(cleanedText);
    
    // 如果返回的是对象包含数组，尝试提取
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      return parsed.questions;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }
    
    return parsed;
  } catch (e) {
    console.error("Failed to generate questions:", e);
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
  const prompt = `Analyze this English transcription: "${transcription}". 
  1. Provide a more natural, native-sounding version of what the user tried to say.
  2. Extract 2-3 useful language 'chunks' (phrases or sentence patterns) that would help the user improve. 
  
  Return ONLY JSON format without any markdown formatting:
  {
    "optimized": "improved version",
    "chunks": [
      {
        "original": "phrase in English",
        "translation": "中文翻译",
        "exampleEn": "Example sentence in English",
        "exampleZh": "例句中文翻译"
      }
    ]
  }`;

  const responseText = await callLLM(prompt, { type: "json_object" });
  const cleanedText = cleanMarkdownJson(responseText);
  const result = JSON.parse(cleanedText);
  
  const formattedChunks: Chunk[] = (result.chunks || []).map((c: any) => ({
    ...c,
    id: Math.random().toString(36).substring(7),
    proficiency: Proficiency.BEGINNER,
  }));

  return { optimized: result.optimized || transcription, chunks: formattedChunks };
};

export const autoCompleteChunk = async (partial: {
  original?: string;
  translation?: string;
}): Promise<Partial<Chunk>> => {
  const basePrompt = partial.original
    ? `Complete this English language chunk: "${partial.original}". Provide a Chinese translation, an English example sentence, and its Chinese translation.`
    : `Find a common English phrase for: "${partial.translation}". Provide the English phrase, an English example sentence, and its Chinese translation.`;
  
  const prompt = `${basePrompt}
  
  Return ONLY JSON format without any markdown formatting:
  {
    "original": "English phrase",
    "translation": "中文翻译",
    "exampleEn": "Example sentence",
    "exampleZh": "例句翻译"
  }`;

  const responseText = await callLLM(prompt, { type: "json_object" });
  const cleanedText = cleanMarkdownJson(responseText);
  return JSON.parse(cleanedText);
};

export const evaluateSentence = async (
  chunk: string,
  userSentence: string
): Promise<{
  natural: boolean;
  feedback: string;
  nextProficiency?: Proficiency;
}> => {
  const prompt = `The user is practicing the chunk: "${chunk}". They said: "${userSentence}". 
  Evaluate their use of the chunk, grammar, and naturalness. 
  Determine if they have '掌握' (Mastered) or are still '生疏' (Unfamiliar).
  
  Return ONLY JSON format without any markdown formatting:
  {
    "natural": true/false,
    "feedback": "your feedback here",
    "proficiency": "BEGINNER" or "FAMILIAR" or "MASTERED"
  }`;

  const responseText = await callLLM(prompt, { type: "json_object" });
  const cleanedText = cleanMarkdownJson(responseText);
  const data = JSON.parse(cleanedText);
  return {
    natural: data.natural,
    feedback: data.feedback,
    nextProficiency: data.proficiency as Proficiency,
  };
};
