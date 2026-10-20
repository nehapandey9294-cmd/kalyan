import React, { useState } from 'react';
import { Plus, Sparkles, Filter } from 'lucide-react';
import SearchableSelect, { JODI_DIGITS } from '../../components/common/SearchableSelect';

const JodiDigitPanel = ({ session, points, onAddBids, minBid, maxBid }) => {
  const [jodiInput, setJodiInput] = useState('');
  const [selectedJodis, setSelectedJodis] = useState([]);
  const [filterType, setFilterType] = useState('all');

  // Handle single Jodi add
  const handleAddSingle = (e) => {
    e.preventDefault();
    if (!/^\d{2}$/.test(jodiInput)) {
      alert('Please enter a valid 2-digit Jodi (00-99)');
      return;
    }
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }

    onAddBids([{
      game_type: 'Jodi Digit',
      session: 'Close', // Jodi is whole market (Close)
      open_digit: jodiInput.charAt(0),
      close_digit: jodiInput.charAt(1),
      open_pana: 'NA',
      close_pana: 'NA',
      display_number: jodiInput,
      points_action: pts
    }]);

    setJodiInput('');
  };

  // Quick filters for Jodi generator
  const applyPresetFilter = (type) => {
    setFilterType(type);
    let filtered = [];
    if (type === 'double') {
      // 00, 11, 22, ... 99
      filtered = ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'];
    } else if (type === 'even_even') {
      filtered = JODI_DIGITS.filter(j => parseInt(j[0], 10) % 2 === 0 && parseInt(j[1], 10) % 2 === 0);
    } else if (type === 'odd_odd') {
      filtered = JODI_DIGITS.filter(j => parseInt(j[0], 10) % 2 !== 0 && parseInt(j[1], 10) % 2 !== 0);
    } else if (type === 'red_bracket') {
      // Red bracket jodis (e.g. 00, 11, 22, 33, 44, 55, 66, 77, 88, 99 and cut jodis like 05, 50, 16, 61, 27, 72, 38, 83, 49, 94)
      const reds = new Set(['00', '11', '22', '33', '44', '55', '66', '77', '88', '99', '05', '50', '16', '61', '27', '72', '38', '83', '49', '94']);
      filtered = JODI_DIGITS.filter(j => reds.has(j));
    }
    setSelectedJodis(filtered);
  };

  const toggleJodiChip = (jodi) => {
    if (selectedJodis.includes(jodi)) {
      setSelectedJodis(prev => prev.filter(j => j !== jodi));
    } else {
      setSelectedJodis(prev => [...prev, jodi]);
    }
  };

  const handleAddMultiple = () => {
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }
    if (selectedJodis.length === 0) {
      alert('Please select at least one Jodi from the list');
      return;
    }

    const bidsToAdd = selectedJodis.map(j => ({
      game_type: 'Jodi Digit',
      session: 'Close',
      open_digit: j.charAt(0),
      close_digit: j.charAt(1),
      open_pana: 'NA',
      close_pana: 'NA',
      display_number: j,
      points_action: pts
    }));

    onAddBids(bidsToAdd);
    setSelectedJodis([]);
  };

  const ptsVal = parseInt(points, 10) || 0;
  const totalPoints = selectedJodis.length * ptsVal;

  return (
    <div>
      {/* Direct Jodi Entry */}
      <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--color-gold, #d6be66)', fontWeight: '700' }}>
          Direct Jodi Input (00-99)
        </h4>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <SearchableSelect
              label="Select or Type Jodi"
              placeholder="e.g. 52, 00, 78..."
              options={JODI_DIGITS}
              value={jodiInput}
              onChange={(val) => setJodiInput(val)}
            />
          </div>
          <button
            type="button"
            onClick={handleAddSingle}
            disabled={!/^\d{2}$/.test(jodiInput)}
            style={{
              padding: '11px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: /^\d{2}$/.test(jodiInput) ? 'var(--color-gold, #d6be66)' : 'rgba(255,255,255,0.1)',
              color: /^\d{2}$/.test(jodiInput) ? '#000000' : 'rgba(255,255,255,0.4)',
              fontSize: '0.88rem',
              fontWeight: '700',
              cursor: /^\d{2}$/.test(jodiInput) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} /> Add to Bet List
          </button>
        </div>
      </div>

      {/* Quick Jodi Batch Generator */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} style={{ color: 'var(--color-gold, #d6be66)' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
              Bulk Jodi Generator
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => applyPresetFilter('double')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'double' ? '1px solid var(--color-gold, #d6be66)' : '1px solid rgba(255,255,255,0.15)',
                background: filterType === 'double' ? 'rgba(214, 190, 102, 0.2)' : 'rgba(255,255,255,0.06)',
                color: filterType === 'double' ? 'var(--color-gold, #d6be66)' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Double (00-99)
            </button>
            <button
              type="button"
              onClick={() => applyPresetFilter('even_even')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'even_even' ? '1px solid var(--color-gold, #d6be66)' : '1px solid rgba(255,255,255,0.15)',
                background: filterType === 'even_even' ? 'rgba(214, 190, 102, 0.2)' : 'rgba(255,255,255,0.06)',
                color: filterType === 'even_even' ? 'var(--color-gold, #d6be66)' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Even-Even
            </button>
            <button
              type="button"
              onClick={() => applyPresetFilter('odd_odd')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'odd_odd' ? '1px solid var(--color-gold, #d6be66)' : '1px solid rgba(255,255,255,0.15)',
                background: filterType === 'odd_odd' ? 'rgba(214, 190, 102, 0.2)' : 'rgba(255,255,255,0.06)',
                color: filterType === 'odd_odd' ? 'var(--color-gold, #d6be66)' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Odd-Odd
            </button>
            <button
              type="button"
              onClick={() => applyPresetFilter('red_bracket')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: filterType === 'red_bracket' ? '1px solid var(--color-gold, #d6be66)' : '1px solid rgba(255,255,255,0.15)',
                background: filterType === 'red_bracket' ? 'rgba(214, 190, 102, 0.2)' : 'rgba(255,255,255,0.06)',
                color: filterType === 'red_bracket' ? 'var(--color-gold, #d6be66)' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Red Bracket
            </button>
            {selectedJodis.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedJodis([])}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Selected Jodis preview chips */}
        {selectedJodis.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              {selectedJodis.map(j => (
                <span
                  key={j}
                  onClick={() => toggleJodiChip(j)}
                  style={{
                    backgroundColor: 'rgba(214, 190, 102, 0.2)',
                    color: 'var(--color-gold, #d6be66)',
                    border: '1px solid rgba(214, 190, 102, 0.4)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Click to remove"
                >
                  {j} ✕
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                Selected: <strong>{selectedJodis.length} Jodis</strong> (@ ₹{points || '10'} each)
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-gold, #d6be66)' }}>
                Total: ₹{totalPoints.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddMultiple}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--color-gold, #d6be66)',
                color: '#000000',
                fontSize: '0.92rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={18} /> Add All {selectedJodis.length} Jodis to Bet List (₹{totalPoints.toLocaleString('en-IN')})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JodiDigitPanel;
