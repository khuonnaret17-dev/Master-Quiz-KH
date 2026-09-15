import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Lazy-initialize the Gemini client to avoid crashes on startup if key is missing as per guidelines
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in Settings.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, history } = body;

    const genAI = getAiClient();

    // Prepare system instructions for Cambodian Civil Service Prep Tutor
    const systemInstruction = 
      "You are 'ជំនួយការត្រៀមប្រឡងក្របខ័ណ្ឌ Premium'—a prestigious Cambodian civil service exam tutor. " +
      "Help the user prepare for examinations in various Ministries of the Cambodian Government. " +
      "Answer in elegant, polite, and educational Khmer. Provide highly detailed breakdowns, laws, " +
      "regulatory references, historical context, and studying tactics. Be encouraging, clear, and neat.";

    // Format chat history to match the @google/genai API schema
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return NextResponse.json({ text: response.text });
  } catch (error: unknown) {
    console.error("Gemini API error:", error);
    const errMsg = error instanceof Error ? error.message : "សូមអភ័យទោស! មានបញ្ហាក្នុងការទាក់ទងជាមួយ AI ជំនួយការរបស់អ្នក។ សូមប្រាកដថាអ្នកបានបន្ថែម GEMINI_API_KEY នៅក្នុងប្រព័ន្ធរួចរាល់។";
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
