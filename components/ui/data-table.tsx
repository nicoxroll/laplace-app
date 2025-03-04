"use client";

import {
  Box,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  format?: (value: any, row?: any) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  rowsPerPageOptions?: number[];
  title?: string;
}

type Order = "asc" | "desc";

// Modificación del componente DataTable para manejar casos donde rows puede ser undefined

export function DataTable({
  columns,
  rows = [], // Asegurar un valor por defecto
  rowsPerPageOptions = [10, 25, 100],
  title,
}: DataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState<string>("");
  const [order, setOrder] = useState<Order>("asc");

  const handleChangePage = (
    _: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Filtrar filas según el término de búsqueda
  const filteredRows = useMemo(() => {
    // Asegurar que rows siempre sea un array
    const safeRows = Array.isArray(rows) ? rows : [];

    if (!searchTerm) return safeRows;

    return safeRows.filter((row) =>
      Object.entries(row).some(([key, value]) => {
        // Solo buscar en propiedades que son columnas
        if (!columns.find((col) => col.id === key)) return false;

        // Convertir el valor a string para búsqueda
        const stringValue =
          value !== null && value !== undefined ? String(value) : "";
        return stringValue.toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [rows, searchTerm, columns]);

  // Ordenar filas
  const sortedRows = useMemo(() => {
    // Asegurar que filteredRows siempre sea un array
    const rowsToSort = filteredRows || [];

    if (!orderBy) return rowsToSort;

    return [...rowsToSort].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      // Manejar valores nulos o indefinidos
      if (aValue === undefined || aValue === null)
        return order === "asc" ? -1 : 1;
      if (bValue === undefined || bValue === null)
        return order === "asc" ? 1 : -1;

      // Comparar según el tipo
      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }

      // Comparar como strings
      return order === "asc"
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredRows, order, orderBy]);

  // Paginar filas
  const paginatedRows = useMemo(() => {
    // Asegurar que sortedRows siempre sea un array
    const rowsToPage = sortedRows || [];

    return rowsToPage.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedRows, page, rowsPerPage]);

  // Asegurar que rows siempre sea array en el cálculo de emptyRows
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - (rows?.length || 0)) : 0;

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#0d1117", // Fondo azul marino
        border: "1px solid #30363d",
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #30363d",
        }}
      >
        {title && (
          <Typography variant="h6" sx={{ color: "#e6edf3" }}>
            {title}
          </Typography>
        )}
        <TextField
          placeholder="Search..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#8b949e" />
              </InputAdornment>
            ),
          }}
          sx={{
            ml: "auto",
            width: { xs: "100%", sm: 250 },
            mt: { xs: title ? 2 : 0, sm: 0 },
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#161b22",
              color: "#e6edf3",
              borderColor: "#30363d",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#58a6ff",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#58a6ff",
              },
            },
          }}
        />
      </Box>

      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{
                    backgroundColor: "#161b22", // Cabecera más oscura
                    color: "#e6edf3",
                    fontWeight: "bold",
                    borderBottom: "1px solid #30363d",
                  }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : "asc"}
                      onClick={() => handleRequestSort(column.id)}
                      sx={{
                        "&.MuiTableSortLabel-root": {
                          color: "#8b949e",
                          "&:hover": {
                            color: "#58a6ff",
                          },
                          "&.Mui-active": {
                            color: "#58a6ff",
                          },
                        },
                        "& .MuiTableSortLabel-icon": {
                          color: "#58a6ff !important",
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, index) => (
                <TableRow
                  hover
                  tabIndex={-1}
                  key={index}
                  sx={{
                    "&:hover": {
                      backgroundColor: "#1c2128",
                    },
                    "&:nth-of-type(odd)": {
                      backgroundColor: alpha("#161b22", 0.5),
                    },
                  }}
                >
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={{
                          color: "#e6edf3",
                          borderBottom: "1px solid #30363d",
                        }}
                      >
                        {column.format ? column.format(value, row) : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 3, color: "#8b949e" }}
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 2,
          borderTop: "1px solid #30363d",
        }}
      >
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={(sortedRows || []).length} // Protección contra undefined
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count}`
          }
          sx={{
            color: "#8b949e",
            "& .MuiTablePagination-select": {
              color: "#e6edf3",
              backgroundColor: "#161b22",
              borderRadius: 1,
              border: "1px solid #30363d",
              "&:focus": {
                borderColor: "#58a6ff",
              },
            },
            "& .MuiTablePagination-selectIcon": {
              color: "#8b949e",
            },
            "& .MuiIconButton-root": {
              color: "#8b949e",
              "&.Mui-disabled": {
                color: "#484f58",
              },
              "&:hover": {
                backgroundColor: "#1c2128",
              },
            },
          }}
        />
      </Box>
    </Paper>
  );
}
