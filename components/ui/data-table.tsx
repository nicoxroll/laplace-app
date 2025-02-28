import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Search } from 'lucide-react';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  backgroundColor: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: '8px',
  overflow: 'hidden',
  '& .MuiTable-root': {
    backgroundColor: 'transparent',
  },
  '& .MuiTableCell-root': {
    borderColor: '#30363d',
    color: '#e6edf3',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    backgroundColor: '#161b22',
    fontWeight: 600,
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: '#161b22',
  },
  '& .MuiTablePagination-root': {
    color: '#e6edf3',
    backgroundColor: '#161b22',
  },
  '& .MuiTablePagination-select': {
    color: '#e6edf3',
  },
  '& .MuiTablePagination-selectIcon': {
    color: '#e6edf3',
  },
  '& .MuiTablePagination-displayedRows': {
    color: '#e6edf3',
  },
  '& .MuiTablePagination-actions': {
    '& .MuiIconButton-root': {
      color: '#e6edf3',
      '&.Mui-disabled': {
        color: '#30363d',
      },
    },
  },
  '& .MuiTablePagination-toolbar': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
  },
  '& .MuiTableSortLabel-root': {
    color: '#e6edf3',
    '&:hover': {
      color: '#58a6ff',
    },
    '&.Mui-active': {
      color: '#58a6ff',
    },
  },
  '& .MuiTableSortLabel-icon': {
    color: '#58a6ff !important',
  },
}));

const StyledTextField = styled(TextField)({
  width: '100%',
  '& .MuiInputBase-root': {
    color: '#e6edf3',
    backgroundColor: '#161b22',
    height: '36px',
    fontSize: '0.875rem',
    borderRadius: 0,
    border: 'none',
    borderBottom: '1px solid #30363d',
    '&:hover': {
      backgroundColor: '#1c2129',
    },
    '&.Mui-focused': {
      backgroundColor: '#1c2129',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiInputBase-input': {
    padding: '8px 12px',
  },
  '& .MuiInputAdornment-root': {
    color: '#8b949e',
    marginLeft: '12px',
  },
});

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any, row?: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  rowsPerPageOptions?: number[];
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

type Order = 'asc' | 'desc';

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

export function DataTable({ columns, rows, rowsPerPageOptions = [5, 10, 25] }: DataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredRows = rows.filter((row) =>
    Object.values(row).some(
      (value) =>
        value &&
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const sortedRows = orderBy
    ? filteredRows.sort(getComparator(order, orderBy))
    : filteredRows;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', bgcolor: 'transparent', boxShadow: 'none' }}>
      <StyledTextField
        fullWidth
        size="small"
        placeholder="Buscar..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
        }}
      />
      <StyledTableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={() => handleRequestSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format ? column.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </StyledTableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={sortedRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{
          borderTop: '1px solid #30363d',
          backgroundColor: '#161b22',
          '& .MuiToolbar-root': {
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            padding: '0 16px',
            minHeight: '52px',
          },
          '& .MuiTablePagination-spacer': {
            display: 'none',
          },
        }}
      />
    </Paper>
  );
} 