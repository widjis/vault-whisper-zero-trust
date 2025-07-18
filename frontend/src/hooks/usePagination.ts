import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialRowsPerPage?: number;
  rowsPerPageOptions?: number[];
  totalItems?: number;
}

interface UsePaginationReturn {
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions: number[];
  totalItems: number;
  totalPages: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setTotalItems: (count: number) => void;
  resetPagination: () => void;
  paginationProps: {
    count: number;
    page: number;
    rowsPerPage: number;
    rowsPerPageOptions: number[];
    onPageChange: (event: unknown, newPage: number) => void;
    onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

const usePagination = (options: UsePaginationOptions = {}): UsePaginationReturn => {
  const {
    initialPage = 0,
    initialRowsPerPage = 10,
    rowsPerPageOptions = [5, 10, 25, 50],
    totalItems: initialTotalItems = 0,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [totalItems, setTotalItems] = useState(initialTotalItems);

  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  }, []);

  const resetPagination = useCallback(() => {
    setPage(initialPage);
    setRowsPerPage(initialRowsPerPage);
  }, [initialPage, initialRowsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / rowsPerPage);
  }, [totalItems, rowsPerPage]);

  // Props object for MUI pagination components
  const paginationProps = useMemo(
    () => ({
      count: totalItems,
      page,
      rowsPerPage,
      rowsPerPageOptions,
      onPageChange: handleChangePage,
      onRowsPerPageChange: handleChangeRowsPerPage,
    }),
    [totalItems, page, rowsPerPage, rowsPerPageOptions, handleChangePage, handleChangeRowsPerPage]
  );

  return {
    page,
    rowsPerPage,
    rowsPerPageOptions,
    totalItems,
    totalPages,
    handleChangePage,
    handleChangeRowsPerPage,
    setTotalItems,
    resetPagination,
    paginationProps,
  };
};

export default usePagination;