import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScanResult } from '../types';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const PROMPT = `You are a waste classification expert. Look at this image and identify what waste item is shown.

Respond with ONLY a JSON object. Use this exact structure:
{"category":"plastic","material":"PET Plastic Bottle","isRecyclable":true,"confidence":0.92,"tips":"Rinse and remove cap. Place in the recycling bin.","points":10,"carbonFootprint":"~0.5kg CO2 saved","disposalMethod":"Recycle Bin","diyIdea":"Cut the bottom off to use as a mini greenhouse for seedlings."}

Rules:
- category must be one of: plastic, paper, glass, metal, organic, electronic, textile, hazardous, other
- material: be specific about what the item is
- isRecyclable: true if it can go in a recycling bin
- confidence: 0.0 to 1.0
- tips: 1-2 practical sentences
- points: 5 to 25
- carbonFootprint: rough CO2 impact
- disposalMethod: Recycle Bin, Compost, E-Waste Centre, Hazardous Waste, or General Trash
- diyIdea: If the item can easily be reused, upcycled, or used for a DIY project, provide a 1-sentence creative idea. Otherwise, omit this field or leave it empty.

If unclear, use "other" category and low confidence.`;

function extractBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return text.trim();
}

export async function classifyWaste(imageDataUrl: string): Promise<ScanResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { 
      temperature: 0.1, 
      maxOutputTokens: 512,
      responseMimeType: "application/json" // Guarantees pure JSON output
    },
  });

  const imagePart = {
    inlineData: {
      data: extractBase64(imageDataUrl),
      mimeType: extractMimeType(imageDataUrl),
    },
  };

  if (!imagePart.inlineData.data) {
    throw new Error("No image data provided to Gemini.");
  }

  let lastError: any;

  // Retry up to 2 times on parse failure
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent([PROMPT, imagePart]);
      const raw = result.response.text();
      console.log('Gemini raw response:', raw);
      
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
        geminiModel: 'gemini-2.5-flash',
        diyIdea: typeof parsed.diyIdea === 'string' && parsed.diyIdea.trim() !== '' ? parsed.diyIdea : undefined,
      };
    } catch (err) {
      console.error('Gemini attempt failed:', err);
      lastError = err;
      await new Promise(r => setTimeout(r, 800));
    }
  }

  throw new Error(lastError?.message || "Unknown AI Error");
}
