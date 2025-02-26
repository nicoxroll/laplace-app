import { createTheme } from "@mui/material";

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
    text: {
      primary: "#e6edf3",
      secondary: "#8b949e",
    },
    divider: "#30363d",
    primary: {
      main: "#58a6ff",
    },
    secondary: {
      main: "#30363d",
    },
    success: {
      main: "#3fb950",
    },
    error: {
      main: "#f85149",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#0d1117",
          scrollbarColor: "#30363d #0d1117",
          "&::-webkit-scrollbar": {
            width: "10px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#0d1117",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#30363d",
            borderRadius: "5px",
          }
        }
      }
    }
  }
});