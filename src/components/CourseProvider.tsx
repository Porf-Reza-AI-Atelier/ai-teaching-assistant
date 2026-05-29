'use client';

import { createContext, useContext, useState, useEffect } from 'react';

// Unified Course type: superset of both Course (ChatInterface) and CourseData (CourseDetailsPanel)
export interface Course {
  course_id: string;
  course_name: string;
  total_lessons: number;
  total_documents: number;
  lessons?: { [key: string]: any };
}

interface CourseContextType {
  courses: Course[];
  isLoading: boolean;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

// Single fetch lives here for both ChatInterface and CourseDetailsPanel consume via useCourses()
export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:8000/courses');
        if (response.ok) {
          const data = await response.json();
          setCourses(data.courses || []);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []); // runs once on mount

  return (
    <CourseContext.Provider value={{ courses, isLoading }}>
      {children}
    </CourseContext.Provider>
  );
}

// Convenience hook for throws if consumed outside a CourseProvider
export function useCourses(): CourseContextType {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
}
