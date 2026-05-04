import { GoogleGenAI, Type } from '@google/genai';

const getGeminiKey = (): string => {
  const env = import.meta.env as { VITE_GEMINI_API_KEY?: string };
  return env.VITE_GEMINI_API_KEY || '';
};

export type CoachDescriptionInput = {
  serviceTitle: string;
  categoryBreadcrumb: string[];
  answers: Record<string, unknown>;
  userDescription: string;
  aiAssistPrompt?: string;
};

export type CoachDescriptionResult = {
  improved: string;
  missingDetails: string[];
  reasoning: string;
};

/**
 * Client-side Gemini coach for order description (ADR-0016).
 * Pattern aligned with `src/services/geminiService.ts`.
 */
export async function coachDescription(input: CoachDescriptionInput): Promise<CoachDescriptionResult> {
  const apiKey = getGeminiKey();
  if (!apiKey.trim()) {
    return {
      improved: input.userDescription,
      missingDetails: [],
      reasoning: 'AI unavailable; please add detail',
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';

  const crumb = input.categoryBreadcrumb.length ? input.categoryBreadcrumb.join(' › ') : 'General';
  const assist =
    input.aiAssistPrompt?.trim() ||
    'Help the customer describe the job clearly for local service providers.';

  const prompt = `${assist}

Service: "${input.serviceTitle}"
Category path: ${crumb}
Known answers (JSON): ${JSON.stringify(input.answers)}
Current description from customer:
"""
${input.userDescription}
"""

Return JSON only with:
- improved: a polished, specific description the customer could send as-is (same language as input).
- missingDetails: short bullet hints (strings) of useful info still missing (empty array if none).
- reasoning: one short sentence on what you improved.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            improved: { type: Type.STRING },
            missingDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING },
          },
          required: ['improved', 'missingDetails', 'reasoning'],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return {
        improved: input.userDescription,
        missingDetails: [],
        reasoning: 'AI unavailable; please add detail',
      };
    }
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      improved: typeof parsed.improved === 'string' ? parsed.improved : input.userDescription,
      missingDetails: Array.isArray(parsed.missingDetails)
        ? parsed.missingDetails.filter((x): x is string => typeof x === 'string')
        : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch {
    return {
      improved: input.userDescription,
      missingDetails: [],
      reasoning: 'AI unavailable; please add detail',
    };
  }
}
