import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * Matka Helper Data Generators
 */
export const SINGLE_DIGITS = Array.from({ length: 10 }, (_, i) => String(i));

export const JODI_DIGITS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));

export const TRIPLE_PANAS = Array.from({ length: 10 }, (_, i) => `${i}${i}${i}`);

const valOf = (d) => (d === 0 ? 10 : d);

export const SINGLE_PANAS = (() => {
  const result = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (let c = 0; c <= 9; c++) {
        if (a !== b && b !== c && a !== c) {
          const vA = valOf(a), vB = valOf(b), vC = valOf(c);
          if (vA < vB && vB < vC) {
            result.push(`${a}${b}${c}`);
          }
        }
      }
    }
  }
  return result;
})();

export const DOUBLE_PANAS = (() => {
  const result = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (let c = 0; c <= 9; c++) {
        if ((a === b && b !== c) || (a === c && a !== b) || (b === c && a !== b)) {
          const vA = valOf(a), vB = valOf(b), vC = valOf(c);
          if (vA <= vB && vB <= vC) {
            result.push(`${a}${b}${c}`);
          }
        }
      }
    }
  }
  return result;
})();

export const ALL_PANAS = [...SINGLE_PANAS, ...DOUBLE_PANAS, ...TRIPLE_PANAS];

const getPanaAnk = (pana) => {
  if (!pana || String(pana).length < 3) return '';
  const sum = String(pana).split('').reduce((acc, c) => acc + (parseInt(c, 10) || 0), 0);
  return String(sum % 10);
};

/**
 * SearchableSelect Component
 * Features:
 * - Uses React Portal directly to document.body to escape any parent CSS transforms (like PullToRefresh)
 * - Ultra-high z-index (10000000) so it never gets obscured by BottomNav
 * - Full viewport bottom-sheet modal on mobile, centered dialog on larger screens
 * - Live real-time search with clear button
 * - Ank filter tabs for Panas (All, 1-9, 0) for 1-tap browsing of 220 panas
 * - Body scroll locking during open state
 */
const SearchableSelect = ({
  label,
  placeholder = 'Select number...',
  options = [],
  value = '',
  onChange,
  disabled = false,
  required = false,
  maxLength,
  theme = 'light',
  isPana = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAnk, setSelectedAnk] = useState('ALL');
  const searchInputRef = useRef(null);

  // Auto-focus search input when opening and lock background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 70);

      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    } else {
      setSearch('');
      setSelectedAnk('ALL');
    }
  }, [isOpen]);

  // Determine if options are Panas (3-digit numbers)
  const isPanaList = isPana || (options.length > 0 && String(options[0]).length === 3);

  // Filter options by search text and Ank tab
  const filteredOptions = options.filter((opt) => {
    const optStr = String(opt);
    const matchesSearch = !search.trim() || optStr.includes(search.trim());
    if (!matchesSearch) return false;

    if (isPanaList && selectedAnk !== 'ALL') {
      return getPanaAnk(optStr) === selectedAnk;
    }
    return true;
  });

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else if (search.trim()) {
        handleSelect(search.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isLight = theme === 'light';

  // Modal content portaled to document.body
  const modalContent = isOpen && typeof document !== 'undefined' ? (
    createPortal(
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 10000000,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 0
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '85vh',
            backgroundColor: isLight ? '#ffffff' : '#0f172a',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(214, 190, 102, 0.3)',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))'
          }}
        >
          {/* Modal Drag Handle Pill */}
          <div style={{
            width: '42px',
            height: '4px',
            borderRadius: '2px',
            background: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
            margin: '10px auto 4px auto'
          }} />

          {/* Modal Header */}
          <div style={{
            padding: '10px 18px 12px 18px',
            borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)'
          }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 800,
                color: isLight ? '#0f172a' : '#ffffff'
              }}>
                {label || placeholder}
              </h3>
              <span style={{ fontSize: '11px', color: isLight ? '#64748b' : '#9ca3af', fontWeight: 600 }}>
                {filteredOptions.length} available {isPanaList ? 'panas' : 'numbers'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: isLight ? '#0f172a' : '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Box & Ank Filter Bar */}
          <div style={{
            padding: '12px 16px',
            borderBottom: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: isLight ? '#d97706' : 'var(--color-gold, #d6be66)'
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isPanaList ? 'Type 3-digit pana (e.g. 123)...' : 'Type number to search...'}
                value={search}
                onChange={(e) => setSearch(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 32px 0 36px',
                  backgroundColor: isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.5)',
                  border: isLight ? '1.5px solid #cbd5e1' : '1px solid rgba(214, 190, 102, 0.3)',
                  borderRadius: '10px',
                  color: isLight ? '#0f172a' : '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Ank Filter Tabs for Panas (All, 1-9, 0) */}
            {isPanaList && options.length > 20 && (
              <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: '2px',
                WebkitOverflowScrolling: 'touch'
              }}>
                {['ALL', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((ank) => {
                  const isActive = selectedAnk === ank;
                  return (
                    <button
                      key={ank}
                      type="button"
                      onClick={() => setSelectedAnk(ank)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: isActive
                          ? '1.5px solid #d97706'
                          : isLight
                          ? '1px solid #cbd5e1'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isActive
                          ? '#fef3c7'
                          : isLight
                          ? '#f8fafc'
                          : 'rgba(255, 255, 255, 0.04)',
                        color: isActive ? '#b45309' : isLight ? '#475569' : '#9ca3af',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {ank === 'ALL' ? 'All' : `Ank ${ank}`}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Options Grid (Scrollable and 100% contained in bottom sheet) */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: options.length <= 10 ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
            gap: '8px',
            WebkitOverflowScrolling: 'touch'
          }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(value) === String(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    style={{
                      padding: '11px 4px',
                      backgroundColor: isSelected
                        ? '#fef3c7'
                        : isLight
                        ? '#f8fafc'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected
                        ? '1.5px solid #d97706'
                        : isLight
                        ? '1px solid #e2e8f0'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      color: isSelected
                        ? '#b45309'
                        : isLight
                        ? '#0f172a'
                        : '#ffffff',
                      fontWeight: isSelected ? '900' : '700',
                      fontSize: isPanaList ? '14px' : '16px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.1s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </button>
                );
              })
            ) : (
              <div style={{
                gridColumn: '1 / -1',
                padding: '28px 16px',
                textAlign: 'center',
                color: isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '13px'
              }}>
                No matching number found.
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSelect(search)}
                    style={{
                      marginTop: '12px',
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #d97706',
                      borderRadius: '8px',
                      color: '#b45309',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Use "{search}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 700,
          color: isLight ? '#64748b' : 'var(--color-gold, #d6be66)',
          marginBottom: '5px'
        }}>
          {label}
        </label>
      )}

      {/* Trigger Button Field */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '46px',
          padding: '0 12px',
          background: disabled
            ? isLight ? '#f1f5f9' : 'rgba(0, 0, 0, 0.2)'
            : isLight ? '#f8fafc' : 'rgba(0, 0, 0, 0.4)',
          border: disabled
            ? isLight ? '1.5px dashed #cbd5e1' : '1.5px dashed rgba(255, 255, 255, 0.15)'
            : isLight ? '1.5px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: isLight ? '#0f172a' : '#ffffff',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span style={{
          fontSize: '14.5px',
          fontWeight: value ? '800' : '500',
          color: value
            ? isLight ? '#0f172a' : 'var(--color-gold, #d6be66)'
            : isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.4)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {value ? value : placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Clear"
            >
              <X size={15} />
            </button>
          )}

          <ChevronDown
            size={17}
            style={{
              color: isLight ? '#64748b' : 'rgba(255, 255, 255, 0.7)'
            }}
          />
        </div>
      </div>

      {/* Hidden input for form submission validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
        />
      )}

      {/* Portaled Bottom Sheet Modal */}
      {modalContent}
    </div>
  );
};

export default SearchableSelect;
