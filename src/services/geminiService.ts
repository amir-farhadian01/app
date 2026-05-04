import { GoogleGenAI, Type } from "@google/genai";

const getGeminiKey = () => (import.meta as any).env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: getGeminiKey() });

export interface KycAiAnalysis {
  isLikelyFraud: boolean;
  fraudReasoning: string;
  isEdited: boolean;
  isInternetDownloaded: boolean;
  ocrName: string;
  nameMatchesProfile: boolean;
  dataMismatchDetails: string;
  recommendation: 'approve' | 'reject' | 'manual_review';
  confidence: number;
}

/**
 * Analyzes KYC documents using Gemini 3.
 * Performs OCR, fraud detection (Photoshop/Internet check), and profile matching.
 */
export async function analyzeKycDocuments(
  images: { mimeType: string, data: string }[],
  profileName: string,
  businessName?: string
): Promise<KycAiAnalysis> {
  const model = "gemini-3-flash-preview";

  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.data.split(',')[1] || img.data // Strip data:image/... prefix if present
    }
  }));

  const prompt = `
    Analyze the provided KYC document images for a platform called Neighborly.
    
    Tasks:
    1. Perform OCR to extract the full name and any business names found.
    2. Check for signs of document manipulation (e.g., mismatched fonts, digital editing, Photoshop artifacts).
    3. Detect if the document is a generic sample downloaded from the internet.
    4. Compare the extracted name with the profile name: "${profileName}".
    ${businessName ? `5. Compare the extracted business details with: "${businessName}".` : ''}
    
    Provide a detailed report in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { 
        parts: [...imageParts, { text: prompt }] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isLikelyFraud: { type: Type.BOOLEAN },
            fraudReasoning: { type: Type.STRING },
            isEdited: { type: Type.BOOLEAN },
            isInternetDownloaded: { type: Type.BOOLEAN },
            ocrName: { type: Type.STRING },
            nameMatchesProfile: { type: Type.BOOLEAN },
            dataMismatchDetails: { type: Type.STRING },
            recommendation: { 
              type: Type.STRING, 
              enum: ['approve', 'reject', 'manual_review'] 
            },
            confidence: { type: Type.NUMBER }
          },
          required: [
            'isLikelyFraud', 'fraudReasoning', 'isEdited', 
            'isInternetDownloaded', 'ocrName', 'nameMatchesProfile', 
            'dataMismatchDetails', 'recommendation', 'confidence'
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("No analysis received from AI.");
    }

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}

/**
 * Translates a given text to a target language.
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to ${targetLanguage}: "${text}"`,
  });
  return response.text || '';
}

/**
 * Regenerates a message with a more professional tone.
 */
export async function regenerateText(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Rewrite the following message to sound more professional and friendly: "${text}"`,
  });
  return response.text || '';
}
