import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScanResult } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const WASTE_CLASSIFICATION_PROMPT = `You are an expert waste classification AI. Analyze this image of a waste item and respond with ONLY valid JSON — no markdown, no explanation, just the JSON object.

{
  "category": "one of: plastic | paper | glass | metal | organic | electronic | textile | hazardous | other",
  "material": "specific material name (e.g. PET Plastic Bottle, Cardboard Box, Aluminum Can)",
  "isRecyclable": true or false,
  "confidence": number between 0.0 and 1.0,
  "tips": "2-3 sentences of specific disposal or recycling instructions",
  "points": number between 5 and 25 (higher for harder-to-recycle or high-impact items),
  "carbonFootprint": "estimated CO2 impact if not recycled properly (e.g. 2.5kg CO2)",
  "disposalMethod": "short label: Recycle Bin | Compost | E-Waste Centre | Hazardous Waste | General Trash"
}

Rules:
- Be specific about the material — identify exactly what it is from the image.
- points: 5 for common items (plastic bottle), up to 25 for difficult items (e-waste, batteries).
- If unsure, be honest with a lower confidence score.
- Always return valid parseable JSON.`;

function base64FromDataUrl(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

function mimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

export async function classifyWaste(imageDataUrl: string): Promise<ScanResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const imageData = {
    inlineData: {
      data: base64FromDataUrl(imageDataUrl),
      mimeType: mimeTypeFromDataUrl(imageDataUrl),
    },
  };

  const result = await model.generateContent([WASTE_CLASSIFICATION_PROMPT, imageData]);
  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  const parsed = JSON.parse(jsonText);

  return {
    category: parsed.category ?? 'other',
    material: parsed.material ?? 'Unknown Material',
    isRecyclable: Boolean(parsed.isRecyclable),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    tips: parsed.tips ?? 'Please check with your local waste management authority.',
    points: typeof parsed.points === 'number' ? parsed.points : 5,
    carbonFootprint: parsed.carbonFootprint ?? 'Unknown',
    disposalMethod: parsed.disposalMethod ?? 'General Trash',
    geminiModel: 'gemini-1.5-flash',
  };
}
