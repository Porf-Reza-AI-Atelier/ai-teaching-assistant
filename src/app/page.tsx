'use client';

import ChatInterface from '@/components/ChatInterface';
import Layout from '@/components/Layout';
import { CourseProvider } from '@/components/CourseProvider';

export default function Home() {
  return (
    <CourseProvider>
      <Layout title="AI Teaching Assistant - Student Chat">
        <ChatInterface />
      </Layout>
    </CourseProvider>
  );
}
