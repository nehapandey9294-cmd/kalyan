import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

const BidCartTable = ({
  bids = [],
  onRemoveBid,
  onClearCart,
  onSubmitBids,
  isSubmitting = false,
  walletBalance = 0
}) => {
  const totalPoints = bids.reduce((acc, b) => acc + (parseInt(b.points_action, 10) || 0), 0);
  const isInsufficient = walletBalance > 0 && walletBalance < totalPoints;

  // Render Digit / Sangam with distinct colored chips so numbers never run into the Amount column
  const renderDigitBadge = (b) => {
    // Half Sangam: OD + CP
    if (b.game_type === 'Half Sangam' && b.open_digit && b.open_digit !== 'NA' && b.close_pana && b.close_pana !== 'NA') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{
            background: '#fef3c7',
            color: '#b45309',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid rgba(217, 119, 6, 0.3)'
          }}>
            OD: {b.open_digit}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800 }}>×</span>
          <span style={{
            background: '#ecfdf5',
            color: '#047857',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            CP: {b.close_pana}
          </span>
        </div>
      );
    }

    // Half Sangam: OP + CD
    if (b.game_type === 'Half Sangam' && b.open_pana && b.open_pana !== 'NA' && b.close_digit && b.close_digit !== 'NA') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{
            background: '#ecfdf5',
            color: '#047857',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            OP: {b.open_pana}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800 }}>×</span>
          <span style={{
            background: '#fef3c7',
            color: '#b45309',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid rgba(217, 119, 6, 0.3)'
          }}>
            CD: {b.close_digit}
          </span>
        </div>
      );
    }

    // Full Sangam: OP + CP
    if (b.game_type === 'Full Sangam' || (b.open_pana && b.open_pana !== 'NA' && b.close_pana && b.close_pana !== 'NA')) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{
            background: '#ecfdf5',
            color: '#047857',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            OP: {b.open_pana}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 800 }}>×</span>
          <span style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 800,
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            CP: {b.close_pana}
          </span>
        </div>
      );
    }

    // Default for Single Digit, Jodi, Pana, etc.
    const num = b.display_number || b.open_digit || b.open_pana || b.close_digit || b.close_pana;
    return (
      <span style={{
        fontWeight: 900,
        fontSize: '15px',
        color: '#0f172a',
        letterSpacing: '0.5px'
      }}>
        {num}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
      {/* CARD 2: STAGED BETS TABLE (Polished responsive card matching design) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        padding: '16px 18px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.16)',
        border: '1px solid rgba(226, 232, 240, 0.8)'
      }}>
        {/* Table Header Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 0.9fr) minmax(0, 0.9fr) 34px',
          alignItems: 'center',
          paddingBottom: '12px',
          borderBottom: '1.5px solid #e2e8f0',
          color: '#64748b',
          fontSize: '12.5px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <span>Digit</span>
          <span style={{ textAlign: 'center' }}>Amount</span>
          <span style={{ textAlign: 'center' }}>Game Type</span>
          <div style={{ textAlign: 'right' }}>
            {bids.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                disabled={isSubmitting}
                title="Clear all bets"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.15s ease'
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Table Body */}
        {bids.length === 0 ? (
          <div style={{
            padding: '28px 12px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13.5px',
            fontWeight: 500
          }}>
            No bets added yet. Select numbers above to add bets.
          </div>
        ) : (
          <div style={{
            maxHeight: '280px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch'
          }}>
            {bids.map((b, idx) => {
              const displayType = b.session || b.game_type;
              const isSessionOpen = b.session === 'Open';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 0.9fr) minmax(0, 0.9fr) 34px',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: idx === bids.length - 1 ? 'none' : '1px solid #f1f5f9',
                    fontSize: '14px',
                    color: '#1e293b'
                  }}
                >
                  {/* Digit Column */}
                  <div style={{ minWidth: 0, paddingRight: '6px' }}>
                    {renderDigitBadge(b)}
                  </div>

                  {/* Amount Column (Centered Pill with currency symbol) */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 10px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      color: '#0f172a'
                    }}>
                      ₹{b.points_action}
                    </span>
                  </div>

                  {/* Game Type / Session Column (Centered Status Badge) */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      background: isSessionOpen ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                      color: isSessionOpen ? '#047857' : '#b45309',
                      border: isSessionOpen
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      {displayType}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveBid(idx)}
                      disabled={isSubmitting}
                      title="Delete this bet"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        transition: 'opacity 0.15s ease'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Insufficient Funds Warning */}
      {isInsufficient && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '10px 14px',
          borderRadius: '12px',
          fontSize: '12.5px',
          fontWeight: 600
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Insufficient wallet balance. Total ₹{totalPoints} exceeds balance ₹{walletBalance}.</span>
        </div>
      )}

      {/* BOTTOM SUMMARY & SUBMIT BAR (Matching User Mobile Screenshot) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: '#ffffff',
        borderRadius: '18px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.16)',
        border: '1px solid rgba(226, 232, 240, 0.8)'
      }}>
        {/* Live Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div>
            <span style={{
              display: 'block',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: 800,
              letterSpacing: '0.6px'
            }}>
              BIDS
            </span>
            <span style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.1
            }}>
              {bids.length}
            </span>
          </div>

          <div>
            <span style={{
              display: 'block',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: 800,
              letterSpacing: '0.6px'
            }}>
              POINTS
            </span>
            <span style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.1
            }}>
              ₹{totalPoints}
            </span>
          </div>
        </div>

        {/* Prominent SUBMIT Button */}
        <button
          type="button"
          onClick={onSubmitBids}
          disabled={isSubmitting || bids.length === 0}
          style={{
            padding: '12px 34px',
            borderRadius: '14px',
            border: 'none',
            background: bids.length === 0
              ? '#cbd5e1'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '15px',
            cursor: bids.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: bids.length > 0 ? '0 4px 14px rgba(245, 158, 11, 0.38)' : 'none',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.15s ease'
          }}
        >
          {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
        </button>
      </div>
    </div>
  );
};

export default BidCartTable;
