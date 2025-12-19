import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import './ForgotPasswordModal.css';

const ForgotPasswordModal = ({ isOpen, onClose, onSuccess, variant = 'modal', initialEmail = '' }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  React.useEffect(() => {
    if (isOpen) {
      console.log('ForgotPasswordModal is now open');
      // Set initial email if provided, otherwise reset
      if (initialEmail && initialEmail.trim()) {
        setEmail(initialEmail.trim());
      } else {
        setEmail('');
      }
      setError(null);
      setSuccess(false);
      setResetUrl(null);
      setFieldErrors({});
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email || !email.trim()) {
      setFieldErrors({ email: 'Email is required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFieldErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setSubmitting(true);

    try {
      const api = window.electronAPI;
      if (api && api.requestPasswordReset) {
        const result = await api.requestPasswordReset(email.trim());
        
        if (result && result.success) {
          setSuccess(true);
          // Store reset URL if provided (for development/testing)
          if (result.resetUrl) {
            setResetUrl(result.resetUrl);
          }
          // Don't call onSuccess here - let the user see the success message first
        } else {
          setError(result?.error || 'Failed to send password reset email. Please try again.');
        }
      } else {
        setError('Password reset functionality is not available.');
      }
    } catch (err) {
      console.error('Error requesting password reset:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setEmail('');
      setError(null);
      setSuccess(false);
      setFieldErrors({});
      onClose();
    }
  };

  const content = (
    <>
      {variant === 'modal' && (
        <button className="forgot-password-modal-close" onClick={handleClose} disabled={submitting}>
          <X size={20} />
        </button>
      )}

      {!success ? (
        <>
          <h2 className="forgot-password-modal-title">Forgot Password</h2>
          <p className="forgot-password-modal-description">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.email;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.email ? 'error' : ''}
                placeholder="your.email@example.com"
                autoComplete="email"
                disabled={submitting}
              />
              {fieldErrors.email && (
                <div className="auth-field-error">{fieldErrors.email}</div>
              )}
            </div>

            {error && (
              <div className="auth-error-message">{error}</div>
            )}

            <div className="forgot-password-actions">
              {variant === 'modal' && (
                <button
                  type="button"
                  className="forgot-password-cancel"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="auth-submit"
                disabled={submitting || !email.trim()}
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="forgot-password-success">
          <div className="forgot-password-success-icon">
            <CheckCircle />
          </div>
          <h2 className="forgot-password-modal-title">Check Your Email</h2>
          <p className="forgot-password-modal-description">
            We've sent a password reset link to <strong>{email}</strong>. Please check your email and click the link to reset your password.
          </p>
          {resetUrl && (
            <div className="forgot-password-reset-link-container">
              <p className="forgot-password-reset-link-label">Development Mode - Reset Link:</p>
              <div className="forgot-password-reset-link">
                <input
                  type="text"
                  readOnly
                  value={resetUrl}
                  className="forgot-password-reset-link-input"
                  onClick={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className="forgot-password-copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetUrl);
                    alert('Reset link copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="forgot-password-reset-link-note">
                ⚠️ In production, this link would be sent via email.
              </p>
            </div>
          )}
          <button
            className="auth-submit"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      )}
    </>
  );

  if (variant === 'page') {
    return (
      <div className="forgot-password-page">
        <div className="forgot-password-page-content">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-modal-overlay" onClick={handleClose}>
      <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

