'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, History, X, Menu, Plus, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Source {
  filename: string;
  confidence: number;
  content_preview: string;
}

interface Message {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: string;
  sources?: Source[];
  responseTime?: number;
}

interface Course {
  course_id: string;
  course_name: string;
  total_lessons: number;
  total_documents: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: "agent",
      content: "Hello! I'm your AI Teaching Assistant. I have access to all your course materials and can help you understand concepts, explain topics, and answer questions. What would you like to learn about today?",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<{ [key: string]: boolean }>({});
  const [selectedCourse, setSelectedCourse] = useState('');
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('current');

  // Load conversation from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-chat-messages');
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    localStorage.setItem('ai-chat-messages', JSON.stringify(messages));
  }, [messages]);

  // Load available courses
  useEffect(() => {
    fetchAvailableCourses();
  }, []);

  // Load chat history
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = () => {
    try {
      const stored = localStorage.getItem('chat-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setChatHistory(parsed);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const fetchAvailableCourses = async () => {
    setIsLoadingCourses(true);
    try {
      const response = await fetch('http://localhost:8000/courses');
      if (response.ok) {
        const data = await response.json();
        const courses = data.courses || [];
        setAvailableCourses(courses);
        // Auto-select the first available course if none is selected
        if (courses.length > 0) {
          setSelectedCourse(prev => prev || courses[0].course_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    const questionToSend = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const startTime = Date.now();
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionToSend,
          course_id: selectedCourse
        }),
      });

      if (!response.ok) {
        let detail = `Server error (${response.status})`;
        try {
          const errBody = await response.json();
          const raw = errBody.detail || errBody.message;
          detail = typeof raw === 'string'
            ? raw
            : Array.isArray(raw)
              ? raw.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
              : JSON.stringify(raw);
        } catch (_) {}
        throw new Error(detail);
      }

      const data = await response.json();
      const endTime = Date.now();
      const responseTime = (endTime - startTime) / 1000;

      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        role: 'agent',
        content: data.answer,
        timestamp: new Date().toLocaleTimeString(),
        sources: data.sources,
        responseTime: responseTime
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';
      const errorDetail = error instanceof Error ? error.message : 'Unknown error';
      const content = isNetworkError
        ? "Could not reach the backend server. Make sure it's running on localhost:8000."
        : `Query failed: ${errorDetail}`;
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: 'agent',
        content,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const loadChatFromHistory = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      // Save current chat before switching
      if (messages.length > 1) { // More than just welcome message
        saveToHistory(messages);
      }
      
      // Load selected chat
      const convertedMessages = chat.messages.map((m: any) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'agent' : m.role,
        content: m.content,
        timestamp: m.timestamp,
        sources: m.sources
      }));
      setMessages(convertedMessages);
      setCurrentChatId(chatId);
      setShowHistorySidebar(false);
    }
  };

  const startNewChat = () => {
    // Save current chat before starting new one
    if (messages.length > 1) {
      saveToHistory(messages);
    }
    
    setMessages([{
      id: '1',
      role: "agent",
      content: "Hello! I'm your AI Teaching Assistant. I have access to all your course materials and can help you understand concepts, explain topics, and answer questions. What would you like to learn about today?",
      timestamp: new Date().toLocaleTimeString()
    }]);
    setCurrentChatId('current');
    setExpandedSources({});
    setShowHistorySidebar(false);
  };

  const deleteChatFromHistory = (chatId: string) => {
    const updated = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updated);
    localStorage.setItem('chat-history', JSON.stringify(updated));
    
    if (currentChatId === chatId) {
      startNewChat();
    }
  };

  const saveToHistory = (messageList: Message[]) => {
    // Only save if there are user messages (more than just the welcome message)
    const userMessages = messageList.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;

    // Generate a title from the first user message
    const firstUserMessage = userMessages[0].content;
    const title = firstUserMessage.length > 50 
      ? firstUserMessage.substring(0, 47) + '...'
      : firstUserMessage;

    // Get the current course name
    const currentCourse = availableCourses.find(c => c.course_id === selectedCourse);
    const courseName = currentCourse ? currentCourse.course_name : selectedCourse;

    // Create chat session object
    const chatSession = {
      id: Date.now().toString(),
      title: title,
      course: courseName,
      timestamp: new Date().toISOString(),
      messages: messageList.map(m => ({
        id: m.id,
        content: m.content,
        role: m.role === 'agent' ? 'assistant' : 'user',
        timestamp: m.timestamp,
        sources: m.sources
      }))
    };

    // Load existing history and add new session
    try {
      const existingHistory = JSON.parse(localStorage.getItem('chat-history') || '[]');
      const updatedHistory = [chatSession, ...existingHistory];
      localStorage.setItem('chat-history', JSON.stringify(updatedHistory));
      setChatHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to save to chat history:', error);
    }
  };

  const clearConversation = () => {
    startNewChat();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-full flex">
      {/* Chat History Sidebar */}
      {showHistorySidebar && (
        <div className="w-80 border-r bg-muted/30 dark:bg-muted/10 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Chat History</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistorySidebar(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-b">
            <Button
              onClick={startNewChat}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {/* Chat History List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {chatHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No chat history yet</p>
                </div>
              ) : (
                chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                      currentChatId === chat.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => loadChatFromHistory(chat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate mb-1">
                          {chat.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(chat.timestamp)}</span>
                          <span>•</span>
                          <span>{chat.messages.length} messages</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatFromHistory(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistorySidebar(!showHistorySidebar)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={startNewChat}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex gap-3 max-w-[70%]",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                {/* Avatar */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center",
                  message.role === "agent" 
                    ? "bg-primary" 
                    : "bg-secondary"
                )}>
                  <span className={cn(
                    "text-xs font-medium",
                    message.role === "agent" 
                      ? "text-primary-foreground" 
                      : "text-secondary-foreground"
                  )}>
                    {message.role === "agent" ? "AI" : "You"}
                  </span>
                </div>

                {/* Message Content */}
                <div className="space-y-2 flex-1">
                  <div className={cn(
                    "flex items-center gap-2",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}>
                    <span className="text-sm font-medium">
                      {message.role === "agent" ? "AI Teaching Assistant" : "You"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {message.timestamp}
                    </span>
                    {message.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        • {message.responseTime.toFixed(2)}s
                      </span>
                    )}
                  </div>

                  <div className={cn(
                    "p-3 rounded-lg",
                    message.role === "agent" 
                      ? "bg-muted/50" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Sources Toggle - only for AI messages */}
                  {message.role === "agent" && message.sources && message.sources.length > 0 && (
                    <div className="space-y-2">
                      <button
                        onClick={() => toggleSources(message.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedSources[message.id] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Sources ({message.sources.length})</span>
                      </button>

                      {expandedSources[message.id] && (
                        <div className="bg-muted/30 rounded-lg p-3 border">
                          <div className="space-y-2">
                            {message.sources.map((source, index) => (
                              <div key={index} className="text-xs bg-background rounded p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium">📄 {source.filename}</span>
                                  <span className="text-muted-foreground">
                                    {(() => {
                                      // Convert vector similarity scores to readable confidence
                                      const confidence = Math.max(0, Math.min(100, 100 - Math.abs(source.confidence * 10)));
                                      return `${Math.round(confidence)}% relevant`;
                                    })()}
                                  </span>
                                </div>
                                {source.content_preview && (
                                  <p className="text-muted-foreground italic">
                                    "{source.content_preview.slice(0, 100)}..."
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons - only for AI messages */}
                  {message.role === "agent" && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[70%]">
                <div className="h-8 w-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs text-primary-foreground font-medium">AI</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">AI Teaching Assistant</span>
                    <span className="text-sm text-muted-foreground">typing...</span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </ScrollArea>
      
        {/* Input Area */}
        <div className="border-t bg-background flex-shrink-0">
          <div className="p-4 max-w-4xl mx-auto">
            <div className="flex gap-2 mb-2 items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearConversation}
                className="text-xs gap-2"
              >
                <Plus className="h-3 w-3" />
                New Chat
              </Button>
              
              {/* Course Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Course:</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="text-xs bg-background border border-border rounded px-2 py-1"
                  disabled={isLoadingCourses}
                >
                  {availableCourses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_name} ({course.total_documents} materials)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask me about concepts, definitions, or any course topics..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-8"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}