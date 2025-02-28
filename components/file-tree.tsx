"use client";

import { useRepository } from "@/contexts/repository-context";
import {
  ArrowBack,
  Folder,
  InsertDriveFile,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
} from "@mui/material";

export function FileTree() {
  const {
    tree,
    currentFolder,
    searchTerm,
    isTreeLoading,
    setSearchTerm,
    handleTreeItemClick,
    handleTreeBack,
  } = useRepository();

  const filteredTree = tree.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <List sx={{ flex: 1, overflow: "auto" }}>
        {currentFolder && (
          <ListItemButton onClick={handleTreeBack}>
            <ListItemIcon>
              <ArrowBack fontSize="small" sx={{ color: "#58a6ff" }} />
            </ListItemIcon>
            <ListItemText
              primary={`Back to ${
                currentFolder.split("/").slice(0, -1).pop() || "root"
              }`}
            />
          </ListItemButton>
        )}

        {filteredTree.map((item) => (
          <ListItemButton
            key={item.path}
            onClick={() => handleTreeItemClick(item)}
          >
            <ListItemIcon>
              {item.type === "dir" ? (
                <Folder fontSize="small" sx={{ color: "#58a6ff" }} />
              ) : (
                <InsertDriveFile fontSize="small" sx={{ color: "#e6edf3" }} />
              )}
            </ListItemIcon>
            <ListItemText primary={item.name} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
