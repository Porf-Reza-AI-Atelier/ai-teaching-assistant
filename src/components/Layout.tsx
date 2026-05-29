'use client';

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "@/components/Sidebar";
import CourseDetailsPanel from "@/components/CourseDetailsPanel";
import { X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showRightPanel?: boolean;
}

export default function Layout({ 
  children, 
  title = "AI Teaching Assistant",
  showRightPanel = true 
}: LayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center justify-between flex-shrink-0">
            <h1 className="text-sm font-medium">{title}</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                Save conversation
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>
          
          {/* Content Area */}
          <div className="flex-1 overflow-hidden bg-background">
            {children}
          </div>
        </div>

        {/* Right Panel */}
        {showRightPanel && (
          <CourseDetailsPanel />
        )}
      </div>
    </div>
  );
} 