// components/knowledge/FileUploader.tsx
import {
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
} from "@mui/material";
import { size } from "lodash";
import { File, Upload, Trash } from "lucide-react";
import { icon } from "mermaid/dist/rendering-util/rendering-elements/shapes/icon.js";
import { type } from "os";
import { RefObject } from "react";
import style from "styled-jsx/style";

interface FileUploaderProps {
  selectedFile: File | null;
  isIndexing: boolean;
  isIndexed: boolean;
  indexProgress: number;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
}

export function FileUploader({
  selectedFile,
  isIndexing,
  isIndexed,
  indexProgress,
  fileInputRef,
  onFileChange,
  onClearFile,
}: FileUploaderProps) {
  return (
    <Box
      sx={{
        mb: 2,
        mt: 1,
        border: "1px dashed grey",
        borderRadius: 1,
        p: 2,
      }}
    >
      <Typography variant="body2" sx={{ mb: 1 }}>
        Subir documento (PDF, Excel, Word, etc.)
      </Typography>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
        style={{ display: "none" }}
        onChange={onFileChange}
        disabled={isIndexing}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
        }}
      >
        <Button
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          disabled={isIndexing}
          startIcon={<Upload size={18} />}
        >
          Seleccionar archivo
        </Button>
      </Box>

      {selectedFile && (
        <Box
          sx={{
            mt: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Chip
            icon={<File size={16} />}
            label={`${selectedFile.name} (${(selectedFile.size / 1024).toFixed(
              2
            )} KB)`}
            variant="outlined"
            color={isIndexed ? "success" : "default"}
          />
          <IconButton
            size="small"
            onClick={onClearFile}
            sx={{ ml: 1 }}
            color="error"
          >
            <Trash size={16} />
          </IconButton>
        </Box>
      )}

      {isIndexing && (
        <LinearProgress
          variant="determinate"
          value={indexProgress}
          sx={{ mt: 1 }}
        />
      )}

      {isIndexed && (
        <Alert severity="success" sx={{ mt: 1 }}>
          Archivo indexado correctamente
        </Alert>
      )}
    </Box>
  );
}
