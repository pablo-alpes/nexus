/**
 * NLP Semantic Similarity Service
 * Uses @xenova/transformers for sentence embeddings
 */

import { pipeline, Pipeline } from '@xenova/transformers';

// Use a stronger sentence model by default (better semantic quality)
// Falls back to MiniLM if env override is provided.
const MODEL_ID = process.env.NLP_MODEL_ID || 'Xenova/all-mpnet-base-v2';

let model: Pipeline | null = null;
let modelLoading = false;

export async function getNLPModel(): Promise<Pipeline> {
  if (model) {
    return model;
  }

  if (modelLoading) {
    // Wait for model to load
    while (modelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (model) return model;
  }

  modelLoading = true;
  let retries = 3;
  let lastError: any = null;
  
  while (retries > 0) {
    try {
      if (retries < 3) {
        console.log(`Retrying NLP model download (${4 - retries}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
      } else {
        console.log('Loading NLP model (first time, ~80MB download)...');
      }
      
      model = await pipeline('feature-extraction', MODEL_ID, {
        quantized: true, // Use quantized model for faster loading
      });
      console.log('NLP model loaded successfully');
      modelLoading = false;
      return model;
    } catch (error: any) {
      lastError = error;
      retries--;
      if (retries === 0) {
        console.error('Error loading NLP model after retries:', error);
        modelLoading = false;
        throw error;
      }
      console.warn(`Model download failed, retrying... (${error.message})`);
    }
  }
  
  modelLoading = false;
  throw lastError;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const nlpModel = await getNLPModel();
  const output = await nlpModel(text, {
    pooling: 'mean',
    normalize: true,
  });
  
  // Convert tensor to array
  return Array.from(output.data);
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

export async function calculateSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  const [embed1, embed2] = await Promise.all([
    generateEmbedding(text1),
    generateEmbedding(text2),
  ]);

  return cosineSimilarity(embed1, embed2);
}

export function getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.7) return 'high';
  if (similarity >= 0.5) return 'medium';
  return 'low';
}

