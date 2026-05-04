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
 * Moderates a chat message for PII (Phone, Email, Address).
 */
export async function moderateChatMessage(text: string): Promise<{ isSafe: boolean; reason?: string }> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze the following chat message between a Customer and a Service Provider.
    Neighbors is a professional platform. We prohibit exchanging personal contact info (Phone, Email, Address) before a contract is paid.
    
    Message: "${text}"
    
    Does this message contain or request a phone number, email, or physical address?
    Respond in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSafe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ['isSafe']
        }
      }
    });

    return JSON.parse(response.text || '{"isSafe":true}');
  } catch (error) {
    console.error("AI Moderation Error:", error);
    return { isSafe: true };
  }
}

/**
 * Generates a professional service contract.
 */
export async function generateServiceContract(job: any, provider: any): Promise<{ content: string; terms: string }> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Generate a professional service contract for:
    Job: ${job.title}
    Description: ${job.description}
    Amount: $${(job.totalAmount / 100).toFixed(2)}
    Provider: ${provider.name}
    
    Include standard marketplace clauses for Canada (HST, Liability, completion terms).
    Respond in JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING },
            terms: { type: Type.STRING }
          },
          required: ['content', 'terms']
        }
      }
    });

    return JSON.parse(response.text || '{"content":"Default Contract", "terms":"Default Terms"}');
  } catch (error) {
    console.error("AI Contract Generation Error:", error);
    return { content: "Fallback Professional Service Contract", terms: "Standard Terms & Conditions Apply." };
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
