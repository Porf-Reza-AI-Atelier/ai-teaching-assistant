'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Target, Clock, Lightbulb, ChevronRight } from 'lucide-react';

interface CourseData {
  course_id: string;
  course_name: string;
  total_lessons: number;
  total_documents: number;
  lessons?: { [key: string]: any };
}

const suggestedQuestions = [
  "What is LangChain and how does it work?",
  "Explain the key concepts in AI for business",
  "What are the ethics considerations in AI?",
  "How do large language models function?",
  "What are the main topics in this course?",
  "Explain Gemini multimodal models"
];

const studyTopics = [
  "LangChain Development",
  "Large Language Models",
  "AI Ethics & Considerations", 
  "Business Applications",
  "Gemini Models",
  "Smart Contracts"
];

export default function CourseDetailsPanel() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [activeTab, setActiveTab] = useState<'topics' | 'suggestions' | 'progress'>('topics');

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:8000/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const currentCourse = courses.find(c => c.course_id === 'prof_reza_courses') || courses[0];

  return (
    <div className="w-80 border-l bg-muted/20 flex flex-col overflow-hidden">
      <div className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center flex-shrink-0">
        <h2 className="font-medium">Study Guide</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="flex gap-2 border-b pb-4 mb-4">
            <Button 
              variant={activeTab === 'topics' ? "secondary" : "ghost"} 
              size="sm" 
              className="rounded-full text-xs"
              onClick={() => setActiveTab('topics')}
            >
              Topics
            </Button>
            <Button 
              variant={activeTab === 'suggestions' ? "secondary" : "ghost"} 
              size="sm" 
              className="rounded-full text-xs"
              onClick={() => setActiveTab('suggestions')}
            >
              Study Help
            </Button>
          </div>
          
          <div className="space-y-4">
            {activeTab === 'topics' && (
              <>
                {/* Current Course */}
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Current Course
                    </div>
                    <div className="bg-primary/10 rounded p-3">
                      <div className="font-medium text-sm mb-1">
                        {currentCourse?.course_name || 'Prof. Reza Courses'}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {currentCourse?.total_documents || 5} materials • 568 searchable sections
                      </div>
                    </div>
                  </div>
                </div>

                {/* Study Topics */}
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Key Topics
                    </div>
                    <div className="space-y-2">
                      {studyTopics.map((topic, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-xs">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'suggestions' && (
              <>
                {/* Quick Study Tips */}
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Suggested Questions
                    </div>
                    <div className="text-muted-foreground text-xs mb-3">
                      Try asking these questions to explore the course content:
                    </div>
                    <div className="space-y-2">
                      {suggestedQuestions.map((question, index) => (
                        <div key={index} className="bg-muted/50 rounded p-2 hover:bg-muted/70 cursor-pointer">
                          <div className="text-xs text-foreground">"{question}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Study Tips */}
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Study Tips
                    </div>
                    <div className="text-muted-foreground text-xs space-y-2">
                      <div className="bg-muted/50 rounded p-2">
                        💡 Ask specific questions for better answers
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        📚 Reference specific lessons or topics
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        🔍 Click "Sources" to see where answers come from
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* How It Works */}
            <div className="text-sm pt-4 border-t">
              <div className="font-medium mb-2">🔍 How It Works</div>
              <div className="text-muted-foreground text-xs space-y-2">
                <div className="bg-muted/50 rounded p-2">
                  <strong>{currentCourse?.total_documents || 5} documents</strong> uploaded by professor
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <strong>568 searchable sections</strong> for precise answers
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <strong>Top 5 sources</strong> shown per question
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
