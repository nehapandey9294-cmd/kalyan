import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, Filter, Check, Trash2 } from 'lucide-react';
import SearchableSelect, { SINGLE_PANAS, DOUBLE_PANAS, TRIPLE_PANAS } from '../../components/common/SearchableSelect';

// Calculate the sum modulo 10 for a pana (Matka digit)
const getPanaDigit = (pana) => {
  const sum = pana.split('').reduce((acc, char) => acc + parseInt(char, 10), 0);
  return String(sum % 10);
};

const PanaPanel = ({ session, points, onAddBids, minBid, maxBid, defaultType = 'Single Pana' }) => {
  const [subType, setSubType] = useState(defaultType);

  React.useEffect(() => {
    if (defaultType === 'Single Pana' || defaultType === 'Double Pana' || defaultType === 'Triple Pana') {
      setSubType(defaultType);
    }
  }, [defaultType]);
  const [directPana, setDirectPana] = useState('');
  const [selectedDigitFilter, setSelectedDigitFilter] = useState('ALL'); // 'ALL' or '0'-'9'
  const [selectedPanas, setSelectedPanas] = useState([]);

  // Active pana list based on selected subtype
  const activePanaList = useMemo(() => {
    if (subType === 'Single Pana') return SINGLE_PANAS;
    if (subType === 'Double Pana') return DOUBLE_PANAS;
    return TRIPLE_PANAS;
  }, [subType]);

  // Filtered pana list by digit filter
  const displayedPanas = useMemo(() => {
    if (selectedDigitFilter === 'ALL') return activePanaList;
    return activePanaList.filter(p => getPanaDigit(p) === selectedDigitFilter);
  }, [activePanaList, selectedDigitFilter]);

  // Handle single direct pana add
  const handleAddDirect = (e) => {
    e.preventDefault();
    const clean = directPana.trim();
    if (!/^\d{3}$/.test(clean)) {
      alert('Please enter a valid 3-digit Pana');
      return;
    }
    if (!activePanaList.includes(clean)) {
      alert(`Invalid ${subType} number: ${clean}`);
      return;
    }

    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }

    onAddBids([{
      game_type: subType,
      session,
      open_digit: 'NA',
      close_digit: 'NA',
      open_pana: session === 'Open' ? clean : 'NA',
      close_pana: session === 'Close' ? clean : 'NA',
      display_number: clean,
      points_action: pts
    }]);

    setDirectPana('');
  };

  // Toggle selection of a pana chip
  const togglePanaChip = (p) => {
    setSelectedPanas(prev => {
      if (prev.includes(p)) {
        return prev.filter(x => x !== p);
      } else {
        return [...prev, p];
      }
    });
  };

  // Select all currently displayed panas
  const handleSelectAllDisplayed = () => {
    const combined = Array.from(new Set([...selectedPanas, ...displayedPanas]));
    setSelectedPanas(combined);
  };

  // Clear selections
  const handleClearSelections = () => {
    setSelectedPanas([]);
  };

  // Add all selected chips to cart
  const handleAddSelectedToCart = () => {
    if (selectedPanas.length === 0) {
      alert('Please select at least one Pana');
      return;
    }
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }

    const bids = selectedPanas.map(p => ({
      game_type: subType,
      session,
      open_digit: 'NA',
      close_digit: 'NA',
      open_pana: session === 'Open' ? p : 'NA',
      close_pana: session === 'Close' ? p : 'NA',
      display_number: p,
      points_action: pts
    }));

    onAddBids(bids);
    setSelectedPanas([]);
  };

  const totalPoints = selectedPanas.length * (parseInt(points, 10) || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Subtype Selector Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.3)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {['Single Pana', 'Double Pana', 'Triple Pana'].map((type) => {
          const isActive = subType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSubType(type);
                setSelectedPanas([]);
                setDirectPana('');
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive
                  ? 'linear-gradient(135deg, var(--color-gold, #d6be66), #a08432)'
                  : 'transparent',
                color: isActive ? '#000' : 'var(--text-secondary, #9ca3af)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} style={{ opacity: isActive ? 1 : 0.6 }} />
              {type}
            </button>
          );
        })}
      </div>

      {/* Direct Quick Entry */}
      <form onSubmit={handleAddDirect} style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            color: 'var(--text-secondary, #9ca3af)',
            marginBottom: '6px',
            fontWeight: 600
          }}>
            Quick Enter {subType} (3 Digits)
          </label>
          <SearchableSelect
            placeholder={`Search or type ${subType}...`}
            options={activePanaList}
            value={directPana}
            onChange={(val) => setDirectPana(val)}
            maxLength={3}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            height: '46px'
          }}
        >
          <Plus size={18} /> Add to Bet List
        </button>
      </form>

      {/* Bulk Digit Filter Grid */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--color-gold, #d6be66)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
              Filter by Pana Total (Ank):
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSelectAllDisplayed}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Select Shown ({displayedPanas.length})
            </button>
            {selectedPanas.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelections}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={12} /> Clear ({selectedPanas.length})
              </button>
            )}
          </div>
        </div>

        {/* Ank Tabs: ALL, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '14px'
        }}>
          {['ALL', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(d => {
            const isSelected = selectedDigitFilter === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDigitFilter(d)}
                style={{
                  minWidth: '40px',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: isSelected
                    ? '1px solid var(--color-gold, #d6be66)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected
                    ? 'rgba(214, 190, 102, 0.2)'
                    : 'rgba(255,255,255,0.03)',
                  color: isSelected ? 'var(--color-gold, #d6be66)' : '#9ca3af',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {d === 'ALL' ? 'All' : `Ank ${d}`}
              </button>
            );
          })}
        </div>

        {/* Panas Chip Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
          gap: '8px',
          maxHeight: '280px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {displayedPanas.map(p => {
            const isSelected = selectedPanas.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePanaChip(p)}
                style={{
                  padding: '10px 4px',
                  borderRadius: '8px',
                  border: isSelected
                    ? '1.5px solid var(--color-gold, #d6be66)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(214, 190, 102, 0.25), rgba(214, 190, 102, 0.1))'
                    : 'rgba(0, 0, 0, 0.25)',
                  color: isSelected ? 'var(--color-gold, #d6be66)' : '#e5e7eb',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
                {isSelected && <Check size={12} color="var(--color-gold, #d6be66)" />}
              </button>
            );
          })}
        </div>

        {/* Selected Count & Add Button */}
        {selectedPanas.length > 0 && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>Selected: </span>
              <strong style={{ color: '#fff', fontSize: '15px' }}>{selectedPanas.length} Panas</strong>
              <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '12px' }}>Total Points: </span>
              <strong style={{ color: 'var(--color-gold, #d6be66)', fontSize: '15px' }}>₹{totalPoints}</strong>
            </div>

            <button
              type="button"
              onClick={handleAddSelectedToCart}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-gold, #d6be66), #b59b3d)',
                color: '#000',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(214, 190, 102, 0.3)'
              }}
            >
              <Plus size={16} /> Add {selectedPanas.length} Panas to Bet List
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PanaPanel;
