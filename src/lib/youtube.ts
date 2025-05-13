import { YoutubeTranscript } from 'youtube-transcript';
import { db } from './firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';

export async function getVideoTranscript(videoUrl: string): Promise<string> {
  try {
    // Extract video ID from URL
    const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Try to get transcript from Firebase first
    try {
      const transcriptsCollection = collection(db, 'transcripts');
      const transcriptRef = doc(transcriptsCollection, videoId);
      const transcriptDoc = await getDoc(transcriptRef);

      if (transcriptDoc.exists()) {
        console.log('Retrieved transcript from cache');
        return transcriptDoc.data().text;
      }
    } catch (firebaseError) {
      console.warn('Firebase cache check failed, proceeding with direct transcript fetch:', firebaseError);
    }

    // Fetch transcript from YouTube
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'en'
    });
    
    if (!transcriptItems || transcriptItems.length === 0) {
      throw new Error('No transcript found for this video');
    }

    // Combine transcript items into a single string
    const transcript = transcriptItems
      .map(item => item.text)
      .join(' ');

    // Try to cache the transcript in Firebase
    try {
      const transcriptsCollection = collection(db, 'transcripts');
      const transcriptRef = doc(transcriptsCollection, videoId);
      await setDoc(transcriptRef, {
        text: transcript,
        timestamp: new Date().toISOString(),
        videoId: videoId
      });
      console.log('Stored new transcript in cache');
    } catch (firebaseError) {
      console.warn('Failed to cache transcript in Firebase:', firebaseError);
      // Continue even if caching fails
    }

    return transcript;
  } catch (error) {
    console.error('Error fetching video transcript:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch video transcript: ${error.message}`);
    }
    throw new Error('Failed to fetch video transcript. Please ensure the video has captions enabled.');
  }
}

// Helper function to clean transcript text
export function cleanTranscript(text: string): string {
  return text
    .replace(/\n+/g, ' ') // Replace multiple newlines with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
} 