'use client';

import ChatInterface from '@/components/ChatInterface';
import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout title="AI Teaching Assistant - Student Chat">
      <ChatInterface />
    </Layout>
  );
}
