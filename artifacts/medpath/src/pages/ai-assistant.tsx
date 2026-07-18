import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot, User, Send, FileText, Loader2, Sparkles, History,
  Bookmark, BookmarkCheck, Copy, Check, Trash2, X, Clock, ChevronLeft
} from "lucide-react";
import { useAiChat } from "@workspace/api-client-react";
import type { ChatMessage } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SearchHistoryItem { id: number; query: string; type: string; createdAt: string }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Render AI structured response with bold section headers styled as clinical sections */
function StructuredResponse({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let key = 0;
  let bulletBuffer: string[] = [];

  function flushBullets() {
    if (bulletBuffer.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1 my-2 pl-1">
          {bulletBuffer.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="text-primary mt-1 shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushBullets(); elements.push(<div key={key++} className="h-1" />); continue; }

    // Bold section header: **Section Name**
    const headerMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (headerMatch) {
      flushBullets();
      const title = headerMatch[1];
      const isRedFlag = title.toLowerCase().includes("red flag");
      const isPearl = title.toLowerCase().includes("pearl");
      elements.push(
        <div key={key++} className={cn(
          "flex items-center gap-2 mt-4 mb-1 pb-1 border-b",
          isRedFlag ? "border-red-200" : isPearl ? "border-amber-200" : "border-primary/20"
        )}>
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            isRedFlag ? "text-red-600" : isPearl ? "text-amber-600" : "text-primary"
          )}>
            {title}
          </span>
        </div>
      );
      continue;
    }

    // Inline bold in text: **word**
    const hasBold = line.includes("**");
    if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("🚨") || line.startsWith("🔑") || line.startsWith("⚕️")) {
      const content = line.replace(/^[-•]\s*/, "");
      bulletBuffer.push(content);
      continue;
    }

    flushBullets();
    if (hasBold) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      elements.push(
        <p key={key++} className="text-sm text-gray-700 leading-relaxed my-0.5">
          {parts.map((part, i) =>
            i % 2 === 1
              ? <span key={i} className="font-semibold text-gray-900">{part}</span>
              : <span key={i}>{part}</span>
          )}
        </p>
      );
    } else {
      elements.push(
        <p key={key++} className="text-sm text-gray-700 leading-relaxed my-0.5">{line}</p>
      );
    }
  }
  flushBullets();
  return <div className="space-y-0.5">{elements}</div>;
}

export default function AiAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<(ChatMessage & { bookmarked?: boolean; copied?: boolean })[]>([{
    role: "assistant",
    content: "Hello Doctor. I'm your clinical AI assistant.\n\nAsk me about any clinical condition and I'll provide a fully structured response covering:\n**Definition** • **Causes** • **Risk Factors** • **Symptoms** • **Differential Diagnosis** • **History Questions** • **Physical Examination** • **Investigations** • **Management** • **Drug Treatment** • **Clinical Pearls** • **Red Flags** • **Patient Education**"
  }]);
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMutation = useAiChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load search history
  useEffect(() => {
    fetchHistory();
  }, []);

  function fetchHistory() {
    fetch("/api/search-history?type=ai", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSearchHistory(data); })
      .catch(() => {});
  }

  function recordSearch(query: string) {
    fetch("/api/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query, type: "ai" }),
    }).then(() => fetchHistory()).catch(() => {});
  }

  function clearHistory() {
    fetch("/api/search-history", { method: "DELETE", credentials: "include" })
      .then(() => setSearchHistory([]))
      .catch(() => {});
  }

  async function bookmarkResponse(idx: number) {
    const msg = messages[idx];
    if (!msg || msg.role !== "assistant") return;
    // Find the user message before this
    const userMsg = messages[idx - 1];
    const title = userMsg ? userMsg.content.slice(0, 80) : "AI Response";
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content: msg.content, category: "AI Chat", tags: ["ai", "clinical"] }),
      });
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, bookmarked: true } : m));
      toast({ title: "Saved to Notes", description: "AI response saved to your clinical notes." });
    } catch {
      toast({ title: "Error", description: "Could not save to notes.", variant: "destructive" });
    }
  }

  function copyResponse(content: string, idx: number) {
    navigator.clipboard.writeText(content).then(() => {
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, copied: true } : m));
      setTimeout(() => setMessages(prev => prev.map((m, i) => i === idx ? { ...m, copied: false } : m)), 2000);
    });
  }

  const handleSend = (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    recordSearch(text);

    chatMutation.mutate(
      { data: { message: userMsg.content, conversationHistory: messages as ChatMessage[] } },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        },
        onError: () => {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "I'm currently running in offline mode. Please ensure the API server is running for AI responses."
          }]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isPending = chatMutation.isPending;

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] flex gap-4 animate-[fadeIn_0.4s_ease-out] max-w-5xl mx-auto w-full">

      {/* History Sidebar — desktop always shown, mobile overlay */}
      {showHistory && (
        <div className="fixed inset-0 z-40 md:hidden bg-black/40" onClick={() => setShowHistory(false)} />
      )}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 z-50 md:z-auto flex-shrink-0 flex flex-col bg-white border-r md:border md:rounded-xl shadow-lg md:shadow-sm transition-all duration-300 overflow-hidden",
        showHistory ? "w-72" : "w-0 md:w-0",
        "md:top-auto md:h-full"
      )}>
        {showHistory && (
          <>
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Search History</span>
              </div>
              <div className="flex items-center gap-1">
                {searchHistory.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 rounded hover:bg-muted/50" title="Clear history">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {searchHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No recent searches</p>
                </div>
              ) : searchHistory.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setInput(item.query); setShowHistory(false); }}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-colors group"
                >
                  <p className="text-xs font-medium text-gray-800 line-clamp-2 group-hover:text-primary">{item.query}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(item.createdAt)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(v => !v)}
              className={cn(
                "p-2 rounded-lg border transition-colors",
                showHistory ? "bg-primary/10 border-primary/30 text-primary" : "border-muted text-muted-foreground hover:bg-muted/50"
              )}
              title="Search history"
            >
              <History className="w-4 h-4" />
            </button>
            <div className="p-2 bg-blue-100 rounded-lg text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">AI Clinical Assistant</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Structured clinical responses — 13-section format</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs hidden sm:flex gap-1 items-center">
            <Sparkles className="w-3 h-3 text-primary" /> MedPath AI
          </Badge>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-sm border-gray-200">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <div className={cn(
                  "max-w-[90%] sm:max-w-[85%] rounded-2xl shadow-sm",
                  msg.role === "user"
                    ? "px-4 py-2.5 bg-primary text-primary-foreground rounded-tr-sm text-sm"
                    : "px-4 py-3 bg-white border border-gray-100 rounded-tl-sm"
                )}>
                  {msg.role === "assistant" ? (
                    <>
                      <StructuredResponse content={msg.content} />
                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => copyResponse(msg.content, idx)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                          title="Copy response"
                        >
                          {(msg as any).copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          <span className="hidden sm:inline">{(msg as any).copied ? "Copied" : "Copy"}</span>
                        </button>
                        {idx > 0 && (
                          <button
                            onClick={() => bookmarkResponse(idx)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                            title="Save to notes"
                            disabled={(msg as any).bookmarked}
                          >
                            {(msg as any).bookmarked
                              ? <BookmarkCheck className="w-3 h-3 text-primary" />
                              : <Bookmark className="w-3 h-3" />}
                            <span className="hidden sm:inline">{(msg as any).bookmarked ? "Saved" : "Save to Notes"}</span>
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gray-100 border flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>
            ))}

            {isPending && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-gray-500">Generating structured clinical response…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 sm:p-4 bg-gray-50 border-t">
            <div className="flex gap-2 sm:gap-3">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a disease, drug, or clinical scenario… (e.g. 'Type 2 Diabetes Mellitus')"
                className="min-h-[52px] max-h-[160px] resize-none bg-white text-sm shadow-sm focus-visible:ring-primary/30"
              />
              <div className="flex flex-col justify-end">
                <Button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isPending}
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0 bg-primary hover:bg-primary/90 shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap justify-center mt-2 gap-2 sm:gap-4 text-xs text-gray-500">
              {["Hypertension", "Pneumonia", "Acute MI", "Iron Deficiency Anemia"].map(topic => (
                <button
                  key={topic}
                  onClick={() => handleSend(topic)}
                  className="flex items-center gap-1 hover:text-primary hover:underline transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> {topic}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
