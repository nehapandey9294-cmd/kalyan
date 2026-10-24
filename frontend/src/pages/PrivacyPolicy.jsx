import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Trash2, CheckCircle2, Mail, Phone, FileText, ExternalLink } from 'lucide-react';
import api from '../utils/api';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [appName, setAppName] = useState('Sara 777');
  const [contactEmail, setContactEmail] = useState('support@sara777.com');
  const [contactMobile, setContactMobile] = useState('');
  const [dataDeletionUrl, setDataDeletionUrl] = useState('/data-deletion');

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/app-info').then(res => {
      if (res.data?.success === '1' && res.data.data) {
        if (res.data.data.app_name) setAppName(res.data.data.app_name);
        if (res.data.data.mobile) setContactMobile(res.data.data.mobile);
        if (res.data.data.data_deletion_url) setDataDeletionUrl(res.data.data.data_deletion_url);
      }
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#09121f',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '24px 16px 80px 16px',
      boxSizing: 'border-box',
      background: 'radial-gradient(circle at top right, rgba(214, 190, 102, 0.12) 0%, transparent 60%), #09121f'
    }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Navigation / Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <Link
            to={dataDeletionUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f87171',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              padding: '8px 14px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: '700'
            }}
          >
            <Trash2 size={15} /> Data Deletion
          </Link>
        </div>

        {/* Hero Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(25, 38, 58, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(214, 190, 102, 0.25)',
          borderRadius: '20px',
          padding: '32px 24px',
          marginBottom: '28px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #d6be66 0%, #bca54e 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#09121f',
            marginBottom: '16px',
            boxShadow: '0 4px 15px rgba(214, 190, 102, 0.3)'
          }}>
            <Shield size={32} />
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '1.85rem',
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: '-0.02em'
          }}>
            Privacy Policy
          </h1>
          <p style={{
            margin: '0 0 14px 0',
            fontSize: '0.98rem',
            color: '#d6be66',
            fontWeight: '600'
          }}>
            {appName} (Package: Sara777.quizzes)
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.82rem',
            color: 'rgba(255, 255, 255, 0.65)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            padding: '6px 14px',
            borderRadius: '20px'
          }}>
            <span>Last Updated: October 2026</span>
            <span>•</span>
            <span>Google Play Policy Compliant</span>
          </div>
        </div>

        {/* Content Card */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '28px 24px',
          lineHeight: '1.65',
          fontSize: '0.94rem',
          color: 'rgba(255, 255, 255, 0.85)'
        }}>

          {/* Section 1 */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} style={{ color: '#d6be66' }} />
              1. Introduction & Overview
            </h2>
            <p>
              Welcome to <strong>{appName}</strong> ("we", "our", or "us"). We are committed to protecting your privacy and ensuring your personal information is treated with transparency, dignity, and high security. This Privacy Policy governs your use of our mobile application (Android Package: <code>Sara777.quizzes</code>) and associated web services.
            </p>
            <p>
              By accessing or using our application, you acknowledge that you have read, understood, and agree to the collection and use of your information in accordance with this policy.
            </p>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} style={{ color: '#d6be66' }} />
              2. Information We Collect
            </h2>
            <p>We only collect data necessary to provide and enhance our services:</p>
            <ul style={{ paddingLeft: '20px', margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Personal Identifiers:</strong> Name, 10-digit mobile phone number, and optional email address provided during account registration.</li>
              <li><strong>Financial & Transactional Records:</strong> UPI transaction reference IDs, deposit request history, withdrawal records, and bank details you submit for processing wallet payouts.</li>
              <li><strong>Device & Usage Details:</strong> Operating system version, device model, IP address, and application performance metrics collected to ensure stability, fraud detection, and security.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} style={{ color: '#d6be66' }} />
              3. How We Use Your Information
            </h2>
            <p>Your information is used strictly for legitimate operational purposes:</p>
            <ul style={{ paddingLeft: '20px', margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>To create, verify, and authenticate your member account via phone number.</li>
              <li>To process wallet deposits and withdrawal payouts accurately.</li>
              <li>To provide customer support and troubleshoot account queries.</li>
              <li>To detect and prevent fraudulent activities, unauthorized access, and violations of our Terms of Service.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} style={{ color: '#d6be66' }} />
              4. Data Protection & Sharing
            </h2>
            <p>
              We implement industry-standard AES encryption, secure HTTPS/TLS transmission protocols, and strict access control mechanisms to safeguard your data.
            </p>
            <p>
              <strong>We do NOT sell, rent, or trade your personal data with third-party advertising companies.</strong> We only share information when required by lawful law enforcement requests or with trusted payment gateways strictly to execute financial transactions requested by you.
            </p>
          </section>

          {/* Section 5: Data Deletion Rights */}
          <section style={{
            marginBottom: '28px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '14px',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '1.2rem', color: '#f87171', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={20} />
              5. Your Rights & Account Data Deletion
            </h2>
            <p style={{ margin: '0 0 14px 0' }}>
              In compliance with Google Play Store Data Safety and User Data Policies, you have the right to request full deletion of your user account and all associated personal data at any time.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <Link
                to={dataDeletionUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                <Trash2 size={16} /> Request Account & Data Deletion
              </Link>
              <span style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Requests are processed within 24–48 hours.
              </span>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={20} style={{ color: '#d6be66' }} />
              6. Grievance Officer & Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your data privacy, please contact our support desk:
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              padding: '16px',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} style={{ color: '#d6be66' }} />
                <span>Email Support: <strong>{contactEmail}</strong></span>
              </div>
              {contactMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={16} style={{ color: '#d6be66' }} />
                  <span>Support Helpline: <strong>+91 {contactMobile}</strong></span>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '28px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.82rem' }}>
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
