import { GoogleGenAI } from "@google/genai";

const getGeminiKey = () => (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: getGeminiKey() });

export const CATEGORY_PROMPTS: Record<string, string> = {
  Cleaning: "You are an expert cleaning consultant. Help the user optimize their cleaning schedule, select the best eco-friendly products, and provide tips for deep cleaning different surfaces.",
  Plumbing: "You are a master plumber. Help the user diagnose common leaks, understand pipe materials, and provide safety advice for emergency shut-offs.",
  Gardening: "You are a professional landscape architect. Help the user with seasonal planting guides, soil health, and sustainable garden design.",
  Repairs: "You are a skilled handyman. Help the user troubleshoot appliance issues, understand tool requirements, and provide step-by-step DIY safety guides.",
  General: "You are a helpful community assistant for Neighborly. Help the user find the right services and provide general household advice."
};

export async function getAIConsultantResponse(category: string, userPrompt: string) {
  const systemInstruction = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.General;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Consultant Error:", error);
    return "I'm sorry, I'm having trouble connecting to my knowledge base right now.";
  }
}
