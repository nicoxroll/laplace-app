"use client";

import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import type { Repository } from "@/types/repository";
import { Box } from "@mui/material";
import { Bot } from "lucide-react";

const columns = [
  {
    id: "icon",
    label: "",
    minWidth: 50,
    format: () => (
      <Box sx={{ color: "primary.main" }}>
        <Bot size={20} />
      </Box>
    ),
  },
  { id: "name", label: "Agent Name", minWidth: 170 },
  { id: "description", label: "Description", minWidth: 300 },
  { id: "status", label: "Status", minWidth: 100 },
];

const agentsData = [
  {
    icon: "bot",
    name: "Code Analysis Agent",
    description: "Analyzes code for patterns, bugs, and potential improvements",
    status: "Active",
  },
  {
    icon: "bot",
    name: "Documentation Agent",
    description: "Generates and improves code documentation",
    status: "Active",
  },
  {
    icon: "bot",
    name: "Security Agent",
    description: "Identifies security vulnerabilities and suggests fixes",
    status: "Active",
  },
];

export function AgentsSection({
  repository,
}: {
  repository: Repository | null;
}) {
  return (
    <SectionCard
      icon={Bot}
      title={repository ? `AI Agents - ${repository.full_name}` : "AI Agents"}
    >
      <DataTable
        columns={columns}
        rows={agentsData}
        rowsPerPageOptions={[3, 5, 10]}
      />
    </SectionCard>
  );
}
