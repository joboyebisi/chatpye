import { GoogleGenerativeAI } from '@google/generative-ai';
import { getVideoTranscript, cleanTranscript } from './youtube';

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable');
}

// Initialize the API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper function to handle rate limits
async function handleRateLimit(error: any) {
  if (error.status === 429) {
    const retryDelay = error.errorDetails?.[2]?.retryDelay || '10s';
    const delayMs = parseInt(retryDelay) * 1000;
    console.log(`Rate limit hit, waiting ${retryDelay} before retrying...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return true;
  }
  return false;
}

// Function to generate embeddings for text
async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'embedding-001',
      generationConfig: {
        temperature: 0,
      },
    });

    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

// Function to find relevant context using semantic search
async function findRelevantContext(question: string, transcript: string) {
  try {
    // Split transcript into chunks (e.g., by sentences or paragraphs)
    const chunks = transcript.split(/[.!?]+/).filter(chunk => chunk.trim().length > 0);
    
    // Generate embedding for the question
    const questionEmbedding = await generateEmbeddings(question);
    
    // Generate embeddings for each chunk
    const chunkEmbeddings = await Promise.all(
      chunks.map(chunk => generateEmbeddings(chunk))
    );
    
    // Calculate cosine similarity between question and each chunk
    const similarities = chunkEmbeddings.map((embedding, index) => ({
      chunk: chunks[index],
      similarity: cosineSimilarity(questionEmbedding, embedding)
    }));
    
    // Sort by similarity and return top chunks
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(item => item.chunk)
      .join(' ');
  } catch (error) {
    console.error('Error finding relevant context:', error);
    throw error;
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function analyzeVideo(youtubeUrl: string, prompt: string) {
  // Extract video ID from URL
  const videoId = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  try {
    // First, get the video transcript
    const transcript = await getVideoTranscript(youtubeUrl);
    
    // Find relevant context for the question
    const relevantContext = await findRelevantContext(prompt, transcript);
    
    // Get the Gemini Pro model with correct configuration
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Create a streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the analysis in the background
    (async () => {
      try {
        const result = await model.generateContentStream({
          contents: [{
            role: 'user',
            parts: [
              {
                text: `You are an AI tutor analyzing a YouTube video. Here is the relevant context from the video transcript:

${relevantContext}

Please provide a detailed response to the following question: ${prompt}
                
Guidelines:
- Be concise but informative
- Use bullet points for key points
- Include timestamps if relevant
- Format code blocks with proper syntax highlighting
- If you're unsure about something, acknowledge it
- Keep the response focused on the video content`
              }
            ]
          }]
        });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            await writer.write(new TextEncoder().encode(text));
          }
        }
      } catch (error) {
        console.error('Detailed Gemini error:', error);
        
        // Handle rate limits
        if (await handleRateLimit(error)) {
          // Retry the request
          try {
            const result = await model.generateContentStream({
              contents: [{
                role: 'user',
                parts: [
                  {
                    text: `You are an AI tutor analyzing a YouTube video. Here is the relevant context from the video transcript:

${relevantContext}

Please provide a detailed response to the following question: ${prompt}
                    
Guidelines:
- Be concise but informative
- Use bullet points for key points
- Include timestamps if relevant
- Format code blocks with proper syntax highlighting
- If you're unsure about something, acknowledge it
- Keep the response focused on the video content`
                  }
                ]
              }]
            });

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                await writer.write(new TextEncoder().encode(text));
              }
            }
          } catch (retryError) {
            console.error('Error on retry:', retryError);
            await writer.write(new TextEncoder().encode('Sorry, I encountered an error while analyzing the video. Please try again in a few moments.'));
          }
        } else {
          await writer.write(new TextEncoder().encode('Sorry, I encountered an error while analyzing the video. Please try again.'));
        }
      } finally {
        await writer.close();
      }
    })();

    return stream.readable;
  } catch (error) {
    console.error('Error initializing Gemini:', error);
    throw error;
  }
}

export async function getVideoSummary(youtubeUrl: string) {
  return analyzeVideo(youtubeUrl, "Please provide a concise summary of this video in 3-4 sentences.");
}

export async function getVideoHighlights(youtubeUrl: string) {
  return analyzeVideo(youtubeUrl, "What are the key highlights and main points discussed in this video?");
}

export async function explainVideoSimply(youtubeUrl: string) {
  return analyzeVideo(youtubeUrl, "Explain the main concepts of this video in simple terms, as if explaining to a 5-year-old.");
}

export async function answerQuestion(youtubeUrl: string, question: string) {
  return analyzeVideo(youtubeUrl, `Based on the video content, please answer this question: ${question}`);
} 