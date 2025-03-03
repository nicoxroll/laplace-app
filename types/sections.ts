import { LoadingState } from "./common";
import { User } from "./user";

// Tipos para Pull Requests
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  created_at: string;
  updated_at: string;
  html_url: string;
  user: User;
  base: {
    ref: string;
    sha: string;
    label: string;
  };
  head: {
    ref: string;
    sha: string;
    label: string;
  };
  draft?: boolean;
  mergeable?: boolean;
  comments: number;
  review_comments: number;
}

// Tipos para Issues
export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  html_url: string;
  user: User | null;
  labels: Label[];
  comments: number;
  assignees: User[];
  milestone?: {
    id: number;
    title: string;
    due_on?: string;
  };
}

// Tipos para Security
export interface SecurityVulnerability {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affected_file: string;
  line_number?: number;
  fix_suggestion?: string;
  created_at: string;
  status: "open" | "fixed" | "dismissed";
}

export interface SecurityScan {
  id: string;
  status: LoadingState;
  started_at: string;
  completed_at?: string;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Tipos para Insights
export interface InsightData {
  commits_timeline: Array<{
    date: string;
    count: number;
  }>;
  language_stats: Record<string, number>;
  contributor_stats: Array<{
    user: User;
    commits: number;
    additions: number;
    deletions: number;
  }>;
  activity_summary: {
    total_commits: number;
    total_prs: number;
    total_issues: number;
    active_days: number;
  };
}

// Tipos para Agents
export interface Agent {
  id: string;
  name: string;
  type: "analysis" | "security" | "documentation" | "optimization";
  status: "active" | "inactive" | "busy" | "error";
  capabilities: string[];
  last_run?: string;
  current_task?: string;
}

export interface AgentTask {
  id: string;
  agent_id: string;
  type: string;
  status: LoadingState;
  progress: number;
  result?: any;
  error?: string;
  started_at: string;
  completed_at?: string;
}

// Tipos para Knowledge
export interface KnowledgeItem {
  id: string;
  name: string;
  description: string;
  size: string;
  type: string;
  created_at: string;
  updated_at?: string;
}
