
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { Contact } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeBusinessCard = async (frontImage: File, backImage: File | null): Promise<Partial<Contact>> => {
  try {
    const imageParts = [await fileToGenerativePart(frontImage)];
    if (backImage) {
        imageParts.push(await fileToGenerativePart(backImage));
    }
    
    const prompt = "Analyze the business card image(s) and extract the contact information. If two images are provided, one is the front and one is the back; combine the information from both. Provide the output in the specified JSON format.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full name of the person." },
            email: { type: Type.STRING, description: "Email address." },
            phone: { type: Type.STRING, description: "Phone number." },
            company: { type: Type.STRING, description: "Company name." },
            title: { type: Type.STRING, description: "Job title." },
            address: { type: Type.STRING, description: "Full address." },
          }
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error("Error analyzing business card:", error);
    throw new Error("Failed to analyze business card. Please check the image and try again.");
  }
};


export const generateFollowUp = async (contact: Contact): Promise<{ subject?: string, body: string }> => {
    const prompt = `
        You are a professional sales assistant. Based on the following contact information and personal notes, please draft a follow-up message.

        Contact Details:
        - Name: ${contact.name}
        - Title: ${contact.title}
        - Company: ${contact.company}
        - Email: ${contact.email}

        My Notes:
        "${contact.notes}"

        Follow-up Method: ${contact.followUp?.method}

        Task:
        Generate a professional yet friendly follow-up message. 
        ${contact.followUp?.method === 'email' ? 'Include a concise and compelling subject line.' : ''}
        The goal is to advance the conversation based on my notes.
    `;

    try {
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING, description: "The subject line for the email. Omit for text/call." },
                body: { type: Type.STRING, description: "The body of the message." },
              },
              required: ["body"]
            }
          }
        });
        
        const parsed = JSON.parse(result.text);
        return parsed;

    } catch (error) {
        console.error("Error generating follow-up:", error);
        throw new Error("Failed to generate follow-up message.");
    }
};

export const scheduleEmailWithGmail = async (contact: Contact): Promise<{ success: boolean, message: string }> => {
    console.log("Simulating scheduling email via Gmail for:", contact.name);

    // This is a simulation. In a real app, you'd use the Gmail API here.
    // We'll simulate a network delay.
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!contact.followUp || !contact.followUp.generatedContent) {
        return { success: false, message: "No follow-up content to send." };
    }

    // Simulate a potential failure
    if (Math.random() < 0.1) { // 10% chance of failure
        console.error("Simulated Gmail API error.");
        return { success: false, message: "Failed to connect to Gmail API. Please try again." };
    }

    console.log("Successfully scheduled email:", {
        to: contact.email,
        subject: contact.followUp.generatedContent.subject,
        body: contact.followUp.generatedContent.body,
        scheduleTime: contact.followUp.dateTime
    });
    
    return { success: true, message: "Email scheduled successfully." };
};


let chat: Chat | null = null;

export const startChat = () => {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: [],
            config: {
                systemInstruction: 'You are a helpful assistant for the SuperFU app.'
            }
        });
    }
    return chat;
}

export const sendMessage = async (message: string) => {
    if (!chat) {
        startChat();
    }
    if(chat){
        const result = await chat.sendMessageStream({ message });
        return result;
    }
    throw new Error("Chat not initialized");
}