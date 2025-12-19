import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './ResetPasswordModal.css';

const ResetPasswordModal = ({ isOpen, onClose, token, onSuccess, variant = 'modal' }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    if (isOpen && token) {
      validateToken();
    }
  }, [isOpen, token]);

  const validateToken = async () => {
    try {
      const api = window.electronAPI;
      if (api && api.validatePasswordResetToken) {
        const result = await api.validatePasswordResetToken(token);
        setTokenValid(result?.valid || false);
        if (!result?.valid) {
          setError(result?.error || 'This password reset link is invalid or has expired.');
        }
      } else {
        setTokenValid(false);
        setError('Password reset functionality is not available.');
      }
    } catch (err) {
      console.error('Error validating token:', err);
      setTokenValid(false);
      setError('An error occurred while validating the reset link.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newFieldErrors = {};

    if (!newPassword || !newPassword.trim()) {
      newFieldErrors.newPassword = 'Password is required.';
    } else if (newPassword.length < 6) {
      newFieldErrors.newPassword = 'Password must be at least 6 characters long.';
    }

    if (!confirmPassword || !confirmPassword.trim()) {
      newFieldErrors.confirmPassword = 'Please confirm your password.';
    } else if (newPassword !== confirmPassword) {
      newFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setSubmitting(true);

    try {
      const api = window.electronAPI;
      if (api && api.resetPassword) {
        const result = await api.resetPassword(token, newPassword);
        
        if (result && result.success) {
          if (onSuccess) {
            onSuccess();
          }
          handleClose();
        } else {
          setError(result?.error || 'Failed to reset password. Please try again.');
        }
      } else {
        setError('Password reset functionality is not available.');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setFieldErrors({});
      setTokenValid(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const content = (
    <>
      {variant === 'modal' && (
        <button className="reset-password-modal-close" onClick={handleClose} disabled={submitting}>
          <X size={20} />
        </button>
      )}

      {tokenValid === false ? (
        <>
          <h2 className="reset-password-modal-title">Invalid Reset Link</h2>
          <p className="reset-password-modal-description">
            {error || 'This password reset link is invalid or has expired. Please request a new password reset link.'}
          </p>
          <button className="auth-submit" onClick={handleClose}>
            Close
          </button>
        </>
      ) : (
        <>
          <h2 className="reset-password-modal-title">Reset Password</h2>
          <p className="reset-password-modal-description">
            Enter your new password. It cannot be the same as your previous password.
          </p>

          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="auth-field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.newPassword;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.newPassword ? 'error' : ''}
                placeholder="Enter new password"
                autoComplete="new-password"
                disabled={submitting || tokenValid === null}
              />
              {fieldErrors.newPassword && (
                <div className="auth-field-error">{fieldErrors.newPassword}</div>
              )}
              {!fieldErrors.newPassword && newPassword && newPassword.length < 6 && (
                <div className="auth-field-error">Password must be at least 6 characters</div>
              )}
            </div>

            <div className="auth-field">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.confirmPassword;
                      return newErrors;
                    });
                  }
                }}
                className={fieldErrors.confirmPassword ? 'error' : ''}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={submitting || tokenValid === null}
              />
              {fieldErrors.confirmPassword && (
                <div className="auth-field-error">{fieldErrors.confirmPassword}</div>
              )}
              {!fieldErrors.confirmPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="auth-field-error">Passwords do not match</div>
              )}
            </div>

            {error && (
              <div className="auth-error-message">{error}</div>
            )}

            <div className="reset-password-actions">
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
                disabled={submitting || tokenValid === null || !newPassword.trim() || !confirmPassword.trim()}
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );

  if (variant === 'page') {
    return (
      <div className="reset-password-page">
        <div className="reset-password-page-content">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-modal-overlay" onClick={handleClose}>
      <div className="reset-password-modal" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

export default ResetPasswordModal;

