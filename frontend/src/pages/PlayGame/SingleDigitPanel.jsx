import React, { useState } from 'react';
import { Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { SINGLE_DIGITS } from './panaUtils';

const SingleDigitPanel = ({ session, points, onAddBids, minBid, maxBid }) => {
  const [selectedDigits, setSelectedDigits] = useState([]);
  const [singleDigitInput, setSingleDigitInput] = useState('');

  // Toggle selection of a digit chip
  const toggleDigit = (d) => {
    setSelectedDigits(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  // Quick preset filters
  const handleSelectPreset = (type) => {
    if (type === 'all') {
      setSelectedDigits([...SINGLE_DIGITS]);
    } else if (type === 'even') {
      setSelectedDigits(['0', '2', '4', '6', '8']);
    } else if (type === 'odd') {
      setSelectedDigits(['1', '3', '5', '7', '9']);
    }
  };

  // Add selected digits to the bet list
  const handleAddSelectedToBetList = () => {
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }
    if (selectedDigits.length === 0) {
      alert('Please select at least one digit (0-9)');
      return;
    }

    const bidsToAdd = selectedDigits.map(d => ({
      game_type: 'Single Digit',
      session,
      open_digit: session === 'Open' ? d : 'NA',
      close_digit: session === 'Close' ? d : 'NA',
      open_pana: 'NA',
      close_pana: 'NA',
      display_number: d,
      points_action: pts
    }));

    onAddBids(bidsToAdd);
    setSelectedDigits([]);
  };

  // Handle single direct input add
  const handleDirectAdd = (e) => {
    e.preventDefault();
    const d = singleDigitInput.trim();
    if (!/^\d$/.test(d)) {
      alert('Please enter a valid single digit (0-9)');
      return;
    }
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }

    onAddBids([{
      game_type: 'Single Digit',
      session,
      open_digit: session === 'Open' ? d : 'NA',
      close_digit: session === 'Close' ? d : 'NA',
      open_pana: 'NA',
      close_pana: 'NA',
      display_number: d,
      points_action: pts
    }]);

    setSingleDigitInput('');
  };

  const ptsVal = parseInt(points, 10) || 0;
  const totalAmount = selectedDigits.length * ptsVal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Quick Direct Digit Input Bar */}
      <form onSubmit={handleDirectAdd} style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '12px 14px'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px', fontWeight: 600 }}>
            Enter Single Digit (0-9)
          </label>
          <input
            type="number"
            min="0"
            max="9"
            placeholder="Type Digit (0-9)"
            value={singleDigitInput}
            onChange={(e) => setSingleDigitInput(e.target.value.slice(-1))}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              outline: 'none'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            alignSelf: 'flex-end',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--color-gold, #d6be66), #b59b3d)',
            color: '#000',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '42px',
            boxShadow: '0 4px 12px rgba(214, 190, 102, 0.3)'
          }}
        >
          <Plus size={16} /> Add to Bet List
        </button>
      </form>

      {/* Preset Batch Buttons (All, Even, Odd) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
          Or Select Digits below:
        </span>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSelectPreset('all')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All (0-9)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('even')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Even (0,2,4,6,8)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('odd')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Odd (1,3,5,7,9)
          </button>
          {selectedDigits.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDigits([])}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 0-9 Digit Selection Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px'
      }}>
        {SINGLE_DIGITS.map(d => {
          const isSelected = selectedDigits.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDigit(d)}
              style={{
                padding: '14px 6px',
                borderRadius: '12px',
                border: isSelected
                  ? '2px solid var(--color-gold, #d6be66)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(214, 190, 102, 0.3), rgba(214, 190, 102, 0.1))'
                  : 'rgba(0, 0, 0, 0.3)',
                color: isSelected ? 'var(--color-gold, #d6be66)' : '#fff',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(214, 190, 102, 0.2)' : 'none'
              }}
            >
              {d}
              {isSelected && <Check size={14} color="var(--color-gold, #d6be66)" />}
            </button>
          );
        })}
      </div>

      {/* Selected Digits Summary & Add to Bet List Button */}
      {selectedDigits.length > 0 && (
        <div style={{
          background: 'rgba(214, 190, 102, 0.08)',
          border: '1px solid rgba(214, 190, 102, 0.2)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Selected: </span>
            <strong style={{ color: '#fff', fontSize: '15px' }}>{selectedDigits.length} Digits </strong>
            <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '10px' }}>Total Points: </span>
            <strong style={{ color: 'var(--color-gold, #d6be66)', fontSize: '15px' }}>₹{totalAmount}</strong>
          </div>

          <button
            type="button"
            onClick={handleAddSelectedToBetList}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
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
            <Plus size={16} /> Add {selectedDigits.length} {selectedDigits.length === 1 ? 'Digit' : 'Digits'} to Bet List
          </button>
        </div>
      )}
    </div>
  );
};

export default SingleDigitPanel;
