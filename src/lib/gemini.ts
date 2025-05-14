import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

// Helper function to get video ID from URL
function getVideoId(youtubeUrl: string): string | null {
  const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

// Helper function to check cache
async function checkCache(videoId: string, prompt: string): Promise<string | null> {
  try {
    const cacheRef = doc(db, 'video_analysis', `${videoId}_${prompt}`);
    const cacheDoc = await getDoc(cacheRef);
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      // Check if cache is less than 24 hours old
      const cacheAge = Date.now() - data.timestamp.toMillis();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return data.analysis;
      }
    }
    return null;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
}

// Helper function to save to cache
async function saveToCache(videoId: string, prompt: string, analysis: string) {
  try {
    const cacheRef = doc(db, 'video_analysis', `${videoId}_${prompt}`);
    await setDoc(cacheRef, {
      analysis,
      timestamp: new Date(),
      videoId,
      prompt
    });
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

export async function analyzeVideo(youtubeUrl: string, prompt: string) {
  try {
    const videoId = getVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Check cache first
    const cachedAnalysis = await checkCache(videoId, prompt);
    if (cachedAnalysis) {
      console.log('Using cached analysis');
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      await writer.write(new TextEncoder().encode(cachedAnalysis));
      await writer.close();
      return stream.readable;
    }

    // Get the Gemini Pro model with correct configuration
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
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
    let fullAnalysis = '';

    // Start the analysis in the background
    (async () => {
      try {
        const result = await model.generateContentStream({
          contents: [{
            role: 'user',
            parts: [
              {
                text: `You are an AI tutor analyzing a YouTube video. Please analyze the following video and provide a detailed response to: ${prompt}
                
Guidelines:
- Be concise but informative
- Use bullet points for key points
- Include timestamps if relevant
- Format code blocks with proper syntax highlighting
- If you're unsure about something, acknowledge it
- Keep the response focused on the video content`
              },
              {
                fileData: {
                  fileUri: youtubeUrl,
                  mimeType: 'video/mp4'
                }
              }
            ]
          }]
        });

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            fullAnalysis += text;
            await writer.write(new TextEncoder().encode(text));
          }
        }

        // Save to cache after successful analysis
        await saveToCache(videoId, prompt, fullAnalysis);
      } catch (error: any) {
        console.error('Error in Gemini analysis:', error);
        
        // Handle rate limits
        if (error.message?.includes('rate limit')) {
          await writer.write(new TextEncoder().encode('Rate limit exceeded. Please try again in a few minutes.'));
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await writer.write(new TextEncoder().encode(`Error: ${errorMessage}`));
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