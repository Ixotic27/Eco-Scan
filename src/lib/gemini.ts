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
    } catch (err: any) {
      console.error('Gemini attempt failed:', err);
      lastError = err;
      await new Promise(r => setTimeout(r, 800));
    }
  }

  throw new Error(lastError?.message || "Unknown AI Error");
}

export async function verifyRecyclingImage(
  imageDataUrl: string,
  material: string,
  quantity: number,
  quantityUnit: string
): Promise<import('../types').RecycleVerificationResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  });

  const prompt = `You are a strict waste management verifier.
The user claims they are currently discarding ${quantity} ${quantityUnit} of ${material} in a proper recycling facility or bin.

Analyze this image and return a JSON object exactly like this:
{"valid":true,"confidence":0.95,"extractedTimestamp":"12/10/2026 14:30:22","carbonSavedKg":1.25,"reason":"Clear view of 5 plastic bottles inside a blue recycling bin. Watermark timestamp found."}

Rules:
1. valid: true ONLY IF you see the material actually being discarded into a proper bin, facility, or collection area. (Not just sitting on a desk).
2. extractedTimestamp: Read any text burned into the image (GPS map camera watermarks usually have a Date/Time). Return the exact Date/Time string. Return null if no text watermark exists.
3. carbonSavedKg: Estimate the kg of CO2 equivalent emissions saved by recycling this specific quantity/weight of this material instead of landfilling it. (e.g. 1kg of plastic saves ~1.5kg CO2). Return a number.
4. reason: Explain your decision in 1 sentence.`;

  const imagePart = {
    inlineData: { data: extractBase64(imageDataUrl), mimeType: extractMimeType(imageDataUrl) },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const parsed = JSON.parse(extractJSON(result.response.text()));
  
  return {
    valid: Boolean(parsed.valid),
    confidence: Number(parsed.confidence) || 0,
    extractedTimestamp: parsed.extractedTimestamp || undefined,
    carbonSavedKg: Number(parsed.carbonSavedKg) || 0,
    reason: parsed.reason || 'Verification complete.',
  };
}

export async function verifyDIYProject(
  imageDataUrls: string[],
  originalMaterial: string,
  materialsUsed: string
): Promise<import('../types').DIYVerificationResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  });

  const prompt = `You are an AI deepfake detector and upcycling expert.
The user claims they upcycled ${originalMaterial} into a DIY project using: ${materialsUsed}.
I have provided multiple images of their project from different angles.

Analyze these images and return a JSON object exactly like this:
{"valid":true,"confidence":0.9,"isAIGenerated":false,"reason":"Consistent lighting across angles. Real physical textures. Correlates with materials listed."}

Rules:
1. valid: true ONLY IF this looks like a genuine, physical DIY project made by a human using the stated materials.
2. isAIGenerated: SET TO TRUE if you detect ANY signs of AI rendering (Midjourney, DALL-E). Look for uncanny smooth textures, impossible lighting, background blur inconsistencies, or floating elements.
3. reason: Explain your decision in 1 short sentence.`;

  const imageParts = imageDataUrls.map(url => ({
    inlineData: { data: extractBase64(url), mimeType: extractMimeType(url) },
  }));

  const result = await model.generateContent([prompt, ...imageParts]);
  const parsed = JSON.parse(extractJSON(result.response.text()));

  return {
    valid: Boolean(parsed.valid),
    confidence: Number(parsed.confidence) || 0,
    isAIGenerated: Boolean(parsed.isAIGenerated),
    reason: parsed.reason || 'Verification complete.',
  };
}
