import React, { useState, useMemo } from 'react';
import { Plus, Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';
import { generateSPMotor, generateDPMotor } from './panaUtils';

const MotorPanel = ({ session, points, onAddBids, minBid, maxBid }) => {
  const [motorType, setMotorType] = useState('SP Motor'); // 'SP Motor' or 'DP Motor'
  const [digitsInput, setDigitsInput] = useState('');

  // Handle digit button click on keypad
  const handleDigitToggle = (d) => {
    if (digitsInput.includes(d)) {
      setDigitsInput(digitsInput.split('').filter(x => x !== d).join(''));
    } else {
      setDigitsInput(digitsInput + d);
    }
  };

  // Generated Panas preview
  const generatedPanas = useMemo(() => {
    if (motorType === 'SP Motor') {
      return generateSPMotor(digitsInput);
    } else {
      return generateDPMotor(digitsInput);
    }
  }, [motorType, digitsInput]);

  const minRequiredDigits = motorType === 'SP Motor' ? 3 : 2;
  const isReady = digitsInput.length >= minRequiredDigits && generatedPanas.length > 0;
  const pts = parseInt(points, 10) || 0;
  const totalPoints = generatedPanas.length * pts;

  // Add all generated panas to cart
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!isReady) {
      alert(`Please select at least ${minRequiredDigits} unique digits for ${motorType}`);
      return;
    }
    if (pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }

    const gameType = motorType === 'SP Motor' ? 'Single Pana' : 'Double Pana';
    const bids = generatedPanas.map(p => ({
      game_type: gameType,
      session,
      open_digit: 'NA',
      close_digit: 'NA',
      open_pana: session === 'Open' ? p : 'NA',
      close_pana: session === 'Close' ? p : 'NA',
      display_number: p,
      points_action: pts
    }));

    onAddBids(bids);
    setDigitsInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* SP / DP Motor Tab */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.3)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {['SP Motor', 'DP Motor'].map((type) => {
          const isActive = motorType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                setMotorType(type);
                setDigitsInput('');
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
              <Cpu size={15} style={{ opacity: isActive ? 1 : 0.6 }} />
              {type}
            </button>
          );
        })}
      </div>

      {/* Digits Keypad & Selection */}
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
          marginBottom: '12px'
        }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb', display: 'block' }}>
              Select Digits for {motorType}
            </label>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {motorType === 'SP Motor' ? 'Select min 3 digits' : 'Select min 2 digits'} (auto generates all combinations)
            </span>
          </div>

          {digitsInput.length > 0 && (
            <button
              type="button"
              onClick={() => setDigitsInput('')}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={12} /> Clear
            </button>
          )}
        </div>

        {/* Selected Digits Display Box */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1.5px dashed rgba(214, 190, 102, 0.4)',
          borderRadius: '10px',
          padding: '12px 16px',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {digitsInput.length === 0 ? (
            <span style={{ color: '#6b7280', fontSize: '13px', fontStyle: 'italic' }}>
              Click digits below to build {motorType}...
            </span>
          ) : (
            digitsInput.split('').map((d) => (
              <span
                key={d}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--color-gold, #d6be66), #b59b3d)',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '16px'
                }}
              >
                {d}
              </span>
            ))
          )}
        </div>

        {/* Digit Keypad (1 to 9, then 0) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => {
            const isSelected = digitsInput.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => handleDigitToggle(d)}
                style={{
                  height: '46px',
                  borderRadius: '10px',
                  border: isSelected
                    ? '1.5px solid var(--color-gold, #d6be66)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: isSelected
                    ? 'rgba(214, 190, 102, 0.25)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? 'var(--color-gold, #d6be66)' : '#fff',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated Combinations Preview */}
      {digitsInput.length > 0 && (
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
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
              Generated Panas ({generatedPanas.length})
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-gold, #d6be66)' }}>
              ₹{pts} per Pana
            </span>
          </div>

          {generatedPanas.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
              Select at least {minRequiredDigits} unique digits to generate {motorType} panas.
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                paddingRight: '4px',
                marginBottom: '16px'
              }}>
                {generatedPanas.map(p => (
                  <div
                    key={p}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(214, 190, 102, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--color-gold, #d6be66)'
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>

              {/* Bottom Summary & Add Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div>
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>Total Panas: </span>
                  <strong style={{ color: '#fff', fontSize: '15px' }}>{generatedPanas.length}</strong>
                  <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '12px' }}>Total Amount: </span>
                  <strong style={{ color: 'var(--color-gold, #d6be66)', fontSize: '15px' }}>₹{totalPoints}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!isReady}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isReady
                      ? 'linear-gradient(135deg, var(--color-gold, #d6be66), #b59b3d)'
                      : 'rgba(255,255,255,0.1)',
                    color: isReady ? '#000' : '#6b7280',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isReady ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isReady ? '0 4px 12px rgba(214, 190, 102, 0.3)' : 'none'
                  }}
                >
                  <Plus size={16} /> Add All {generatedPanas.length} to Bet List
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MotorPanel;
