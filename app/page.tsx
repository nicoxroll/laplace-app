"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { CodeViewer } from '@/components/code-viewer';
import { IssuesSection } from '@/components/issues-section';
import { PullRequestsSection } from '@/components/pull-requests-section';
import { InsightsSection } from '@/components/insights-section';
import { SecuritySection } from '@/components/security-section';
import { AgentsSection } from '@/components/agents-section';
import { RepositoryList } from '@/components/repository-list';
import { FloatingChat } from '@/components/floating-chat';
import { LoadingScreen } from '@/components/loading-screen';
import type { Repository } from '@/types/repository';

const NoRepoSelectedMessage = () => (
  <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
    <div className="text-center text-gray-400">
      Please select a repository to view this section
    </div>
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/api/auth/signin');
    },
  });
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeSection, setActiveSection] = useState('code');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (status === 'loading') {
        console.log('Session loading is taking longer than expected...');
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [status]);

  const renderSection = () => {
    switch (activeSection) {
      case 'code':
        return selectedRepo ? (
          <CodeViewer repository={selectedRepo} />
        ) : (
          <NoRepoSelectedMessage />
        );
      case 'issues':
        return selectedRepo ? (
          <IssuesSection repository={selectedRepo} />
        ) : (
          <NoRepoSelectedMessage />
        );
      case 'pull-requests':
        return selectedRepo ? (
          <PullRequestsSection repository={selectedRepo} />
        ) : (
          <NoRepoSelectedMessage />
        );
      case 'security':
        return selectedRepo ? (
          <SecuritySection repository={selectedRepo} />
        ) : (
          <NoRepoSelectedMessage />
        );
      case 'insights':
        return selectedRepo ? (
          <InsightsSection repository={selectedRepo} />
        ) : (
          <NoRepoSelectedMessage />
        );
      case 'agents':
        return <AgentsSection />;
      default:
        return selectedRepo ? (
          <CodeViewer repository={selectedRepo} />
        ) : (
          <NoRepoSelectedMessage />
        );
    }
  };

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0d1117]">
      <Header 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      <div className="flex gap-4 p-4 flex-1 overflow-hidden">
        <div className="w-1/3 overflow-auto">
          <RepositoryList 
            onSelect={setSelectedRepo}
            selectedRepo={selectedRepo}
          />
        </div>
        <div className="w-2/3 overflow-auto">
          {renderSection()}
        </div>
      </div>

      {session?.user && (
        <FloatingChat
          apiUrl={process.env.NEXT_PUBLIC_API_URL || ''}
          repoData={{
            selectedRepo: selectedRepo?.full_name || null,
            currentPath: '',
            fileContent: [],
            repoStructure: [],
          }}
          githubToken={session.accessToken || ''}
        />
      )}
    </div>
  );
}
