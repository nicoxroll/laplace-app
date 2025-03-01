"use client";

import { useRepository } from "@/contexts/repository-context";
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Bot,
  Code,
  GitPullRequest,
  LineChart,
  LogOut,
  Menu as MenuIcon,
  MoreVertical,
  Settings,
  Shield,
  TicketCheck,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  activeSection,
  onSectionChange,
  showSidebar,
  onToggleSidebar,
}: HeaderProps) {
  const { data: session } = useSession();
  const { selectedRepo } = useRepository();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSettings = () => {
    router.push("/settings");
    handleCloseMenu();
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/auth/signin");
    handleCloseMenu();
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileNavigation = (sectionId: string) => {
    onSectionChange(sectionId);
    setMobileMenuOpen(false);
  };

  const sections = [
    { id: "code", label: "Code", icon: Code },
    { id: "issues", label: "Issues", icon: TicketCheck },
    { id: "pull-requests", label: "Pull Requests", icon: GitPullRequest },
    { id: "security", label: "Security", icon: Shield },
    { id: "insights", label: "Insights", icon: LineChart },
    { id: "agents", label: "AI Agents", icon: Bot },
  ];

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ backgroundColor: "background.paper" }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onToggleSidebar}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: isMobile ? 1 : 0,
                mr: isMobile ? 0 : 4,
              }}
            >
              Laplace
            </Typography>
          </Box>

          {isMobile ? (
            <IconButton
              color="inherit"
              onClick={handleMobileMenuToggle}
              sx={{ mr: 1 }}
            >
              <MoreVertical />
            </IconButton>
          ) : (
            <Tabs
              value={activeSection}
              onChange={(_, value) => onSectionChange(value)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                flexGrow: 1,
                "& .MuiTab-root": {
                  minWidth: "auto",
                  px: 2,
                  py: 1.5,
                  minHeight: 0,
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                },
              }}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Tab
                    key={section.id}
                    value={section.id}
                    label={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Icon size={16} />
                        <span>{section.label}</span>
                      </Box>
                    }
                  />
                );
              })}
            </Tabs>
          )}

          {session?.user && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Tooltip title="Account settings">
                <IconButton
                  onClick={handleOpenMenu}
                  size="small"
                  sx={{ ml: 2 }}
                  aria-controls={open ? "account-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? "true" : undefined}
                >
                  <Avatar
                    alt={session.user.name || "User"}
                    src={session.user.image || undefined}
                    sx={{ width: 32, height: 32 }}
                  />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleCloseMenu}
                onClick={handleCloseMenu}
                PaperProps={{
                  elevation: 0,
                  sx: {
                    overflow: "visible",
                    filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                    mt: 1.5,
                    "& .MuiAvatar-root": {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                    "&:before": {
                      content: '""',
                      display: "block",
                      position: "absolute",
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: "background.paper",
                      transform: "translateY(-50%) rotate(45deg)",
                      zIndex: 0,
                    },
                  },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem onClick={handleCloseMenu}>
                  <Avatar /> {session.user.name || session.user.email}
                </MenuItem>
                <MenuItem onClick={handleSettings}>
                  <Settings size={16} style={{ marginRight: 8 }} />
                  Settings
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <LogOut size={16} style={{ marginRight: 8 }} />
                  Sign out
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Menú móvil */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
        sx={{
          "& .MuiDrawer-paper": {
            width: 240,
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box sx={{ pt: 6, pb: 2 }}>
          <List>
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <ListItem key={section.id} disablePadding>
                  <ListItemButton
                    selected={activeSection === section.id}
                    onClick={() => handleMobileNavigation(section.id)}
                  >
                    <ListItemIcon>
                      <Icon size={20} />
                    </ListItemIcon>
                    <ListItemText primary={section.label} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
