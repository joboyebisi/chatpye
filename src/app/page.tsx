"use client";

import { useState, useEffect } from 'react';
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const examplePrompts = [
  "Give me insights from this video",
  "What are the highlights of this video",
  "Explain this video like I am 5"
];

export default function Home() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<{
    title: string;
    description: string;
    views: string;
    publishedAt: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isChatActive, setIsChatActive] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const { toast } = useToast();

  // Add useEffect to handle videoId parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const videoId = searchParams.get('videoId');
    
    if (videoId) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      setUrl(youtubeUrl);
      handleUrlSubmit(youtubeUrl);
    }
  }, []);

  const handleUrlSubmit = async (inputUrl?: string) => {
    const urlToProcess = inputUrl || url;
    if (!urlToProcess) return;
    
    // Add URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(urlToProcess)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // First, get video info
      const response = await fetch('/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl: urlToProcess }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to process video');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.details || data.error);
      }

      setVideoInfo(data);
      setIsChatActive(true);
      setMessages([]); // Clear previous messages when new video is loaded
      setHasVideo(true);
      setCurrentVideoUrl(urlToProcess);
      toast({
        title: "Video processed!",
        description: "You can now ask questions about the video.",
      });
    } catch (error) {
      console.error('Error getting video info:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process video. Please try again.",
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
      // Show loading state
      setIsLoading(true);

      // Get the YouTube URL from the current video URL
      if (!currentVideoUrl) {
        throw new Error('No video URL provided. Please enter a YouTube URL first.');
      }

      // Make API request
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
        throw new Error(errorData.error || 'Failed to analyze video');
      }

      // Create a new message for the assistant's response
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
      };

      // Add the message to the chat
      setMessages(prev => [...prev, assistantMessage]);

      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const text = new TextDecoder().decode(value);
        
        // Update the assistant's message
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content += text;
          }
          return newMessages;
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      
      // Show error toast
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze video',
        variant: 'destructive',
      });

      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message || 'Failed to analyze video'}. Please try again or try a different video.`
      }]);
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
      {/* Navigation Bar */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm py-3 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-[18px] font-bold text-black tracking-tight">ChatPye</span>
          </div>
          
          {authLoading ? (
            <div className="h-8 w-20 bg-gray-200 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[#666666]">{user.displayName}</span>
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
            <div className="flex items-center space-x-4">
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-lg hover:bg-gray-100">
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-full px-4 py-2">
                <Search className="h-4 w-4 text-[#666666] mr-2" />
                <Input
                  type="text"
                  placeholder="Paste YouTube URL to start learning"
                  className="flex-1 border-0 focus-visible:ring-0 bg-transparent text-[#1a1a1a] placeholder:text-[#666666]"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
              </div>
              
              <Button 
                className="shrink-0 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                onClick={() => handleUrlSubmit()}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Start Learning'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex gap-6 relative z-10">
          {/* Video Player Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Video Player Card */}
            <Card className="overflow-hidden bg-white p-4">
              <div className="aspect-video bg-black relative rounded-lg">
                {url ? (
                  <VideoPlayer src={url} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <h2 className="text-[20px] font-medium text-black mb-2">Welcome to ChatPye</h2>
                    <p className="text-[16px] text-[#666666]">Your AI-powered video learning companion</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Video Info Card */}
            {videoInfo && (
              <Card className="bg-white p-6">
                <h2 className="text-lg font-medium font-['Clarendon_Blk_BT'] text-[#1a1a1a] mb-4">
                  {videoInfo.title}
                </h2>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex mb-2">
                    <span className="text-[#666666] font-medium">
                      {videoInfo.views} views - {videoInfo.publishedAt}
                    </span>
                  </div>
                  <p className="text-sm text-[#666666] line-clamp-3">
                    {videoInfo.description}
                  </p>
                </div>
              </Card>
            )}

            {/* Recommended Videos Card */}
            {videoInfo && (
              <Card className="bg-white p-6">
                <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">Recommended Videos</h3>
                <div className="space-y-4">
                  {/* Placeholder for recommended videos */}
                  <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="w-40 h-24 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#1a1a1a] mb-1">Loading recommendations...</h4>
                      <p className="text-sm text-[#666666]">Coming soon</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
          
          {/* Chat Interface Column */}
          <div className="w-[420px] shrink-0">
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
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col-reverse">
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
                            {message.isStreaming ? (
                              <div className="space-y-2">
                                {renderMessage({ ...message, content: currentStreamingMessage })}
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                                </div>
                              </div>
                            ) : (
                              renderMessage(message)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="mt-auto border-t border-gray-200 p-6">
                    <div className="flex items-center gap-2">
                      <Input 
                        type="text" 
                        placeholder="Chat with video..."
                        className="flex-1 rounded-lg bg-white border-gray-200 text-[#1a1a1a] placeholder:text-[#666666]"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && inputMessage.trim() && url) {
                            handleSendMessage(inputMessage);
                          }
                        }}
                        disabled={isLoading}
                      />
                      <Button 
                        size="icon" 
                        className="rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
                        onClick={() => handleSendMessage(inputMessage)}
                        disabled={isSendButtonDisabled}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
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
        </div>
      </div>

      {/* Add Firebase test component */}
      <FirebaseTest />

      <Toaster />
    </div>
  );
}
