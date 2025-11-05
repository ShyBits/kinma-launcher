import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
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
  const [gender, setGender] = useState('none');
  const [customGender, setCustomGender] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true); // Default to true for convenience
  const [isExistingUser, setIsExistingUser] = useState(null); // null = not checked yet, true = exists, false = new
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register' - explicit mode switch
  const [showOptionalFields, setShowOptionalFields] = useState(false); // Toggle for optional fields visibility
  const [devIntent, setDevIntent] = useState(() => {
    try { return localStorage.getItem('developerIntent') === 'pending'; } catch (_) { return false; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const [qrPending, setQrPending] = useState(false);
  const bodyRef = useRef(null);
  const footerRef = useRef(null);
  const maxHeightRef = useRef(null); // Track maximum height for consistent window size

  // Reset additional fields when switching auth mode
  useEffect(() => {
    if (authMode === 'login') {
      setConfirmPassword('');
      setFullName('');
      setEmail('');
      setPhone('');
      setDateOfBirth('');
      setAddress('');
      setCity('');
      setZipCode('');
      setCountry('');
      setGender('none');
      setCustomGender('');
      setAcceptTerms(false);
      setShowOptionalFields(false);
      setIsExistingUser(null);
      // Don't reset stayLoggedIn - keep user preference across mode switches
    }
    setError(null);
    
    // Reset scroll position to top when switching tabs
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [authMode]);

  // Reduce scrolling speed to half
  useEffect(() => {
    if (!isOpen) return;
    
    const handleWheel = (e) => {
      const scrollableElement = bodyRef.current;
      if (scrollableElement && (scrollableElement === e.target || scrollableElement.contains(e.target))) {
        // Only intercept if the element is scrollable and not at scroll boundaries
        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
        const isScrollable = scrollHeight > clientHeight;
        const isAtTop = scrollTop <= 0 && e.deltaY < 0;
        const isAtBottom = scrollTop >= scrollHeight - clientHeight && e.deltaY > 0;
        
        if (isScrollable && !isAtTop && !isAtBottom) {
          e.preventDefault();
          scrollableElement.scrollTop += e.deltaY * 0.5; // Half the scroll speed
        }
      }
    };

    const element = bodyRef.current;
    if (element) {
      element.addEventListener('wheel', handleWheel, { passive: false });
      return () => element.removeEventListener('wheel', handleWheel);
    }
  }, [isOpen]);

  // Reset additional fields and check status when identifier changes (user switches)
  useEffect(() => {
    if (authMode === 'register') return; // Don't auto-reset in register mode
    setConfirmPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setDateOfBirth('');
    setAddress('');
    setCity('');
    setZipCode('');
    setCountry('');
    setGender('none');
    setAcceptTerms(false);
    // Don't reset isExistingUser when identifier changes - only reset on blur
    setError(null); // Clear error when identifier changes
  }, [identifier, authMode]);

  // Clear error when password changes
  useEffect(() => {
    setError(null);
  }, [password, confirmPassword]);

  // Removed Escape key handler - users should not be able to skip authentication
  // useEffect(() => {
  //   if (!isOpen) return;
  //   const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
  //   document.addEventListener('keydown', onKey);
  //   return () => document.removeEventListener('keydown', onKey);
  // }, [isOpen, onClose]);

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

  // Show additional fields in register mode OR if auto-detected as new user
  const showAdditionalFields = authMode === 'register' || (isExistingUser === false && isIdentifierComplete(identifier));

  // Reset max height when modal opens to allow fresh measurement
  useEffect(() => {
    if (isOpen && variant === 'page') {
      maxHeightRef.current = null;
    }
  }, [isOpen, variant]);

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
      const footer = footerRef.current;
      const footerHeight = footer ? footer.offsetHeight : 0;
      
      // Calculate total needed height with consistent spacing
      // - Title bar: 32px
      // - Header: ~48px (tabs + border)
      // - Body content height (calculated dynamically)
      // - Extra padding for comfortable spacing
      const titleBarHeight = 32;
      const headerHeight = 48; // Tab header height
      const extraPadding = 80; // Consistent bottom and top padding
      
      // Calculate the actual needed height based on content
      const calculatedHeight = titleBarHeight + headerHeight + bodyHeight + footerHeight + extraPadding;
      
      // Track maximum height to ensure consistent window size for both login and register
      if (!maxHeightRef.current || calculatedHeight > maxHeightRef.current) {
        maxHeightRef.current = calculatedHeight;
      }
      
      // Use the maximum height seen so far for both modes to keep window size consistent
      const maxHeight = 1200; // Maximum height to prevent it from getting too large
      const windowHeight = Math.min(maxHeight, maxHeightRef.current);
      
      console.log('📐 Window height calculation:', {
        bodyHeight,
        containerHeight,
        calculatedHeight,
        maxHeightTracked: maxHeightRef.current,
        windowHeight,
        showAdditionalFields,
        authMode
      });
      
      onHeightChange(windowHeight);
    };

    // Calculate immediately first, then use multiple timeouts to ensure DOM is fully updated
    updateHeight();
    
    const timeout1 = setTimeout(updateHeight, 50);
    const timeout2 = setTimeout(updateHeight, 200);
    const timeout3 = setTimeout(updateHeight, 500);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [isOpen, identifier, password, confirmPassword, fullName, email, phone, dateOfBirth, address, city, zipCode, country, gender, customGender, acceptTerms, showAdditionalFields, variant, authMode, onHeightChange]);

  // Validation for submit button
  const canSubmit = useMemo(() => {
    if (!identifier || !password) return false;
    
    // For register mode or new accounts, check additional required fields
    if (authMode === 'register' || showAdditionalFields) {
      // Email is required in register mode
      if (!email || !email.trim()) return false;
      // Passwords must match
      if (password !== confirmPassword) return false;
      // Password must be at least 6 characters
      if (password.length < 6) return false;
      // Terms must be accepted
      if (!acceptTerms) return false;
      // Full name is now optional, so we don't require it
    }
    
    return true;
  }, [identifier, password, confirmPassword, email, acceptTerms, authMode, showAdditionalFields]);

  // Removed backdrop click handler - users should not be able to skip authentication
  // const handleBackdrop = (e) => {
  //   if (e.target === e.currentTarget) onClose?.();
  // };

  const handleContinue = async () => {
    setError(null);
    
    // Validate inputs first
    if (!identifier || !password) {
      setError('Please fill in all required fields.');
      setSubmitting(false);
      return;
    }
    
    // Validate username length early for register mode
    if (authMode === 'register') {
      const trimmedIdentifier = identifier.trim();
      if (trimmedIdentifier.length < 1) {
        setError('Username must be at least 1 character long.');
        setSubmitting(false);
        return;
      }
      if (trimmedIdentifier.length > 20) {
        setError('Username must be 20 characters or less.');
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 250));
    
    // Re-check if user exists (final verification) - but only in login mode
    const users = await loadUsers();
    const existing = findUserByIdentifier(identifier, users);
    let user;
    
    // In register mode, always create a new account (don't allow duplicate check)
    if (authMode === 'register') {
      // Check if user already exists - show error instead of allowing registration
      if (existing) {
        setError('An account with this identifier already exists. Please sign in instead.');
        setSubmitting(false);
        return;
      }
    } else if (existing) {
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
      
      // Update stayLoggedIn preference if user is logging in (reuse users array already loaded)
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].stayLoggedIn = stayLoggedIn;
        await persistUsers(users);
      }
    }
    
    // If not an existing user (or in register mode), create new account
    if (!user) {
      // New user - register
      // Validate username length
      const trimmedIdentifier = identifier.trim();
      if (trimmedIdentifier.length < 1) {
        setError('Username must be at least 1 character long.');
        setSubmitting(false);
        return;
      }
      
      if (trimmedIdentifier.length > 20) {
        setError('Username must be 20 characters or less.');
        setSubmitting(false);
        return;
      }
      
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
      
      if (!email || !email.trim()) {
        setError('Email is required.');
        setSubmitting(false);
        return;
      }
      
      if (!acceptTerms) {
        setError('You must accept the Terms of Service and Privacy Policy.');
        setSubmitting(false);
        return;
      }
      
      // Validate date of birth is not in the future
      if (dateOfBirth) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const selectedDate = new Date(dateOfBirth);
        if (selectedDate > today) {
          setError('Date of birth cannot be in the future.');
          setSubmitting(false);
          return;
        }
      }
      
      // Generate name from full name or username or email
      const name = fullName.trim() || identifier.trim() || (email ? email.split('@')[0] : 'User');
      
      // Save ALL fields from the registration form
      user = { 
        id: Date.now().toString(), 
        // Required fields
        username: trimmedIdentifier,
        email: email.trim(),
        password,
        name: name,
        // Optional fields - save everything (even empty strings)
        fullName: fullName.trim() || '',
        phone: (phone && phone.trim()) ? phone.trim().replace(/\s/g, '') : '',
        dateOfBirth: dateOfBirth || '',
        gender: (gender === 'other' || gender === 'none') && customGender.trim() ? customGender.trim() : (gender || ''),
        address: address.trim() || '',
        city: city.trim() || '',
        zipCode: zipCode.trim() || '',
        country: country.trim() || '',
        // Checkbox fields
        acceptTerms: acceptTerms,
        devIntent: devIntent,
        stayLoggedIn: stayLoggedIn,
        // Metadata
        createdAt: new Date().toISOString(),
        lastLoginTime: new Date().toISOString(), // Set login time on registration
        isLoggedIn: true // Mark as logged in
      };
      
      users.push(user);
      await persistUsers(users); // This will sort the users automatically
      setIsExistingUser(true); // Mark as existing after creation
    }
    
    // Update last login time and stayLoggedIn preference for this user (reuse users array already loaded)
    try {
      const userIndex = users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        users[userIndex].lastLoginTime = new Date().toISOString();
        users[userIndex].isLoggedIn = true; // Mark as logged in
        users[userIndex].stayLoggedIn = stayLoggedIn; // Update stay logged in preference
        await persistUsers(users);
      }
    } catch (error) {
      console.error('Error updating last login time:', error);
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
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}`;
    setQrUrl(url);
    setQrPending(false);
  }, []);

  // Post-process QR to invert to white modules with transparent background
  useEffect(() => {
    if (!qrUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 160;
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
      
      // Update last login time and stayLoggedIn preference for this user
      try {
        const users = await loadUsers();
        const userIndex = users.findIndex(u => u.id === user.id || u.email === user.email);
        if (userIndex !== -1) {
          users[userIndex].lastLoginTime = new Date().toISOString();
          users[userIndex].isLoggedIn = true; // Mark as logged in
          users[userIndex].stayLoggedIn = stayLoggedIn; // Update stay logged in preference
          await persistUsers(users);
        } else {
          // If user doesn't exist in our system, add them
          const newUser = {
            ...user,
            lastLoginTime: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isLoggedIn: true, // Mark as logged in
            stayLoggedIn: stayLoggedIn
          };
          users.push(newUser);
          await persistUsers(users);
        }
      } catch (error) {
        console.error('Error updating last login time:', error);
      }
      
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
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
              type="button"
            >
              Login
            </button>
            <button 
              className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              Register
            </button>
          </div>
        </div>

        <div className="auth-body" ref={bodyRef}>
          {authMode === 'login' && (
            <div className="auth-qr">
              {qrDataUrl && <img className="qr-code" alt="QR code" src={qrDataUrl} />}
              <div className="qr-help">Scan with mobile app to sign in</div>
            </div>
          )}

          {authMode === 'login' && (
            <>
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
                    // Only check in login mode when leaving the identifier field AND identifier is complete
                    if (authMode === 'login' && isIdentifierComplete(identifier)) {
                      checkUserExists();
                    } else if (authMode === 'login') {
                      // If not complete, reset the check status
                      setIsExistingUser(null);
                    }
                  }}
                  onFocus={() => {
                    // When clicking back into the field, don't check - user might still be editing
                    // Only reset status if we had a previous result and in login mode
                    if (authMode === 'login' && isExistingUser !== null && !isIdentifierComplete(identifier)) {
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
                    // This counts as field switch - check if identifier is complete (only in login mode)
                    if (authMode === 'login' && isIdentifierComplete(identifier)) {
                      checkUserExists();
                    }
                  }}
                  onBlur={() => {
                    // Also check when leaving password field (another field switch, only in login mode)
                    if (authMode === 'login' && isIdentifierComplete(identifier)) {
                      checkUserExists();
                    }
                  }}
                  placeholder="Password" 
                  autoComplete="current-password" 
                />
              </div>

              <label className="auth-checkbox">
                <input 
                  type="checkbox" 
                  checked={stayLoggedIn} 
                  onChange={(e) => setStayLoggedIn(e.target.checked)} 
                />
                <span>Keep me signed in</span>
              </label>

              {/* Debug info - only show in login mode when identifier is complete */}
              {isIdentifierComplete(identifier) && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '-8px', marginBottom: '4px' }}>
                  Status: {isExistingUser === null ? 'Checking...' : isExistingUser === true ? 'Account exists' : 'New account'}
                </div>
              )}

              {error && (
                <div className="auth-error-message">
                  {error}
                </div>
              )}

              <div className="auth-actions inline">
                <button className="auth-submit" onClick={handleContinue} disabled={!canSubmit || submitting}>
                  {isExistingUser === true ? 'Login' : isExistingUser === false ? 'Create Account' : 'Continue'}
                </button>
              </div>

              <div className="auth-separator"><span>or</span></div>
              <div className="auth-social">
                <button className="auth-social-btn discord" onClick={() => handleSocial('discord')} disabled={submitting}>
                  Login with Discord
                </button>
                <button className="auth-social-btn google" onClick={() => handleSocial('google')} disabled={submitting}>
                  Login with Google
                </button>
              </div>
              
              <div className="auth-separator"><span>or</span></div>
              <button className="auth-skip-btn" onClick={handleSkip} disabled={submitting}>
                Skip and continue as guest
              </button>
            </>
          )}

          {/* Registration Form - Completely Reorganized */}
          {authMode === 'register' && (
            <div className="auth-register-form">
              {/* Title */}
              <h2 className="auth-register-title">Create Account</h2>

              {/* Social Login Buttons at Top */}
              <div className="auth-social">
                <button className="auth-social-btn discord" onClick={() => handleSocial('discord')} disabled={submitting}>
                  Register with Discord
                </button>
                <button className="auth-social-btn google" onClick={() => handleSocial('google')} disabled={submitting}>
                  Register with Google
                </button>
              </div>

              <div className="auth-separator"><span>or</span></div>

              {/* Required Fields */}
              <div className="auth-field">
                <label>Username <span className="auth-required">*</span></label>
                <input 
                  type="text" 
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                  placeholder="Choose a username" 
                  autoComplete="username"
                  maxLength={20}
                />
                {identifier.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    {identifier.length}/20 characters
                  </div>
                )}
              </div>

              <div className="auth-field">
                <label>Email <span className="auth-required">*</span></label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="your.email@example.com" 
                  autoComplete="email" 
                />
              </div>

              <div className="auth-field">
                <label>Password <span className="auth-required">*</span></label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Create a password" 
                  autoComplete="new-password" 
                />
                {password && password.length < 6 && (
                  <div className="auth-field-error">Password must be at least 6 characters</div>
                )}
              </div>

              <div className="auth-field">
                <label>Confirm Password <span className="auth-required">*</span></label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm your password" 
                  autoComplete="new-password" 
                />
                {confirmPassword && password !== confirmPassword && (
                  <div className="auth-field-error">Passwords do not match</div>
                )}
              </div>

              {/* Optional Information Section - Combined Container */}
              <div className="auth-optional-section">
                <button 
                  type="button"
                  className={`auth-optional-toggle ${showOptionalFields ? 'expanded' : 'collapsed'}`}
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                >
                  <span>{showOptionalFields ? '−' : '+'}</span>
                  <span>Optional Information</span>
                </button>

                {/* Optional Fields - Displayed Conditionally */}
                {showOptionalFields && (
                  <div className="auth-optional-fields-container">
                    <div className="auth-field">
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        value={fullName} 
                        onChange={(e) => setFullName(e.target.value)} 
                        placeholder="Your full name" 
                        autoComplete="name" 
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

                    <div className="auth-field-row">
                      <div className="auth-field">
                        <label>Date of Birth</label>
                        <input 
                          type="date" 
                          value={dateOfBirth} 
                          onChange={(e) => {
                            const selectedDate = e.target.value;
                            const today = new Date().toISOString().split('T')[0];
                            // Only set if the date is not in the future
                            if (!selectedDate || selectedDate <= today) {
                              setDateOfBirth(selectedDate);
                            }
                          }}
                          onKeyDown={(e) => {
                            // Handle backspace/delete to navigate backwards through date parts
                            if (e.key === 'Backspace' || e.key === 'Delete') {
                              const input = e.target;
                              // Use setTimeout to check selection after the key event
                              setTimeout(() => {
                                const selectionStart = input.selectionStart;
                                const value = input.value;
                                // If we're in the year section (positions 0-4) and it's cleared, focus month
                                // If we're in the month section (positions 5-7) and it's cleared, focus day
                                // Try to move focus to the left part programmatically
                                if (value && input.setSelectionRange) {
                                  // For date inputs, we can try to simulate navigation
                                  // This helps with the flow of deletion
                                  const parts = value.split('-');
                                  if (parts.length === 3) {
                                    // If year is empty or being cleared, move to month
                                    if (selectionStart <= 4 && (!parts[0] || parts[0].length === 0)) {
                                      input.setSelectionRange(5, 7);
                                    }
                                    // If month is empty or being cleared, move to day
                                    else if (selectionStart >= 5 && selectionStart <= 7 && (!parts[1] || parts[1].length === 0)) {
                                      input.setSelectionRange(8, 10);
                                    }
                                  }
                                }
                              }, 0);
                            }
                          }}
                          max={new Date().toISOString().split('T')[0]}
                          autoComplete="bday" 
                        />
                      </div>
                      <div className="auth-field">
                        <label>Gender</label>
                        <div className={`auth-gender-input-group ${gender === 'other' ? 'expanded' : ''}`}>
                          <select 
                            value={gender} 
                            onChange={(e) => {
                              // Prevent selecting separator lines (empty values)
                              if (e.target.value === '') {
                                e.target.value = gender; // Reset to previous value
                                return;
                              }
                              setGender(e.target.value);
                              if (e.target.value !== 'other') {
                                setCustomGender('');
                              }
                            }}
                            className={`auth-select ${gender === 'other' ? 'expanded' : ''}`}
                          >
                            <option value="none">None</option>
                            <option value="" disabled>&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="" disabled>&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;&#8212;</option>
                            <option value="other">Other</option>
                          </select>
                          {gender === 'other' && (
                            <div className="auth-custom-gender-container">
                              <input 
                                type="text" 
                                value={customGender} 
                                onChange={(e) => setCustomGender(e.target.value)} 
                                placeholder="Specify your gender"
                                className="auth-field-input"
                                autoComplete="off"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

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
                        <label>Postal Code</label>
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
                )}
              </div>

              {/* Checkboxes Section */}
              <div className="auth-register-checkboxes">
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

                <label className="auth-checkbox">
                  <input type="checkbox" checked={devIntent} onChange={(e) => setDevIntent(e.target.checked)} />
                  <span>Request developer access</span>
                </label>

                <label className="auth-checkbox">
                  <input 
                    type="checkbox" 
                    checked={stayLoggedIn} 
                    onChange={(e) => setStayLoggedIn(e.target.checked)} 
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              {error && (
                <div className="auth-error-message">
                  {error}
                </div>
              )}

              <div className="auth-actions inline">
                <button className="auth-submit" onClick={handleContinue} disabled={!canSubmit || submitting}>
                  Create Account
                </button>
              </div>

              <div className="auth-separator"><span>or</span></div>
              <button className="auth-skip-btn" onClick={handleSkip} disabled={submitting}>
                Skip and continue as guest
              </button>
            </div>
          )}
        </div>

        {/* Footer ref kept for height calculation, but empty in login mode */}
        <div className="auth-footer" ref={footerRef} style={{ display: 'none' }}></div>
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
    <div className={`auth-modal-overlay ${fullscreen ? 'fullscreen' : ''}`}>
      {Container}
    </div>
  );
};

export default AuthModal;


