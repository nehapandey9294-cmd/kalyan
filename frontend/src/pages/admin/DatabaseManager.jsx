import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Database, Table, Search, RefreshCw, Edit, Trash2, Plus, 
  X, Check, AlertTriangle, Key, Layers, ArrowUpDown, 
  ChevronLeft, ChevronRight, Download, Filter, Eye, FileText, CheckCircle2
} from 'lucide-react';
import api from '../../utils/api';

const DatabaseManager = ({ isMobile }) => {
  // Tables state
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState('');

  // Active view tab: 'records' | 'structure'
  const [viewTab, setViewTab] = useState('records');

  // Table structure state
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);

  // Table records state
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [primaryKey, setPrimaryKey] = useState('id');
  const [columns, setColumns] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editNullMap, setEditNullMap] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({});
  const [addNullMap, setAddNullMap] = useState({});
  const [addLoading, setAddLoading] = useState(false);

  // Toast / Alert message state
  const [alertMsg, setAlertMsg] = useState(null);
  const [downloadingDb, setDownloadingDb] = useState(false);

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 5000);
  };

  // Fetch all tables on mount
  const fetchTables = async (selectDefault = false) => {
    setTablesLoading(true);
    try {
      const res = await api.get('/admin/database/tables');
      if (res.data && res.data.success === '1') {
        const tableList = res.data.data || [];
        setTables(tableList);
        if ((selectDefault || !selectedTable) && tableList.length > 0) {
          const first = tableList[0].name;
          setSelectedTable(first);
        }
      } else {
        showAlert('error', res.data?.error || 'Failed to load database tables');
      }
    } catch (err) {
      console.error('fetchTables error:', err);
      showAlert('error', err.response?.data?.error || err.message || 'Error fetching tables');
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    fetchTables(true);
  }, []);

  // Fetch Table Structure
  const fetchTableStructure = async (tableName) => {
    if (!tableName) return;
    setStructureLoading(true);
    try {
      const res = await api.get(`/admin/database/tables/${tableName}/structure`);
      if (res.data && res.data.success === '1') {
        setStructure(res.data.data);
        if (res.data.data.primaryKey) {
          setPrimaryKey(res.data.data.primaryKey);
        }
      }
    } catch (err) {
      console.error('fetchTableStructure error:', err);
    } finally {
      setStructureLoading(false);
    }
  };

  // Fetch Table Records
  const fetchRecords = async (tableName, pageNum = page, limit = pageSize, search = activeSearch, sort = sortField, order = sortOrder) => {
    if (!tableName) return;
    setRecordsLoading(true);
    try {
      const params = {
        page: pageNum,
        limit,
        search,
        sortField: sort || undefined,
        sortOrder: order || undefined
      };
      const res = await api.get(`/admin/database/tables/${tableName}/records`, { params });
      if (res.data && res.data.success === '1') {
        const data = res.data.data;
        setRecords(data.records || []);
        setTotalRecords(data.total || 0);
        setPrimaryKey(data.primaryKey || 'id');
        setColumns(data.columns || []);
      } else {
        showAlert('error', res.data?.error || 'Failed to load records');
      }
    } catch (err) {
      console.error('fetchRecords error:', err);
      showAlert('error', err.response?.data?.error || err.message || 'Error loading records');
    } finally {
      setRecordsLoading(false);
    }
  };

  // When selectedTable changes, fetch structure and records
  useEffect(() => {
    if (selectedTable) {
      setPage(1);
      setSearchQuery('');
      setActiveSearch('');
      setSortField('');
      setSortOrder('DESC');
      fetchTableStructure(selectedTable);
      fetchRecords(selectedTable, 1, pageSize, '', '', 'DESC');
    }
  }, [selectedTable]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setActiveSearch(searchQuery.trim());
    setPage(1);
    fetchRecords(selectedTable, 1, pageSize, searchQuery.trim(), sortField, sortOrder);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
    fetchRecords(selectedTable, 1, pageSize, '', sortField, sortOrder);
  };

  // Handle Sorting
  const handleSort = (columnField) => {
    let newOrder = 'ASC';
    if (sortField === columnField) {
      newOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
    }
    setSortField(columnField);
    setSortOrder(newOrder);
    setPage(1);
    fetchRecords(selectedTable, 1, pageSize, activeSearch, columnField, newOrder);
  };

  // Open Edit Modal
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    const formVals = {};
    const nulls = {};
    columns.forEach(col => {
      const val = record[col.field];
      if (val === null || val === undefined) {
        nulls[col.field] = true;
        formVals[col.field] = '';
      } else {
        nulls[col.field] = false;
        formVals[col.field] = String(val);
      }
    });
    setEditFormData(formVals);
    setEditNullMap(nulls);
    setEditModalOpen(true);
  };

  // Submit Edit Record
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord || !selectedTable) return;

    setEditLoading(true);
    try {
      const pkCol = primaryKey || 'id';
      const pkVal = editingRecord[pkCol];

      const payloadData = {};
      columns.forEach(col => {
        if (col.field === pkCol) return; // Don't modify primary key
        if (editNullMap[col.field]) {
          payloadData[col.field] = null;
        } else {
          payloadData[col.field] = editFormData[col.field] ?? '';
        }
      });

      const res = await api.put(`/admin/database/tables/${selectedTable}/records`, {
        primaryKey: { col: pkCol, val: pkVal },
        data: payloadData
      });

      if (res.data && res.data.success === '1') {
        showAlert('success', res.data.message || 'Record updated successfully!');
        setEditModalOpen(false);
        setEditingRecord(null);
        fetchRecords(selectedTable, page, pageSize, activeSearch, sortField, sortOrder);
      } else {
        showAlert('error', res.data?.error || 'Failed to update record');
      }
    } catch (err) {
      console.error('handleSaveEdit error:', err);
      showAlert('error', err.response?.data?.error || err.message || 'Error updating record');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (record) => {
    setDeletingRecord(record);
    setDeleteModalOpen(true);
  };

  // Submit Delete Record
  const handleConfirmDelete = async () => {
    if (!deletingRecord || !selectedTable) return;
    setDeleteLoading(true);
    try {
      const pkCol = primaryKey || 'id';
      const pkVal = deletingRecord[pkCol];

      const res = await api.delete(`/admin/database/tables/${selectedTable}/records`, {
        data: { primaryKey: { col: pkCol, val: pkVal } }
      });

      if (res.data && res.data.success === '1') {
        showAlert('success', res.data.message || 'Record deleted successfully!');
        setDeleteModalOpen(false);
        setDeletingRecord(null);
        fetchRecords(selectedTable, page, pageSize, activeSearch, sortField, sortOrder);
        // Refresh tables row count in sidebar
        fetchTables(false);
      } else {
        showAlert('error', res.data?.error || 'Failed to delete record');
      }
    } catch (err) {
      console.error('handleConfirmDelete error:', err);
      showAlert('error', err.response?.data?.error || err.message || 'Error deleting record');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Add Record Modal
  const handleOpenAdd = () => {
    const initialForm = {};
    const nulls = {};
    columns.forEach(col => {
      initialForm[col.field] = col.default !== null && col.default !== undefined ? String(col.default) : '';
      nulls[col.field] = false;
    });
    setAddFormData(initialForm);
    setAddNullMap(nulls);
    setAddModalOpen(true);
  };

  // Submit Add Record
  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!selectedTable) return;

    setAddLoading(true);
    try {
      const payloadData = {};
      columns.forEach(col => {
        const isAutoInc = col.extra && col.extra.includes('auto_increment');
        if (isAutoInc && (!addFormData[col.field] || addFormData[col.field].trim() === '')) {
          return; // Let MySQL auto increment
        }
        if (addNullMap[col.field]) {
          payloadData[col.field] = null;
        } else {
          payloadData[col.field] = addFormData[col.field] ?? '';
        }
      });

      const res = await api.post(`/admin/database/tables/${selectedTable}/records`, {
        data: payloadData
      });

      if (res.data && res.data.success === '1') {
        showAlert('success', res.data.message || 'Record added successfully!');
        setAddModalOpen(false);
        fetchRecords(selectedTable, 1, pageSize, activeSearch, sortField, sortOrder);
        setPage(1);
        fetchTables(false);
      } else {
        showAlert('error', res.data?.error || 'Failed to insert record');
      }
    } catch (err) {
      console.error('handleSaveAdd error:', err);
      showAlert('error', err.response?.data?.error || err.message || 'Error inserting record');
    } finally {
      setAddLoading(false);
    }
  };

  // Download SQL Backup
  const handleDownloadBackup = async () => {
    setDownloadingDb(true);
    try {
      const res = await api.get('/admin/backup-db', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `database_backup_${new Date().toISOString().slice(0, 10)}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showAlert('success', 'Database backup downloaded successfully!');
    } catch (err) {
      console.error('Download backup error:', err);
      showAlert('error', 'Failed to download SQL backup');
    } finally {
      setDownloadingDb(false);
    }
  };

  // Filtered tables for sidebar
  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables;
    const q = tableSearch.toLowerCase().trim();
    return tables.filter(t => t.name.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Format cell value
  const renderCellValue = (val, col) => {
    if (val === null || val === undefined) {
      return (
        <span style={{
          backgroundColor: '#f1f5f9',
          color: '#94a3b8',
          fontSize: '0.72rem',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          NULL
        </span>
      );
    }

    const str = String(val);
    if (col.key === 'PRI') {
      return <strong style={{ color: '#4f46e5', fontFamily: 'monospace' }}>{str}</strong>;
    }

    if (str.length > 50) {
      return (
        <span title={str} style={{ cursor: 'pointer', borderBottom: '1px dotted #94a3b8' }}>
          {str.slice(0, 47)}...
        </span>
      );
    }
    return str;
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-in-out' }}>
      
      {/* Top Header & Breadcrumb */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h4 style={{
            margin: 0,
            fontSize: '1.25rem',
            color: '#1f2937',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Database size={24} style={{ color: '#4f46e5' }} />
            Database Tables & Records Manager
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#6b7280' }}>
            Inspect table structures, view all records, edit, and delete data directly with real-time MySQL synchronization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={downloadingDb}
            style={{
              padding: '8px 16px',
              fontSize: '0.84rem',
              fontWeight: '600',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingDb ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
            }}
          >
            <Download size={15} />
            <span>{downloadingDb ? 'Exporting SQL...' : 'Download SQL Dump'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fetchTables(false);
              if (selectedTable) {
                fetchTableStructure(selectedTable);
                fetchRecords(selectedTable, page, pageSize, activeSearch, sortField, sortOrder);
              }
            }}
            style={{
              padding: '8px 14px',
              fontSize: '0.84rem',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#4b5563',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} className={tablesLoading || recordsLoading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: alertMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${alertMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: alertMsg.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {alertMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{alertMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertMsg(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid: Left Tables List + Right Records/Structure Viewer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '290px 1fr',
        gap: '20px',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: Tables Sidebar List */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobile ? '340px' : 'calc(100vh - 160px)'
        }}>
          {/* Header of tables list */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #f3f4f6',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} style={{ color: '#4f46e5' }} />
                Database Tables
              </span>
              <span style={{
                backgroundColor: '#e0e7ff',
                color: '#4338ca',
                fontSize: '0.74rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                {tables.length} tables
              </span>
            </div>

            {/* Search filter for table names */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search tables..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  fontSize: '0.82rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* List of tables */}
          <div style={{
            overflowY: 'auto',
            flex: 1,
            padding: '6px 8px'
          }}>
            {tablesLoading && tables.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                Loading tables...
              </div>
            ) : filteredTables.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                No matching tables
              </div>
            ) : (
              filteredTables.map((tbl) => {
                const isSelected = selectedTable === tbl.name;
                return (
                  <button
                    key={tbl.name}
                    type="button"
                    onClick={() => setSelectedTable(tbl.name)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? '#eef2ff' : 'transparent',
                      color: isSelected ? '#4338ca' : '#4b5563',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: '2px',
                      transition: 'all 0.15s ease',
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: '0.86rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <Table size={15} style={{ flexShrink: 0, color: isSelected ? '#4f46e5' : '#9ca3af' }} />
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {tbl.name}
                      </span>
                    </div>
                    {tbl.estimated_rows !== undefined && (
                      <span style={{
                        fontSize: '0.72rem',
                        color: isSelected ? '#4338ca' : '#9ca3af',
                        backgroundColor: isSelected ? '#ffffff' : '#f3f4f6',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        flexShrink: 0,
                        marginLeft: '6px'
                      }}>
                        {tbl.estimated_rows}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Table Workspace */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>

          {/* Table Header Bar */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f3f4f6',
            backgroundColor: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                <Table size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827', fontWeight: '800' }}>
                    {selectedTable || 'Select a table'}
                  </h3>
                  {primaryKey && (
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Key size={12} /> PK: {primaryKey}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                  Total Records: <strong style={{ color: '#111827' }}>{totalRecords}</strong> | Columns: <strong style={{ color: '#111827' }}>{columns.length}</strong>
                </div>
              </div>
            </div>

            {/* View switcher tabs + Add Record Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                backgroundColor: '#f3f4f6',
                padding: '3px',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setViewTab('records')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: viewTab === 'records' ? '#ffffff' : 'transparent',
                    color: viewTab === 'records' ? '#4f46e5' : '#6b7280',
                    boxShadow: viewTab === 'records' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Records Data ({totalRecords})
                </button>
                <button
                  type="button"
                  onClick={() => setViewTab('structure')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: viewTab === 'structure' ? '#ffffff' : 'transparent',
                    color: viewTab === 'structure' ? '#4f46e5' : '#6b7280',
                    boxShadow: viewTab === 'structure' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Table Structure
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenAdd}
                style={{
                  padding: '7px 14px',
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
                }}
              >
                <Plus size={15} />
                <span>Add Record</span>
              </button>
            </div>
          </div>

          {/* TAB 1: RECORDS VIEW */}
          {viewTab === 'records' && (
            <div>
              {/* Filter & Search Bar */}
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f3f4f6',
                backgroundColor: '#fafafa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {/* Search Form */}
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '420px' }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search in ${selectedTable}...`}
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 32px',
                        fontSize: '0.84rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#374151',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Search
                  </button>
                  {activeSearch && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        color: '#ef4444',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </form>

                {/* Per Page selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#6b7280' }}>
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const sz = Number(e.target.value);
                      setPageSize(sz);
                      setPage(1);
                      fetchRecords(selectedTable, 1, sz, activeSearch, sortField, sortOrder);
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.82rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value={10}>10 records</option>
                    <option value={20}>20 records</option>
                    <option value={50}>50 records</option>
                    <option value={100}>100 records</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto', minHeight: '300px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      {/* Fixed Action Column Header */}
                      <th style={{
                        padding: '12px 14px',
                        fontWeight: '700',
                        color: '#475569',
                        textTransform: 'uppercase',
                        fontSize: '0.74rem',
                        letterSpacing: '0.04em',
                        width: '110px',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: '#f8fafc',
                        zIndex: 2,
                        boxShadow: '2px 0 5px rgba(0,0,0,0.03)'
                      }}>
                        Actions
                      </th>

                      {/* Dynamic Columns Headers */}
                      {columns.map((col) => {
                        const isSorted = sortField === col.field;
                        return (
                          <th
                            key={col.field}
                            onClick={() => handleSort(col.field)}
                            style={{
                              padding: '12px 14px',
                              fontWeight: '700',
                              color: isSorted ? '#4338ca' : '#475569',
                              fontSize: '0.74rem',
                              letterSpacing: '0.04em',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {col.key === 'PRI' && <Key size={13} style={{ color: '#d97706' }} />}
                              <span>{col.field}</span>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'normal' }}>
                                ({col.type})
                              </span>
                              <ArrowUpDown size={12} style={{ color: isSorted ? '#4338ca' : '#cbd5e1' }} />
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {recordsLoading ? (
                      <tr>
                        <td colSpan={columns.length + 1} style={{ padding: '40px', textAlign: 'center', color: '#6366f1' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <RefreshCw size={18} className="spin-anim" />
                            <span>Loading records from {selectedTable}...</span>
                          </div>
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No records found in table <strong>{selectedTable}</strong> {activeSearch ? `matching "${activeSearch}"` : ''}
                        </td>
                      </tr>
                    ) : (
                      records.map((row, idx) => {
                        const rowBg = idx % 2 === 0 ? '#ffffff' : '#fcfcfd';
                        return (
                          <tr
                            key={row[primaryKey] || idx}
                            style={{
                              backgroundColor: rowBg,
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            {/* Action Buttons Column */}
                            <td style={{
                              padding: '10px 14px',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: rowBg,
                              zIndex: 1,
                              boxShadow: '2px 0 5px rgba(0,0,0,0.03)',
                              whiteSpace: 'nowrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(row)}
                                  title="Edit Record"
                                  style={{
                                    padding: '5px 8px',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4338ca',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  <Edit size={13} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDelete(row)}
                                  title="Delete Record"
                                  style={{
                                    padding: '5px 8px',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                  }}
                                >
                                  <Trash2 size={13} />
                                  <span>Del</span>
                                </button>
                              </div>
                            </td>

                            {/* Column Values */}
                            {columns.map((col) => (
                              <td
                                key={col.field}
                                style={{
                                  padding: '10px 14px',
                                  color: '#334155',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {renderCellValue(row[col.field], col)}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#ffffff'
              }}>
                <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  Showing <strong style={{ color: '#1e293b' }}>
                    {records.length > 0 ? (page - 1) * pageSize + 1 : 0}
                  </strong> to <strong style={{ color: '#1e293b' }}>
                    {Math.min(page * pageSize, totalRecords)}
                  </strong> of <strong style={{ color: '#1e293b' }}>{totalRecords}</strong> records
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    disabled={page <= 1 || recordsLoading}
                    onClick={() => {
                      const newP = page - 1;
                      setPage(newP);
                      fetchRecords(selectedTable, newP, pageSize, activeSearch, sortField, sortOrder);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      color: page <= 1 ? '#9ca3af' : '#374151',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>

                  <span style={{ fontSize: '0.82rem', color: '#475569', padding: '0 8px' }}>
                    Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages || recordsLoading}
                    onClick={() => {
                      const newP = page + 1;
                      setPage(newP);
                      fetchRecords(selectedTable, newP, pageSize, activeSearch, sortField, sortOrder);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      backgroundColor: '#ffffff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      color: page >= totalPages ? '#9ca3af' : '#374151',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STRUCTURE / SCHEMA VIEW */}
          {viewTab === 'structure' && (
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '600' }}>
                  Column definitions, indices, and constraints for <strong>{selectedTable}</strong>:
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {structure?.columns?.length || 0} Columns Total
                </span>
              </div>

              {structureLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6366f1' }}>
                  Loading table structure...
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>#</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Column Name</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Data Type</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Key</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Nullable</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Default</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Extra</th>
                        <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '700' }}>Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(structure?.columns || columns).map((col, idx) => (
                        <tr
                          key={col.field}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                          }}
                        >
                          <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {col.key === 'PRI' && <Key size={14} style={{ color: '#d97706' }} />}
                              <span>{col.field}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#4f46e5' }}>
                            {col.type}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {col.key === 'PRI' ? (
                              <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                                PRIMARY KEY
                              </span>
                            ) : col.key === 'UNI' ? (
                              <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                                UNIQUE
                              </span>
                            ) : col.key === 'MUL' ? (
                              <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                                INDEX
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              color: col.null === 'YES' ? '#10b981' : '#ef4444',
                              fontWeight: '600',
                              fontSize: '0.78rem'
                            }}>
                              {col.null === 'YES' ? 'YES' : 'NO'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace' }}>
                            {col.default !== null && col.default !== undefined ? String(col.default) : <span style={{ color: '#cbd5e1' }}>NULL</span>}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#8b5cf6', fontWeight: '600' }}>
                            {col.extra || '-'}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>
                            {col.comment || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT RECORD MODAL */}
      {/* ======================================================== */}
      {editModalOpen && editingRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit size={18} style={{ color: '#4f46e5' }} />
                  Edit Record in `{selectedTable}`
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Identifier: <strong>{primaryKey} = {editingRecord[primaryKey]}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {columns.map((col) => {
                  const isPk = col.field === primaryKey || col.key === 'PRI';
                  const isNullChecked = editNullMap[col.field];
                  const typeLower = (col.type || '').toLowerCase();
                  const isTextarea = typeLower.includes('text') || typeLower.includes('json');

                  return (
                    <div key={col.field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPk && <Key size={13} style={{ color: '#d97706' }} />}
                          <span>{col.field}</span>
                          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 'normal' }}>
                            ({col.type})
                          </span>
                        </label>

                        {/* NULL Checkbox if column is nullable and not primary key */}
                        {!isPk && col.null === 'YES' && (
                          <label style={{ fontSize: '0.74rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!isNullChecked}
                              onChange={(e) => {
                                setEditNullMap(prev => ({ ...prev, [col.field]: e.target.checked }));
                              }}
                            />
                            <span>Set as NULL</span>
                          </label>
                        )}
                      </div>

                      {isTextarea ? (
                        <textarea
                          rows={3}
                          disabled={isPk || isNullChecked}
                          value={isNullChecked ? '' : (editFormData[col.field] ?? '')}
                          onChange={(e) => {
                            setEditFormData(prev => ({ ...prev, [col.field]: e.target.value }));
                          }}
                          placeholder={isNullChecked ? 'NULL' : `Enter ${col.field}...`}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.84rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: (isPk || isNullChecked) ? '#f3f4f6' : '#ffffff',
                            color: (isPk || isNullChecked) ? '#9ca3af' : '#111827',
                            resize: 'vertical',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        <input
                          type={typeLower.includes('int') || typeLower.includes('decimal') || typeLower.includes('double') ? 'number' : 'text'}
                          disabled={isPk || isNullChecked}
                          value={isNullChecked ? '' : (editFormData[col.field] ?? '')}
                          onChange={(e) => {
                            setEditFormData(prev => ({ ...prev, [col.field]: e.target.value }));
                          }}
                          placeholder={isNullChecked ? 'NULL' : isPk ? 'Primary Key (Read-only)' : `Enter ${col.field}...`}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.84rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: (isPk || isNullChecked) ? '#f3f4f6' : '#ffffff',
                            color: (isPk || isNullChecked) ? '#9ca3af' : '#111827'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 22px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editLoading}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#4b5563'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    backgroundColor: '#4f46e5',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: editLoading ? 'wait' : 'pointer',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DELETE CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {deleteModalOpen && deletingRecord && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#111827', fontWeight: '800' }}>
              Confirm Record Deletion
            </h3>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#4b5563', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete this record from table <strong style={{ color: '#111827' }}>`{selectedTable}`</strong>?
            </p>

            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '0.82rem',
              color: '#334155',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              <div><strong>{primaryKey}:</strong> {deletingRecord[primaryKey]}</div>
              {Object.entries(deletingRecord).slice(1, 4).map(([k, v]) => (
                <div key={k} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  <strong>{k}:</strong> {String(v)}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                style={{
                  padding: '9px 22px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: deleteLoading ? 'wait' : 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD RECORD MODAL */}
      {/* ======================================================== */}
      {addModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#111827', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} style={{ color: '#4f46e5' }} />
                  Add New Record to `{selectedTable}`
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Enter values for table columns below
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {columns.map((col) => {
                  const isAutoInc = col.extra && col.extra.includes('auto_increment');
                  const isNullChecked = addNullMap[col.field];
                  const typeLower = (col.type || '').toLowerCase();
                  const isTextarea = typeLower.includes('text') || typeLower.includes('json');

                  return (
                    <div key={col.field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {col.key === 'PRI' && <Key size={13} style={{ color: '#d97706' }} />}
                          <span>{col.field}</span>
                          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 'normal' }}>
                            ({col.type}) {isAutoInc ? '• auto_increment' : ''}
                          </span>
                        </label>

                        {col.null === 'YES' && (
                          <label style={{ fontSize: '0.74rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={!!isNullChecked}
                              onChange={(e) => {
                                setAddNullMap(prev => ({ ...prev, [col.field]: e.target.checked }));
                              }}
                            />
                            <span>Set as NULL</span>
                          </label>
                        )}
                      </div>

                      {isTextarea ? (
                        <textarea
                          rows={3}
                          disabled={isNullChecked}
                          value={isNullChecked ? '' : (addFormData[col.field] ?? '')}
                          onChange={(e) => {
                            setAddFormData(prev => ({ ...prev, [col.field]: e.target.value }));
                          }}
                          placeholder={isNullChecked ? 'NULL' : `Enter ${col.field}...`}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.84rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: isNullChecked ? '#f3f4f6' : '#ffffff',
                            resize: 'vertical',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        <input
                          type={typeLower.includes('int') || typeLower.includes('decimal') || typeLower.includes('double') ? 'number' : 'text'}
                          disabled={isNullChecked}
                          value={isNullChecked ? '' : (addFormData[col.field] ?? '')}
                          onChange={(e) => {
                            setAddFormData(prev => ({ ...prev, [col.field]: e.target.value }));
                          }}
                          placeholder={isNullChecked ? 'NULL' : isAutoInc ? '(Auto generated if left empty)' : `Enter ${col.field}...`}
                          style={{
                            padding: '8px 12px',
                            fontSize: '0.84rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: isNullChecked ? '#f3f4f6' : '#ffffff'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{
                padding: '14px 22px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  disabled={addLoading}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#4b5563'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    backgroundColor: '#4f46e5',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: addLoading ? 'wait' : 'pointer',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {addLoading ? 'Inserting...' : 'Insert Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DatabaseManager;

