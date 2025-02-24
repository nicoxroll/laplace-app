"use client";

import { useCallback, useState, useRef, useEffect } from 'react';
import { Bot, Code2, AlertCircle, GitPullRequest, Shield, LineChart, Bot as BotIcon } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { RepositoryList } from '@/components/repository-list';
import { CodeViewer } from '@/components/code-viewer';
import { IssuesSection } from '@/components/issues-section';
import type { Repository } from '@/types/repository';

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: 'code', name: 'Code', icon: Code2 },
  { id: 'issues', name: 'Issues', icon: AlertCircle },
  { id: 'pull-requests', name: 'Pull Requests', icon: GitPullRequest },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'insights', name: 'Insights', icon: LineChart },
  { id: 'agents', name: 'Agents', icon: BotIcon },
];

export function Header({ activeSection, onSectionChange }: HeaderProps) {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: '/' });
  }, []);

  // Handle clicking outside of dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0d1117] border-b border-[#30363d]">
      <div className="max-w-7xl mx-auto">
        {/* Top header with logo and user info */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold text-gray-200">Laplace</span>
          </div>
          
          <div className="flex items-center gap-4">
            {session?.user && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 hover:opacity-80 focus:outline-none"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-200">
                      {session.user.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {session.user.email}
                    </span>
                  </div>
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || ''}
                      className="w-8 h-8 rounded-full ring-2 ring-[#30363d]"
                    />
                  )}
                </button>
                
                {/* Dropdown menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 py-2 w-48 bg-[#161b22] rounded-lg shadow-xl border border-[#30363d] z-50">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#1c2128] flex items-center gap-2"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation sections */}
        <div className="px-4">
          <nav className="flex space-x-4 overflow-x-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`px-3 py-2 flex items-center gap-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'text-blue-400 bg-[#1c2128]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeSection, setActiveSection] = useState('code');

  const renderSection = () => {
    switch (activeSection) {
      case 'code':
        return selectedRepo && <CodeViewer repository={selectedRepo} />;
      case 'issues':
        return selectedRepo && <IssuesSection repository={selectedRepo} />;
      
      default:
        return null;
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
            selectedRepo={selectedRepo}
            onSelect={setSelectedRepo}
          />
        </div>
        <div className="w-2/3 overflow-auto">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}

