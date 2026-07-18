import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Bot, User, Send, FileText, Loader2, Sparkles } from "lucide-react";
import { useAiChat } from "@workspace/api-client-react";
import { ChatMessage, ChatMessageRole } from "@workspace/api-client-react/src/generated/api.schemas";

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hello Doctor. I'm your clinical AI assistant. How can I help you with diagnoses, drug information, or case studies today?"
  }]);
  const [input, setInput] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useAiChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");

    chatMutation.mutate(
      { 
        data: { 
          message: userMsg.content,
          conversationHistory: messages
        } 
      },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        },
        onError: () => {
          // Mock fallback for when backend isn't connected
          setTimeout(() => {
            setMessages(prev => [...prev, { 
              role: "assistant", 
              content: "I'm currently running in offline mode. In a fully connected environment, I would provide a detailed clinical analysis for your query based on current medical guidelines." 
            }]);
          }, 1000);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isPending = chatMutation.isPending;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2 bg-blue-100 rounded-lg text-primary">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">AI Clinical Assistant</h1>
          <p className="text-sm text-gray-500">Ask questions, discuss cases, get differential diagnoses</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-gray-200">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}
              
              <div 
                className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-white border border-gray-100 rounded-tl-sm text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>
          ))}
          {isPending && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 rounded-tl-sm text-gray-800 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-gray-500">Analyzing clinical data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex gap-4 max-w-4xl mx-auto">
            <Textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a patient case, ask about a drug interaction, or request a differential diagnosis..."
              className="min-h-[60px] max-h-[200px] resize-y bg-white text-base shadow-sm focus-visible:ring-primary/30"
            />
            <div className="flex flex-col justify-end">
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isPending}
                size="icon"
                className="h-12 w-12 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-white shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex justify-center mt-3 gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Differential Diagnosis</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Management Plans</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
