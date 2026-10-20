import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = "Search records...",
  searchable = true,
  pagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  // Server-side props (if provided, DataTable runs in server-side mode)
  serverSide = false,
  totalItems: serverTotalItems,
  currentPage: serverCurrentPage = 1,
  onPageChange,
  onSearchChange,
  onPageSizeChange,
  emptyMessage = "No records found",
  actions = null,
  headerTitle = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(defaultPageSize);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle Client Search
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setClientPage(1);
    if (serverSide && onSearchChange) {
      onSearchChange(val);
    }
  };

  // Filter Data (Client side)
  const filteredData = useMemo(() => {
    if (serverSide) return data;
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase().trim();
    return data.filter(row => {
      return columns.some(col => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, columns, serverSide]);

  // Sort Data (Client side)
  const sortedData = useMemo(() => {
    if (serverSide || !sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortConfig, serverSide]);

  // Pagination Variables
  const currentPage = serverSide ? serverCurrentPage : clientPage;
  const pageSize = serverSide ? defaultPageSize : clientPageSize;
  const totalItems = serverSide ? (serverTotalItems ?? data.length) : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Paginated Data Chunk
  const paginatedData = useMemo(() => {
    if (serverSide || !pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, serverSide, pagination]);

  const handlePageClick = (page) => {
    if (page < 1 || page > totalPages) return;
    if (serverSide && onPageChange) {
      onPageChange(page);
    } else {
      setClientPage(page);
    }
  };

  const handlePageSizeSelect = (e) => {
    const newSize = parseInt(e.target.value, 10);
    if (serverSide && onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setClientPageSize(newSize);
      setClientPage(1);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const startEntry = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(totalItems, currentPage * pageSize);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
      border: '1px solid #eef2f7',
      overflow: 'hidden',
      marginBottom: '24px'
    }}>
      {/* Table Header / Toolbar */}
      {(searchable || headerTitle || actions) && (
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderBottom: '1px solid #edf2f7',
          backgroundColor: '#fafbfc'
        }}>
          {headerTitle && (
            <h6 style={{ margin: 0, fontWeight: '700', color: '#2d3748', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#556ee6' }} />
              {headerTitle}
            </h6>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {searchable && (
              <div style={{ position: 'relative', minWidth: '240px', flex: '0 1 320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInput}
                  placeholder={searchPlaceholder}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e0',
                    fontSize: '0.86rem',
                    color: '#2d3748',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#556ee6'; e.target.style.boxShadow = '0 0 0 3px rgba(85,110,230,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div style={{ overflowX: 'auto', minHeight: loading ? '180px' : 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem', color: '#2d3748' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #edf2f7' }}>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  onClick={() => col.sortable !== false && !serverSide && handleSort(col.key)}
                  style={{
                    padding: '12px 16px',
                    fontWeight: '700',
                    color: '#4a5568',
                    fontSize: '0.82rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: col.sortable !== false && !serverSide ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    ...col.headerStyle
                  }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {col.title}
                    {sortConfig.key === col.key && (
                      <span style={{ color: '#556ee6' }}>{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '40px 16px', textAlign: 'center', color: '#718096' }}>
                  <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e0', borderTopColor: '#556ee6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <div style={{ marginTop: '8px', fontSize: '0.88rem', fontWeight: '600' }}>Loading data...</div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '36px 16px', textAlign: 'center', color: '#a0aec0', fontSize: '0.9rem' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr
                  key={row.id || row._id || rIdx}
                  style={{
                    borderBottom: '1px solid #edf2f7',
                    backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = rIdx % 2 === 0 ? '#ffffff' : '#fcfcfd'}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      style={{
                        padding: '12px 16px',
                        verticalAlign: 'middle',
                        whiteSpace: col.nowrap ? 'nowrap' : 'normal',
                        ...col.style
                      }}
                    >
                      {col.render ? col.render(row, (currentPage - 1) * pageSize + rIdx + 1) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderTop: '1px solid #edf2f7',
          backgroundColor: '#fafbfc',
          fontSize: '0.84rem',
          color: '#718096'
        }}>
          {/* Entries Info */}
          <div>
            Showing <strong>{startEntry}</strong> to <strong>{endEntry}</strong> of <strong>{totalItems}</strong> entries
          </div>

          {/* Page Controls & Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', color: '#718096' }}>Rows per page:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeSelect}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e0',
                  fontSize: '0.82rem',
                  color: '#2d3748',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                {pageSizeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handlePageClick(1)}
                disabled={currentPage === 1}
                style={btnPaginationStyle(currentPage === 1)}
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handlePageClick(currentPage - 1)}
                disabled={currentPage === 1}
                style={btnPaginationStyle(currentPage === 1)}
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers().map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageClick(p)}
                  style={{
                    ...btnPaginationStyle(false),
                    backgroundColor: p === currentPage ? '#556ee6' : '#ffffff',
                    color: p === currentPage ? '#ffffff' : '#4a5568',
                    fontWeight: p === currentPage ? '700' : '500',
                    borderColor: p === currentPage ? '#556ee6' : '#e2e8f0'
                  }}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handlePageClick(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={btnPaginationStyle(currentPage === totalPages)}
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => handlePageClick(totalPages)}
                disabled={currentPage === totalPages}
                style={btnPaginationStyle(currentPage === totalPages)}
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnPaginationStyle = (disabled) => ({
  minWidth: '32px',
  height: '32px',
  padding: '0 6px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#ffffff',
  color: disabled ? '#cbd5e0' : '#4a5568',
  fontSize: '0.82rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.15s ease',
  outline: 'none'
});

export default DataTable;
