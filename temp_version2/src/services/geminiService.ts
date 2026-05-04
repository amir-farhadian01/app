import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const translateText = async (text: string, targetLanguage: string = "Persian") => {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else: "${text}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
};

export const regenerateText = async (text: string) => {
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Rewrite and improve the following text to be more professional and clear, while keeping the same meaning. Only return the improved text: "${text}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Regeneration error:", error);
    return null;
  }
};
