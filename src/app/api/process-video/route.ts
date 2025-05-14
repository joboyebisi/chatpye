import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Simple in-memory cache (replace with Redis or similar in production)
const videoCache = new Map();

export async function POST(request: Request) {
  try {
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Check cache first
    if (videoCache.has(youtubeUrl)) {
      return NextResponse.json({
        status: 'completed',
        message: 'Video analysis retrieved from cache',
        analysis: videoCache.get(youtubeUrl)
      });
    }

    // Start instant analysis with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Get video info first
    const videoInfoResponse = await fetch('/api/video-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ youtubeUrl }),
    });

    if (!videoInfoResponse.ok) {
      throw new Error('Failed to get video info');
    }

    const videoInfo = await videoInfoResponse.json();

    // Generate initial analysis
    const prompt = `Analyze this YouTube video and provide key insights:
    Title: ${videoInfo.title}
    Description: ${videoInfo.description}
    
    Please provide:
    1. Main topics covered
    2. Key points
    3. Technical concepts (if any)
    4. Potential questions users might ask`;

    const result = await model.generateContent(prompt);
    const analysis = result.response.text();

    // Cache the analysis
    videoCache.set(youtubeUrl, {
      analysis,
      videoInfo,
      timestamp: Date.now()
    });

    // Start background processing for more detailed analysis
    // This would typically be handled by a queue system
    processVideoInBackground(youtubeUrl);

    return NextResponse.json({ 
      status: 'processing',
      message: 'Initial analysis complete, continuing with detailed processing',
      initialAnalysis: analysis
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
}

async function processVideoInBackground(youtubeUrl: string) {
  try {
    // Here you would:
    // 1. Extract video transcript
    // 2. Perform detailed analysis
    // 3. Update cache with complete analysis
    // 4. Notify client of completion (via WebSocket or polling)
    
    // Simulate background processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Update cache with complete analysis
    const currentCache = videoCache.get(youtubeUrl);
    if (currentCache) {
      videoCache.set(youtubeUrl, {
        ...currentCache,
        completeAnalysis: true,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error in background processing:', error);
  }
} 