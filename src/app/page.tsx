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
          onError={(e) => {
            // Fallback to hqdefault if maxresdefault fails
            const target = e.target as HTMLImageElement;
            target.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
          }}
        />
      </div>
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-2 line-clamp-2">{video.title}</h2>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <span>{video.views}</span>
          <span className="mx-2">•</span>
          <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{video.description}</p>
        <Button 
          onClick={onSelect} 
          className="w-full bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
        >
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
    setHasVideo(false);
    setCurrentVideoUrl('');

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

      // Ensure all required fields are present
      const videoInfo = {
        id: videoId,
        title: data.videoInfo.title || 'Untitled Video',
        description: data.videoInfo.description || 'No description available',
        views: data.videoInfo.views || '0 views',
        publishedAt: data.videoInfo.publishedAt || new Date().toISOString(),
        url: urlToProcess
      };

      setVideoInfo(videoInfo);
      setHasVideo(true);
      setCurrentVideoUrl(urlToProcess);
      setShowChat(true);

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
    if (!message.trim() || !hasVideo || !currentVideoUrl) return;

    // Add user message to chat
    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Make API call to analyze endpoint
      const response = await fetch('/api/analyze', {
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

          {/* Sidebar Chat - Hidden on mobile */}
          <div className="hidden lg:block w-[420px] shrink-0">
            <Card className="h-full flex flex-col bg-white p-4">
              <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#666666]">Gemini</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]">
                      <span className="mr-1">+</span> New Chat
                    </Button>
                  </div>
                  
                  <h1 className="text-2xl font-semibold text-center font-['Space_Grotesk'] text-[#1a1a1a] tracking-tight">ChatPye</h1>
                  <p className="text-center text-sm text-[#666666] mt-1">Your Personal AI Tutor for Video Learning</p>
                </div>

                <div className="px-6 py-4">
                  <div className="grid grid-cols-4 gap-1">
                    <Button variant="outline" className="rounded-l-lg rounded-r-none h-auto py-3 flex flex-col items-center gap-2 hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]">
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-xs">Chat</span>
                    </Button>
                    <Button variant="outline" className="rounded-none h-auto py-3 flex flex-col items-center gap-2 hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]">
                      <History className="h-4 w-4" />
                      <span className="text-xs">Timeline</span>
                    </Button>
                    <Button variant="outline" className="rounded-none h-auto py-3 flex flex-col items-center gap-2 hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]">
                      <FileCog className="h-4 w-4" />
                      <span className="text-xs">Copy</span>
                    </Button>
                    <Button variant="outline" className="rounded-l-none rounded-r-lg h-auto py-3 flex flex-col items-center gap-2 hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-xs">Notes</span>
                    </Button>
                  </div>
                </div>

                <TabsContent value="chat" className="flex-1 flex flex-col">
                  {/* Description */}
                  <div className="p-6 text-center text-[#666666] text-sm">
                    <p>An AI Tutor that helps you get contextual, accurate answers from videos in realtime. You can ask specific questions, copy code or text on screen and get accurate answers.</p>
                  </div>

                  {/* Example section - always show template prompts */}
                  <div className="px-6 py-4">
                    <p className="text-sm text-[#666666] mb-3">Try an example:</p>
                    
                    <div className="space-y-3">
                      {examplePrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 rounded-lg hover:bg-gray-100 border-[#a78bfa] hover:border-[#8b5cf6]"
                          onClick={() => handleTemplateClick(prompt)}
                        >
                          <span className="text-[#666666] mr-2">→</span>
                          <span className="truncate">{prompt}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={chatContainerRef}>
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-[#8b5cf6] text-white'
                                : 'bg-gray-100 text-[#1a1a1a]'
                            }`}
                          >
                            {renderMessage(message)}
                            {isLoading && index === messages.length - 1 && message.role === 'assistant' && (
                              <div className="flex space-x-1 mt-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="mt-auto border-t border-gray-200 p-6">
                    <div className="flex items-center gap-2">
                      <Input 
                        type="text" 
                        placeholder={hasVideo ? "Ask a question about the video..." : "Process a video first to start chatting"}
                        className="flex-1 rounded-lg bg-white border-gray-200 text-[#1a1a1a] placeholder:text-[#666666] select-text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && inputMessage.trim() && hasVideo) {
                            handleSendMessage(inputMessage);
                          }
                        }}
                        disabled={!hasVideo || isLoading}
                      />
                      <Button 
                        size="icon" 
                        className="rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] disabled:opacity-50"
                        onClick={() => handleSendMessage(inputMessage)}
                        disabled={!hasVideo || isLoading || !inputMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {!hasVideo && (
                      <p className="text-sm text-[#666666] mt-2 text-center">
                        Enter a YouTube URL in the search bar above to start chatting
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="flex-1 p-6">
                  <div className="flex items-center justify-center h-full text-[#666666]">
                    <Clock className="h-8 w-8 mr-2" />
                    Timeline coming soon...
                  </div>
                </TabsContent>

                <TabsContent value="copy" className="flex-1 p-6">
                  <div className="flex items-center justify-center h-full text-[#666666]">
                    <Copy className="h-8 w-8 mr-2" />
                    Copy feature coming soon...
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="flex-1 p-6">
                  <div className="flex items-center justify-center h-full text-[#666666]">
                    <FileText className="h-8 w-8 mr-2" />
                    Notes feature coming soon...
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Mobile Chat Interface - Only shown on mobile */}
          {showChat && videoInfo && (
            <div className="lg:hidden fixed inset-0 z-50">
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
