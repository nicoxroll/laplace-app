"use client";

import { Repository } from "@/types/repository";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  BarChart2,
  BookOpen,
  Bot,
  CircleSlash,
  Code,
  GitPullRequest,
  Shield,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { AgentsSection } from "./agents-section";
import { CodeSection } from "./code-section";
import { InsightsSection } from "./insights-section";
import { IssuesSection } from "./issues-section";
import { PullRequestsSection } from "./pull-requests-section";
import { RepositoryList } from "./repository-list";
import { SecuritySection } from "./security-section";

export function Header({
  activeSection,
  onSectionChange,
  showSidebar,
  onToggleSidebar,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
}) {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const sections = [
    { id: "code", icon: Code, label: "Code" },
    { id: "pull-requests", icon: GitPullRequest, label: "Pull Requests" },
    { id: "issues", icon: CircleSlash, label: "Issues" },
    { id: "insights", icon: BarChart2, label: "Insights" },
    { id: "security", icon: Shield, label: "Security" },
    { id: "agents", icon: Bot, label: "Agents" },
  ];

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <IconButton onClick={onToggleSidebar} sx={{ color: "text.secondary" }}>
          <BookOpen className="h-6 w-6 text-blue-400" />
        </IconButton>
        <Box sx={{ display: "flex", gap: 1 }}>
          {sections.map((section) => (
            <Button
              key={section.id}
              startIcon={<section.icon className="h-4 w-4" />}
              onClick={() => onSectionChange(section.id)}
              sx={{
                color: "text.primary",
                textTransform: "none",
                px: 2,
                borderRadius: 1,
                "&:hover": { bgcolor: "#30363d" },
                ...(activeSection === section.id && {
                  bgcolor: "#1c2128",
                  "&:hover": { bgcolor: "#1c2128" },
                }),
              }}
            >
              {section.label}
            </Button>
          ))}
        </Box>

        {session?.user && (
          <Box sx={{ ml: "auto" }}>
            <Tooltip title="Account settings">
              <IconButton onClick={handleMenu} size="small">
                <Avatar
                  sx={{ width: 32, height: 32 }}
                  src={session.user.image || undefined}
                />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.primary" }}
                  noWrap
                >
                  {session.user.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary" }}
                  noWrap
                >
                  {session.user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => signOut()}
                sx={{
                  color: "text.primary",
                  "&:hover": { bgcolor: "#30363d" },
                }}
              >
                Sign out
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default function HomePage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [activeSection, setActiveSection] = useState("code");

  const renderSection = () => {
    if (!selectedRepo) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Select a repository to get started</p>
        </div>
      );
    }

    switch (activeSection) {
      case "code":
        return <CodeSection repository={selectedRepo} />;

      case "issues":
        return <IssuesSection repository={selectedRepo} />;

      case "pullRequests":
        return <PullRequestsSection repository={selectedRepo} />;

      case "security":
        return <SecuritySection repository={selectedRepo} />;

      case "insights":
        return <InsightsSection repository={selectedRepo} />;

      case "agents":
        return <AgentsSection repository={selectedRepo} />;

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a valid section</p>
          </div>
        );
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
        <div className="w-2/3 overflow-auto">{renderSection()}</div>
      </div>
    </div>
  );
}
