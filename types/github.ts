export interface GitHubSecurityAlert {
  number?: number;
  id?: number;
  tool?: {
    name: string;
  };
  rule?: {
    severity: "critical" | "high" | "moderate" | "low";
    description: string;
  };
  securityVulnerability?: {
    package?: {
      name: string;
    };
  };
  severity?: string;
  title?: string;
  message?: string;
  most_recent_instance?: {
    message: string;
  };
  description?: string;
  created_at: string;
  state: string;
}
