import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
if (!apiKey) {
  throw new Error("VITE_GOOGLE_API_KEY is not set in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey });

export const extractDataFromImage = async (base64Image: string): Promise<ExtractedData> => {
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image (document, invoice, inventory list, ID, etc.).
            
            1. Extract 'fields': These are global values like "Invoice Number", "Date", "Total Amount", "Vendor Name".
            2. Extract 'tables': Look for any grid, list, or line items.
               - For each table, identify the 'headers' (column names).
               - Extract all 'rows' strictly following the headers.
               - Ensure every row has a value for every header (use empty string if missing).
            
            Do not flatten tables into fields. Keep them structured.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ["label", "value"],
              },
            },
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Description of the table (e.g. Items)" },
                  headers: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING } 
                  },
                  rows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        values: { 
                          type: Type.ARRAY, 
                          items: { type: Type.STRING },
                          description: "Row values corresponding to headers order" 
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Vision API");

    const parsedData = JSON.parse(text) as ExtractedData;
    
    // Ensure structure exists even if empty
    return {
      fields: Array.isArray(parsedData.fields) ? parsedData.fields : [],
      tables: Array.isArray(parsedData.tables) ? parsedData.tables : []
    };

  } catch (error) {
    console.error("Vision Extraction Error:", error);
    throw error;
  }
};