"use client";

import { useState, useEffect, useRef } from 'react';
import { Send, Search, MessageSquare, ArrowLeft, ArrowRight, RefreshCw, Clock, Copy, FileText, MessageCircle, History, FileCog, BookOpen, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoPlayer } from '@/components/video/video-player';
import { ProfileMenu } from '@/components/ui/profile-menu';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '@/contexts/auth-context';
import { FirebaseTest } from '@/components/auth/firebase-test';
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const examplePrompts = [
  "Give me insights from this video",
  "What are the highlights of this video",
  "Explain this video like I am 5"
];

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  views: string;
  publishedAt: string;
  url: string;
}

const VideoCard = ({ video, onSelect }: { video: VideoInfo; onSelect: () => void }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-video relative">
        <img
          src={`https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-2">{video.title}</h2>
        <div className="flex items-center text-xs sm:text-sm text-gray-500 mb-2">
          <span>{video.views} views</span>
          <span className="mx-2">•</span>
          <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-4 line-clamp-3">{video.description}</p>
        <Button onClick={onSelect} className="w-full">
          Chat about this video
        </Button>
      </div>
    </div>
  );
};

const ChatInterface = ({ video, onClose }: { video: VideoInfo; onClose: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: video.url,
          prompt: input
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let assistantMessage = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantMessage;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col">
        <div className="p-3 sm:p-4 border-b flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-semibold truncate">Chat about: {video.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-2 sm:p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-2 sm:p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t">
          <div className="flex space-x-2 sm:space-x-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the video..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Home() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isChatActive, setIsChatActive] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const { toast } = useToast();
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [videoAnalysis, setVideoAnalysis] = useState<string | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle video URL from query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const videoId = searchParams.get('videoId');
    
    if (videoId) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        setUrl(youtubeUrl);
        handleUrlSubmit(youtubeUrl);
      } else {
        toast({
          title: "Invalid Video ID",
          description: "The provided video ID is not valid.",
          variant: "destructive"
        });
      }
    }
  }, []);

  // Add useEffect to handle connection status
  useEffect(() => {
    if (user) {
      setShowConnectionStatus(true);
      const timer = setTimeout(() => {
        setShowConnectionStatus(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Add this useEffect for auto-scrolling
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleUrlSubmit = async (inputUrl?: string) => {
    const urlToProcess = inputUrl || url;
    if (!urlToProcess) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: urlToProcess })
      });

      if (!response.ok) {
        throw new Error('Failed to process video');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Extract video ID from URL
      const videoId = urlToProcess.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      setVideoInfo({
        id: videoId,
        title: data.videoInfo.title,
        description: data.videoInfo.description,
        views: data.videoInfo.views,
        publishedAt: data.videoInfo.publishedAt,
        url: urlToProcess
      });

      toast({
        title: "Video processed successfully",
        description: "You can now chat about this video",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process video');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to process video',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setInputMessage('');

    try {
      setIsLoading(true);

      if (!currentVideoUrl) {
        throw new Error('No video URL provided');
      }

      // Make API call to analyze endpoint
      const response = await fetch(`${window.location.origin}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: currentVideoUrl,
          prompt: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to analyze video');
      }

      // Add assistant message to chat
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream available');

      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        // Update the last message in chat
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantMessage;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to process your request'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderMessage = (message: Message) => {
    // Split message content by code blocks
    const parts = message.content.split(/(```[\s\S]*?```)/g);
    
    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            // Extract language and code
            const [_, language, code] = part.match(/```(\w+)?\n([\s\S]*?)```/) || [];
            return (
              <SyntaxHighlighter
                key={index}
                language={language || 'text'}
                style={vscDarkPlus}
                className="rounded-lg !bg-gray-900 !p-4"
              >
                {code}
              </SyntaxHighlighter>
            );
          }
          return <p key={index}>{part}</p>;
        })}
      </div>
    );
  };

  // Add debug logging for button state
  const isSendButtonDisabled = isLoading || !url || !inputMessage;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f4f9]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b5cf6] mx-auto mb-4"></div>
          <p className="text-[#666666]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f4f9] relative font-['Inter',_sans-serif] text-base text-[#1a1a1a]">
      {/* Connection Status Toast */}
      {showConnectionStatus && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-2 border border-[#8b5cf6]">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-[#1a1a1a]">Connected</span>
            <button 
              onClick={() => setShowConnectionStatus(false)}
              className="ml-2 text-[#666666] hover:text-[#1a1a1a]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm py-3 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Image
              src="/logo.svg"
              alt="ChatPye Logo"
              width={32}
              height={32}
              className="mr-2"
            />
            <span className="text-[18px] font-bold text-black tracking-tight">ChatPye</span>
          </div>
          
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-sm text-[#666666] hidden sm:inline">{user.displayName}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg text-[#666666] hover:text-[#1a1a1a] border-[#a78bfa] hover:border-[#8b5cf6]"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg text-[#666666] hover:text-[#1a1a1a] border-[#a78bfa] hover:border-[#8b5cf6]"
                onClick={handleSignIn}
              >
                Sign in
              </Button>
              <Button 
                size="sm" 
                className="rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                onClick={handleSignIn}
              >
                Sign up
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10">
        {/* Search Bar */}
        <div className="w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm py-4 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="w-full flex items-center bg-white border border-gray-200 rounded-full px-4 py-2">
                <Search className="h-4 w-4 text-[#666666] mr-2" />
                <Input
                  type="text"
                  placeholder="Paste YouTube URL to start learning"
                  className="flex-1 border-0 focus-visible:ring-0 bg-transparent text-[#1a1a1a] placeholder:text-[#666666] select-text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
              </div>
              
              <Button 
                className="w-full sm:w-auto rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                onClick={() => handleUrlSubmit()}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Start Learning'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col lg:flex-row gap-6 relative z-10">
          {/* Video Player Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Video Player Card */}
            <Card className="overflow-hidden bg-white p-2 sm:p-4">
              <div className="aspect-video bg-black relative rounded-lg">
                {url ? (
                  <VideoPlayer src={url} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <h2 className="text-[18px] sm:text-[20px] font-medium text-black mb-2">Welcome to ChatPye</h2>
                    <p className="text-[14px] sm:text-[16px] text-[#666666]">Your AI-powered video learning companion</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Video Info */}
            {videoInfo && (
              <VideoCard
                video={videoInfo}
                onSelect={() => setShowChat(true)}
              />
            )}
          </div>

          {/* Chat Interface */}
          {showChat && videoInfo && (
            <div className="fixed inset-0 z-50 lg:relative lg:z-0">
              <ChatInterface
                video={videoInfo}
                onClose={() => setShowChat(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Firebase test component */}
      <FirebaseTest />

      <Toaster />
    </div>
  );
}

// Add type for Toaster props
interface ToasterProps {
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  toastOptions?: {
    className?: string;
    duration?: number;
    style?: React.CSSProperties;
  };
}
