import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, CheckSquare } from 'lucide-react';
import './AuthModal.css';
import oauthConfig from '../config/oauth.config.example.js';

const AuthModal = ({ isOpen, onClose, onAuthenticated, fullscreen = false, variant = 'modal', onHeightChange }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(null); // null = not checked yet, true = exists, false = new
  const [devIntent, setDevIntent] = useState(() => {
    try { return localStorage.getItem('developerIntent') === 'pending'; } catch (_) { return false; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [qrPending, setQrPending] = useState(false);
  const bodyRef = useRef(null);

  // Reset additional fields and check status when identifier changes (user switches)
  useEffect(() => {
    setConfirmPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setDateOfBirth('');
    setAddress('');
    setCity('');
    setZipCode('');
    setCountry('');
    setGender('');
    setAcceptTerms(false);
    // Don't reset isExistingUser when identifier changes - only reset on blur
    setError(null); // Clear error when identifier changes
  }, [identifier]);

  // Clear error when password changes
  useEffect(() => {
    setError(null);
  }, [password, confirmPassword]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const persistUsers = async (users) => {
    try {
      // Sort users alphabetically by name (or email/username if no name)
      const sorted = [...users].sort((a, b) => {
        const nameA = (a.name || a.email || a.username || '').toLowerCase();
        const nameB = (b.name || b.email || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Save to file system using Electron API
      const api = window.electronAPI;
      if (api && api.saveUsers) {
        await api.saveUsers(sorted);
      } else {
        // Fallback to localStorage if Electron API not available
        localStorage.setItem('users', JSON.stringify(sorted));
      }
    } catch (error) {
      console.error('Error saving users:', error);
      // Fallback to localStorage on error
      try {
        const sorted = [...users].sort((a, b) => {
          const nameA = (a.name || a.email || a.username || '').toLowerCase();
          const nameB = (b.name || b.email || b.username || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        localStorage.setItem('users', JSON.stringify(sorted));
      } catch (_) {}
    }
  };

  // Clear all users from file system and localStorage
  const clearAllUsers = async () => {
    try {
      // Clear from file system using Electron API
      const api = window.electronAPI;
      if (api && api.clearAllUsers) {
        await api.clearAllUsers();
      }
      
      // Clear from localStorage
      try {
        localStorage.removeItem('users');
      } catch (_) {}
      
      // Also clear authUser if exists
      try {
        localStorage.removeItem('authUser');
      } catch (_) {}
      
      // Reset state
      setIsExistingUser(null);
      setIdentifier('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      
      console.log('All users cleared from file system and cache');
      return true;
    } catch (error) {
      console.error('Error clearing users:', error);
      return false;
    }
  };

  const loadUsers = async () => {
    try {
      console.log('📂 Loading users from file system...');
      
      // Always try to load from file system first using Electron API
      const api = window.electronAPI;
      if (api && api.getUsers) {
        const result = await api.getUsers();
        
        console.log('📥 File system result:', {
          success: result?.success,
          usersCount: result?.users?.length || 0,
          isArray: Array.isArray(result?.users),
          users: result?.users
        });
        
        if (result && result.success && Array.isArray(result.users)) {
          // Sort users
          const fileUsers = result.users.sort((a, b) => {
            const nameA = (a.name || a.email || a.username || '').toLowerCase();
            const nameB = (b.name || b.email || b.username || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          
          // Always clear localStorage to keep them in sync with file system
          try {
            localStorage.removeItem('users');
            console.log('🧹 Cleared localStorage users');
          } catch (_) {}
          
          console.log('✅ Returning', fileUsers.length, 'users from file system');
          return fileUsers;
        }
        
        // If file system returns empty or no users, return empty array
        console.log('📭 No users in file system, returning empty array');
        try {
          localStorage.removeItem('users');
        } catch (_) {}
        return [];
      }
      
      console.warn('⚠️ Electron API not available, checking localStorage...');
      // Only fallback to localStorage if Electron API is not available
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const sorted = users.sort((a, b) => {
        const nameA = (a.name || a.email || a.username || '').toLowerCase();
        const nameB = (b.name || b.email || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      console.log('📦 Loaded', sorted.length, 'users from localStorage (fallback)');
      return sorted;
    } catch (error) {
      console.error('❌ Error loading users:', error);
      // On error, return empty array (don't load from localStorage to avoid stale data)
      return [];
    }
  };

  // Normalize identifier for comparison (handles email, username, phone)
  const normalizeIdentifier = (value) => {
    if (!value) return '';
    // For phone numbers: remove all non-digit characters except +
    // For email/username: just trim and lowercase
    const trimmed = value.trim();
    // Check if it looks like a phone number (starts with + or is all digits/spaces/dashes)
    if (/^\+?[\d\s-]+$/.test(trimmed)) {
      // Normalize phone: remove spaces, dashes, keep + if present
      return trimmed.replace(/[\s-]/g, '').toLowerCase();
    }
    return trimmed.toLowerCase();
  };

  // Check if user exists by email, username, or phone
  const findUserByIdentifier = (identifier, users) => {
    if (!identifier || !users || !Array.isArray(users) || users.length === 0) {
      return null;
    }
    const norm = normalizeIdentifier(identifier);
    if (!norm) return null;
    
    const found = users.find(u => {
      if (!u) return false;
      const emailNorm = u.email ? normalizeIdentifier(u.email) : '';
      const usernameNorm = u.username ? normalizeIdentifier(u.username) : '';
      const phoneNorm = u.phone ? normalizeIdentifier(u.phone) : '';
      return (emailNorm && emailNorm === norm) || 
             (usernameNorm && usernameNorm === norm) || 
             (phoneNorm && phoneNorm === norm);
    });
    
    return found || null;
  };

  // Check if identifier input is complete enough to check
  const isIdentifierComplete = (value) => {
    if (!value || value.trim().length < 3) return false;
    const trimmed = value.trim();
    
    // For email: check if it has @ and domain part with at least one character after the dot
    // Example: user@example.com or user@example.c (at least something after the dot)
    if (trimmed.includes('@')) {
      const parts = trimmed.split('@');
      if (parts.length === 2) {
        const domainPart = parts[1];
        // Must have a dot and at least one character after the dot
        if (domainPart.includes('.')) {
          const afterDot = domainPart.split('.').slice(-1)[0];
          if (afterDot && afterDot.length > 0) {
            return true; // Email has domain with extension (e.g., .com, .c, .co)
          }
        }
      }
      return false; // Email not complete yet (no dot after @ or no extension)
    }
    
    // For phone: check if it has enough digits (at least 6)
    if (/^\+?[\d\s-]+$/.test(trimmed.replace(/\s/g, ''))) {
      const digitsOnly = trimmed.replace(/[\s-]/g, '');
      return digitsOnly.length >= 6;
    }
    
    // For username: at least 4 characters
    return trimmed.length >= 4;
  };

  // Extract checkable part from identifier (email username part before @)
  const getCheckablePart = (value) => {
    if (!value) return value;
    const trimmed = value.trim();
    
    // For email: extract everything before @
    if (trimmed.includes('@')) {
      const emailParts = trimmed.split('@');
      return emailParts[0]; // Return username part before @
    }
    
    // For phone or username: return as is
    return trimmed;
  };

  // Check if user exists by checking username part (before @ for emails)
  const checkUserExists = async () => {
    if (!identifier) {
      setIsExistingUser(null);
      return;
    }
    
    // Only check if identifier is complete
    if (!isIdentifierComplete(identifier)) {
      setIsExistingUser(null);
      return;
    }
    
    try {
      // Always load fresh data from file system
      const users = await loadUsers();
      
      const checkablePart = getCheckablePart(identifier);
      
      // Debug: Log what we're checking
      console.log('🔍 Checking user existence:', {
        fullIdentifier: identifier,
        checkablePart: checkablePart,
        usersArrayLength: users?.length || 0,
        isArray: Array.isArray(users)
      });
      
      // If no users array or empty, definitely no user exists
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.log('✅ No users found - setting exists to false');
        setIsExistingUser(false);
        return;
      }
      
      // Check if any user matches the checkable part (username part for emails)
      // For emails, we check if any stored email starts with the checkable part + @
      // For usernames/phones, we check exact match
      const isEmail = identifier.includes('@');
      let found = null;
      
      if (isEmail) {
        // For email: check if any user has email starting with checkablePart + @
        const checkPartNorm = normalizeIdentifier(checkablePart);
        found = users.find(u => {
          if (u.email) {
            const emailNorm = normalizeIdentifier(u.email);
            // Extract username part from stored email
            const storedEmailParts = emailNorm.split('@');
            if (storedEmailParts.length > 0) {
              const storedUsernamePart = storedEmailParts[0];
              return storedUsernamePart === checkPartNorm;
            }
          }
          return false;
        });
      } else {
        // For username/phone: check exact match
        found = findUserByIdentifier(checkablePart, users);
      }
      
      const exists = found !== null;
      
      // Always set the state, even if user not found (false = new user)
      setIsExistingUser(exists);
      
      console.log('📋 User check result:', { 
        fullIdentifier: identifier,
        checkablePart,
        exists, 
        usersCount: users.length,
        found: found ? 'FOUND' : 'NOT FOUND'
      });
    } catch (error) {
      console.error('❌ Error checking user exists:', error);
      // On error, assume user doesn't exist (safe default for registration)
      setIsExistingUser(false);
    }
  };

  // Show additional fields only if we know it's a new user (not existing)
  // Also check if identifier is complete and check has been performed
  const showAdditionalFields = isExistingUser === false && isIdentifierComplete(identifier);

  // Update window height when fields change
  useEffect(() => {
    if (!isOpen || variant !== 'page' || !bodyRef.current || !containerRef.current) return;
    
    const updateHeight = () => {
      if (!bodyRef.current || !onHeightChange || !containerRef.current) return;
      
      // Get the actual content height
      const container = containerRef.current;
      const body = bodyRef.current;
      
      // Get the actual rendered height
      const bodyHeight = body.scrollHeight;
      const containerHeight = container.offsetHeight;
      
      // Calculate total needed height with more generous spacing:
      // - Title bar: 32px
      // - Header + title: ~60px
      // - Body content height (QR + fields + buttons + social)
      // - Extra padding for comfortable spacing
      const titleBarHeight = 32;
      const headerHeight = 70; // Header + title + margins
      const extraPadding = 150; // Generous bottom and top padding for comfortable spacing
      
      const calculatedHeight = titleBarHeight + headerHeight + bodyHeight + extraPadding;
      
      // Set reasonable min/max bounds - increased minimum for better spacing
      const minHeight = 900; // Increased minimum for comfortable login
      const maxHeight = 1200;
      
      const windowHeight = Math.min(Math.max(calculatedHeight, minHeight), maxHeight);
      
      console.log('📐 Window height calculation:', {
        bodyHeight,
        containerHeight,
        calculatedHeight,
        windowHeight,
        showAdditionalFields
      });
      
      onHeightChange(windowHeight);
    };

    // Use multiple timeouts to ensure DOM is fully updated
    const timeout1 = setTimeout(updateHeight, 50);
    const timeout2 = setTimeout(updateHeight, 200);
    const timeout3 = setTimeout(updateHeight, 500);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [isOpen, identifier, password, confirmPassword, fullName, email, phone, dateOfBirth, address, city, zipCode, country, gender, acceptTerms, showAdditionalFields, variant, onHeightChange]);

  // Validation for submit button
  const canSubmit = useMemo(() => {
    if (!identifier || !password) return false;
    
    // For new accounts, check additional required fields
    if (showAdditionalFields) {
      // Passwords must match
      if (password !== confirmPassword) return false;
      // Password must be at least 6 characters
      if (password.length < 6) return false;
      // Full name is required
      if (!fullName || !fullName.trim()) return false;
      // Terms must be accepted
      if (!acceptTerms) return false;
    }
    
    return true;
  }, [identifier, password, confirmPassword, fullName, acceptTerms, showAdditionalFields]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleContinue = async () => {
    setError(null);
    
    // Validate inputs first
    if (!identifier || !password) {
      setError('Please fill in all required fields.');
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 250));
    
    // Re-check if user exists (final verification)
    const users = await loadUsers();
    const existing = findUserByIdentifier(identifier, users);
    let user;
    
    if (existing) {
      // Existing user - login
      // Verify password matches
      if (existing.password !== password) {
        setError('Incorrect password. Please try again.');
        setSubmitting(false);
        return;
      }
      
      user = { 
        id: existing.id, 
        email: existing.email, 
        username: existing.username,
        phone: existing.phone,
        name: existing.name || existing.email?.split('@')[0] || existing.username || 'User'
      };
    } else {
      // New user - register
      // Validate that additional required fields are filled correctly
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please try again.');
        setSubmitting(false);
        return;
      }
      
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setSubmitting(false);
        return;
      }
      
      if (!fullName || !fullName.trim()) {
        setError('Full name is required.');
        setSubmitting(false);
        return;
      }
      
      if (!acceptTerms) {
        setError('You must accept the Terms of Service and Privacy Policy.');
        setSubmitting(false);
        return;
      }
      
      // Heuristically classify identifier
      let data = {};
      if (identifier.includes('@')) {
        data.email = identifier.trim();
      } else if (/^\+?[\d\s-]{6,}$/.test(identifier.replace(/\s/g, ''))) {
        // Phone number (allows spaces, dashes, optional +)
        data.phone = identifier.trim().replace(/\s/g, '');
      } else {
        data.username = identifier.trim();
      }
      
      // Use provided email/phone if available (might be different from identifier)
      if (email && email.trim()) {
        data.email = email.trim();
      }
      if (phone && phone.trim()) {
        data.phone = phone.trim().replace(/\s/g, '');
      }
      
      // Generate name from full name or identifier
      const name = fullName.trim() || data.username || (data.email ? data.email.split('@')[0] : 'User');
      
      user = { 
        id: Date.now().toString(), 
        ...data, 
        name: name,
        fullName: fullName.trim(),
        password,
        dateOfBirth: dateOfBirth || null,
        address: address.trim() || null,
        city: city.trim() || null,
        zipCode: zipCode.trim() || null,
        country: country.trim() || null,
        gender: gender || null,
        createdAt: new Date().toISOString()
      };
      
      users.push(user);
      await persistUsers(users); // This will sort the users automatically
      setIsExistingUser(true); // Mark as existing after creation
    }
    
    try { localStorage.setItem('authUser', JSON.stringify({ id: user.id, email: user.email, name: user.name })); } catch (_) {}
    try { localStorage.setItem('developerIntent', devIntent ? 'pending' : 'none'); } catch (_) {}
    setSubmitting(false);
    onAuthenticated?.({ user, developerChosen: devIntent });
    onClose?.();
  };

  // Auto-generate QR image only (no auto login). Backend/mobile confirmation should trigger a separate event.
  const [qrUrl, setQrUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    const token = Math.random().toString(36).slice(2);
    const link = `https://kinma.app/qr-login?token=${token}`; // placeholder login link
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`;
    setQrUrl(url);
    setQrPending(false);
  }, []);

  // Post-process QR to invert to white modules with transparent background
  useEffect(() => {
    if (!qrUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 180;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      try {
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const isWhite = r > 240 && g > 240 && b > 240;
          if (isWhite) {
            // make background transparent
            data[i+3] = 0;
          } else {
            // make modules pure white
            data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        setQrDataUrl(canvas.toDataURL('image/png'));
      } catch (_) {
        // Fallback: use original
        setQrDataUrl(qrUrl);
      }
    };
    img.onerror = () => setQrDataUrl(qrUrl);
    img.src = qrUrl;
  }, [qrUrl]);

  const handleSocial = async (provider) => {
    try {
      setSubmitting(true);
      const api = window.electronAPI;
      const res = await api?.oauthStart?.(provider, { redirectUri: oauthConfig.redirectUri });
      setSubmitting(false);
      if (!res || !res.success) return;
      const user = res.user;
      try { localStorage.setItem('authUser', JSON.stringify(user)); } catch (_) {}
      try { localStorage.setItem('developerIntent', devIntent ? 'pending' : 'none'); } catch (_) {}
      onAuthenticated?.({ user, developerChosen: devIntent });
      onClose?.();
    } catch (_) {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setSubmitting(true);
      // Create a guest user object
      const guestUser = {
        id: `guest_${Date.now()}`,
        name: 'Guest',
        username: `guest_${Date.now()}`,
        isGuest: true
      };
      
      // Save to localStorage
      try { localStorage.setItem('authUser', JSON.stringify({ id: guestUser.id, name: guestUser.name })); } catch (_) {}
      try { localStorage.setItem('developerIntent', 'none'); } catch (_) {}
      
      // Call the same authentication flow as a normal login
      const api = window.electronAPI;
      try {
        api?.setAuthUser && await api.setAuthUser(guestUser);
      } catch (_) {}
      
      setSubmitting(false);
      onAuthenticated?.({ user: guestUser, developerChosen: false });
      onClose?.();
    } catch (_) {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const Container = (
      <div className="auth-modal" onMouseDown={(e) => e.stopPropagation()} ref={containerRef}>
        <div className="auth-header">
          <div className="auth-title">Sign in or create account</div>
        </div>

        <div className="auth-body" ref={bodyRef}>
          <div className="auth-qr">
            {qrDataUrl && <img className="qr-code" alt="QR code" src={qrDataUrl} />}
            <div className="qr-help">Scan with mobile app to sign in</div>
          </div>

          <div className="auth-field">
            <label>Email, username, or phone</label>
            <input 
              type="text" 
              value={identifier} 
              onChange={(e) => {
                const newValue = e.target.value;
                setIdentifier(newValue);
                // Reset check status when typing - no check while typing!
                setIsExistingUser(null);
                // Don't check while typing - only on blur or field switch
              }}
              onBlur={() => {
                // Only check when leaving the identifier field AND identifier is complete
                // For email: must have @domain.extension (dot after @ with at least one char after dot)
                if (isIdentifierComplete(identifier)) {
                  checkUserExists();
                } else {
                  // If not complete, reset the check status
                  setIsExistingUser(null);
                }
              }}
              onFocus={() => {
                // When clicking back into the field, don't check - user might still be editing
                // Only reset status if we had a previous result
                if (isExistingUser !== null && !isIdentifierComplete(identifier)) {
                  setIsExistingUser(null);
                }
              }}
              placeholder="Email / Username / Phone" 
              autoComplete="username" 
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              onFocus={() => {
                // Check when switching TO password field (user clicked away from identifier field)
                // This counts as field switch - check if identifier is complete
                if (isIdentifierComplete(identifier)) {
                  checkUserExists();
                }
              }}
              onBlur={() => {
                // Also check when leaving password field (another field switch)
                if (isIdentifierComplete(identifier)) {
                  checkUserExists();
                }
              }}
              placeholder="Password" 
              autoComplete="current-password" 
            />
          </div>

          {/* Debug info - only show when identifier is complete */}
          {isIdentifierComplete(identifier) && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '-8px', marginBottom: '4px' }}>
              Status: {isExistingUser === null ? 'Checking...' : isExistingUser === true ? 'Account exists' : 'New account'}
            </div>
          )}

          {/* Additional fields for new accounts - Registration Form */}
          {showAdditionalFields && (
            <div className="auth-registration-form">
              <div className="auth-form-section">
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label>Full Name <span className="auth-required">*</span></label>
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="Your full name" 
                      autoComplete="name" 
                    />
                  </div>
                  <div className="auth-field">
                    <label>Confirm Password <span className="auth-required">*</span></label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Confirm Password" 
                      autoComplete="new-password" 
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <div className="auth-field-error">Passwords do not match</div>
                    )}
                    {password && password.length < 6 && (
                      <div className="auth-field-error">Password must be at least 6 characters</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="auth-form-section">
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="your.email@example.com" 
                      autoComplete="email" 
                    />
                  </div>
                  <div className="auth-field">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="+1 234 567 8900" 
                      autoComplete="tel" 
                    />
                  </div>
                </div>
              </div>

              <div className="auth-form-section">
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label>Date of Birth</label>
                    <input 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={(e) => setDateOfBirth(e.target.value)} 
                      placeholder="YYYY-MM-DD" 
                      autoComplete="bday" 
                    />
                  </div>
                  <div className="auth-field">
                    <label>Gender</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value)}
                      className="auth-select"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="auth-form-section">
                <div className="auth-field">
                  <label>Street Address</label>
                  <input 
                    type="text" 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="123 Main Street" 
                    autoComplete="street-address" 
                  />
                </div>
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label>City</label>
                    <input 
                      type="text" 
                      value={city} 
                      onChange={(e) => setCity(e.target.value)} 
                      placeholder="City" 
                      autoComplete="address-level2" 
                    />
                  </div>
                  <div className="auth-field">
                    <label>ZIP / Postal Code</label>
                    <input 
                      type="text" 
                      value={zipCode} 
                      onChange={(e) => setZipCode(e.target.value)} 
                      placeholder="12345" 
                      autoComplete="postal-code" 
                    />
                  </div>
                  <div className="auth-field">
                    <label>Country</label>
                    <input 
                      type="text" 
                      value={country} 
                      onChange={(e) => setCountry(e.target.value)} 
                      placeholder="Country" 
                      autoComplete="country-name" 
                    />
                  </div>
                </div>
              </div>

              <div className="auth-form-section">
                <label className="auth-checkbox">
                  <input 
                    type="checkbox" 
                    checked={acceptTerms} 
                    onChange={(e) => setAcceptTerms(e.target.checked)} 
                  />
                  <span>
                    I accept the <a href="#" onClick={(e) => { e.preventDefault(); }}>Terms of Service</a> and <a href="#" onClick={(e) => { e.preventDefault(); }}>Privacy Policy</a> <span className="auth-required">*</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <label className="auth-checkbox">
            <input type="checkbox" checked={devIntent} onChange={(e) => setDevIntent(e.target.checked)} />
            <span><CheckSquare size={14} /> Request developer access</span>
          </label>

          {error && (
            <div className="auth-error-message">
              {error}
            </div>
          )}

          <div className="auth-actions inline">
            <button className="auth-submit" onClick={handleContinue} disabled={!canSubmit || submitting}>
              {isExistingUser === true ? 'Sign In' : isExistingUser === false ? 'Create Account' : 'Continue'}
            </button>
          </div>

          <div className="auth-separator" style={{ marginTop: '12px' }}><span>or</span></div>
          <div className="auth-social">
            <button className="auth-social-btn discord" onClick={() => handleSocial('discord')} disabled={submitting}>
              Continue with Discord
            </button>
            <button className="auth-social-btn google" onClick={() => handleSocial('google')} disabled={submitting}>
              Continue with Google
            </button>
          </div>
          
          <div className="auth-separator" style={{ marginTop: '16px' }}><span>or</span></div>
          <button className="auth-skip-btn" onClick={handleSkip} disabled={submitting}>
            Skip and continue as guest
          </button>
        </div>

        
      </div>
  );

  if (variant === 'page') {
    return (
      <div className={`auth-page ${fullscreen ? 'fullscreen' : ''}`}>
        {Container}
      </div>
    );
  }

  return (
    <div className={`auth-modal-overlay ${fullscreen ? 'fullscreen' : ''}`} onMouseDown={handleBackdrop}>
      {Container}
    </div>
  );
};

export default AuthModal;


