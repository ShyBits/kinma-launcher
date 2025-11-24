import React, { useState } from 'react';
import { X } from 'lucide-react';
import './ForgotPasswordModal.css';

const ForgotPasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  React.useEffect(() => {
    if (isOpen) {
      console.log('ForgotPasswordModal is now open');
    }
  }, [isOpen]);

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
          if (onSuccess) {
            onSuccess(email.trim());
          }
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

  return (
    <div className="forgot-password-modal-overlay" onClick={handleClose}>
      <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        <button className="forgot-password-modal-close" onClick={handleClose} disabled={submitting}>
          <X size={20} />
        </button>

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
                <button
                  type="button"
                  className="forgot-password-cancel"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
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
            <h2 className="forgot-password-modal-title">Check Your Email</h2>
            <p className="forgot-password-modal-description">
              We've sent a password reset link to <strong>{email}</strong>. Please check your email and click the link to reset your password.
            </p>
            <button
              className="auth-submit"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

