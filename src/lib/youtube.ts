// This file is no longer needed as we're using direct video analysis with Gemini
// You can safely delete this file 

import { google } from 'googleapis';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

const youtube = google.youtube('v3');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface VideoInfo {
  title: string;
  description: string;
  views: string;
  publishedAt: string;
  hasTranscript: boolean;
  transcript?: string;
  videoId: string;
  visionAnalysis?: string;
}

export async function getVideoInfo(videoId: string): Promise<VideoInfo> {
  try {
    // Get video details
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      id: [videoId],
      key: process.env.YOUTUBE_API_KEY,
    });

    const video = videoResponse.data.items?.[0];
    if (!video) {
      throw new Error('Video not found');
    }

    const { snippet, statistics } = video;

    // Try to get transcript
    let transcript = '';
    let hasTranscript = false;
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcriptItems && transcriptItems.length > 0) {
        transcript = transcriptItems
          .map(item => item.text)
          .join(' ');
        hasTranscript = true;
      }
    } catch (error) {
      console.log('No transcript available for this video');
    }

    // If no transcript, use Gemini vision for analysis
    let visionAnalysis = '';
    if (!hasTranscript) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
        const prompt = `Analyze this YouTube video content. Provide a concise summary covering:
          1. Main Thesis/Claim: What is the central point the creator is making?
          2. Key Topics: List the main subjects discussed
          3. Technical Content: Identify any code, technical concepts, or tools shown
          4. Summary: Provide a concise summary of the video content`;

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: 'video/youtube',
              data: `https://www.youtube.com/watch?v=${videoId}`
            }
          }
        ]);

        visionAnalysis = result.response.text();
      } catch (error) {
        console.error('Error in vision analysis:', error);
      }
    }

    return {
      title: snippet?.title || '',
      description: snippet?.description || '',
      views: new Intl.NumberFormat().format(Number(statistics?.viewCount || 0)),
      publishedAt: new Date(snippet?.publishedAt || '').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      hasTranscript,
      transcript,
      videoId,
      visionAnalysis
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw error;
  }
}

export function extractVideoId(youtubeUrl: string): string | null {
  const match = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
} 