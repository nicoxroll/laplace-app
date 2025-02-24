"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/header';
import { CodeViewer } from '@/components/code-viewer';
import { IssuesSection } from '@/components/issues-section';
import { PullRequestsSection } from '@/components/pull-requests-section';
import { InsightsSection } from '@/components/insights-section';
import { RepositoryList } from '@/components/repository-list';
import { FloatingChat } from '@/components/floating-chat';
import type { Repository } from '@/types/repository';

export default function HomePage() {
  const { data: session } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeSection, setActiveSection] = useState('code');

  const renderSection = () => {
    if (!selectedRepo) return null;

    switch (activeSection) {
      case 'code':
        return <CodeViewer repository={selectedRepo} />;
      case 'issues':
        return <IssuesSection repository={selectedRepo} />;
      case 'pull-requests':
        return <PullRequestsSection repository={selectedRepo} />;
      case 'insights':
        return <InsightsSection repository={selectedRepo} />;
      case 'security':
      case 'agents':
        return (
          <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
            <div className="text-center text-gray-400">
              {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} section coming soon...
            </div>
          </div>
        );
      default:
        return <CodeViewer repository={selectedRepo} />;
    }
  };

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
