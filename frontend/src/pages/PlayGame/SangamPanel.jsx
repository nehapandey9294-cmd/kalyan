import React, { useState } from 'react';
import { Plus, Shuffle, Split } from 'lucide-react';
import SearchableSelect, { SINGLE_DIGITS, ALL_PANAS } from '../../components/common/SearchableSelect';

const SangamPanel = ({ points, onAddBids, minBid, maxBid, defaultType = 'Half Sangam' }) => {
  const [sangamType, setSangamType] = useState(defaultType);

  React.useEffect(() => {
    if (defaultType === 'Half Sangam' || defaultType === 'Full Sangam') {
      setSangamType(defaultType);
    }
  }, [defaultType]);
  const [halfType, setHalfType] = useState('OD_CP'); // 'OD_CP' (Open Digit + Close Pana) or 'OP_CD' (Open Pana + Close Digit)

  // Half Sangam fields
  const [openDigit, setOpenDigit] = useState('');
  const [closePana, setClosePana] = useState('');
  const [openPana, setOpenPana] = useState('');
  const [closeDigit, setCloseDigit] = useState('');

  // Full Sangam fields
  const [fullOpenPana, setFullOpenPana] = useState('');
  const [fullClosePana, setFullClosePana] = useState('');

  const handleAddBid = (e) => {
    e.preventDefault();
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < minBid || pts > maxBid) {
      alert(`Points must be between ₹${minBid} and ₹${maxBid}`);
      return;
    }

    if (sangamType === 'Half Sangam') {
      if (halfType === 'OD_CP') {
        if (!/^\d$/.test(openDigit) || !/^\d{3}$/.test(closePana)) {
          alert('Please enter a valid Open Digit (0-9) and Close Pana (3 digits)');
          return;
        }
        onAddBids([{
          game_type: 'Half Sangam',
          session: 'Open',
          open_digit: openDigit,
          close_digit: 'NA',
          open_pana: 'NA',
          close_pana: closePana,
          display_number: `[OD: ${openDigit}] × [CP: ${closePana}]`,
          points_action: pts
        }]);
        setOpenDigit('');
        setClosePana('');
      } else {
        if (!/^\d{3}$/.test(openPana) || !/^\d$/.test(closeDigit)) {
          alert('Please enter a valid Open Pana (3 digits) and Close Digit (0-9)');
          return;
        }
        onAddBids([{
          game_type: 'Half Sangam',
          session: 'Close',
          open_digit: 'NA',
          close_digit: closeDigit,
          open_pana: openPana,
          close_pana: 'NA',
          display_number: `[OP: ${openPana}] × [CD: ${closeDigit}]`,
          points_action: pts
        }]);
        setOpenPana('');
        setCloseDigit('');
      }
    } else {
      // Full Sangam
      if (!/^\d{3}$/.test(fullOpenPana) || !/^\d{3}$/.test(fullClosePana)) {
        alert('Please enter valid 3-digit Open Pana and Close Pana');
        return;
      }
      onAddBids([{
        game_type: 'Full Sangam',
        session: 'Close',
        open_digit: 'NA',
        close_digit: 'NA',
        open_pana: fullOpenPana,
        close_pana: fullClosePana,
        display_number: `[OP: ${fullOpenPana}] × [CP: ${fullClosePana}]`,
        points_action: pts
      }]);
      setFullOpenPana('');
      setFullClosePana('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sangam Type Tabs */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.3)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {['Half Sangam', 'Full Sangam'].map((type) => {
          const isActive = sangamType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSangamType(type)}
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
              <Split size={15} style={{ opacity: isActive ? 1 : 0.6 }} />
              {type}
            </button>
          );
        })}
      </div>

      {/* Half Sangam Sub-Mode (OD_CP vs OP_CD) */}
      {sangamType === 'Half Sangam' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={() => setHalfType('OD_CP')}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: halfType === 'OD_CP'
                ? '1px solid var(--color-gold, #d6be66)'
                : '1px solid rgba(255,255,255,0.08)',
              background: halfType === 'OD_CP'
                ? 'rgba(214, 190, 102, 0.15)'
                : 'rgba(255,255,255,0.02)',
              color: halfType === 'OD_CP' ? 'var(--color-gold, #d6be66)' : '#9ca3af',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Open Digit + Close Pana
          </button>
          <button
            type="button"
            onClick={() => setHalfType('OP_CD')}
            style={{
              padding: '10px',
              borderRadius: '10px',
              border: halfType === 'OP_CD'
                ? '1px solid var(--color-gold, #d6be66)'
                : '1px solid rgba(255,255,255,0.08)',
              background: halfType === 'OP_CD'
                ? 'rgba(214, 190, 102, 0.15)'
                : 'rgba(255,255,255,0.02)',
              color: halfType === 'OP_CD' ? 'var(--color-gold, #d6be66)' : '#9ca3af',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Open Pana + Close Digit
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleAddBid} style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {sangamType === 'Half Sangam' ? (
          halfType === 'OD_CP' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                  Open Digit (0-9)
                </label>
                <SearchableSelect
                  placeholder="Select Digit"
                  options={SINGLE_DIGITS}
                  value={openDigit}
                  onChange={(val) => setOpenDigit(val)}
                  maxLength={1}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                  Close Pana (3 Digits)
                </label>
                <SearchableSelect
                  placeholder="Select Close Pana"
                  options={ALL_PANAS}
                  value={closePana}
                  onChange={(val) => setClosePana(val)}
                  maxLength={3}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                  Open Pana (3 Digits)
                </label>
                <SearchableSelect
                  placeholder="Select Open Pana"
                  options={ALL_PANAS}
                  value={openPana}
                  onChange={(val) => setOpenPana(val)}
                  maxLength={3}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                  Close Digit (0-9)
                </label>
                <SearchableSelect
                  placeholder="Select Digit"
                  options={SINGLE_DIGITS}
                  value={closeDigit}
                  onChange={(val) => setCloseDigit(val)}
                  maxLength={1}
                />
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                Open Pana (3 Digits)
              </label>
              <SearchableSelect
                placeholder="Select Open Pana"
                options={ALL_PANAS}
                value={fullOpenPana}
                onChange={(val) => setFullOpenPana(val)}
                maxLength={3}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
                Close Pana (3 Digits)
              </label>
              <SearchableSelect
                placeholder="Select Close Pana"
                options={ALL_PANAS}
                value={fullClosePana}
                onChange={(val) => setFullClosePana(val)}
                maxLength={3}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--color-gold, #d6be66), #b59b3d)',
            color: '#000',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(214, 190, 102, 0.3)'
          }}
        >
          <Plus size={18} /> Add {sangamType} to Bet List
        </button>
      </form>
    </div>
  );
};

export default SangamPanel;
