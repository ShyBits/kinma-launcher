import React, { useState, useEffect, useRef } from 'react';
import { getUserData, saveUserData, getUserScopedKey } from '../utils/UserDataManager';
import { 
  Upload, Plus, Edit, Trash2, Package, Play, X, Box,
  FileText, Image, Settings, ChevronLeft, ChevronRight, Check, X as XIcon, Edit2,
  Download, MessageSquare, ShoppingCart, Calendar, ChevronUp, ChevronDown,
  Star, Users, TrendingUp, Lock, Unlock, RefreshCw
} from 'lucide-react';
import './GameStudio.css';
import './Game.css';
import './Market.css';
import './Community.css';
import './Store.css';
import Community from './Community';
import Market from './Market';
import Game from './Game';
import Store from './Store';
import ImageUpload from '../components/ImageUpload';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

const GameStudio = ({ navigate }) => {
  // Helper function to load user-specific custom games
  const loadCustomGames = () => {
    try {
      const customGames = getUserData('customGames', []);
      
      // Convert custom games to Studio format
      const customGamesFormatted = customGames.map((game, index) => ({
        id: index + 1,
        name: game.name,
        version: game.version || '1.0.0',
        status: game.status || 'public',
        downloads: game.downloads || 0,
        revenue: `$${((game.downloads || 0) * 2.5).toFixed(2)}`,
        banner: game.banner || (game.banner?.startsWith('file://') || game.banner?.startsWith('data:') ? game.banner : '/public/images/games/pathline-banner.jpg'),
        lastUpdated: game.lastUpdated || 'just now',
        gameId: game.gameId // Store reference to the actual game
      }));
      
      return customGamesFormatted;
    } catch (e) {
      console.error('Error loading custom games in GameStudio:', e);
      return [];
    }
  };

  // Load custom games from user-specific storage on mount
  const [games, setGames] = useState(() => loadCustomGames());

  // Listen for custom game updates to reload the games list
  useEffect(() => {
    const handleCustomGameUpdate = () => {
      setGames(loadCustomGames());
    };
    
    const handleStorageChange = (e) => {
      if (e.key === getUserScopedKey('customGames')) {
        setGames(loadCustomGames());
      }
    };
    
    // Listen for user changes
    const handleUserChange = () => {
      setGames(loadCustomGames());
    };
    
    // Load on mount
    loadCustomGames();
    
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-changed', handleUserChange);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', handleUserChange);
    };
  }, []);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState(null);

  // Time filter state
  const [timeFilter, setTimeFilter] = useState('1Y');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Sample player statistics over time - different datasets for different filters
  const playerStatsData = {
    '1D': [
      { label: '00:00', players: 1200 },
      { label: '04:00', players: 950 },
      { label: '08:00', players: 1450 },
      { label: '12:00', players: 1850 },
      { label: '16:00', players: 2100 },
      { label: '20:00', players: 1980 },
      { label: '24:00', players: 1700 }
    ],
    '1W': [
      { label: 'Mon', players: 1800 },
      { label: 'Tue', players: 1950 },
      { label: 'Wed', players: 2100 },
      { label: 'Thu', players: 2050 },
      { label: 'Fri', players: 2200 },
      { label: 'Sat', players: 2400 },
      { label: 'Sun', players: 2150 }
    ],
    '1M': [
      { label: 'W1', players: 1600 },
      { label: 'W2', players: 1750 },
      { label: 'W3', players: 1850 },
      { label: 'W4', players: 1950 }
    ],
    '1Y': [
      { month: 'Jan', players: 450 },
      { month: 'Feb', players: 520 },
      { month: 'Mar', players: 610 },
      { month: 'Apr', players: 780 },
      { month: 'May', players: 920 },
      { month: 'Jun', players: 1100 },
      { month: 'Jul', players: 1250 },
      { month: 'Aug', players: 1380 },
      { month: 'Sep', players: 1520 },
      { month: 'Oct', players: 1690 },
      { month: 'Nov', players: 1820 },
      { month: 'Dec', players: 2010 }
    ]
  };

  const playerStats = playerStatsData[timeFilter];

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [contentSection, setContentSection] = useState('description');
  const [previewView, setPreviewView] = useState('game'); // 'game', 'community', 'market', 'store'
  const [isModalMinimized, setIsModalMinimized] = useState(false);
  const [editingGameId, setEditingGameId] = useState(null);
  
  // Image URL cache to prevent flickering on re-renders
  const imageUrlCache = useRef(new Map());
  
  // Refs for input fields to enable immediate focus
  const gameNameInputRef = useRef(null);
  const developerInputRef = useRef(null);

  // Draggable image handler
  const handleImageDrag = (imageType) => {
    return (e) => {
      // Only handle left mouse button
      if (e.button !== undefined && e.button !== 0) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const container = e.currentTarget.closest('[data-drag-container]');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPos = formData[`${imageType}Position`] || { x: 50, y: 50 };

      const handleMouseMove = (moveEvent) => {
        moveEvent.preventDefault();
        const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
        const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;

        const newX = Math.max(0, Math.min(100, startPos.x + deltaX));
        const newY = Math.max(0, Math.min(100, startPos.y + deltaY));

        setFormData(prev => ({
          ...prev,
          [`${imageType}Position`]: { x: newX, y: newY }
        }));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';
    };
  };

  // Zoom and bounded drag state for previews
  const bannerNaturalSize = useRef({ w: 0, h: 0 });
  const cardNaturalSize = useRef({ w: 0, h: 0 });
  const bannerStateRef = useRef({ scale: 1, x: 0, y: 0, initialized: false });
  const cardStateRef = useRef({ scale: 1, x: 0, y: 0, initialized: false });

  // Placeholder; actual sync added after formData initialization

  const clampPosition = (container, natural, state) => {
    if (!container || !natural.w || !natural.h) return { x: 0, y: 0 };
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    // Height-fit logic
    const scaledHeight = containerHeight * state.scale;
    const scaledWidth = (natural.w / natural.h) * scaledHeight;

    // Center when image smaller than container in a dimension
    const minX = scaledWidth > containerWidth ? (containerWidth - scaledWidth) : 0;
    const maxX = 0;
    const minY = scaledHeight > containerHeight ? (containerHeight - scaledHeight) : 0;
    const maxY = 0;

    let x = state.x;
    let y = state.y;
    if (scaledWidth <= containerWidth) {
      x = (containerWidth - scaledWidth) / 2;
    } else {
      x = Math.min(maxX, Math.max(minX, x));
    }
    if (scaledHeight <= containerHeight) {
      y = (containerHeight - scaledHeight) / 2;
    } else {
      y = Math.min(maxY, Math.max(minY, y));
    }
    return { x, y };
  };

  const initCentered = (container, natural, stateRef) => {
    if (!container || !natural.w || !natural.h) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaledHeight = containerHeight * stateRef.current.scale;
    const scaledWidth = (natural.w / natural.h) * scaledHeight;
    stateRef.current.x = (containerWidth - scaledWidth) / 2;
    stateRef.current.y = (containerHeight - scaledHeight) / 2;
    stateRef.current.initialized = true;
  };

  const handleWheelZoom = (type, containerEl) => (e) => {
    e.preventDefault();
    const stateRef = type === 'banner' ? bannerStateRef : cardStateRef;
    const natural = type === 'banner' ? bannerNaturalSize.current : cardNaturalSize.current;
    const delta = -e.deltaY; // up to zoom in
    const factor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.min(6, Math.max(1, stateRef.current.scale * factor));
    stateRef.current.scale = newScale;
    // Persist zoom in formData so it can be saved and used elsewhere
    setFormData((prev) => ({ ...prev, [`${type}Zoom`]: newScale }));
    const bounded = clampPosition(containerEl, natural, stateRef.current);
    stateRef.current.x = bounded.x;
    stateRef.current.y = bounded.y;
    // persist offsets and trigger re-render
    setFormData((prev) => ({ 
      ...prev, 
      [`${type}Offset`]: { x: bounded.x, y: bounded.y },
      [`${type}Zoom`]: newScale
    }));
  };

  const handleBoundedDrag = (type, containerEl) => (e) => {
    // Only when zoomed or larger than container; otherwise ignore
    const stateRef = type === 'banner' ? bannerStateRef : cardStateRef;
    const natural = type === 'banner' ? bannerNaturalSize.current : cardNaturalSize.current;
    if (!containerEl || !natural.w || !natural.h) return;
    const containerWidth = containerEl.clientWidth;
    const containerHeight = containerEl.clientHeight;
    const scaledHeight = containerHeight * stateRef.current.scale;
    const scaledWidth = (natural.w / natural.h) * scaledHeight;
    const draggable = scaledWidth > containerWidth || scaledHeight > containerHeight;
    if (!draggable) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = stateRef.current.x;
    const initY = stateRef.current.y;
    const onMove = (me) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      stateRef.current.x = initX + dx;
      stateRef.current.y = initY + dy;
      const bounded = clampPosition(containerEl, natural, stateRef.current);
      stateRef.current.x = bounded.x;
      stateRef.current.y = bounded.y;
      setFormData((prev) => ({ ...prev, [`${type}Offset`]: { x: bounded.x, y: bounded.y } }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Center image on double click
  const handleDoubleCenter = (type, containerEl) => (e) => {
    const stateRef = type === 'banner' ? bannerStateRef : cardStateRef;
    const natural = type === 'banner' ? bannerNaturalSize.current : cardNaturalSize.current;
    if (!containerEl || !natural.w || !natural.h) return;
    initCentered(containerEl, natural, stateRef);
    setFormData((prev) => ({ ...prev }));
  };
  
  // Helper function to get image URL (handles both File/Blob objects and URL strings)
  const getImageUrl = (image) => {
    if (!image) return null;
    
    // If it's a string URL
    if (typeof image === 'string') {
      // If it's already a data URL or http/https, return it
      if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) {
        return image;
      }
      
      // If it's a file:// URL, we need to convert it to data URL
      // This will be handled by the component that uses it - we'll return it as-is
      // and let the component handle conversion via Electron API
      return image;
    }
    
    // If it's not a File or Blob, return null
    if (!(image instanceof File) && !(image instanceof Blob)) {
      return null;
    }
    
    // Check cache first
    if (imageUrlCache.current.has(image)) {
      return imageUrlCache.current.get(image);
    }
    
    // Create and cache URL
    try {
      const url = URL.createObjectURL(image);
      imageUrlCache.current.set(image, url);
      return url;
    } catch (error) {
      console.error('Error creating object URL:', error);
      return null;
    }
  };

  // Clean up URLs when component unmounts
  useEffect(() => {
    return () => {
      imageUrlCache.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      imageUrlCache.current.clear();
    };
  }, []);

  // Removed presets feature completely
  
  // Form data state
  const [formData, setFormData] = useState({
    gameName: '',
    developer: '', // Who is uploading the game
    version: '',
    genre: '',
    ageRating: '',
    description: '',
    price: '',
    releaseDate: '',
    tags: '',
    requirements: '',
    bannerImage: null,
    cardImage: null,
    gameLogo: null,
    titleImage: null,
    titleImageSize: 100, // Size in percentage (100 = full width)
    screenshots: null,
    gameExecutable: null,
    gameFileSize: 0, // File size in bytes
    // Position adjustments
    logoSize: 120,
    logoPosition: 'left', // left, center, right
    bannerHeight: 60, // vh
    marketEnabled: true, // Enable/disable market for the game
    // Image positions for drag-to-move functionality (in percentage: {x: 50, y: 50} = center)
    bannerPosition: { x: 50, y: 50 },
    logoPositionCustom: { x: 50, y: 50 },
    titlePosition: { x: 50, y: 50 },
    cardPosition: { x: 50, y: 50 },
    // new: persisted zoom/offset defaults
    bannerZoom: 1,
    cardZoom: 1,
    bannerOffset: { x: 0, y: 0 },
    cardOffset: { x: 0, y: 0 },
  });

  // Keep preview zoom in sync with saved formData zoom values
  useEffect(() => {
    if (typeof formData?.bannerZoom === 'number') {
      bannerStateRef.current.scale = formData.bannerZoom;
    }
    if (typeof formData?.cardZoom === 'number') {
      cardStateRef.current.scale = formData.cardZoom;
    }
    if (formData?.bannerOffset) {
      bannerStateRef.current.x = formData.bannerOffset.x || 0;
      bannerStateRef.current.y = formData.bannerOffset.y || 0;
    }
    if (formData?.cardOffset) {
      cardStateRef.current.x = formData.cardOffset.x || 0;
      cardStateRef.current.y = formData.cardOffset.y || 0;
    }
    // trigger preview re-render
    setFormData(prev => ({ ...prev }));
  }, [formData?.bannerZoom, formData?.cardZoom, formData?.bannerOffset, formData?.cardOffset]);
  
  // Error states for each step
  const [stepErrors, setStepErrors] = useState({
    1: false, // Game Info
    2: false, // Media
    3: false, // Store Preview
    4: false, // Game Menu Preview
    5: false, // Community Preview
    6: false, // Market Preview
    7: false, // Files
    8: false  // Confirmation
  });

  // Removed all preset-related code
  
  // Helper function to check if a step is actually completed with valid data
  const isStepCompleted = (step) => {
    if (step === 1) {
      return formData.gameName && formData.developer && formData.version && formData.genre && formData.description;
    } else if (step === 2) {
      // All media fields are now required
      return formData.bannerImage !== null && 
             formData.cardImage !== null && 
             formData.gameLogo !== null && 
             formData.titleImage !== null && 
             formData.screenshots && formData.screenshots.length > 0;
    } else if (step === 3 || step === 4 || step === 5 || step === 6) {
      // Preview steps (Store, Game Menu, Community, Market) - optional, always return false
      return false;
    } else if (step === 7) {
      return formData.gameExecutable !== null;
    } else if (step === 8) {
      // Confirmation - required but no data to validate
      return false;
    }
    return false;
  };
  
  // Helper to check if step is optional and has been visited/passed
  const isOptionalStepPassed = (step) => {
    // Steps 3, 4, 5, 6 are optional preview steps that show outline when passed
    // They show blue outline if not filled, green if filled
    return (step === 3 || step === 4 || step === 5 || step === 6) && currentStep > step;
  };
  
  // Helper to check if a line should be blue (after optional step without content)
  const isLineBlueOptional = (lineStep) => {
    // Lines 3-4, 4-5, 5-6, 6-7 come after optional steps
    // They should be blue if the step before them is just outlined (not completed)
    if (lineStep === 3) {
      // Line 3-4: step 3 is optional
      return isOptionalStepPassed(3) && !completedSteps.includes(3);
    } else if (lineStep === 4) {
      // Line 4-5: step 4 is optional
      return isOptionalStepPassed(4) && !completedSteps.includes(4);
    } else if (lineStep === 5) {
      // Line 5-6: step 5 is optional
      return isOptionalStepPassed(5) && !completedSteps.includes(5);
    } else if (lineStep === 6) {
      // Line 6-7: step 6 is optional
      return isOptionalStepPassed(6) && !completedSteps.includes(6);
    }
    return false;
  };
  
  // Completed steps should be tracked independently of current selection
  const completedSteps = [1, 2, 3, 4, 5, 6, 7].filter(step => isStepCompleted(step));
  
  // Validation function for each step
  const validateStep = (step) => {
    const errors = { ...stepErrors };
    
    let hasError = false;
    
    if (step === 1) {
      hasError = !formData.gameName || !formData.developer || !formData.version || !formData.genre || !formData.description;
      errors[1] = hasError;
    } else if (step === 2) {
      hasError = formData.bannerImage === null;
      errors[2] = hasError;
    } else if (step === 3 || step === 4 || step === 5 || step === 6) {
      // Preview steps (Store, Game Menu, Community, Market) - no validation
      errors[step] = false;
    } else if (step === 7) {
      hasError = formData.gameExecutable === null;
      errors[7] = hasError;
    } else if (step === 8) {
      // Confirmation - no validation, but required (user must check terms)
      errors[8] = false;
    }
    
    setStepErrors(errors);
    return !hasError;
  };
  
  // Auto-validate all previous steps when form data changes
  useEffect(() => {
    const newErrors = { ...stepErrors };
    
    // Validate all steps before and including current step
    for (let i = 1; i <= currentStep; i++) {
      if (i === 1) {
        newErrors[1] = !formData.gameName || !formData.developer || !formData.version || !formData.genre || !formData.description;
      } else if (i === 2) {
        // All media fields are now required
        newErrors[2] = formData.bannerImage === null || 
                       formData.cardImage === null || 
                       formData.gameLogo === null || 
                       formData.titleImage === null || 
                       !formData.screenshots || formData.screenshots.length === 0;
      } else if (i === 3 || i === 4 || i === 5 || i === 6) {
        newErrors[i] = false; // No validation for preview steps
      } else if (i === 7) {
        newErrors[7] = formData.gameExecutable === null;
      } else if (i === 8) {
        newErrors[8] = false; // No validation for confirmation
      }
    }
    
    // Clear errors for future steps
    for (let i = currentStep + 1; i <= totalSteps; i++) {
      newErrors[i] = false;
    }
    
    setStepErrors(newErrors);
  }, [formData.gameName, formData.version, formData.genre, formData.description, formData.bannerImage, formData.cardImage, formData.gameLogo, formData.titleImage, formData.screenshots, formData.gameExecutable, currentStep]);

  const handleUploadGame = () => {
    // First close modal if open, then reset everything, then reopen
    setUploadModalOpen(false);
    
    // Use setTimeout to ensure state updates are processed in order
    setTimeout(() => {
      // Reset form data completely in one call
      setFormData({
        gameName: '',
        developer: '',
        version: '',
        genre: '',
        ageRating: '',
        description: '',
        price: '',
        releaseDate: '',
        tags: '',
        requirements: '',
        bannerImage: null,
        cardImage: null,
        gameLogo: null,
        titleImage: null,
        titleImageSize: 100,
        screenshots: null,
        gameExecutable: null,
        gameFileSize: 0,
        logoSize: 120,
        logoPosition: 'left',
        bannerHeight: 60,
        marketEnabled: true,
        bannerPosition: { x: 50, y: 50 },
        logoPositionCustom: { x: 50, y: 50 },
        titlePosition: { x: 50, y: 50 },
          cardPosition: { x: 50, y: 50 },
          bannerZoom: 1,
          cardZoom: 1,
          bannerOffset: { x: 0, y: 0 },
          cardOffset: { x: 0, y: 0 },
      });
      
      // Reset step errors
      setStepErrors({
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false,
        8: false
      });
      
      setEditingGameId(null);
      setCurrentStep(1);
      setContentSection('description');
      setPreviewView('game'); // Reset to game view when opening modal
      setShowCreateMenu(false);
      
      // Open modal after a brief delay to ensure state is reset
      setTimeout(() => {
        setUploadModalOpen(true);
      }, 50);
    }, 50);
  };
  
  const handlePreviewCommunity = () => {
    setPreviewView('community');
  };
  
  const handlePreviewMarket = () => {
    setPreviewView('market');
  };
  
  const handleBackToGamePreview = () => {
    setPreviewView('game');
  };
  
  // Dummy navigate function that does nothing - for preview only
  const dummyNavigate = (path) => {
    // Do nothing - this is just a preview
    console.log('Preview navigation to:', path);
  };
  
  const handleNextStep = () => {
    // Allow navigation even with errors - just can't finalize upload
    // BUT prevent going to Confirm step (step 8) if there are errors in required steps
    const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
    
    if (currentStep < totalSteps) {
      const newStep = currentStep + 1;
      
      // Prevent going to Confirm step if there are errors
      if (newStep === 8 && hasErrors) {
        // Don't allow navigation to Confirm step
        return;
      }
      
      setCurrentStep(newStep);
    }
  };
  
  const handlePrevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
    }
  };

  // Keyboard navigation for upload modal
  useEffect(() => {
    if (!uploadModalOpen) return;

    const handleKeyPress = (e) => {
      // Check if focus is on an input, textarea, or other form element
      const isFormElement = 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable;
      
      // Only trigger if not typing in a form element
      if (isFormElement) return;

      if (e.key.toLowerCase() === 'q' || e.key === 'ArrowLeft') {
        if (currentStep > 1) {
        e.preventDefault();
        handlePrevStep();
        }
      } else if (e.key.toLowerCase() === 'e' || e.key === 'ArrowRight') {
        if (currentStep < totalSteps) {
        const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
          // Prevent going to Confirm step if there are errors
        if (currentStep === 7 && hasErrors) {
          return; // Don't allow going to step 8 (Confirm) if there are errors
        }
        e.preventDefault();
        handleNextStep();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [uploadModalOpen, currentStep, totalSteps, handleNextStep, handlePrevStep]);
  
  // Auto-switch preview view based on current step
  useEffect(() => {
    if (!uploadModalOpen) return;
    
    if (currentStep === 3) {
      setPreviewView('store');
    } else if (currentStep === 4) {
      setPreviewView('game');
    } else if (currentStep === 5) {
      setPreviewView('community');
    } else if (currentStep === 6) {
      setPreviewView('market');
    }
    // Step 7 (Files) and step 8 (Confirm) don't change preview - keep the last preview
  }, [currentStep, uploadModalOpen]);

  // Focus first input when modal opens for new game
  useEffect(() => {
    if (uploadModalOpen && !editingGameId && currentStep === 1) {
      // Use multiple strategies to ensure focus works and input is ready
      const focusInput = () => {
        const input = gameNameInputRef.current;
        if (input) {
          try {
            // Ensure input is visible and enabled
            if (input.offsetParent !== null && !input.disabled && !input.readOnly) {
              input.focus();
              // Set cursor position to end
              if (input.setSelectionRange) {
                input.setSelectionRange(input.value.length, input.value.length);
              }
            }
          } catch (e) {
            // Ignore focus errors
          }
        }
      };
      
      // Try immediate focus (if DOM is ready)
      const immediate = setTimeout(focusInput, 0);
      
      // Also try after short delay (for DOM rendering)
      const delayed = setTimeout(focusInput, 50);
      
      // And try after animation completes
      requestAnimationFrame(() => {
        const animationDelay = setTimeout(focusInput, 100);
        return () => clearTimeout(animationDelay);
      });
      
      return () => {
        clearTimeout(immediate);
        clearTimeout(delayed);
      };
    }
  }, [uploadModalOpen, editingGameId, currentStep]);

  // Listen for top-bar Upload button to open this modal
  useEffect(() => {
    const openUpload = () => {
      setUploadModalOpen(true);
      setShowCreateMenu(false);
      setCurrentStep(1);
      setContentSection('description');
      setPreviewView('game');
    };
    window.addEventListener('studio-open-upload-modal', openUpload);
    return () => window.removeEventListener('studio-open-upload-modal', openUpload);
  }, []);
  
  // Close create menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCreateMenu && !event.target.closest('.upload-game-btn') && !event.target.closest('.game-studio-create-menu')) {
        setShowCreateMenu(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showCreateMenu]);
  
  // Check if all required fields are filled to allow final submission
  const canFinalizeUpload = () => {
    // Check all required steps (1=Game Info, 2=Media, 7=Files)
    const step1Valid = formData.gameName && formData.developer && formData.version && formData.genre && formData.description;
    const step2Valid = formData.bannerImage !== null;
    const step7Valid = formData.gameExecutable !== null;
    
    return step1Valid && step2Valid && step7Valid;
  };
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Don't clear errors here - let the auto-validation useEffect handle it
  };

  // Reset form when canceling
  const handleCancel = () => {
    // Reset form data
    setFormData({
      gameName: '',
      developer: '',
      version: '',
      genre: '',
      ageRating: '',
      description: '',
      price: '',
      releaseDate: '',
      tags: '',
      requirements: '',
      bannerImage: null,
      cardImage: null,
      gameLogo: null,
      titleImage: null,
      titleImageSize: 100,
      screenshots: [],
      gameExecutable: null,
      gameFileSize: 0,
      logoSize: 120,
      logoPosition: 'left',
      bannerHeight: 60,
      marketEnabled: true,
      bannerPosition: { x: 50, y: 50 },
      logoPositionCustom: { x: 50, y: 50 },
      titlePosition: { x: 50, y: 50 },
      cardPosition: { x: 50, y: 50 },
    });
    
    // Reset step errors
    setStepErrors({
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
      8: false
    });
    
    // Reset current step
    setCurrentStep(1);
    
    // Close modal
    setUploadModalOpen(false);
    setEditingGameId(null);
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };
  
  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file,
      // Store file size if it's the game executable and a file is provided
      // Clear file size if file is null (deletion)
      ...(field === 'gameExecutable' ? { gameFileSize: file ? file.size : 0 } : {})
    }));
    
    // Set or clear errors based on whether a file was uploaded or deleted
    if (field === 'gameExecutable') {
      // For step 6 (Files), set error if file is null (required field)
      if (currentStep === 6) {
        setStepErrors(prev => ({
          ...prev,
          [currentStep]: file === null
        }));
      }
    } else if (stepErrors[currentStep]) {
      // For other file uploads, clear error when file is uploaded
      setStepErrors(prev => ({
        ...prev,
        [currentStep]: false
      }));
    }
    
    // Auto-advance to Confirm (step 8) when game executable is uploaded and there are no errors
    if (field === 'gameExecutable' && file && currentStep === 7) {
      // Use setTimeout to check errors after state updates
      setTimeout(() => {
        setStepErrors(prev => {
          const hasNoErrors = !prev[1] && !prev[2] && !prev[7];
          if (hasNoErrors) {
            setCurrentStep(8);
          }
          return prev;
        });
      }, 100);
    }
  };

  // Helper to convert file:// URLs to data URLs
  const convertFileToDataUrl = async (filePath) => {
    if (!filePath || typeof filePath !== 'string') return null;
    
    // If it's already a data URL, return it
    if (filePath.startsWith('data:')) return filePath;
    
    // If it's not a file:// URL, return as-is
    if (!filePath.startsWith('file://')) return filePath;
    
    // Convert file:// URL to data URL using Electron API
    if (window.electronAPI && window.electronAPI.fileToDataUrl) {
      try {
        const result = await window.electronAPI.fileToDataUrl(filePath);
        if (result.success) {
          return result.dataURL;
        }
      } catch (error) {
        console.warn('Error converting file to data URL:', error);
      }
    }
    
    return null;
  };

  const handleEditGame = async (gameId) => {
    const game = games.find(g => g.id === gameId);
    if (game) {
      setEditingGameId(gameId);
      setUploadModalOpen(true);
      setShowCreateMenu(false);
      setCurrentStep(1);
      setContentSection('description');
      setPreviewView('game');
      
      // Try to load from metadata.json first (most reliable)
      let metadata = null;
      if (window.electronAPI && window.electronAPI.getGameMetadata) {
        try {
          const metaResult = await window.electronAPI.getGameMetadata(game.gameId);
          if (metaResult.success) {
            metadata = metaResult.metadata;
            console.log('Loaded metadata from JSON:', metadata);
          }
        } catch (error) {
          console.warn('Could not load metadata from JSON:', error);
        }
      }
      
      // Fallback to localStorage if metadata.json not available
      let fd = null;
      if (!metadata) {
        const customGames = getUserData('customGames', []);
        const customGame = customGames.find(g => g.gameId === game.gameId);
        
        if (customGame && customGame.fullFormData) {
          fd = customGame.fullFormData;
        }
      } else {
        // Use metadata.json data, but convert it to formData format
        fd = {
          gameName: metadata.gameName,
          developer: metadata.developer,
          version: metadata.version,
          genre: metadata.genre,
          ageRating: metadata.ageRating,
          description: metadata.description,
          price: metadata.price,
          releaseDate: metadata.releaseDate,
          tags: metadata.tags,
          requirements: metadata.requirements,
          bannerImage: metadata.bannerImage,
          cardImage: metadata.cardImage,
          gameLogo: metadata.gameLogo,
          titleImage: metadata.titleImage,
          titleImageSize: metadata.titleImageSize,
          screenshots: metadata.screenshots || [],
          gameExecutable: metadata.gameExecutable, // This will be the filename or path
          gameFileSize: metadata.gameFileSize,
          logoSize: metadata.logoSize,
          logoPosition: metadata.logoPosition,
          bannerHeight: metadata.bannerHeight,
          bannerPosition: metadata.bannerPosition,
          logoPositionCustom: metadata.logoPositionCustom,
          titlePosition: metadata.titlePosition,
          cardPosition: metadata.cardPosition,
          marketEnabled: metadata.marketEnabled
        };
      }
      
      // Convert file:// URLs to data URLs for all images
      const bannerImageUrl = await convertFileToDataUrl(fd?.bannerImage || metadata?.bannerImage || game.banner);
      const cardImageUrl = await convertFileToDataUrl(fd?.cardImage || metadata?.cardImage);
      const gameLogoUrl = await convertFileToDataUrl(fd?.gameLogo || metadata?.gameLogo || game.banner);
      const titleImageUrl = await convertFileToDataUrl(fd?.titleImage || metadata?.titleImage || game.banner);
      
      // Convert screenshots array
      const screenshotsArray = fd?.screenshots || metadata?.screenshots || [];
      const convertedScreenshots = await Promise.all(
        screenshotsArray.map(screenshot => convertFileToDataUrl(screenshot))
      );
      const validScreenshots = convertedScreenshots.filter(s => s !== null);
      
      // Set form data with loaded values or defaults
      setFormData({
        gameName: fd?.gameName || metadata?.gameName || game.name || '',
        developer: fd?.developer || metadata?.developer || 'Your Studio',
        version: fd?.version || metadata?.version || game.version || '1.0.0',
        genre: fd?.genre || metadata?.genre || 'Action',
        ageRating: fd?.ageRating || metadata?.ageRating || '12+',
        description: fd?.description || metadata?.description || '',
        price: fd?.price || metadata?.price || '0.00',
        releaseDate: fd?.releaseDate || metadata?.releaseDate || new Date().toISOString().split('T')[0],
        tags: fd?.tags || metadata?.tags || '',
        requirements: fd?.requirements || metadata?.requirements || 'Windows 10',
        bannerImage: bannerImageUrl || game.banner,
        cardImage: cardImageUrl || null,
        gameLogo: gameLogoUrl || game.banner,
        titleImage: titleImageUrl || game.banner,
        titleImageSize: fd?.titleImageSize || metadata?.titleImageSize || 100,
        bannerZoom: fd?.bannerZoom || metadata?.bannerZoom || 1,
        cardZoom: fd?.cardZoom || metadata?.cardZoom || 1,
        bannerOffset: fd?.bannerOffset || metadata?.bannerOffset || { x: 0, y: 0 },
        cardOffset: fd?.cardOffset || metadata?.cardOffset || { x: 0, y: 0 },
        screenshots: validScreenshots.length > 0 ? validScreenshots : [],
        // For executable: if we have a filename, create a File-like object reference
        // Note: We can't load the actual file in browser context, but we can indicate it exists
        gameExecutable: fd?.gameExecutable || metadata?.gameExecutable ? 
          (typeof fd?.gameExecutable === 'object' ? fd.gameExecutable : 
           typeof metadata?.gameExecutable === 'object' ? metadata.gameExecutable :
           { name: fd?.gameExecutable || metadata?.gameExecutable, exists: true }) : null,
        gameFileSize: fd?.gameFileSize || metadata?.gameFileSize || 0,
        logoSize: fd?.logoSize || metadata?.logoSize || 120,
        logoPosition: fd?.logoPosition || metadata?.logoPosition || 'left',
        bannerHeight: fd?.bannerHeight || metadata?.bannerHeight || 60,
        bannerPosition: fd?.bannerPosition || metadata?.bannerPosition || { x: 50, y: 50 },
        logoPositionCustom: fd?.logoPositionCustom || metadata?.logoPositionCustom || { x: 50, y: 50 },
        titlePosition: fd?.titlePosition || metadata?.titlePosition || { x: 50, y: 50 },
        cardPosition: fd?.cardPosition || metadata?.cardPosition || { x: 50, y: 50 },
        marketEnabled: fd?.marketEnabled !== false && metadata?.marketEnabled !== false,
      });
    }
  };

  // Quick action to update an existing game's build (opens modal on upload step)
  const handleUpdateBuild = async (gameId) => {
    await handleEditGame(gameId);
    // Jump directly to the upload step after modal opens
    setTimeout(() => {
      setCurrentStep(6);
      setPreviewView('upload');
    }, 0);
  };

  const handleDeleteGame = async (gameId) => {
    // Find the game to get the gameId
    const gameToDelete = games.find(g => g.id === gameId);
    if (!gameToDelete) return;
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${gameToDelete.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Remove from games list in UI
      setGames(games.filter(game => game.id !== gameId));
      
      // Remove from user-specific storage
      const customGames = getUserData('customGames', []);
      const updatedGames = customGames.filter(game => game.gameId !== gameToDelete.gameId);
      saveUserData('customGames', updatedGames);
      
      // Dispatch event to update other components
      window.dispatchEvent(new Event('customGameUpdate'));
      
      // If Electron API is available, delete the game files folder
      if (window.electronAPI && window.electronAPI.deleteGameFolder) {
        await window.electronAPI.deleteGameFolder(gameToDelete.gameId);
      }
      
      alert('Game deleted successfully!');
    } catch (error) {
      console.error('Error deleting game:', error);
      alert('Error deleting game. Please try again.');
    }
  };

  const handleMouseMove = (e, cardId) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Look TOWARD the cursor (positive when mouse is to the right, negative when to the left)
    const rotateY = ((x - centerX) / centerX) * 4; // max 4 degree tilt - looks toward cursor
    const rotateX = -((y - centerY) / centerY) * 4; // negative for natural tilt up/down

    setMousePosition({ 
      x: rotateY, 
      y: rotateX 
    });
    setHoveredCard(cardId);
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
    setHoveredCard(null);
  };
  
  const stepTitles = ['GAME INFO', 'MEDIA', 'STORE', 'GAME MENU', 'COMMUNITY', 'MARKET', 'FILES', 'CONFIRM'];
  const stepHelp = [
    'Game Info: Enter name, developer, version, genre, age rating, description, price, release date, tags and system requirements.',
    'Media: Upload card, banner, logo, stylized title and gallery. Use mouse wheel to zoom and drag to reposition (bounded) in previews.',
    'Store (Preview): See how your game looks in the store. No inputs required.',
    'Game Menu (Preview): Visualize in-game menu layout. No inputs required.',
    'Community (Preview): Preview the community page for your game.',
    'Market (Preview): Preview item marketplace presentation.',
    'Files: Attach the executable. We save it into the game folder. Required to publish.',
    'Confirm: Review everything and publish your game.'
  ];
  
  // Help overlay hover state
  const [helpHovered, setHelpHovered] = useState(false);

  // Handle hash navigation to scroll to sections
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    };

    // Check for hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="game-studio-page">
      <div className="game-studio-container">
        {/* Floating New Game Button */}
        <div className="floating-new-game-btn">
          <button 
            className="upload-game-btn" 
            onClick={() => setShowCreateMenu(!showCreateMenu)}
          >
            <Plus size={20} />
            <span>New Game</span>
          </button>
          
          {showCreateMenu && (
            <div className="game-studio-create-menu">
              <button 
                className="game-studio-menu-item" 
                onClick={handleUploadGame}
              >
                <Plus size={18} />
                <span>New Game</span>
              </button>
              <button 
                className="game-studio-menu-item"
                onClick={() => {
                  setShowCreateMenu(false);
                  // Future: Template or other options
                }}
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                <FileText size={18} />
                <span>From Template</span>
              </button>
              <button 
                className="game-studio-menu-item"
                onClick={() => {
                  setShowCreateMenu(false);
                  // Future: Import option
                }}
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                <Download size={18} />
                <span>Import Game</span>
              </button>
            </div>
          )}
        </div>

        <div className="game-studio-stats">
          <div className="studio-stat-card">
            <Box size={24} />
            <div>
              <span className="stat-value">{games.length}</span>
              <span className="stat-label">Published Games</span>
            </div>
          </div>
          <div className="studio-stat-card">
            <Play size={24} />
            <div>
              <span className="stat-value">{games.reduce((sum, g) => sum + g.downloads, 0).toLocaleString()}</span>
              <span className="stat-label">Total Downloads</span>
            </div>
          </div>
          <div className="studio-stat-card">
            <Settings size={24} />
            <div>
              <span className="stat-value">{games.reduce((sum, g) => parseFloat(g.revenue.replace('$', '').replace(',', '')), 0).toFixed(2)}</span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>
        </div>

        <div className="studio-chart-section">
          <div className="chart-header">
            <div>
              <h3>Player Growth</h3>
              <p>Total active players over time</p>
            </div>
            <div className="chart-filters">
              <button 
                className={`chart-filter-btn ${timeFilter === '1D' ? 'active' : ''}`}
                onClick={() => setTimeFilter('1D')}
              >
                1D
              </button>
              <button 
                className={`chart-filter-btn ${timeFilter === '1W' ? 'active' : ''}`}
                onClick={() => setTimeFilter('1W')}
              >
                1W
              </button>
              <button 
                className={`chart-filter-btn ${timeFilter === '1M' ? 'active' : ''}`}
                onClick={() => setTimeFilter('1M')}
              >
                1M
              </button>
              <button 
                className={`chart-filter-btn ${timeFilter === '1Y' ? 'active' : ''}`}
                onClick={() => setTimeFilter('1Y')}
              >
                1Y
              </button>
            </div>
          </div>
          <div className="chart-container">
            <div className="chart">
              <div className="chart-y-axis">
                {(() => {
                  const maxPlayers = Math.max(...playerStats.map(s => s.players));
                  const maxValue = Math.ceil(maxPlayers / 500) * 500;
                  const values = [];
                  for (let i = 0; i <= 5; i++) {
                    values.push(Math.round((maxValue * i) / 5));
                  }
                  return values.map((val, i) => (
                    <div key={i} className="y-axis-label">{val.toLocaleString()}</div>
                  ));
                })()}
              </div>
              <div className="chart-content">
                <svg className="chart-svg" viewBox="0 0 1000 280" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="white" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const maxPlayers = Math.max(...playerStats.map(s => s.players));
                    const maxValue = Math.ceil(maxPlayers / 500) * 500;
                    
                    return (
                      <>
                        {/* Grid lines */}
                        <line x1="0" y1="56" x2="1000" y2="56" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="0" y1="112" x2="1000" y2="112" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="0" y1="168" x2="1000" y2="168" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="0" y1="224" x2="1000" y2="224" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        
                        {/* Area fill */}
                        <path 
                          d={(() => {
                            const points = playerStats.map((stat, i) => {
                              const x = (i * 1000) / (playerStats.length - 1);
                              const y = 280 - (stat.players / maxValue) * 280;
                              return `${x},${y}`;
                            });
                            return `M 0,280 ${points.map(p => `L ${p}`).join(' ')} L 1000,280 Z`;
                          })()}
                          fill="url(#areaGradient)"
                        />
                        
                        {/* Line */}
                        <polyline
                          points={playerStats.map((stat, i) => {
                            const x = (i * 1000) / (playerStats.length - 1);
                            const y = 280 - (stat.players / maxValue) * 280;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.9"
                        />
                        
                        {/* Invisible hover zones */}
                        {playerStats.map((stat, i) => {
                          const x = (i * 1000) / (playerStats.length - 1);
                          const width = i === playerStats.length - 1 ? 1000 - x : 1000 / (playerStats.length - 1);
                          return (
                            <rect
                              key={i}
                              x={i === 0 ? 0 : x - width / 2}
                              y="0"
                              width={i === 0 || i === playerStats.length - 1 ? width : width}
                              height="280"
                              fill="transparent"
                              onMouseEnter={() => setHoveredIndex(i)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                
                <div className="chart-x-axis">
                  {playerStats.map((stat, index) => (
                    <div key={index} className="x-axis-label">{stat.label || stat.month}</div>
                  ))}
                </div>
                
                {/* Hover tooltip */}
                {hoveredIndex !== null && (() => {
                  const maxPlayers = Math.max(...playerStats.map(s => s.players));
                  const maxValue = Math.ceil(maxPlayers / 500) * 500;
                  return (
                    <div 
                      className="chart-tooltip"
                      style={{
                        left: `${(hoveredIndex * 100) / (playerStats.length - 1)}%`,
                        bottom: `${((playerStats[hoveredIndex].players / maxValue) * 280)}px`
                      }}
                    >
                      {playerStats[hoveredIndex].players.toLocaleString()}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="game-studio-games">
          <div className="studio-games-grid">
            {games.map((game) => (
              <div 
                key={game.id} 
                className="studio-game-card"
                data-status={game.status}
              >
                <div className="studio-game-banner">
                  <img src={game.banner} alt={game.name} onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }} />
                  <div className="studio-banner-placeholder" style={{display: 'none'}}>
                    <div className="placeholder-icon">🎨</div>
                  </div>
                  <div className="studio-game-overlay">
                    <button className="studio-action-btn update" onClick={() => handleUpdateBuild(game.id)} title="Update Build">
                      <RefreshCw size={16} />
                    </button>
                    <button className="studio-action-btn" onClick={() => handleEditGame(game.id)}>
                      <Edit size={16} />
                    </button>
                    <button className="studio-action-btn delete" onClick={() => handleDeleteGame(game.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="studio-game-info">
                  <div className="studio-game-header">
                    <h3>{game.name}</h3>
                  </div>
                  <p className="studio-game-version">Version {game.version}</p>
                  <div className="studio-game-metrics">
                    <div className="studio-metric-item">
                      <div className="studio-metric-icon">
                        <Play size={16} />
                      </div>
                      <div className="studio-metric-info">
                        <span className="studio-metric-value">{game.downloads.toLocaleString()}</span>
                        <span className="studio-metric-label">downloads</span>
                      </div>
                    </div>
                    <div className="studio-metric-item">
                      <div className="studio-metric-icon">
                        <Settings size={16} />
                      </div>
                      <div className="studio-metric-info">
                        <span className="studio-metric-value">{game.revenue}</span>
                        <span className="studio-metric-label">revenue</span>
                      </div>
                    </div>
                  </div>
                  <div className="studio-game-footer">
                    <span className="studio-update-info">Updated {game.lastUpdated}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Sections */}
        <div id="performance-dashboard" style={{ marginTop: '60px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Performance Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor your game's performance metrics and KPIs.</p>
        </div>

        <div id="player-statistics" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Player Statistics</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track player demographics and behavior patterns.</p>
        </div>

        <div id="engagement-metrics" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Engagement Metrics</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Measure user engagement and retention rates.</p>
        </div>

        <div id="revenue-analytics" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Revenue Analytics</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Analyze revenue streams and monetization strategies.</p>
        </div>

        {/* Content Sections */}
        <div id="all-content" style={{ marginTop: '60px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>All Content</h2>
          <p style={{ color: 'var(--text-secondary)' }}>View and manage all your published content.</p>
        </div>

        <div id="assets" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Assets</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manage game assets, images, and files.</p>
        </div>

        <div id="add-content" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Add New Content</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Upload and publish new content for your games.</p>
        </div>

        <div id="content-settings" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Content Settings</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Configure content management preferences.</p>
        </div>

        {/* Reports Sections */}
        <div id="sales-reports" style={{ marginTop: '60px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Sales Reports</h2>
          <p style={{ color: 'var(--text-secondary)' }}>View detailed sales and revenue reports.</p>
        </div>

        <div id="analytics-reports" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Analytics Reports</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Generate comprehensive analytics reports.</p>
        </div>

        <div id="user-reports" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>User Reports</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Analyze user activity and behavior reports.</p>
        </div>

        <div id="content-reports" style={{ marginTop: '40px', padding: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Content Reports</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track content performance and engagement.</p>
        </div>

        {/* Upload Modal */}
        {uploadModalOpen && (
            <div className="upload-modal-overlay" onClick={() => setUploadModalOpen(false)}>
            <div className={`upload-modal ${isModalMinimized ? 'minimized' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="upload-modal-header">
                <h3>{editingGameId ? 'Edit Your Game' : 'Add Your Game'}</h3>
              </div>
              
              {/* Split Layout: Progress + Preview */}
              <div className="upload-modal-split">
                {/* Maximize/Minimize Button - Only show in preview sections (steps 3-6) */}
                {(currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6) && (
                  <button 
                    className="upload-maximize-btn"
                    onClick={() => setIsModalMinimized(!isModalMinimized)}
                    title={isModalMinimized ? "Expand form" : "Minimize form"}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: isModalMinimized ? '80px' : '50%',
                      transform: 'translate(-50%, -50%)',
                      transition: 'left 0.3s ease'
                    }}
                  >
                    {isModalMinimized ? (
                      <ChevronRight size={20} />
                    ) : (
                      <ChevronLeft size={20} />
                    )}
                  </button>
                )}
                
                {/* Left Side: Progress Bar */}
                <div className="upload-modal-left">
                  <div className="upload-progress-container">
                    <div className="upload-progress-wrapper">
                      <div className={`upload-keyboard-hint upload-keyboard-hint-left ${currentStep > 1 ? 'active' : 'disabled'}`}>
                        <ChevronLeft size={16} />
                        <span className="keyboard-key">Q</span>
                      </div>
                      
                      {/* Section Titles */}
                      <div className="progress-section-title progress-title-information">INFORMATION</div>
                      <div className="progress-section-title progress-title-menus">MENUS</div>
                      <div className="progress-section-title progress-title-upload">UPLOAD</div>
                      
                      <div 
                        className="upload-progress-line" 
                        data-current-step={currentStep} 
                        data-has-errors={[1, 2, 3, 4, 5, 6, 7, 8].filter(s => s <= currentStep && stepErrors[s]).length > 0}
                        data-step-1-error={stepErrors[1]}
                        data-step-2-error={stepErrors[2]}
                        data-step-3-error={stepErrors[3]}
                        data-step-4-error={stepErrors[4]}
                        data-step-5-error={stepErrors[5]}
                        data-step-6-error={stepErrors[6]}
                        data-step-7-error={stepErrors[7]}
                        data-step-8-error={stepErrors[8]}
                      >
                      {/* Background line segments */}
                      <div className="upload-line-segment upload-line-segment-1-2"></div>
                      <div className="upload-line-segment upload-line-segment-2-3"></div>
                      <div className="upload-line-segment upload-line-segment-3-4"></div>
                      <div className="upload-line-segment upload-line-segment-4-5"></div>
                      <div className="upload-line-segment upload-line-segment-5-6"></div>
                      <div className="upload-line-segment upload-line-segment-6-7"></div>
                      <div className="upload-line-segment upload-line-segment-7-8"></div>
                      
                      {/* Progress fill segments */}
                      <div className={`progress-fill-segment progress-fill-1-2 ${stepErrors[1] ? 'error' : ''}`}></div>
                      <div className={`progress-fill-segment progress-fill-2-3 ${stepErrors[2] ? 'error' : ''}`}></div>
                      <div className={`progress-fill-segment progress-fill-3-4 ${stepErrors[3] ? 'error' : ''} ${isLineBlueOptional(3) ? 'blue-optional' : ''}`}></div>
                      <div className={`progress-fill-segment progress-fill-4-5 ${stepErrors[4] ? 'error' : ''} ${isLineBlueOptional(4) ? 'blue-optional' : ''}`}></div>
                      <div className={`progress-fill-segment progress-fill-5-6 ${stepErrors[5] ? 'error' : ''} ${isLineBlueOptional(5) ? 'blue-optional' : ''}`}></div>
                      <div className={`progress-fill-segment progress-fill-6-7 ${stepErrors[6] ? 'error' : ''} ${isLineBlueOptional(6) ? 'blue-optional' : ''}`}></div>
                      <div className={`progress-fill-segment progress-fill-7-8 ${stepErrors[7] ? 'error' : ''}`}></div>
                      
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => {
                    // Show error if step has error and is before or equal to current step
                    const showError = stepErrors[step] && step <= currentStep;
                    
                    // Check if Confirm step should be disabled
                    // We need to check if all required steps (1, 2, 7) are actually completed
                    const isStep1Completed = formData.gameName && formData.developer && formData.version && formData.genre && formData.description;
                    const isStep2Completed = formData.bannerImage !== null && 
                                            formData.cardImage !== null && 
                                            formData.gameLogo !== null && 
                                            formData.titleImage !== null && 
                                            formData.screenshots && formData.screenshots.length > 0;
                    const isStep7Completed = formData.gameExecutable !== null;
                    const allRequiredStepsCompleted = isStep1Completed && isStep2Completed && isStep7Completed;
                    
                    const isConfirmDisabled = step === 8 && !allRequiredStepsCompleted && currentStep < 8;
                    
                    return (
                    <div 
                      key={step} 
                      className={`upload-progress-step ${currentStep === step ? 'active' : ''} ${step === 8 && currentStep === step ? 'confirm-active' : ''} ${step === 8 && currentStep !== step ? 'confirm-outline' : ''} ${completedSteps.includes(step) ? 'completed' : ''} ${isOptionalStepPassed(step) ? 'optional-passed' : ''} ${showError ? 'error' : ''} ${isConfirmDisabled ? 'confirm-disabled' : ''} ${(step >= 3 && step <= 6) ? 'optional-step' : ''}`}
                      onClick={() => {
                        // Prevent clicking on Confirm step if there are errors
                        if (isConfirmDisabled) return;
                        
                        // Validate all steps before the clicked step
                        if (step === 8) {
                          // For confirm step, validate all required steps and only navigate if all pass
                          const step1Valid = validateStep(1);
                          const step2Valid = validateStep(2);
                          const step7Valid = validateStep(7);
                          
                          // Only navigate if all required steps are valid
                          if (step1Valid && step2Valid && step7Valid) {
                            setCurrentStep(8);
                          }
                          return;
                        }
                        
                        // For other steps, validate previous steps
                        for (let i = 1; i < step; i++) {
                          validateStep(i);
                        }
                        setCurrentStep(step);
                      }}
                      style={{ cursor: isConfirmDisabled ? 'not-allowed' : 'pointer' }}
                    >
                      <div className="upload-step-circle">
                        {currentStep === step && step === 8 ? (
                          // Confirm step active: unlocked lock
                          <Unlock size={20} />
                        ) : currentStep === step ? (
                          // Active step without error: yellow with edit icon
                          <Edit2 size={20} />
                        ) : step === 8 ? (
                          // Confirm step inactive: show locked or unlocked lock
                          isConfirmDisabled ? (
                            <Lock size={20} />
                          ) : (
                            <Unlock size={20} />
                          )
                        ) : (
                          // All other steps: show number (completed or not)
                          <span>{step}</span>
                        )}
                      </div>
                      <div className="upload-step-label">
                        {stepTitles[step - 1]}
                        {(step === 3 || step === 4 || step === 5 || step === 6) && (
                          <span className="upload-step-optional"> Optional</span>
                        )}
                      </div>
                    </div>
                  )})}
              </div>
              
                      <div className={`upload-keyboard-hint upload-keyboard-hint-right ${(() => {
                        const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
                        // Disable if on last step OR if on step 7 with errors (can't go to Confirm)
                        return (currentStep < totalSteps && !(currentStep === 7 && hasErrors)) ? 'active' : 'disabled';
                      })()}`}>
                        <span className="keyboard-key">E</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
              </div>

                  {/* Form Content */}
              <div className="upload-modal-content">
                {currentStep === 1 && (
                  <div className="upload-tab-content">
                    <div className="upload-form-grid">
                      <div className="upload-section">
                        <label className="upload-label">Game Name *</label>
                        <input 
                          ref={gameNameInputRef}
                          type="text" 
                          className={`upload-input ${stepErrors[1] && !formData.gameName ? 'error' : ''}`}
                          placeholder="Enter game name" 
                          value={formData.gameName || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('gameName', e.target.value);
                          }}
                          onFocus={(e) => e.target.select()}
                          onMouseDown={(e) => e.stopPropagation()}
                          autoFocus={!editingGameId && currentStep === 1}
                          disabled={false}
                        />
                      </div>
                      <div className="upload-section">
                        <label className="upload-label">Developer / Publisher *</label>
                        <input 
                          ref={developerInputRef}
                          type="text" 
                          className={`upload-input ${stepErrors[1] && !formData.developer ? 'error' : ''}`}
                          placeholder="Enter developer or publisher name" 
                          value={formData.developer || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('developer', e.target.value);
                          }}
                          onFocus={(e) => e.target.select()}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={false}
                        />
                      </div>
                      <div className="upload-section">
                        <label className="upload-label">Version *</label>
                        <input 
                          type="text" 
                          className={`upload-input ${stepErrors[1] && !formData.version ? 'error' : ''}`}
                          placeholder="e.g. 1.0.0"
                          value={formData.version || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('version', e.target.value);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={false}
                        />
                      </div>
                      <div className="upload-section">
                        <label className="upload-label">Genre *</label>
                        <select 
                          className={`upload-input ${stepErrors[1] && !formData.genre ? 'error' : ''}`}
                          value={formData.genre || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('genre', e.target.value);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={false}
                        >
                          <option value="">Select genre</option>
                          <option value="action">Action</option>
                          <option value="adventure">Adventure</option>
                          <option value="rpg">RPG</option>
                          <option value="strategy">Strategy</option>
                          <option value="simulation">Simulation</option>
                          <option value="sports">Sports</option>
                          <option value="racing">Racing</option>
                          <option value="puzzle">Puzzle</option>
                          <option value="indie">Indie</option>
                          <option value="casual">Casual</option>
                          <option value="horror">Horror</option>
                          <option value="multiplayer">Multiplayer</option>
                        </select>
                      </div>
                      <div className="upload-section">
                        <label className="upload-label">
                          Age Rating
                          <span className="upload-optional-label"> (Optional)</span>
                        </label>
                        <select 
                          className="upload-input"
                          value={formData.ageRating || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('ageRating', e.target.value);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={false}
                        >
                          <option value="">Select rating</option>
                          <option value="everyone">Everyone</option>
                          <option value="teen">Teen</option>
                          <option value="mature">Mature</option>
                          <option value="adults-only">Adults Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="upload-section">
                      <label className="upload-label">Game Description *</label>
                      <textarea 
                        className={`upload-textarea ${stepErrors[1] && !formData.description ? 'error' : ''}`}
                        placeholder="Describe your game, its features, and what makes it special" 
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                      />
                    </div>

                    <div className="upload-form-grid">
                      <div className="upload-section">
                        <label className="upload-label">
                          Price
                          <span className="upload-optional-label"> (Optional)</span>
                        </label>
                        <input 
                          type="number" 
                          className="upload-input" 
                          placeholder="0.00" 
                          step="0.01" 
                          min="0"
                          value={formData.price || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('price', e.target.value);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={false}
                        />
                      </div>
                      <div className="upload-section">
                        <label className="upload-label">
                          Release Date
                          <span className="upload-optional-label"> (Optional)</span>
                        </label>
                        <input 
                          type="date" 
                          className="upload-input"
                          value={formData.releaseDate || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleInputChange('releaseDate', e.target.value);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          disabled={false}
                        />
                      </div>
                    </div>

                    <div className="upload-section">
                      <label className="upload-label">
                        Tags
                        <span className="upload-optional-label"> (Optional)</span>
                      </label>
                      <input 
                        type="text" 
                        className="upload-input" 
                        placeholder="Enter tags separated by commas (e.g. action, multiplayer, indie)"
                        value={formData.tags || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleInputChange('tags', e.target.value);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={false}
                      />
                    </div>

                    <div className="upload-section">
                      <label className="upload-label">
                        System Requirements
                        <span className="upload-optional-label"> (Optional)</span>
                      </label>
                      <textarea 
                        className="upload-textarea" 
                        placeholder="Minimum and recommended system requirements" 
                        rows={3}
                        value={formData.requirements || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleInputChange('requirements', e.target.value);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={false}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="upload-tab-content" style={{ paddingBottom: '60px' }}>
                    {/* Media Upload Grid - Custom Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '251px 400px 340px', gridTemplateRows: '180px 180px', gap: '16px', marginBottom: '16px' }}>
                      {/* Left Column - Card Banner (vertical, spans both rows) */}
                      <div style={{ gridColumn: '1', gridRow: '1 / -1', display: 'flex' }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <ImageUpload
                            label="Card Banner"
                            optional={false}
                            field="cardImage"
                            value={formData.cardImage}
                            onChange={(file) => handleFileUpload('cardImage', file)}
                            onDelete={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, cardImage: null }));
                            }}
                            recommendedSize="200x300"
                            previewClass="upload-preview-card"
                          />
                        </div>
                      </div>

                      {/* Middle Column - Game Banner (top) */}
                      <div style={{ gridColumn: '2', gridRow: '1' }}>
                        <ImageUpload
                          label="Game Banner"
                          field="bannerImage"
                          value={formData.bannerImage}
                          onChange={(file) => handleFileUpload('bannerImage', file)}
                          onDelete={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, bannerImage: null }));
                          }}
                          recommendedSize="1920x1080"
                        />
                      </div>

                      {/* Middle Column - Stylized Title (bottom) */}
                      <div style={{ gridColumn: '2', gridRow: '2' }}>
                        <ImageUpload
                          label="Stylized Title"
                          optional={false}
                          field="titleImage"
                          value={formData.titleImage}
                          onChange={(file) => handleFileUpload('titleImage', file)}
                          onDelete={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, titleImage: null }));
                          }}
                          previewClass="upload-preview-title"
                        />
                      </div>

                      {/* Right Column - Logo (vertical, spans both rows) */}
                      <div style={{ gridColumn: '3', gridRow: '1 / -1', display: 'flex' }}>
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <ImageUpload
                            label="Logo"
                            optional={false}
                            field="gameLogo"
                            value={formData.gameLogo}
                            onChange={(file) => handleFileUpload('gameLogo', file)}
                            onDelete={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, gameLogo: null }));
                            }}
                            recommendedSize="512x512"
                            previewClass="upload-preview-logo"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Media */}
                    <div className="upload-section">
                      <label className="upload-label">
                        Media
                        <span className="upload-optional-label"> (Screenshots, Videos, GIFs)</span>
                      </label>
                      {formData.screenshots && formData.screenshots.length > 0 ? (
                        <div className="upload-screenshots-grid">
                          {formData.screenshots.map((file, index) => {
                            const isVideo = file.type && file.type.startsWith('video/');
                            const mediaUrl = getImageUrl(file);
                            return (
                            <div key={index} className="upload-screenshot-item">
                                {isVideo ? (
                                  <CustomVideoPlayer 
                                    src={mediaUrl}
                                    onContextMenu={(e) => e.preventDefault()}
                                  />
                                ) : (
                                  <img 
                                    src={mediaUrl} 
                                    alt={`Media ${index + 1}`} 
                                className="upload-preview-screenshot"
                              />
                                )}
                              <button 
                                className="upload-screenshot-delete"
                                onClick={() => {
                                  const newScreenshots = formData.screenshots.filter((_, i) => i !== index);
                                  setFormData(prev => ({ ...prev, screenshots: newScreenshots }));
                                }}
                                  title="Delete media"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            );
                          })}
                          {formData.screenshots.length < 10 && (
                            <label htmlFor="screenshots-upload" className="upload-screenshot-add">
                              <Plus size={24} />
                              <span>Add more</span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <label htmlFor="screenshots-upload" className="upload-banner-upload">
                        <Image size={48} />
                        <span>Upload Media (up to 10)</span>
                        </label>
                      )}
                      <input 
                        type="file" 
                        id="screenshots-upload" 
                        accept="image/*,video/*,.gif"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            const newFiles = Array.from(files);
                            setFormData(prev => {
                              const existingScreenshots = prev.screenshots || [];
                              const totalFiles = [...existingScreenshots, ...newFiles];
                              return {
                                ...prev,
                                screenshots: totalFiles.slice(0, 10)
                              };
                            });
                            if (stepErrors[currentStep]) {
                              setStepErrors(prev => ({
                                ...prev,
                                [currentStep]: false
                              }));
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="upload-tab-content">
                    <h3 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Preview: Store</h3>
                    <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                      See how your game will appear in the store. Navigate to see different views.
                    </p>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="upload-tab-content">
                    {formData.titleImage && (
                      <div className="upload-section">
                        <label className="upload-label">Title Image Size</label>
                        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <input
                              type="range"
                              min="20"
                              max="150"
                              value={formData.titleImageSize}
                              onChange={(e) => handleInputChange('titleImageSize', parseInt(e.target.value))}
                              className="upload-slider"
                              style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)', minWidth: '50px', textAlign: 'center' }}>
                              {formData.titleImageSize}%
                            </span>
                          </div>
                          <small style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block' }}>
                            Adjust how large the title image appears in the game page banner
                          </small>
                        </div>
                      </div>
                    )}
                    
                    {!formData.titleImage && (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Image size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p style={{ fontSize: '14px' }}>Upload a title image in the Media section to customize its size</p>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="upload-tab-content">
                    <h3 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Preview: Community</h3>
                    <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                      See how your game will appear in the community section. This preview shows a sample community view.
                    </p>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="upload-tab-content">
                    <h3 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Market Settings</h3>
                    <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                      Enable or disable marketplace features for your game. Users can request markets for games that don't have them enabled.
                    </p>
                    
                    <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.marketEnabled}
                          onChange={(e) => handleInputChange('marketEnabled', e.target.checked)}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Enable Market
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Allow users to buy and sell items in your game's marketplace
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 7 && (
                  <div className="upload-tab-content">
                    <div className="upload-section">
                      <label className="upload-label">Game Executable *</label>
                      <div style={{ position: 'relative' }}>
                        {formData.gameExecutable ? (
                          <label htmlFor="executable-upload" style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}>
                            <button 
                              className="upload-delete-btn" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleFileUpload('gameExecutable', null);
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: '#FF4757',
                                border: '1px solid #FF4757',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'white',
                                transition: 'all 0.2s ease',
                                zIndex: 10,
                                opacity: 0.9
                              }}
                            >
                              <Trash2 size={14} /> Remove
                            </button>
                            <Package size={48} color="var(--accent-primary)" />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {formData.gameExecutable?.name || formData.gameExecutable || 'Game Executable'}
                            </span>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                              {formatFileSize(formData.gameFileSize)}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                              Click to replace
                            </span>
                          </label>
                        ) : (
                          <label htmlFor="executable-upload" className={`upload-file-upload ${stepErrors[6] ? 'error' : ''}`}>
                            <Package size={48} />
                            <span>Upload Game Files (.exe, .app, etc.)</span>
                          </label>
                        )}
                        <input 
                          type="file" 
                          id="executable-upload" 
                          accept=".exe,.app,.deb,.rpm"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload('gameExecutable', e.target.files[0])}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 8 && (
                  <div className="upload-tab-content">
                    <h3 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Review your information</h3>
                    <div className="upload-section">
                      <label className="upload-label">Game Name</label>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '16px' }}>{formData.gameName || 'Not provided'}</p>
                      
                      <label className="upload-label">Developer / Publisher</label>
                      <p style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '16px' }}>{formData.developer || 'Not provided'}</p>
                      
                      <label className="upload-label">Version</label>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{formData.version || 'Not provided'}</p>
                      
                      <label className="upload-label">Genre</label>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{formData.genre ? formData.genre.charAt(0).toUpperCase() + formData.genre.slice(1) : 'Not provided'}</p>
                      
                      <label className="upload-label">Files</label>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        {formData.bannerImage ? '✓ Banner uploaded' : '✗ No banner'} • 
                        {formData.gameLogo ? ' ✓ Logo uploaded' : ' ✗ No logo'} • 
                        {formData.gameExecutable ? ` ✓ Executable uploaded (${formatFileSize(formData.gameFileSize)})` : ' ✗ No executable'}
                      </p>
                    </div>
                    
                    <div className="upload-section" style={{ marginTop: '32px' }}>
                      <label className="upload-label">Preview All Menus</label>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => setPreviewView('store')}
                          style={{
                            padding: '12px 24px',
                            background: previewView === 'store' ? 'var(--accent-primary)' : 'transparent',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '8px',
                            color: previewView === 'store' ? 'white' : 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Store
                        </button>
                        <button 
                          onClick={() => setPreviewView('game')}
                          style={{
                            padding: '12px 24px',
                            background: previewView === 'game' ? 'var(--accent-primary)' : 'transparent',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '8px',
                            color: previewView === 'game' ? 'white' : 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Game Menu
                        </button>
                        <button 
                          onClick={() => setPreviewView('community')}
                          style={{
                            padding: '12px 24px',
                            background: previewView === 'community' ? 'var(--accent-primary)' : 'transparent',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '8px',
                            color: previewView === 'community' ? 'white' : 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Community
                        </button>
                        <button 
                          onClick={() => setPreviewView('market')}
                          style={{
                            padding: '12px 24px',
                            background: previewView === 'market' ? 'var(--accent-primary)' : 'transparent',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '8px',
                            color: previewView === 'market' ? 'white' : 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Market
                        </button>
                      </div>
                    </div>

                <div className="upload-section upload-terms-section">
                  <label className="upload-checkbox">
                    <input type="checkbox" required />
                    <span>I agree to the terms of service and confirm I have the rights to publish this game</span>
                  </label>
                    </div>
                  </div>
                )}

                </div>

                  {/* Action Buttons - Fixed at Bottom */}
                <div className="upload-modal-actions">
                  <button className="upload-cancel-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                    <div className="upload-navigation-buttons">
                      <button 
                        className="upload-nav-btn upload-prev-btn" 
                        onClick={handlePrevStep}
                        disabled={currentStep === 1}
                      >
                        <ChevronLeft size={18} />
                        <span>Previous</span>
                      </button>
                      {currentStep < totalSteps ? (
                        <button 
                          className="upload-nav-btn upload-next-btn" 
                          onClick={handleNextStep}
                          disabled={(() => {
                            const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
                            return currentStep === 7 && hasErrors;
                          })()}
                          style={{
                            opacity: (() => {
                              const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
                              return currentStep === 7 && hasErrors ? 0.5 : 1;
                            })(),
                            cursor: (() => {
                              const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
                              return currentStep === 7 && hasErrors ? 'not-allowed' : 'pointer';
                            })()
                          }}
                        >
                          <span>Next</span>
                          <ChevronRight size={18} />
                        </button>
                      ) : (
                        <button 
                          className="upload-submit-btn"
                          onClick={(e) => {
                            if (!canFinalizeUpload()) {
                              e.preventDefault();
                              // Show validation errors for required steps
                              validateStep(1);
                              validateStep(2);
                              validateStep(7);
                              alert('Please fill in all required fields before uploading.');
                            } else {
                              // Get or initialize custom games from user-specific storage
                              let customGames = getUserData('customGames', []);
                              
                              const gameId = formData.gameName.toLowerCase().replace(/\s+/g, '-');
                              
                              // Helper function to convert File to data URL
                              const fileToDataURL = (file) => {
                                return new Promise((resolve) => {
                                  if (!file) {
                                    resolve(null);
                                    return;
                                  }
                                  if (typeof file === 'string') {
                                    resolve(file);
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (e) => resolve(e.target.result);
                                  reader.onerror = () => resolve(null);
                                  reader.readAsDataURL(file);
                                });
                              };
                              
                              // Convert images to data URLs
                              const bannerImagePromise = fileToDataURL(formData.bannerImage);
                              const gameLogoPromise = fileToDataURL(formData.gameLogo);
                              const titleImagePromise = fileToDataURL(formData.titleImage);
                              const cardImagePromise = fileToDataURL(formData.cardImage);
                              
                              // Convert screenshots array
                              const screenshotsPromises = (formData.screenshots || []).map(screenshot => fileToDataURL(screenshot));
                              
                              // Wait for all conversions
                              Promise.all([
                                bannerImagePromise, 
                                gameLogoPromise, 
                                titleImagePromise,
                                cardImagePromise,
                                ...screenshotsPromises
                              ]).then(async ([banner, logo, title, card, ...screenshots]) => {
                                console.log('Starting game creation for:', gameId);
                                console.log('Banner:', banner ? 'Present' : 'Missing');
                                console.log('Logo:', logo ? 'Present' : 'Missing');
                                console.log('Title:', title ? 'Present' : 'Missing');
                                console.log('Card:', card ? 'Present' : 'Missing');
                                console.log('Screenshots:', screenshots.filter(Boolean).length);
                                
                                // If we're in Electron, save files to disk
                                let filePaths = {};
                                if (window.electronAPI && window.electronAPI.saveGameFiles) {
                                  console.log('Saving files to disk...');
                                  try {
                                    const filesToSave = {};
                                    
                                    // Prepare files to save
                                    if (banner) filesToSave.banner = { dataURL: banner, name: formData.bannerImage?.name || 'banner' };
                                    if (logo) filesToSave.logo = { dataURL: logo, name: formData.gameLogo?.name || 'logo' };
                                    if (title) filesToSave.title = { dataURL: title, name: formData.titleImage?.name || 'title' };
                                    if (card) filesToSave.card = { dataURL: card, name: formData.cardImage?.name || 'card' };
                                    
                                    // Save screenshots with index
                                    screenshots.forEach((screenshot, index) => {
                                      if (screenshot) {
                                        filesToSave[`screenshot_${index}`] = { 
                                          dataURL: screenshot, 
                                          name: formData.screenshots?.[index]?.name || `screenshot_${index}` 
                                        };
                                      }
                                    });
                                    
                                    console.log('Files to save:', Object.keys(filesToSave));
                                    const result = await window.electronAPI.saveGameFiles(gameId, filesToSave);
                                    console.log('Save result:', result);
                                    if (result.success) {
                                      filePaths = result.paths;
                                      console.log('Files saved with paths:', filePaths);
                                    }
                                  } catch (error) {
                                    console.error('Error saving game files:', error);
                                  }
                                  
                                  // Save game executable if provided
                                  if (formData.gameExecutable && window.electronAPI && window.electronAPI.saveGameExecutable) {
                                    try {
                                      // Check if it's a File object or a reference object
                                      const isFileObject = formData.gameExecutable instanceof File;
                                      
                                      if (isFileObject) {
                                        // Convert File to buffer for saving
                                        const executableBuffer = await new Promise((resolve, reject) => {
                                          const reader = new FileReader();
                                          reader.onload = (e) => resolve(e.target.result);
                                          reader.onerror = reject;
                                          reader.readAsArrayBuffer(formData.gameExecutable);
                                        });
                                        
                                        const executableResult = await window.electronAPI.saveGameExecutable(gameId, {
                                          buffer: Array.from(new Uint8Array(executableBuffer)),
                                          name: formData.gameExecutable.name
                                        });
                                        
                                        if (executableResult.success) {
                                          console.log('Executable saved:', executableResult.filename);
                                          filePaths.gameExecutable = executableResult.path;
                                        }
                                      } else if (formData.gameExecutable.exists) {
                                        // It's a reference object - the file already exists on disk
                                        // We don't need to save it again, just update the path reference
                                        console.log('Executable already exists on disk:', formData.gameExecutable.name);
                                        // Try to get the full path from the game folder
                                        const gameFolderPath = await window.electronAPI.getGameFolderPath(gameId);
                                        if (gameFolderPath) {
                                          // Construct the file path
                                          const fileName = formData.gameExecutable.name || 'game.exe';
                                          filePaths.gameExecutable = `file://${gameFolderPath.replace(/\\/g, '/')}/${fileName}`;
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Error saving game executable:', error);
                                    }
                                  }
                                } else {
                                  console.error('Electron API not available');
                                }
                                  
                                // Also save metadata to JSON file (ONLY use file paths, no data URLs)
                                if (window.electronAPI && window.electronAPI.saveGameMetadata) {
                                  try {
                                    // Get existing metadata if editing
                                    let existingMetadata = {};
                                    if (editingGameId) {
                                      try {
                                        const existingMetaResult = await window.electronAPI.getGameMetadata(gameId);
                                        if (existingMetaResult.success) {
                                          existingMetadata = existingMetaResult.metadata;
                                        }
                                      } catch (err) {
                                        console.warn('Could not load existing metadata:', err);
                                      }
                                    }
                                    
                                    const metadata = {
                                      gameName: formData.gameName || existingMetadata.gameName || '',
                                      developer: formData.developer || existingMetadata.developer || '',
                                      version: formData.version || existingMetadata.version || '',
                                      genre: formData.genre || existingMetadata.genre || '',
                                      ageRating: formData.ageRating || existingMetadata.ageRating || '',
                                      description: formData.description || existingMetadata.description || '',
                                      price: formData.price || existingMetadata.price || '0.00',
                                      releaseDate: formData.releaseDate || existingMetadata.releaseDate || '',
                                      tags: formData.tags || existingMetadata.tags || '',
                                      requirements: formData.requirements || existingMetadata.requirements || '',
                                      titleImageSize: formData.titleImageSize || existingMetadata.titleImageSize || 100,
                                      logoSize: formData.logoSize || existingMetadata.logoSize || 120,
                                      logoPosition: formData.logoPosition || existingMetadata.logoPosition || 'left',
                                      bannerHeight: formData.bannerHeight || existingMetadata.bannerHeight || 60,
                                      bannerImage: filePaths.banner || existingMetadata.bannerImage || null,
                                      gameLogo: filePaths.logo || existingMetadata.gameLogo || null,
                                      titleImage: filePaths.title || existingMetadata.titleImage || null,
                                      cardImage: filePaths.card || existingMetadata.cardImage || null,
                                      screenshots: screenshots.map((screenshot, index) => filePaths[`screenshot_${index}`] || existingMetadata.screenshots?.[index] || null).filter(Boolean),
                                      gameExecutable: filePaths.gameExecutable || (formData.gameExecutable ? formData.gameExecutable.name : null) || existingMetadata.gameExecutable || null,
                                      gameFileSize: formData.gameFileSize || existingMetadata.gameFileSize || 0,
                                      bannerZoom: formData.bannerZoom || bannerStateRef.current.scale || 1,
                                      cardZoom: formData.cardZoom || cardStateRef.current.scale || 1,
                                      bannerOffset: formData.bannerOffset || { x: bannerStateRef.current.x || 0, y: bannerStateRef.current.y || 0 },
                                      cardOffset: formData.cardOffset || { x: cardStateRef.current.x || 0, y: cardStateRef.current.y || 0 },
                                      bannerPosition: formData.bannerPosition || existingMetadata.bannerPosition || { x: 50, y: 50 },
                                      logoPositionCustom: formData.logoPositionCustom || existingMetadata.logoPositionCustom || { x: 50, y: 50 },
                                      titlePosition: formData.titlePosition || existingMetadata.titlePosition || { x: 50, y: 50 },
                                      cardPosition: formData.cardPosition || existingMetadata.cardPosition || { x: 50, y: 50 },
                                      createdAt: existingMetadata.createdAt || new Date().toISOString(),
                                      updatedAt: new Date().toISOString()
                                    };
                                    console.log('Saving metadata for game:', gameId, metadata);
                                    const result = await window.electronAPI.saveGameMetadata(gameId, metadata);
                                    console.log('Metadata save result:', result);
                                  } catch (error) {
                                    console.error('Error saving metadata:', error);
                                  }
                                }
                                
                                const newGame = {
                                  id: `custom-${Date.now()}`,
                                  gameId: gameId,
                                  name: formData.gameName || 'Untitled Game',
                                  icon: formData.gameName ? formData.gameName.charAt(0).toUpperCase() : 'U',
                                  // Use data URLs for display (work in both dev and production)
                                  banner: banner || filePaths.banner,
                                  logo: logo || filePaths.logo,
                                  title: title || filePaths.title,
                                  card: card || filePaths.card,
                                  screenshots: screenshots.map((screenshot, index) => screenshot || filePaths[`screenshot_${index}`]).filter(Boolean),
                                  rating: 0,
                                  playerCount: '0',
                                  currentPlaying: '0',
                                  trending: '0%',
                                  description: formData.description || 'No description available.',
                                  tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
                                  playtime: '0h',
                                  lastPlayed: 'Never',
                                  size: formData.gameExecutable ? `${(formData.gameFileSize / (1024 * 1024 * 1024)).toFixed(1)} GB` : '0 GB',
                                  developer: formData.developer || 'You',
                                  releaseDate: formData.releaseDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                                  version: formData.version || '1.0.0',
                                  genre: formData.genre || 'Unknown',
                                  status: 'public',
                                  downloads: 0,
                                  bannerHeight: formData.bannerHeight || 60,
                                  // Save all form data for editing later (use file paths only, not data URLs)
                                  fullFormData: {
                                    gameName: formData.gameName || '',
                                    developer: formData.developer || '',
                                    version: formData.version || '',
                                    genre: formData.genre || '',
                                    ageRating: formData.ageRating || '',
                                    description: formData.description || '',
                                    price: formData.price || '0.00',
                                    releaseDate: formData.releaseDate || '',
                                    tags: formData.tags || '',
                                    requirements: formData.requirements || '',
                                    bannerImage: filePaths.banner || null,
                                    gameLogo: filePaths.logo || null,
                                    titleImage: filePaths.title || null,
                                    cardImage: filePaths.card || null,
                                    screenshots: screenshots.map((screenshot, index) => filePaths[`screenshot_${index}`] || null).filter(Boolean),
                                    gameExecutable: filePaths.gameExecutable || (formData.gameExecutable ? formData.gameExecutable.name : null),
                                    gameFileSize: formData.gameFileSize || 0,
                                    titleImageSize: formData.titleImageSize || 100,
                                    logoSize: formData.logoSize || 120,
                                    logoPosition: formData.logoPosition || 'left',
                                    bannerHeight: formData.bannerHeight || 60,
                                    marketEnabled: formData.marketEnabled !== false,
                                    bannerZoom: formData.bannerZoom || bannerStateRef.current.scale || 1,
                                    cardZoom: formData.cardZoom || cardStateRef.current.scale || 1,
                                    bannerOffset: formData.bannerOffset || { x: bannerStateRef.current.x || 0, y: bannerStateRef.current.y || 0 },
                                    cardOffset: formData.cardOffset || { x: cardStateRef.current.x || 0, y: cardStateRef.current.y || 0 },
                                    // Save preview positioning so other menus can apply them
                                    bannerPosition: formData.bannerPosition || { x: 50, y: 50 },
                                    logoPositionCustom: formData.logoPositionCustom || { x: 50, y: 50 },
                                    titlePosition: formData.titlePosition || { x: 50, y: 50 },
                                    cardPosition: formData.cardPosition || { x: 50, y: 50 }
                                  }
                                };
                                
                                if (editingGameId) {
                                  // Update existing game (match by stable gameId, not studio list id)
                                  const updatedGames = customGames.map(game => 
                                    game.gameId === gameId 
                                      ? { ...game, ...newGame }
                                      : game
                                  );
                                  saveUserData('customGames', updatedGames);
                                  
                                  // Dispatch custom event to update other components
                                  window.dispatchEvent(new Event('customGameUpdate'));
                                  
                                  setGames(games.map(game => 
                                    game.id === editingGameId 
                                      ? { ...game, name: formData.gameName, version: formData.version }
                                      : game
                                  ));
                                  alert('Game updated successfully!');
                                  setEditingGameId(null);
                                } else {
                                  // Add new game
                                  customGames.push(newGame);
                                  
                                  // Save to user-specific storage (this might fail if data URLs are too large)
                                  try {
                                    saveUserData('customGames', customGames);
                                  } catch (error) {
                                    console.error('Failed to save to storage (likely too large):', error);
                                    // Fallback: save without the full data URLs
                                    const gameWithoutDataUrls = {
                                      ...newGame,
                                      banner: filePaths.banner || 'default',
                                      logo: filePaths.logo || 'default',
                                      title: filePaths.title || 'default',
                                      card: filePaths.card || 'default',
                                      screenshots: newGame.screenshots.map(() => 'saved'),
                                      fullFormData: {
                                        ...newGame.fullFormData,
                                        bannerImage: filePaths.banner || 'default',
                                        gameLogo: filePaths.logo || 'default',
                                        titleImage: filePaths.title || 'default',
                                        cardImage: filePaths.card || 'default',
                                        screenshots: newGame.screenshots.map(() => 'saved'),
                                        bannerZoom: formData.bannerZoom || bannerStateRef.current.scale || 1,
                                        cardZoom: formData.cardZoom || cardStateRef.current.scale || 1,
                                        bannerOffset: formData.bannerOffset || { x: bannerStateRef.current.x || 0, y: bannerStateRef.current.y || 0 },
                                        cardOffset: formData.cardOffset || { x: cardStateRef.current.x || 0, y: cardStateRef.current.y || 0 },
                                        bannerPosition: formData.bannerPosition || { x: 50, y: 50 },
                                        logoPositionCustom: formData.logoPositionCustom || { x: 50, y: 50 },
                                        titlePosition: formData.titlePosition || { x: 50, y: 50 },
                                        cardPosition: formData.cardPosition || { x: 50, y: 50 }
                                      }
                                    };
                                    customGames[customGames.length - 1] = gameWithoutDataUrls;
                                    saveUserData('customGames', customGames);
                                    console.log('Saved to user storage with file paths only');
                                  }
                                  
                                  // Dispatch custom event to update other components
                                  window.dispatchEvent(new Event('customGameUpdate'));
                                  
                                  // Add to games list for studio (append, don't replace)
                                  const newGameCard = {
                                    id: games.length + 1,
                                    name: formData.gameName,
                                    version: formData.version || '1.0.0',
                                    status: 'public',
                                    downloads: 0,
                                    revenue: '$0.00',
                                    banner: filePaths.banner || banner,
                                    lastUpdated: 'just now',
                                    gameId: gameId
                                  };
                                  
                                  // Check if this game is already in the list
                                  const alreadyExists = games.some(g => g.gameId === gameId);
                                  if (!alreadyExists) {
                                    setGames(prevGames => [...prevGames, newGameCard]);
                                  }
                                  
                                  alert('Game published successfully! You can now find it in your library.');
                                  
                                  // Navigate to the new game
                                  setTimeout(() => {
                                    navigate(`/game/${gameId}`);
                                  }, 500);
                                }
                                
                                // Reset form
                                setFormData({
                                  gameName: '',
                                  developer: '',
                                  version: '',
                                  genre: '',
                                  ageRating: '',
                                  description: '',
                                  price: '',
                                  releaseDate: '',
                                  tags: '',
                                  requirements: '',
                                  bannerImage: null,
                                  cardImage: null,
                                  gameLogo: null,
                                  titleImage: null,
                                  titleImageSize: 100,
                                  screenshots: [],
                                  gameExecutable: null,
                                  gameFileSize: 0,
                                  logoSize: 120,
                                  logoPosition: 'left',
                                  bannerHeight: 60,
                                  marketEnabled: true,
                                  bannerPosition: { x: 50, y: 50 },
                                  logoPositionCustom: { x: 50, y: 50 },
                                  titlePosition: { x: 50, y: 50 },
                                  cardPosition: { x: 50, y: 50 },
                                  bannerZoom: 1,
                                  cardZoom: 1,
                                  bannerOffset: { x: 0, y: 0 },
                                  cardOffset: { x: 0, y: 0 },
                                });
                                
                                // Reset step errors
                                setStepErrors({
                                  1: false,
                                  2: false,
                                  3: false,
                                  4: false,
                                  5: false,
                                  6: false,
                                  7: false,
                                  8: false
                                });
                                
                                setCurrentStep(1);
                                // Close modal and reset editing state
                                setEditingGameId(null);
                                // Use setTimeout to ensure state is fully cleared before closing
                                setTimeout(() => {
                                  setUploadModalOpen(false);
                                }, 100);
                              });
                            }
                          }}
                          style={{ 
                            opacity: canFinalizeUpload() ? 1 : 0.5,
                            cursor: canFinalizeUpload() ? 'pointer' : 'not-allowed'
                          }}
                        >
                    <Upload size={16} />
                    <span>{editingGameId ? 'Update Game' : 'Create Game'}</span>
                  </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Right Side: Preview */}
                <div className="upload-modal-right" style={{ position: 'relative' }}>
                  {/* Step help icon + hover card */}
                  <div 
                    onMouseEnter={() => setHelpHovered(true)}
                    onMouseLeave={() => setHelpHovered(false)}
                    style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 6 }}
                    aria-label="Help"
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '12px',
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        lineHeight: '24px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                        boxShadow: 'inset 0 0 0 1px rgba(0, 212, 255, 0.25), 0 6px 18px rgba(0,0,0,0.35)'
                      }}
                    >i</div>
                    {helpHovered && (
                      <div 
                        onWheel={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: '20px',
                          right: '20px',
                          maxWidth: '360px',
                          background: 'rgba(0,0,0,0.55)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          fontSize: '12px',
                          lineHeight: 1.5,
                          backdropFilter: 'blur(6px)',
                          pointerEvents: 'auto',
                          overscrollBehavior: 'contain'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            width: '18px',
                            height: '18px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: 'var(--accent-primary)',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '11px'
                          }}>i</span>
                          <strong style={{ fontWeight: 600, fontSize: '12px' }}>{stepTitles[currentStep - 1]}</strong>
                        </div>
                        <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                          {stepHelp[currentStep - 1]}
                        </div>
                      </div>
                    )}
                  </div>
                  {(currentStep === 1 || currentStep === 2) && (
                    <div style={{ padding: '0', height: '100%', overflow: 'auto', background: 'var(--bg-primary)' }}>
                      {/* Unified Profile Preview */}
                      <div style={{ 
                        maxWidth: '1200px',
                        margin: '0 auto',
                        padding: '48px'
                      }}>
                        {/* Game Header with Banner */}
                        {formData.bannerImage && (
                          <div 
                            data-drag-container
                            style={{ 
                              position: 'relative',
                              height: '320px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              marginBottom: '32px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              cursor: 'move'
                            }}
                            onMouseDown={(e) => handleBoundedDrag('banner', e.currentTarget)(e)}
                            onWheel={(e) => handleWheelZoom('banner', e.currentTarget)(e)}
                            onDoubleClick={(e) => handleDoubleCenter('banner', e.currentTarget)(e)}
                          >
                            <img 
                              src={getImageUrl(formData.bannerImage)}
                              alt="Banner"
                              onLoad={(ev) => {
                                bannerNaturalSize.current = { w: ev.currentTarget.naturalWidth, h: ev.currentTarget.naturalHeight };
                                if (!bannerStateRef.current.initialized) {
                                  initCentered(ev.currentTarget.parentElement, bannerNaturalSize.current, bannerStateRef);
                                  setFormData((prev) => ({ ...prev }));
                                }
                              }}
                              style={{
                                position: 'absolute',
                                height: '100%',
                                width: 'auto',
                                transform: `translate(${bannerStateRef.current.x}px, ${bannerStateRef.current.y}px) scale(${bannerStateRef.current.scale})`,
                                transformOrigin: 'top left',
                                userSelect: 'none',
                                pointerEvents: 'none'
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: '32px',
                              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                              zIndex: 1,
                              pointerEvents: 'none'
                            }}>
                              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                                {formData.gameLogo && (
                                  <div 
                                    data-drag-container
                                    style={{
                                      position: 'relative',
                                      width: '100px',
                                      height: '100px',
                                      borderRadius: '16px',
                                      overflow: 'hidden',
                                      border: '3px solid rgba(255, 255, 255, 0.3)',
                                      flexShrink: 0,
                                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                                      cursor: 'move'
                                    }}
                                    onMouseDown={handleImageDrag('logoPositionCustom')}
                                  >
                                    <img 
                                      src={getImageUrl(formData.gameLogo)} 
                                      alt="Logo" 
                                  style={{ 
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    position: 'relative'
                                  }} 
                                    />
                                  </div>
                                )}
                                <div style={{ flex: 1 }}>
                                  {formData.gameName && (
                                    <div style={{ 
                                      marginBottom: '12px' 
                                    }}>
                                      {formData.titleImage ? (
                                        <div
                                          data-drag-container
                                          style={{
                                            position: 'relative',
                                            display: 'inline-block',
                                            cursor: 'move',
                                            maxHeight: '50px',
                                            overflow: 'hidden'
                                          }}
                                          onMouseDown={handleImageDrag('title')}
                                        >
                                          <img 
                                            src={getImageUrl(formData.titleImage)} 
                                            alt="Title" 
                                            style={{ 
                                              maxHeight: '50px',
                                              width: 'auto',
                                              display: 'block',
                                              transform: `translate(${(formData.titlePosition?.x || 50) - 50}%, ${(formData.titlePosition?.y || 50) - 50}%)`
                                            }} 
                                          />
                                        </div>
                                      ) : (
                                        <h1 style={{ 
                                          fontSize: '40px', 
                                          fontWeight: 800, 
                                          color: 'white',
                                          margin: 0,
                                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                                        }}>
                                          {formData.gameName}
                                        </h1>
                                      )}
                        </div>
                                  )}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                    {formData.developer && (
                                      <span style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.9)' }}>
                                        {formData.developer}
                                      </span>
                                    )}
                                    {formData.version && (
                                      <span style={{ 
                                        fontSize: '13px', 
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontWeight: 600
                                      }}>
                                        v{formData.version}
                                      </span>
                                    )}
                        </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Game Info Section */}
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: formData.cardImage ? '220px 1fr' : '1fr',
                          gap: '32px',
                          marginBottom: '40px'
                        }}>
                          {/* Left - Game Cover */}
                          {formData.cardImage && (
                        <div>
                              <div 
                                data-drag-container
                                style={{ 
                                  position: 'relative',
                                  width: '100%',
                                  aspectRatio: '2/3',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                  cursor: 'move'
                                }}
                                onMouseDown={(e) => handleBoundedDrag('card', e.currentTarget)(e)}
                                onWheel={(e) => handleWheelZoom('card', e.currentTarget)(e)}
                                onDoubleClick={(e) => handleDoubleCenter('card', e.currentTarget)(e)}
                              >
                                <img 
                                  src={getImageUrl(formData.cardImage)} 
                                  alt="Game Cover" 
                                  style={{ 
                                    width: 'auto',
                                    height: '100%',
                                    objectFit: 'contain',
                                    position: 'absolute',
                                    transform: `translate(${cardStateRef.current.x}px, ${cardStateRef.current.y}px) scale(${cardStateRef.current.scale})`,
                                    transformOrigin: 'top left',
                                    userSelect: 'none',
                                    pointerEvents: 'none'
                                  }} 
                                  onLoad={(ev) => {
                                    cardNaturalSize.current = { w: ev.currentTarget.naturalWidth, h: ev.currentTarget.naturalHeight };
                                    if (!cardStateRef.current.initialized) {
                                      initCentered(ev.currentTarget.parentElement, cardNaturalSize.current, cardStateRef);
                                      setFormData((prev) => ({ ...prev }));
                                    }
                                  }}
                                />
                        </div>
                            </div>
                          )}
                        
                          {/* Right - Info */}
                        <div>
                            {/* Game Name & Info */}
                            {!formData.bannerImage && formData.gameName && (
                              <h1 style={{ 
                                fontSize: '36px', 
                                fontWeight: 700, 
                                color: 'var(--text-primary)',
                                margin: '0 0 20px 0'
                              }}>
                                {formData.gameName}
                              </h1>
                            )}

                            {/* Meta Information */}
                            <div style={{ marginBottom: '28px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                                {formData.genre && (
                                  <span style={{ 
                                    fontSize: '14px',
                                    color: 'var(--accent-primary)',
                                    textTransform: 'capitalize'
                                  }}>
                                    {formData.genre}
                                  </span>
                                )}
                                {formData.ageRating && (
                                  <span style={{ 
                                    fontSize: '14px',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'capitalize'
                                  }}>
                                    • {formData.ageRating}
                                  </span>
                                )}
                        </div>
                        
                              {/* Price and Release */}
                              {(formData.price || formData.releaseDate) && (
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '24px',
                                  alignItems: 'center',
                                  fontSize: '15px'
                                }}>
                                  {formData.price && (
                                    <span style={{ 
                                      fontWeight: 700, 
                                      color: 'var(--text-primary)',
                                      fontSize: '20px'
                                    }}>
                                      {formData.price === '0' || formData.price === '0.00' ? 'Free' : `$${parseFloat(formData.price).toFixed(2)}`}
                                    </span>
                                  )}
                        {formData.releaseDate && (
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {(() => {
                                        const date = new Date(formData.releaseDate);
                                        const month = date.toLocaleDateString('en-US', { month: 'long' });
                                        const day = date.getDate();
                                        const year = date.getFullYear().toString().substring(0, 4);
                                        return `${month} ${day}, ${year}`;
                                      })()}
                                    </span>
                                  )}
                          </div>
                        )}
                            </div>
                        
                            {/* Description */}
                        {formData.description && (
                              <div style={{ marginBottom: '32px' }}>
                                <p style={{ 
                                  fontSize: '15px', 
                                  color: 'var(--text-secondary)', 
                                  lineHeight: '1.7',
                                  margin: 0
                                }}>
                                  {formData.description}
                                </p>
                          </div>
                        )}
                        
                            {/* Tags */}
                        {formData.tags && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
                              {formData.tags.split(',').map((tag, index) => (
                                  <span 
                                    key={index} 
                                    style={{ 
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      color: 'var(--text-secondary)'
                                    }}
                                  >
                                    #{tag.trim()}
                                  </span>
                                ))}
                    </div>
                  )}
                  
                            {/* System Requirements */}
                            {formData.requirements && (
                              <div style={{ marginBottom: '40px' }}>
                                <h3 style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 600, 
                                  color: 'var(--text-secondary)', 
                                  marginBottom: '12px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  System Requirements
                                </h3>
                                <p style={{ 
                                  fontSize: '14px', 
                                  color: 'var(--text-secondary)', 
                                  lineHeight: '1.7',
                                  margin: 0,
                                  whiteSpace: 'pre-line'
                                }}>
                                  {formData.requirements}
                                </p>
                            </div>
                          )}

                            {/* Screenshots */}
                          {formData.screenshots && formData.screenshots.length > 0 && (
                            <div>
                                <h3 style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 600, 
                                  color: 'var(--text-secondary)', 
                                  marginBottom: '16px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  Media
                                </h3>
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                                  gap: '16px' 
                                }}>
                                  {formData.screenshots.map((file, index) => {
                                    const isVideo = file.type && file.type.startsWith('video/');
                                    const mediaUrl = getImageUrl(file);
                                    return (
                                      <div 
                                        key={index} 
                                        style={{ 
                                          aspectRatio: '16/9', 
                                          borderRadius: '8px', 
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s ease',
                                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                      >
                                        {isVideo ? (
                                          <CustomVideoPlayer 
                                            src={mediaUrl}
                                            onContextMenu={(e) => e.preventDefault()}
                                          />
                                        ) : (
                                          <img 
                                            src={mediaUrl} 
                                            alt={`Media ${index + 1}`} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                              </div>
                            </div>
                        </div>
                    </div>
                  )}
                  
                  {currentStep >= 3 && previewView === 'game' && (
                    <div className="game-page">
                    <div className="game-content">
                      {/* Game Banner */}
                      <div 
                        className="game-banner" 
                        data-drag-container
                        style={{
                          background: formData.bannerImage ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          height: `${formData.bannerHeight || 60}vh`,
                          position: 'relative',
                          cursor: formData.bannerImage ? 'move' : 'default',
                          overflow: 'hidden'
                        }}
                        onMouseDown={formData.bannerImage ? (e) => handleBoundedDrag('banner', e.currentTarget)(e) : undefined}
                        onWheel={formData.bannerImage ? (e) => handleWheelZoom('banner', e.currentTarget)(e) : undefined}
                        onDoubleClick={formData.bannerImage ? (e) => handleDoubleCenter('banner', e.currentTarget)(e) : undefined}
                      >
                        {formData.bannerImage && (
                          <img
                            src={getImageUrl(formData.bannerImage)}
                            alt="Banner"
                            onLoad={(ev) => {
                              bannerNaturalSize.current = { w: ev.currentTarget.naturalWidth, h: ev.currentTarget.naturalHeight };
                              if (!bannerStateRef.current.initialized) {
                                initCentered(ev.currentTarget.parentElement, bannerNaturalSize.current, bannerStateRef);
                                setFormData((prev) => ({ ...prev }));
                              }
                            }}
                            style={{
                              position: 'absolute',
                              height: '100%',
                              width: 'auto',
                              transform: `translate(${bannerStateRef.current.x}px, ${bannerStateRef.current.y}px) scale(${bannerStateRef.current.scale})`,
                              transformOrigin: 'top left',
                              userSelect: 'none',
                              pointerEvents: 'none'
                            }}
                          />
                        )}
                        <div className="game-banner-overlay">
                          <div className="game-banner-content" style={{
                            alignItems: formData.logoPosition === 'center' ? 'center' : formData.logoPosition === 'right' ? 'flex-end' : 'flex-start'
                          }}>
                            {formData.gameLogo && (
                              <div 
                                data-drag-container
                                style={{
                                  position: 'relative',
                                  width: `${formData.logoSize || 120}px`,
                                  height: `${formData.logoSize || 120}px`,
                                  borderRadius: '16px',
                                  overflow: 'hidden',
                                  marginBottom: '24px',
                                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                                  cursor: 'move'
                                }}
                                onMouseDown={handleImageDrag('logoPositionCustom')}
                              >
                                <img 
                                  src={getImageUrl(formData.gameLogo)} 
                                  alt="Game logo" 
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    position: 'relative'
                                  }} 
                                />
                              </div>
                            )}
                            {formData.titleImage ? (
                              <div
                                data-drag-container
                                style={{
                                  position: 'relative',
                                  maxWidth: '100%',
                                  marginBottom: '8px',
                                  display: 'inline-block',
                                  cursor: 'move',
                                  overflow: 'hidden'
                                }}
                                onMouseDown={handleImageDrag('title')}
                              >
                                <img
                                  src={getImageUrl(formData.titleImage)}
                                  alt="Game title"
                                  style={{
                                    width: `${formData.titleImageSize}%`,
                                    height: 'auto',
                                    display: 'block',
                                    transform: `translate(${(formData.titlePosition?.x || 50) - 50}%, ${(formData.titlePosition?.y || 50) - 50}%)`
                                  }}
                                />
                              </div>
                            ) : (
                              <h1 className="game-title">{formData.gameName || 'Game Name'}</h1>
                            )}
                            <div className="game-stats-banner">
                              <div className="stat-item">
                                <Star size={18} />
                                <span>4.8</span>
                              </div>
                              <div className="stat-item">
                                <Users size={18} />
                                <span>892K playing now</span>
                              </div>
                              <div className="stat-item trending-positive">
                                <TrendingUp size={18} />
                                <span>+12%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Game Content Section */}
                      <div className="game-content-section">
                        {/* Action Bar */}
                        <div className="game-action-bar">
                          <div className="game-action-left">
                            <div className="action-morpher" data-state="download">
                              <button className="game-download-btn">
                                <Download size={20} />
                                <span>Download</span>
                              </button>
                              <span className="download-size">
                                {formData.gameExecutable ? '32.1 GB • ~1 min' : '-- GB • ~0 min'} <span className="download-speed">(2.0 MB/s)</span>
                              </span>
                            </div>
                          </div>
                          <div className="game-action-right">
                            <button className="nav-aux-btn" onClick={handlePreviewCommunity}>
                              <MessageSquare size={18} />
                              <span>Community</span>
                            </button>
                            <button className="nav-aux-btn" onClick={handlePreviewMarket}>
                              <ShoppingCart size={18} />
                              <span>Market</span>
                            </button>
                          </div>
                        </div>

                        {/* Content Tabs */}
                        <div className="game-content-tabs">
                          <button 
                            className={`content-tab ${contentSection === 'description' ? 'active' : ''}`}
                            onClick={() => setContentSection('description')}
                          >
                            Description
                          </button>
                          <button 
                            className={`content-tab ${contentSection === 'patchnotes' ? 'active' : ''}`}
                            onClick={() => setContentSection('patchnotes')}
                          >
                            Patch Notes
                          </button>
                        </div>

                        {/* Content */}
                        <div className="game-info-section">
                          {contentSection === 'description' ? (
                            <>
                              <h2 className="section-title">About</h2>
                              <p className="game-description">{formData.description || 'No description provided.'}</p>
                              
                              <div className="game-info-cards">
                                {formData.genre && (
                                  <div className="info-card">
                                    <div className="info-card-label">Genre</div>
                                    <div className="info-card-value">{formData.genre.charAt(0).toUpperCase() + formData.genre.slice(1)}</div>
                                  </div>
                                )}
                                {formData.releaseDate && (
                                  <div className="info-card">
                                    <div className="info-card-label">Released</div>
                                    <div className="info-card-value">{formData.releaseDate}</div>
                                  </div>
                                )}
                                {formData.gameExecutable && (
                                  <div className="info-card">
                                    <div className="info-card-label">Size</div>
                                    <div className="info-card-value">32.1 GB</div>
                                  </div>
                                )}
                              </div>

                              {/* Screenshots */}
                              {formData.screenshots && formData.screenshots.length > 0 && (
                                <>
                                  <h3 className="section-title">Screenshots</h3>
                                  <div className="game-screenshots-grid">
                                    {formData.screenshots.map((file, index) => (
                                      <div key={index} className="screenshot-item">
                                        <img 
                                          src={getImageUrl(file)} 
                                          alt={`Screenshot ${index + 1}`}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </>
                          ) : (
                            <div className="patch-notes-section">
                              <div className="patch-note-item">
                                <div className="patch-media-placeholder">
                                  <div className="placeholder-icon">🎮</div>
                                </div>
                                <div className="patch-content">
                                  <div className="patch-header">
                                    <div className="patch-title-section">
                                      <h3 className="patch-version-large">{formData.version || '1.0.0'}</h3>
                                      <h2 className="patch-title">Initial Release</h2>
                                    </div>
                                    <div className="patch-date-small">
                                      <Calendar size={12} />
                                      <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <p className="patch-description">
                                    {formData.description || 'Welcome to this amazing game!'}
                                  </p>
                                  <div className="patch-actions">
                                    <button className="patch-action-btn">
                                      <ChevronUp size={16} />
                                      <span>42</span>
                                    </button>
                                    <button className="patch-action-btn">
                                      <ChevronDown size={16} />
                                      <span>3</span>
                                    </button>
                                    <button className="patch-action-btn">
                                      <MessageSquare size={16} />
                                      <span>12</span>
                  </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Comments Section */}
                        <div className="game-comments-section">
                          <h3 className="section-title">Comments</h3>
                          <div className="comments-container">
                            <div className="new-comment-box">
                              <div className="comment-input-area">
                                <textarea
                                  placeholder="Share your thoughts about this game..."
                                  rows={3}
                                  disabled
                                />
                                <div className="comment-actions">
                                  <label className="attach-btn" style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                                    <Image size={18} />
                                  </label>
                                  <button className="post-comment-btn" disabled>
                                    Post
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="comments-list">
                              <div className="comment-item">
                                <div className="comment-avatar">G</div>
                                <div className="comment-content">
                                  <div className="comment-header">
                                    <span className="comment-author">Game Reviewer</span>
                                    <span className="comment-time">2 hours ago</span>
                                  </div>
                                  <p className="comment-text">This looks like it could be a great game! Looking forward to playing it.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                  
                  {currentStep >= 3 && previewView === 'community' && (
                    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <button 
                          onClick={handleBackToGamePreview}
                          style={{ 
                            padding: '8px 16px', 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ← Back to Game
                        </button>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <Community navigate={dummyNavigate} />
                      </div>
                    </div>
                  )}
                  
                  {currentStep >= 3 && previewView === 'market' && (
                    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <button 
                          onClick={handleBackToGamePreview}
                          style={{ 
                            padding: '8px 16px', 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ← Back to Game
                        </button>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <Market navigate={dummyNavigate} />
                      </div>
                    </div>
                  )}
                  
                  {currentStep >= 3 && previewView === 'store' && (
                    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <button 
                          onClick={handleBackToGamePreview}
                          style={{ 
                            padding: '8px 16px', 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ← Back to Game
                        </button>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto' }}>
                        <Store navigate={dummyNavigate} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStudio;
