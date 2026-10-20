import React from 'react';
import { AlertCircle, CheckCircle2, Wallet, XCircle, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MaterialDialog = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  showCancel = false
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const isInsufficient = type === 'insufficient_funds';

  // Theme configurations based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={36} style={{ color: '#34d399' }} />,
          iconBg: 'rgba(52, 211, 153, 0.15)',
          borderColor: 'rgba(52, 211, 153, 0.3)',
          glowColor: 'rgba(52, 211, 153, 0.2)',
          defaultTitle: 'Success!',
          defaultConfirm: 'OK'
        };
      case 'insufficient_funds':
        return {
          icon: <Wallet size={36} style={{ color: '#f59e0b' }} />,
          iconBg: 'rgba(245, 158, 11, 0.15)',
          borderColor: 'rgba(245, 158, 11, 0.35)',
          glowColor: 'rgba(245, 158, 11, 0.25)',
          defaultTitle: 'Insufficient Wallet Balance',
          defaultConfirm: 'ADD FUNDS'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={36} style={{ color: '#f59e0b' }} />,
          iconBg: 'rgba(245, 158, 11, 0.15)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          glowColor: 'rgba(245, 158, 11, 0.2)',
          defaultTitle: 'Attention',
          defaultConfirm: 'OK'
        };
      case 'error':
      default:
        return {
          icon: <XCircle size={36} style={{ color: '#f87171' }} />,
          iconBg: 'rgba(248, 113, 113, 0.15)',
          borderColor: 'rgba(248, 113, 113, 0.3)',
          glowColor: 'rgba(248, 113, 113, 0.2)',
          defaultTitle: 'Error',
          defaultConfirm: 'OK'
        };
    }
  };

  const config = getTypeConfig();
  const dialogTitle = title || config.defaultTitle;
  const dialogConfirmText = confirmText || config.defaultConfirm;

  const handleConfirmAction = () => {
    if (onConfirm) {
      onConfirm();
    } else if (isInsufficient) {
      if (onClose) onClose();
      navigate('/add-fund');
    } else {
      if (onClose) onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(5, 12, 22, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#0d192b',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(214, 190, 102, 0.08), transparent 70%)',
        borderRadius: '20px',
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px ${config.glowColor}`,
        padding: '24px 20px 20px 20px',
        textAlign: 'center',
        position: 'relative',
        color: '#ffffff',
        transform: 'translateY(0)',
        animation: 'slideUp 0.25s ease-out'
      }}>
        {/* Close Icon (Top Right) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Header Icon Badge */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          backgroundColor: config.iconBg,
          border: `1px solid ${config.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: `0 0 20px ${config.glowColor}`
        }}>
          {config.icon}
        </div>

        {/* Title */}
        <h4 style={{
          fontSize: '1.25rem',
          fontWeight: '800',
          margin: '0 0 10px 0',
          color: '#ffffff',
          letterSpacing: '0.01em'
        }}>
          {dialogTitle}
        </h4>

        {/* Message Content */}
        <div style={{
          fontSize: '0.9rem',
          color: 'rgba(255, 255, 255, 0.8)',
          lineHeight: '1.5',
          marginBottom: '24px'
        }}>
          {message}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          {(showCancel || isInsufficient) && (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
            >
              {cancelText || 'Cancel'}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmAction}
            className={isInsufficient ? 'btn-gold' : type === 'success' ? 'btn-gold' : 'btn-gold'}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.9rem',
              fontWeight: '800',
              cursor: 'pointer',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: isInsufficient 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                : type === 'error'
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'var(--app-gradient-primary, linear-gradient(135deg, #d6be66 0%, #10b981 100%))',
              color: '#0b1a30',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
            }}
          >
            {isInsufficient && <Wallet size={16} />}
            <span>{dialogConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialDialog;
