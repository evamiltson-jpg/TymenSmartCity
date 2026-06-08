
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the GoogleGenAI client with the API key from process.env.API_KEY.
const getAI = () => {
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const SYSTEM_INSTRUCTION = `Ты — бэкенд-модуль системы "Умный город Тюмень". Анализируй данные и давай экспертную оценку. Тон: официальный, конструктивный.`;

/**
 * Uses Gemini 3 Pro to analyze urban initiatives.
 */
export const analyzeInitiative = async (title: string, description: string) => {
  const ai = getAI();
  if (!ai) throw new Error("API KEY MISSING");

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Проанализируй: ${title}. Описание: ${description}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          difficulty: { type: Type.STRING },
          feedback: { type: Type.STRING },
          budgetEstimate: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ["score", "difficulty", "feedback", "budgetEstimate", "category"]
      }
    }
  });

  // Directly access the .text property from the GenerateContentResponse object.
  return JSON.parse(response.text || "{}");
};

/**
 * Searches for city news using Google Search grounding.
 */
export const searchCityNews = async (query: string) => {
  const ai = getAI();
  if (!ai) return { text: "No API Key", sources: [] };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Новости Тюмени: ${query}`,
    config: { tools: [{ googleSearch: {} }] }
  });
  
  return {
    // Directly access the .text property from the GenerateContentResponse object.
    text: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};
