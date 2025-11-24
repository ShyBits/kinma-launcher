import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './AuthModal.css';
import oauthConfig from '../config/oauth.config.example.js';
import { saveUserData, getUserData, getCurrentUserId } from '../utils/UserDataManager';
import ForgotPasswordModal from './ForgotPasswordModal';
import ResetPasswordModal from './ResetPasswordModal';

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
    try { 
      // Check user-specific developer intent
      const userId = getCurrentUserId();
      if (userId) {
        const intent = getUserData('developerIntent', 'none', userId);
        return intent === 'pending';
      }
      // Fallback to localStorage for backward compatibility
      return localStorage.getItem('developerIntent') === 'pending'; 
    } catch (_) { 
      return false; 
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({}); // Field-specific errors
  const [maxAccountsReached, setMaxAccountsReached] = useState(false);
  const [hasMaxAccounts, setHasMaxAccounts] = useState(false); // Track if 10 accounts exist (for blocking register tab)
  const [hasGhostAccounts, setHasGhostAccounts] = useState(false); // Track if there are any ghost logged-in accounts
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const containerRef = useRef(null);
  const [qrPending, setQrPending] = useState(false);
  const bodyRef = useRef(null);
  const footerRef = useRef(null);
  const maxHeightRef = useRef(null); // Track maximum height for consistent window size

  // Check if maximum accounts are reached (only for blocking register tab)
  // Also check if there are any ghost logged-in accounts
  useEffect(() => {
    if (isOpen) {
      const checkMaxAccounts = async () => {
        try {
          const users = await loadUsers();
          // Filter out guest accounts and hidden accounts
          const visibleUsers = users.filter(u => {
            const isHidden = u.hiddenInSwitcher === true || u.hiddenInSwitcher === 1 || u.hiddenInSwitcher === '1';
            const isGuest = u.isGuest === true || 
                           u.id?.toString().startsWith('guest_') || 
                           u.username?.toString().startsWith('guest_') || 
                           u.name === 'Guest';
            return !isHidden && !isGuest;
          });
          const hasMax = visibleUsers.length >= 10;
          
          setHasMaxAccounts(hasMax);
          
          // Check if there are any ghost accounts (logged in but not currently active)
          // A ghost account is one that is logged in (isLoggedIn === true) but not the current user
          const api = window.electronAPI;
          let currentUserId = null;
          try {
            const authUser = await api?.getAuthUser?.();
            currentUserId = authUser?.id || null;
          } catch (_) {
            // Try localStorage fallback
            try {
              const stored = localStorage.getItem('authUser');
              if (stored) {
                const user = JSON.parse(stored);
                currentUserId = user?.id || null;
              }
            } catch (_) {}
          }
          
          // Ghost accounts are visible users that are logged in but not the current user
          const ghostAccounts = visibleUsers.filter(u => {
            const isLoggedIn = u.isLoggedIn === true || u.isLoggedIn === 1 || u.isLoggedIn === '1';
            return isLoggedIn && u.id !== currentUserId;
          });
          
          setHasGhostAccounts(ghostAccounts.length > 0);
          
          // If we have max accounts and are in register mode, switch to login mode
          if (hasMax && authMode === 'register') {
            setAuthMode('login');
          }
        } catch (error) {
          console.error('Error checking max accounts:', error);
          setHasMaxAccounts(false);
          setHasGhostAccounts(false);
        }
      };
      checkMaxAccounts();
    }
  }, [isOpen, authMode]);

  // Check for reset token in URL
  useEffect(() => {
    if (isOpen) {
      const hash = window.location.hash || '';
      const searchParams = window.location.search || '';
      
      // Check both hash and search params
      let urlParams;
      if (hash.includes('?')) {
        urlParams = new URLSearchParams(hash.split('?')[1]);
      } else if (searchParams) {
        urlParams = new URLSearchParams(searchParams);
      } else {
        urlParams = new URLSearchParams();
      }
      
      const token = urlParams.get('resetToken');
      if (token) {
        setResetToken(token);
        setShowResetPassword(true);
      }
    }
  }, [isOpen]);

  // Check for email parameter in URL and pre-fill it
  // Check both when isOpen changes AND when URL changes (for page variant)
  useEffect(() => {
    if (isOpen) {
      const checkEmailFromURL = () => {
        try {
          // Check both hash and search params (hash routing uses hash, regular routing uses search)
          const hash = window.location.hash || '';
          const hashParams = hash.includes('?') ? hash.split('?')[1] : '';
          const searchParams = window.location.search || '';
          
          // Try hash params first (for hash routing), then search params (for regular routing)
          const urlParams = hashParams 
            ? new URLSearchParams(hashParams)
            : new URLSearchParams(searchParams);
          
          const emailParam = urlParams.get('email');
          const isAddAccount = urlParams.get('addAccount') === 'true';
          
          // Only log detailed info if email is found or if we're debugging
          if (emailParam) {
            console.log('[AuthModal] ✅ Found email in URL:', emailParam);
            setEmail(emailParam);
            // Also set identifier field for login form (identifier accepts email, username, or phone)
            setIdentifier(emailParam);
            // If email is provided, switch to login mode
            setAuthMode('login');
            return true; // Email found and set
          } else {
            // Only show error if we're in addAccount mode (meaning we might have expected an email)
            // But don't show error if it's just the add button (no email expected)
            // We can't distinguish between "add button" vs "logged out account" from URL alone,
            // so we'll only log a warning, not an error, and only once
            if (isAddAccount) {
              // This is normal for the add button - no email expected
              // Only log once to avoid spam
              return false; // No email found, but that's okay for add button
            }
            return false; // No email found
          }
        } catch (error) {
          console.error('Error reading email from URL:', error);
          return false;
        }
      };
      
      // Check immediately
      const emailFound = checkEmailFromURL();
      
      // Listen for URL changes (for page variant where URL might change after mount)
      const handleLocationChange = () => {
        checkEmailFromURL();
      };
      
      // Check on popstate (back/forward navigation)
      window.addEventListener('popstate', handleLocationChange);
      
      // If email not found immediately, check again after delays (URL might be set asynchronously)
      // But only if we're expecting an email (not just the add button)
      let timeoutId1, timeoutId2, intervalId, stopPollingTimeout;
      
      // Check if we're in addAccount mode - if so, we might be waiting for an email
      const hash = window.location.hash || '';
      const hashParams = hash.includes('?') ? hash.split('?')[1] : '';
      const searchParams = window.location.search || '';
      const urlParams = hashParams 
        ? new URLSearchParams(hashParams)
        : new URLSearchParams(searchParams);
      const isAddAccount = urlParams.get('addAccount') === 'true';
      
      // Only poll for email if we're in addAccount mode (might be a logged-out account)
      // If no addAccount param, don't poll (regular auth flow)
      if (!emailFound && isAddAccount) {
        timeoutId1 = setTimeout(() => {
          checkEmailFromURL();
        }, 100);
        
        timeoutId2 = setTimeout(() => {
          checkEmailFromURL();
        }, 500);
        
        // Poll for URL changes (in case URL is set asynchronously) - only if email not found
        intervalId = setInterval(() => {
          const found = checkEmailFromURL();
          if (found) {
            clearInterval(intervalId);
          }
        }, 200);
        
        // Stop polling after 5 seconds
        stopPollingTimeout = setTimeout(() => {
          if (intervalId) {
            clearInterval(intervalId);
          }
        }, 5000);
      }
      
      return () => {
        if (timeoutId1) clearTimeout(timeoutId1);
        if (timeoutId2) clearTimeout(timeoutId2);
        if (stopPollingTimeout) clearTimeout(stopPollingTimeout);
        if (intervalId) clearInterval(intervalId);
        window.removeEventListener('popstate', handleLocationChange);
      };
    }
  }, [isOpen]);

  // Reset additional fields when switching auth mode
  useEffect(() => {
    if (authMode === 'login') {
      setConfirmPassword('');
      setFullName('');
      // Don't reset email if it was pre-filled from URL
      try {
        const hash = window.location.hash || '';
        const hashParams = hash.includes('?') ? hash.split('?')[1] : '';
        const searchParams = window.location.search || '';
        const urlParams = hashParams 
          ? new URLSearchParams(hashParams)
          : new URLSearchParams(searchParams);
        const emailParam = urlParams.get('email');
        if (!emailParam) {
          setEmail('');
        }
      } catch (error) {
        // If error reading params, clear email
        setEmail('');
      }
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
      console.log('📂 Loading users...');
      
      const api = window.electronAPI;
      
      // Try database methods first
      if (api && api.dbGetUsers) {
        const result = await api.dbGetUsers();
        if (result && result.success && Array.isArray(result.users)) {
          // Sort users
          const sorted = result.users.sort((a, b) => {
            const nameA = (a.name || a.email || a.username || '').toLowerCase();
            const nameB = (b.name || b.email || b.username || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          console.log('✅ Returning', sorted.length, 'users from database');
          return sorted;
        }
      }
      
      // Fallback to file-based methods
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
      const windowHeight = Math.min(maxHeight, maxHeightRef.current) - 100; // Reduce by 100px
      
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
    setFieldErrors({});
    
    const newFieldErrors = {};
    
    // Validate inputs first
    if (!identifier || !identifier.trim()) {
      newFieldErrors.identifier = 'This field is required.';
    }
    
    if (!password || !password.trim()) {
      newFieldErrors.password = 'This field is required.';
    }
    
    // Validate username length early for register mode
    if (authMode === 'register') {
      const trimmedIdentifier = identifier.trim();
      if (trimmedIdentifier.length < 1) {
        newFieldErrors.identifier = 'Username must be at least 1 character long.';
      } else if (trimmedIdentifier.length > 20) {
        newFieldErrors.identifier = 'Username must be 20 characters or less.';
      }
      
      if (!email || !email.trim()) {
        newFieldErrors.email = 'Email is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newFieldErrors.email = 'Please enter a valid email address.';
      }
      
      if (password && password.length < 6) {
        newFieldErrors.password = 'Password must be at least 6 characters long.';
      }
      
      if (confirmPassword && password !== confirmPassword) {
        newFieldErrors.confirmPassword = 'Passwords do not match.';
      }
      
      if (!acceptTerms) {
        newFieldErrors.acceptTerms = 'You must accept the Terms of Service and Privacy Policy.';
      }
    }
    
    // If there are field errors, set them and return
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 250));
    
    // Re-check if user exists (final verification) - but only in login mode
    const users = await loadUsers();
    const visibleUsers = users.filter(u => u.hiddenInSwitcher !== true);
    const hasMax = visibleUsers.length >= 10;
    
    // Check if max accounts reached and entered email is not a ghost account (only on login attempt)
    if (hasMax && authMode === 'login') {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      const isGhostAccount = visibleUsers.some(u => {
        const emailNorm = u.email ? u.email.trim().toLowerCase() : '';
        const usernameNorm = u.username ? u.username.trim().toLowerCase() : '';
        const phoneNorm = u.phone ? u.phone.trim().replace(/\s/g, '').toLowerCase() : '';
        return emailNorm === normalizedIdentifier || 
               usernameNorm === normalizedIdentifier || 
               phoneNorm === normalizedIdentifier;
      });
      
      // If max is reached AND the entered identifier is NOT a ghost account, show error
      if (!isGhostAccount) {
        setFieldErrors({ identifier: 'Maximum of 10 accounts reached. The entered email/username does not belong to any of your existing accounts. Please remove an account before adding a new one or log in to an existing account.' });
        setSubmitting(false);
        return;
      }
    }
    
    const existing = findUserByIdentifier(identifier, users);
    let user;
    
    // In register mode, always create a new account (don't allow duplicate check)
    if (authMode === 'register') {
      // Check if user already exists - show error instead of allowing registration
      if (existing) {
        setFieldErrors({ identifier: 'An account with this identifier already exists. Please sign in instead.' });
        setSubmitting(false);
        return;
      }
    } else if (existing) {
      // Existing user - login
      // Verify password matches
      if (existing.password !== password) {
        setFieldErrors({ password: 'Incorrect password. Please try again.' });
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
      // Check if maximum of 10 users is reached (only count visible users, not hidden ones)
      const visibleUsers = users.filter(u => u.hiddenInSwitcher !== true);
      if (visibleUsers.length >= 10) {
        setFieldErrors({ identifier: 'Maximum of 10 accounts allowed. Please remove an account before creating a new one.' });
        setSubmitting(false);
        return;
      }
      
      // Validate date of birth is not in the future
      if (dateOfBirth) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        const selectedDate = new Date(dateOfBirth);
        if (selectedDate > today) {
          setFieldErrors({ dateOfBirth: 'Date of birth cannot be in the future.' });
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
    
    // Set auth user in localStorage
    const authUserData = { id: user.id, email: user.email, name: user.name };
    try { 
      localStorage.setItem('authUser', JSON.stringify(authUserData)); 
    } catch (_) {}
    
    // Set auth user in Electron store
    try {
      const api = window.electronAPI;
      if (api?.setAuthUser) {
        await api.setAuthUser(authUserData);
      }
      if (api?.authSuccess) {
        await api.authSuccess(authUserData);
      }
    } catch (error) {
      console.error('Error setting auth user in Electron:', error);
    }
    
    // Save developer intent to user account
    if (devIntent && user.id) {
      saveUserData('developerIntent', 'pending', user.id);
      saveUserData('developerAccess', false, user.id); // Not yet granted
      saveUserData('gameStudioAccess', false, user.id); // Not yet granted
    } else if (user.id) {
      saveUserData('developerIntent', 'none', user.id);
    }
    
    // Dispatch user-changed event
    window.dispatchEvent(new Event('user-changed'));
    
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
          // If user doesn't exist in our system, check if we can add them (max 10 visible users)
          const visibleUsers = users.filter(u => u.hiddenInSwitcher !== true);
          if (visibleUsers.length >= 10) {
            setError('Maximum of 10 accounts allowed. Please remove an account before adding a new one.');
            setSubmitting(false);
            return;
          }
          
          // Add new user
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
      
      // Save developer intent to user account
      if (devIntent && user.id) {
        saveUserData('developerIntent', 'pending', user.id);
        saveUserData('developerAccess', false, user.id); // Not yet granted
        saveUserData('gameStudioAccess', false, user.id); // Not yet granted
      } else if (user.id) {
        saveUserData('developerIntent', 'none', user.id);
      }
      
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
      // Guest users don't have developer access
      if (guestUser.id) {
        saveUserData('developerIntent', 'none', guestUser.id);
      }
      
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

  const handleGoToAccountSwitcher = async () => {
    try {
      const api = window.electronAPI;
      
      // For page variant, navigate directly
      if (variant === 'page') {
        if (window.location) {
          window.location.hash = '/account-switcher';
        }
        return;
      }
      
      // For modal variant, close and navigate
      onClose?.();
      
      // Try to use Electron API to open account switcher window
      if (api && api.openAccountSwitcherWindow) {
        try {
          await api.openAccountSwitcherWindow();
          return;
        } catch (e) {
          console.error('Error opening account switcher window:', e);
        }
      }
      
      // Fallback: navigate via hash
      if (window.location) {
        window.location.hash = '/account-switcher';
      }
    } catch (error) {
      console.error('Error navigating to account switcher:', error);
      // Final fallback
      if (window.location) {
        window.location.hash = '/account-switcher';
      }
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
            {!hasMaxAccounts && (
              <button 
                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
                type="button"
              >
                Register
              </button>
            )}
          </div>
        </div>

        <div className="auth-body" ref={bodyRef}>
          <>
              {authMode === 'login' && (
            <>
              <div className="auth-qr">
                {qrDataUrl && <img className="qr-code" alt="QR code" src={qrDataUrl} />}
                <div className="qr-help">Scan with mobile app to sign in</div>
              </div>
              
              <div className="auth-social-quick-login">
                <div className="auth-social-quick">
                  <button className="auth-social-btn-square discord" onClick={() => handleSocial('discord')} disabled={submitting} title="Login with Discord">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </button>
                  <button className="auth-social-btn-square google" onClick={() => handleSocial('google')} disabled={submitting} title="Login with Google">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </button>
                </div>
                <div className="auth-social-divider"></div>
                <button className="auth-guest-btn-square" onClick={handleSkip} disabled={submitting} title="Continue as guest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </button>
              </div>
              
              <div className="auth-field-with-switch">
                <div className="auth-field">
                  <label>Email, username, or phone</label>
                  <input 
                  type="text" 
                  value={identifier} 
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setIdentifier(newValue);
                    // Clear field error when user types
                    if (fieldErrors.identifier) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.identifier;
                        return newErrors;
                      });
                    }
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
                  className={fieldErrors.identifier ? 'error' : ''}
                  placeholder={
                    authMode === 'login' && isIdentifierComplete(identifier)
                      ? (isExistingUser === null 
                          ? 'Checking...' 
                          : isExistingUser === true 
                            ? 'Account exists' 
                            : 'New account')
                      : 'Email / Username / Phone'
                  }
                  autoComplete="username" 
                />
                {fieldErrors.identifier && (
                  <div className="auth-field-error">{fieldErrors.identifier}</div>
                )}
                </div>
                {hasGhostAccounts && (
                  <button 
                    className="auth-switch-account-btn-inline" 
                    onClick={handleGoToAccountSwitcher} 
                    disabled={submitting}
                    type="button"
                    title="Switch to existing account"
                  >
                    Switch account
                  </button>
                )}
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // Clear field error when user types
                    if (fieldErrors.password) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.password;
                        return newErrors;
                      });
                    }
                  }}
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
                  className={fieldErrors.password ? 'error' : ''}
                  placeholder="Password" 
                  autoComplete="current-password" 
                />
                {fieldErrors.password && (
                  <div className="auth-field-error">{fieldErrors.password}</div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <label className="auth-checkbox">
                  <input 
                    type="checkbox" 
                    checked={stayLoggedIn} 
                    onChange={(e) => setStayLoggedIn(e.target.checked)} 
                  />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  className="auth-forgot-password-link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Forgot Password clicked, setting showForgotPassword to true');
                    setShowForgotPassword(true);
                  }}
                  disabled={submitting}
                >
                  Forgot Password?
                </button>
              </div>

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
            </>
          )}

          {/* Registration Form - Completely Reorganized */}
          {authMode === 'register' && (
            <div className="auth-register-form">
              <div className="auth-social-quick-login">
                <div className="auth-social-quick">
                  <button className="auth-social-btn-square discord" onClick={() => handleSocial('discord')} disabled={submitting} title="Register with Discord">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </button>
                  <button className="auth-social-btn-square google" onClick={() => handleSocial('google')} disabled={submitting} title="Register with Google">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </button>
                </div>
                <div className="auth-social-divider"></div>
                <button className="auth-guest-btn-square" onClick={handleSkip} disabled={submitting} title="Continue as guest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </button>
              </div>

              {/* Required Fields */}
              <div className="auth-field">
                <label>Username <span className="auth-required">*</span></label>
                <input 
                  type="text" 
                  value={identifier} 
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    // Clear field error when user types
                    if (fieldErrors.identifier) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.identifier;
                        return newErrors;
                      });
                    }
                  }}
                  className={fieldErrors.identifier ? 'error' : ''}
                  placeholder="Choose a username" 
                  autoComplete="username"
                  maxLength={20}
                />
                {fieldErrors.identifier && (
                  <div className="auth-field-error">{fieldErrors.identifier}</div>
                )}
                {!fieldErrors.identifier && identifier.length > 0 && (
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Clear field error when user types
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
                />
                {fieldErrors.email && (
                  <div className="auth-field-error">{fieldErrors.email}</div>
                )}
              </div>

              <div className="auth-field">
                <label>Password <span className="auth-required">*</span></label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // Clear field error when user types
                    if (fieldErrors.password) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.password;
                        return newErrors;
                      });
                    }
                  }}
                  className={fieldErrors.password ? 'error' : ''}
                  placeholder="Create a password" 
                  autoComplete="new-password" 
                />
                {fieldErrors.password && (
                  <div className="auth-field-error">{fieldErrors.password}</div>
                )}
                {!fieldErrors.password && password && password.length < 6 && (
                  <div className="auth-field-error">Password must be at least 6 characters</div>
                )}
              </div>

              <div className="auth-field">
                <label>Confirm Password <span className="auth-required">*</span></label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    // Clear field error when user types
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.confirmPassword;
                        return newErrors;
                      });
                    }
                  }}
                  className={fieldErrors.confirmPassword ? 'error' : ''}
                  placeholder="Confirm your password" 
                  autoComplete="new-password" 
                />
                {fieldErrors.confirmPassword && (
                  <div className="auth-field-error">{fieldErrors.confirmPassword}</div>
                )}
                {!fieldErrors.confirmPassword && confirmPassword && password !== confirmPassword && (
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
                              // Clear field error when user changes date
                              if (fieldErrors.dateOfBirth) {
                                setFieldErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.dateOfBirth;
                                  return newErrors;
                                });
                              }
                            }
                          }}
                          className={fieldErrors.dateOfBirth ? 'error' : ''}
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
            </div>
          )}
          </>
        </div>

        {/* Footer ref kept for height calculation, but empty in login mode */}
        <div className="auth-footer" ref={footerRef} style={{ display: 'none' }}></div>
      </div>
  );

  if (variant === 'page') {
    return (
      <>
        <div className={`auth-page ${fullscreen ? 'fullscreen' : ''}`}>
          {Container}
        </div>
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onSuccess={() => {
            setShowForgotPassword(false);
          }}
        />
        <ResetPasswordModal
          isOpen={showResetPassword}
          onClose={() => {
            setShowResetPassword(false);
            setResetToken(null);
          }}
          token={resetToken}
          onSuccess={() => {
            setShowResetPassword(false);
            setResetToken(null);
            // Optionally show success message or redirect to login
            if (onClose) {
              onClose();
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className={`auth-modal-overlay ${fullscreen ? 'fullscreen' : ''}`}>
        {Container}
      </div>
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSuccess={() => {
          setShowForgotPassword(false);
        }}
      />
      <ResetPasswordModal
        isOpen={showResetPassword}
        onClose={() => {
          setShowResetPassword(false);
          setResetToken(null);
        }}
        token={resetToken}
        onSuccess={() => {
          setShowResetPassword(false);
          setResetToken(null);
          // Optionally show success message or redirect to login
          if (onClose) {
            onClose();
          }
        }}
      />
    </>
  );
};

export default AuthModal;


