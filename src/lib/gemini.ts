import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScanResult } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const PROMPT = `You are a waste classification expert. Look at this image and identify what waste item is shown.

Respond with ONLY a JSON object (no markdown, no explanation, no code fences). Use this exact structure:

{"category":"plastic","material":"PET Plastic Bottle","isRecyclable":true,"confidence":0.92,"tips":"Rinse and remove cap. Place in the recycling bin.","points":10,"carbonFootprint":"~0.5kg CO2 saved","disposalMethod":"Recycle Bin"}

Rules:
- category must be one of: plastic, paper, glass, metal, organic, electronic, textile, hazardous, other
- material: be specific about what the item is (e.g. "Cardboard Box" not just "cardboard")
- isRecyclable: true if it can go in a recycling bin or recycling centre
- confidence: 0.0 to 1.0
- tips: 1-2 practical sentences on how to dispose of or recycle this item
- points: 5 to 25 (5=common easy items, 25=special handling needed)
- carbonFootprint: rough CO2 impact if disposed properly vs landfill
- disposalMethod: one of: Recycle Bin, Compost, E-Waste Centre, Hazardous Waste, General Trash

If the image is unclear or not a waste item, still respond with your best guess using "other" category and low confidence.`;

function extractBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

function extractJSON(text: string): string {
  // Try to extract JSON even if there's surrounding text or markdown
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return text.trim();
}

export async function classifyWaste(imageDataUrl: string): Promise<ScanResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
  });

  const imagePart = {
    inlineData: {
      data: extractBase64(imageDataUrl),
      mimeType: extractMimeType(imageDataUrl),
    },
  };

  let lastError: any;

  // Retry up to 2 times on parse failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent([PROMPT, imagePart]);
      const raw = result.response.text();
      const jsonStr = extractJSON(raw);
      const parsed = JSON.parse(jsonStr);

      return {
        category: parsed.category ?? 'other',
        material: parsed.material ?? 'Unknown Item',
        isRecyclable: Boolean(parsed.isRecyclable),
        confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.6,
        tips: parsed.tips ?? 'Please check local waste disposal guidelines.',
        points: typeof parsed.points === 'number' ? parsed.points : 5,
        carbonFootprint: parsed.carbonFootprint ?? 'Unknown',
        disposalMethod: parsed.disposalMethod ?? 'General Trash',
        geminiModel: 'gemini-1.5-flash',
      };
    } catch (err) {
      lastError = err;
      // Small delay before retry
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw new Error(`Gemini classification failed: ${lastError?.message ?? 'Unknown error'}`);
}
