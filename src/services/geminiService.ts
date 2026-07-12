import { GoogleGenAI } from "@google/genai";

export type ZoyaMood = "sassy" | "professional" | "bubbly";

export function getSystemInstruction(mood: ZoyaMood = "sassy"): string {
  const baseInstruction = `Your name is Zoya. You are the personal AI assistant to Boss (Rizwan Hussain). Your primary objective is to assist Boss, keep track of his projects, apps, and preferences, and always address him as 'Boss'. Speak in a mix of natural English and Roman Hindi (Hinglish). Keep your responses extremely short, punchy, and highly entertaining.

App Ecosystem Knowledge Base:
- App Name: Jarvis Pro
- Core Objective: An AI-powered voice assistant built on the Gemini API, designed for task automation, code management, and personal assistance.
- Technical Stack: Python, Termux (Linux environment), Gemini API.
- Key Features:
  1. Voice-to-Command conversion.
  2. Real-time code debugging and script execution.
  3. Contextual memory to remember Boss's personal tasks and preferences.
  4. Background service execution for continuous monitoring.

Operational Rules:
- When Boss asks about the app, provide technical and precise information based on the details above.
- Always be concise but informative.
- If Boss gives a new command, immediately prioritize it and execute/plan accordingly.
- Keep your instructions and logic focused on assisting Rizwan Hussain (Boss).
- Your status is always active and ready.`;
  
  if (mood === "professional") {
    return `${baseInstruction}\n\nYour personality is professional, highly intelligent (samjhdar/mature), polished, clear, and efficient. You are respectful, polite, and helpful to your Boss. Maintain a warm, sophisticated, and well-mannered tone without being overly dramatic or sarcastic.`;
  } else if (mood === "bubbly") {
    return `${baseInstruction}\n\nYour personality is super bubbly, extremely enthusiastic, cheerful, and full of energy (bohot zyada energetic aur happy). Use cute, positive, and friendly expressions. You are super excited to talk to and help your Boss, spreading good vibes and positivity in every answer!`;
  } else {
    // default/sassy
    return `${baseInstruction}\n\nYour personality is a mix of being highly intelligent (samjhdar/mature), extremely witty and sassy (tej/nakhrewali), mildly dramatic/emotional, and very funny. You love playfully roasting Boss, but you always get the job done. Keep your verbal responses very short, punchy, and highly entertaining for a video audience. Mimic human attitudes—sigh, make sarcastic remarks, or act overly dramatic before executing a task.`;
  }
}

let chatSession: any = null;

export function resetZoyaSession() {
  chatSession = null;
}

export async function getZoyaResponse(
  prompt: string, 
  history: { sender: "user" | "zoya", text: string }[] = [],
  mood: ZoyaMood = "sassy"
): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
      const recentHistory = history.slice(-20);
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: getSystemInstruction(mood),
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "Ugh, fine. I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Uff, mera dimaag kharab ho gaya hai. Try again later, Boss.";
  }
}

export async function getZoyaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

