import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  hasVideo: boolean;
}

export function ChatInput({ onSendMessage, isLoading, hasVideo }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (hasVideo && !isLoading) {
      toast({
        title: "Video processed!",
        description: "You can now ask questions about the video.",
      });
    }
  }, [hasVideo, isLoading, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={hasVideo ? "Ask a question about the video..." : "Enter a YouTube video URL..."}
        disabled={isLoading}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || isLoading}
        className="min-w-[120px]"
      >
        {isLoading ? "Processing..." : hasVideo ? "Start Learning" : "Process Video"}
      </Button>
    </form>
  );
} 