import { useEffect, useMemo, useState } from "react";

interface UseSearchPaginationOptions<T> {
  items: T[];
  filter: (item: T, searchTerm: string) => boolean;
  initialPageSize?: number;
}

interface UseSearchPaginationReturn<T> {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  currentPage: number;
  setCurrentPage: (value: number) => void;
  pageCount: number;
  paginatedItems: T[];
  filteredCount: number;
}

const DEFAULT_PAGE_SIZE = 10;

/**
 * Provides filtered and paginated slices of an array of items.
 * Normalises the search term and ensures the page index stays within bounds.
 */
export function useSearchPagination<T>(
  options: UseSearchPaginationOptions<T>
): UseSearchPaginationReturn<T> {
  const { items, filter, initialPageSize = DEFAULT_PAGE_SIZE } = options;
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  const normalisedTerm = searchTerm.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalisedTerm) {
      return items;
    }
    return items.filter((item) => filter(item, normalisedTerm));
  }, [items, filter, normalisedTerm]);

  const pageCount = useMemo(() => {
    if (filteredItems.length === 0) {
      return 1;
    }
    return Math.ceil(filteredItems.length / pageSize);
  }, [filteredItems.length, pageSize]);

  // Keep current page within available range
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, normalisedTerm]);

  const safePage = Math.min(currentPage, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, endIndex),
    [filteredItems, startIndex, endIndex]
  );

  return {
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage: safePage,
    setCurrentPage,
    pageCount,
    paginatedItems,
    filteredCount: filteredItems.length,
  };
}

