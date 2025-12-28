import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Users, TrendingUp, TrendingDown, Play, ArrowLeft, CheckCircle2, Volume2, VolumeX, ChevronLeft, ChevronRight, Edit2, X, Save, Code, Terminal, Bug, FileText, Layout, BarChart3, Image, List, Sparkles, Palette, ChevronDown, ChevronUp, Minimize2, Zap, Target, Sword, Shield, Trophy, Mountain, Heart, Skull, Activity, Laugh, Split, Columns, Rows, PanelLeftClose, PanelRightClose, FileCode, Paintbrush, Brackets, Search, Filter } from 'lucide-react';
import { getUserData, getAllUsersData, getCurrentUserId, saveUserData } from '../utils/UserDataManager';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import CodeEditor from '../components/CodeEditor';
import './GamePromo.css';

const GamePromo = ({ gamesData = {} }) => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [customGames, setCustomGames] = useState([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMediaMuted, setIsMediaMuted] = useState(true);
  const [isMediaSlideshowHovered, setIsMediaSlideshowHovered] = useState(false);
  const mediaVideoRefs = useRef({});
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCustomCode, setShowCustomCode] = useState(false);
  const [promoMode, setPromoMode] = useState(() => {
    try {
      return localStorage.getItem(`gamePromoMode_${gameId}`) || 'prebuilt';
    } catch (_) {
      return 'prebuilt';
    }
  });
  const [showPreviewLabels, setShowPreviewLabels] = useState(() => {
    try {
      const saved = localStorage.getItem(`gamePromoPreviewLabels_${gameId}`);
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const [promoHTML, setPromoHTML] = useState(() => {
    try {
      return localStorage.getItem(`gamePromoHTML_${gameId}`) || '';
    } catch (_) {
      return '';
    }
  });
  const [promoCSS, setPromoCSS] = useState(() => {
    try {
      return localStorage.getItem(`gamePromoCSS_${gameId}`) || '';
    } catch (_) {
      return '';
    }
  });
  const [promoJS, setPromoJS] = useState(() => {
    try {
      return localStorage.getItem(`gamePromoJS_${gameId}`) || '';
    } catch (_) {
      return '';
    }
  });
  const [previewHeight, setPreviewHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(`gamePromoPreviewHeight_${gameId}`);
      return saved ? parseInt(saved, 10) : 400;
    } catch (_) {
      return 400;
    }
  });
  const [previewWidth, setPreviewWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(`gamePromoPreviewWidth_${gameId}`);
      return saved ? parseInt(saved, 10) : 700;
    } catch (_) {
      return 700;
    }
  });
  const [isTabsCompact, setIsTabsCompact] = useState(false);
  const editorTabsRef = useRef(null);
  const [activeTab, setActiveTab] = useState('html');
  const [searchQuery, setSearchQuery] = useState('');
  const [cssFilter, setCssFilter] = useState('all'); // 'all', 'keyframes', 'media', 'import', 'variables', etc.
  const [debugConsole, setDebugConsole] = useState([]);
  const [output, setOutput] = useState([]);
  const [terminal, setTerminal] = useState([]);
  const [problems, setProblems] = useState([]);
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(true);
  const [codeLayoutMode, setCodeLayoutMode] = useState(() => {
    try {
      return localStorage.getItem(`gamePromoCodeLayout_${gameId}`) || 'bottom';
    } catch (_) {
      return 'bottom';
    }
  });
  
  const previewRef = useRef(null);
  const editorRef = useRef(null);
  const isResizingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Check if tabs should be compact based on editor width
  useEffect(() => {
    if (!editorRef.current || codeLayoutMode === 'bottom') {
      setIsTabsCompact(false);
      return;
    }
    
    const checkCompact = () => {
      const editorWidth = editorRef.current?.offsetWidth || 0;
      // Lower threshold to ensure buttons are always visible - switch to compact mode earlier
      setIsTabsCompact(editorWidth < 500);
    };
    
    checkCompact();
    const resizeObserver = new ResizeObserver(checkCompact);
    if (editorRef.current) {
      resizeObserver.observe(editorRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [codeLayoutMode, previewWidth]);

  // Reset CSS filter when switching away from CSS tab
  useEffect(() => {
    if (activeTab !== 'css') {
      setCssFilter('all');
    }
  }, [activeTab]);

  // Ensure previewWidth respects minimum size when switching to left/right mode
  useEffect(() => {
    if ((codeLayoutMode === 'left' || codeLayoutMode === 'right') && previewWidth < 400) {
      setPreviewWidth(400);
    }
    
    // Ensure code editor has minimum width
    if (codeLayoutMode === 'left' || codeLayoutMode === 'right') {
      const container = document.querySelector('.promo-edit-content');
      if (container) {
        const containerWidth = container.offsetWidth;
        const codeEditorMinWidth = 480;
        const previewMaxWidth = containerWidth - codeEditorMinWidth;
        if (previewWidth > previewMaxWidth) {
          setPreviewWidth(Math.max(400, previewMaxWidth));
        }
      }
    }
  }, [codeLayoutMode, previewWidth]);

  // Save code layout mode when it changes
  useEffect(() => {
    if (gameId && codeLayoutMode) {
      try {
        localStorage.setItem(`gamePromoCodeLayout_${gameId}`, codeLayoutMode);
      } catch (_) {}
    }
  }, [codeLayoutMode, gameId]);

  // Load all published games
  useEffect(() => {
    const loadGames = async () => {
    try {
        const allGames = await getAllUsersData('customGames');
        if (!Array.isArray(allGames)) {
          setCustomGames([]);
          return;
        }
      const publishedGames = allGames.filter(game => {
        const status = game.status || game.fullFormData?.status || 'draft';
        return status === 'public' || status === 'published';
      });
      setCustomGames(publishedGames);
      } catch (error) {
        console.error('Error loading games in GamePromo:', error);
      setCustomGames([]);
    }
    };
    loadGames();
  }, []);

  // Helper function to extract stats consistently from game data
  const getGameStats = (game) => {
    if (!game) return { rating: 0, players: '0', trending: '+0%' };
    
    const original = game.original || game;
    
    let rating = original?.rating ?? 
                 original?.fullFormData?.rating ?? 
                 original?.metadata?.rating ?? 
                 gamesData?.[original?.gameId || original?.id]?.rating ?? 
                 0;
    
    if (!rating || rating === 0) {
      try {
        const gId = original?.gameId || original?.id;
        if (gId) {
          const savedRatings = localStorage.getItem(`gameRatings_${gId}`);
          if (savedRatings) {
            const ratings = JSON.parse(savedRatings);
            if (ratings && ratings.length > 0) {
              const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
              rating = Math.round((sum / ratings.length) * 10) / 10;
            }
          }
        }
      } catch (_) {}
    }
    
    const players = original?.playerCount ?? 
                    original?.players ?? 
                    original?.fullFormData?.playerCount ?? 
                    original?.fullFormData?.players ?? 
                    gamesData?.[original?.gameId || original?.id]?.playerCount ?? 
                    gamesData?.[original?.gameId || original?.id]?.players ?? 
                    '0';
    
    const trending = original?.trending ?? 
                     original?.fullFormData?.trending ?? 
                     original?.metadata?.trending ?? 
                     gamesData?.[original?.gameId || original?.id]?.trending ?? 
                     '+0%';
    
    return {
      rating: rating || 0,
      players: players || '0',
      trending: trending || '+0%'
    };
  };

  // Find game by ID
  const findGame = () => {
    // Check custom games first
    const customGame = customGames.find(g => String(g.gameId || g.id) === String(gameId));
    if (customGame) {
      return {
        id: customGame.gameId || customGame.id,
        name: customGame.name || customGame.gameName || customGame.fullFormData?.gameName || 'Untitled Game',
        developer: customGame.developer || customGame.fullFormData?.developer || '',
        description: customGame.description || customGame.fullFormData?.description || '',
        tags: Array.isArray(customGame.tags) ? customGame.tags : (customGame.tags ? String(customGame.tags).split(/[,;\s]+/).filter(Boolean) : []),
        image: customGame.banner || customGame.bannerImage || customGame.cardImage || customGame.fullFormData?.bannerImage || customGame.card || null,
        screenshots: customGame.screenshots || customGame.fullFormData?.screenshots || [],
        price: customGame.price ?? customGame.fullFormData?.price ?? customGame.metadata?.price ?? 0,
        original: customGame,
      };
    }
    
    // Check gamesData
    const gameData = gamesData[gameId];
    if (gameData) {
      return {
        id: gameId,
        name: gameData.name || gameId,
        developer: gameData.developer || '',
        description: gameData.description || '',
        tags: gameData.tags || [],
        image: gameData.banner || gameData.image || gameData.cardImage || null,
        screenshots: gameData.screenshots || [],
        price: gameData.price || 0,
        original: gameData,
      };
    }
    
    return null;
  };

  const game = findGame();
  const stats = game ? getGameStats(game) : { rating: 0, players: '0', trending: '+0%' };
  const media = game ? (game.screenshots || []) : [];

  // Auto-switch media slideshow
  useEffect(() => {
    if (!media.length || media.length <= 1 || isMediaSlideshowHovered) return;
    const interval = setInterval(() => {
      setCurrentMediaIndex((prev) => (prev + 1) % media.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [media.length, isMediaSlideshowHovered]);

  // Handle video playback
  useEffect(() => {
    if (!media.length) return;
    
    Object.values(mediaVideoRefs.current).forEach(videoRef => {
      if (videoRef && !videoRef.paused) {
        videoRef.pause();
      }
    });
    
    const currentMediaItem = media[currentMediaIndex];
    if (currentMediaItem && typeof currentMediaItem === 'object' && currentMediaItem.type === 'video') {
      const videoRef = mediaVideoRefs.current[currentMediaIndex];
      if (videoRef) {
        videoRef.muted = isMediaMuted;
        videoRef.play().catch(() => {});
      }
    }
  }, [currentMediaIndex, media, isMediaMuted]);

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') {
      if (image.startsWith('data:') || image.startsWith('http://') || image.startsWith('https://')) {
        return image;
      }
      return image;
    }
    if (image instanceof File || image instanceof Blob) {
      return URL.createObjectURL(image);
    }
    return null;
  };

  const getTrendingIcon = (trendingValue) => {
    const isPositive = trendingValue.startsWith('+');
    return isPositive ? TrendingUp : TrendingDown;
  };

  const getTrendingDisplay = (trendingValue) => {
    const value = trendingValue.replace(/^[+-]/, '');
    const isPositive = trendingValue.startsWith('+');
    return {
      value: `${isPositive ? '+' : '-'}${value}`,
      isPositive
    };
  };

  const getColorForRating = (rating) => {
    // Red to Gold gradient (same as Game.js)
    if (rating >= 4.5) return '#FFD700'; // Gold
    if (rating >= 3.5) return '#FFB800'; // Yellow-orange
    if (rating >= 2.5) return '#FF9500'; // Orange
    if (rating >= 1.5) return '#FF6B00'; // Dark orange
    if (rating >= 0.5) return '#FF4444'; // Red-orange
    return 'rgba(255,255,255,0.3)'; // Gray for very low or no rating
  };

  const isNewRelease = (game) => {
    if (!game) return false;
    try {
      const releaseDate = game.original?.releaseDate || game.releaseDate;
      if (!releaseDate) return false;
      
      const now = new Date();
      let release;
      
      if (typeof releaseDate === 'string') {
        if (releaseDate.includes(' ')) {
          const parts = releaseDate.split(' ');
          if (parts.length === 2) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames.indexOf(parts[0]);
            const year = parseInt(parts[1]);
            if (month !== -1 && year) {
              release = new Date(year, month, 1);
            }
          }
        }
        if (!release) release = new Date(releaseDate);
      } else {
        release = new Date(releaseDate);
      }
      
      if (isNaN(release.getTime())) return false;
      
      const diffTime = now - release;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 30;
    } catch (error) {
      return false;
    }
  };

  const checkOwnership = () => {
    if (!game) return false;
    try {
      const myGames = getUserData('customGames', []);
      return myGames.some(g => String(g.gameId || g.id) === String(gameId));
    } catch (_) {
      return false;
    }
  };

  const isOwned = checkOwnership();

  // Save promo HTML/CSS/JS to localStorage ONLY when explicitly saved
  // Removed automatic saving - changes should only persist when Save is clicked

  // Reload promo code when gameId changes
  useEffect(() => {
    try {
      if (gameId) {
        setPromoHTML(localStorage.getItem(`gamePromoHTML_${gameId}`) || '');
        setPromoCSS(localStorage.getItem(`gamePromoCSS_${gameId}`) || '');
        setPromoJS(localStorage.getItem(`gamePromoJS_${gameId}`) || '');
        const savedHeight = localStorage.getItem(`gamePromoPreviewHeight_${gameId}`);
        if (savedHeight) setPreviewHeight(parseInt(savedHeight, 10));
        const savedLabels = localStorage.getItem(`gamePromoPreviewLabels_${gameId}`);
        if (savedLabels !== null) setShowPreviewLabels(savedLabels === 'true');
        const savedMode = localStorage.getItem(`gamePromoMode_${gameId}`);
        if (savedMode) setPromoMode(savedMode);
      }
    } catch (_) {}
  }, [gameId]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    if (codeLayoutMode === 'bottom') {
      // Vertical resize for bottom mode
      isResizingRef.current = true;
      const startY = e.clientY;
      const startHeight = previewHeight;
      
      const handleMouseMove = (e) => {
        if (!isResizingRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        
        const container = e.currentTarget?.closest?.('.promo-edit-content') || document.querySelector('.promo-edit-content');
        if (!container) return;
        
        const containerHeight = container.offsetHeight;
        const deltaY = e.clientY - startY;
        const maxHeight = containerHeight * 0.9;
        const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY));
        setPreviewHeight(newHeight);
      };
      
      const handleMouseUp = () => {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.body.style.pointerEvents = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'row-resize';
      document.body.style.pointerEvents = 'none';
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
    } else if (codeLayoutMode === 'left' || codeLayoutMode === 'right') {
      // Horizontal resize for left/right modes - exactly like bottom mode but for X axis
      isResizingRef.current = true;
      const startX = e.clientX;
      const startWidth = previewWidth;
      
      const handleMouseMove = (e) => {
        if (!isResizingRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        
        const container = document.querySelector('.promo-edit-content');
        if (!container) return;
        
        const containerWidth = container.offsetWidth;
        
        // Ensure code editor has minimum width of 480px (enough for buttons to be visible)
        const codeEditorMinWidth = 480;
        const previewMaxWidth = containerWidth - codeEditorMinWidth;
        
        // Calculate delta based on direction
        let deltaX;
        if (codeLayoutMode === 'left') {
          // For left mode: preview is on left, code on right
          // Moving handle right increases preview width
          deltaX = e.clientX - startX;
        } else {
          // For right mode: code is on left, preview on right (row-reverse)
          // Moving handle left increases preview width
          deltaX = startX - e.clientX;
        }
        
        const maxWidth = Math.max(400, previewMaxWidth); // Ensure preview doesn't make code editor too small
        const minWidth = Math.max(400, containerWidth * 0.25); // At least 400px, or 25% of container
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
        setPreviewWidth(newWidth);
      };
      
      const handleMouseUp = () => {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.body.style.pointerEvents = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      document.body.style.pointerEvents = 'none';
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
    }
  };

  // Template metadata for display in sidebar
  const getTemplateMetadata = () => {
    return {
      minimal: { category: 'General', description: 'Clean and simple design' },
      modern: { category: 'General', description: 'Full-featured hero layout' },
      gaming: { category: 'Action', description: 'Wild multi-color gaming style' },
      fps: { category: 'FPS', description: 'Fast-paced action shooter' },
      rpg: { category: 'RPG', description: 'Fantasy adventure epic' },
      strategy: { category: 'Strategy', description: 'Tactical command center' },
      competitive: { category: 'Competitive', description: 'Esports tournament ready' },
      adventure: { category: 'Adventure', description: 'Epic journey explorer' },
      indie: { category: 'Indie', description: 'Creative and artistic' },
      horror: { category: 'Horror', description: 'Dark and atmospheric' },
      sports: { category: 'Sports', description: 'Athletic and energetic' },
      dank: { category: 'Meme', description: 'Ultimate 2000s dank meme vibes' }
    };
  };

  const templateMetadata = getTemplateMetadata();

  // Get prebuilt items definition
  const getPrebuiltItems = () => ({
    header: {
      html: '<div class="promo-header">\n  <h1>Game Title</h1>\n  <p class="promo-subtitle">Amazing Game Experience</p>\n</div>\n',
      css: '.promo-header {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  padding: 60px 40px;\n  text-align: center;\n  color: #ffffff;\n  border-radius: 12px;\n  margin-bottom: 30px;\n}\n\n.promo-header h1 {\n  font-size: 48px;\n  font-weight: 900;\n  margin: 0 0 16px 0;\n}\n\n.promo-header .promo-subtitle {\n  font-size: 20px;\n  margin: 0;\n  opacity: 0.9;\n}\n',
      cssSelector: '.promo-header',
      js: ''
    },
    stats: {
      html: '<div class="promo-stats-section">\n  <div class="stat-card">\n    <span class="stat-label">Rating</span>\n    <span class="stat-value">4.5</span>\n  </div>\n  <div class="stat-card">\n    <span class="stat-label">Players</span>\n    <span class="stat-value">12,345</span>\n  </div>\n  <div class="stat-card">\n    <span class="stat-label">Trending</span>\n    <span class="stat-value">+15%</span>\n  </div>\n</div>\n',
      css: '.promo-stats-section {\n  display: flex;\n  gap: 20px;\n  margin-bottom: 30px;\n}\n\n.promo-stats-section .stat-card {\n  flex: 1;\n  background: rgba(255, 255, 255, 0.1);\n  padding: 24px;\n  border-radius: 12px;\n  backdrop-filter: blur(10px);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n.promo-stats-section .stat-label {\n  display: block;\n  font-size: 14px;\n  color: rgba(255, 255, 255, 0.7);\n  margin-bottom: 8px;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n}\n\n.promo-stats-section .stat-value {\n  display: block;\n  font-size: 32px;\n  font-weight: 700;\n  color: #ffffff;\n}\n',
      cssSelector: '.promo-stats-section',
      js: ''
    },
    gallery: {
      html: '<div class="promo-gallery">\n  <h2 class="gallery-title">Screenshots</h2>\n  <div class="gallery-grid">\n    <div class="gallery-item">\n      <div class="gallery-placeholder">Screenshot 1</div>\n    </div>\n    <div class="gallery-item">\n      <div class="gallery-placeholder">Screenshot 2</div>\n    </div>\n    <div class="gallery-item">\n      <div class="gallery-placeholder">Screenshot 3</div>\n    </div>\n  </div>\n</div>\n',
      css: '.promo-gallery {\n  margin-bottom: 30px;\n}\n\n.promo-gallery .gallery-title {\n  font-size: 32px;\n  font-weight: 800;\n  margin: 0 0 24px 0;\n  color: #ffffff;\n}\n\n.promo-gallery .gallery-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));\n  gap: 20px;\n}\n\n.promo-gallery .gallery-item {\n  aspect-ratio: 16/9;\n  border-radius: 12px;\n  overflow: hidden;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n.promo-gallery .gallery-placeholder {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: rgba(255, 255, 255, 0.5);\n  font-size: 16px;\n}\n',
      cssSelector: '.promo-gallery',
      js: ''
    },
    description: {
      html: '<div class="promo-description-section">\n  <h2>About This Game</h2>\n  <p>Write a compelling description about your game here. Tell players what makes it special, what they can expect, and why they should play it.</p>\n  <p>You can add multiple paragraphs to provide more details and create an engaging narrative.</p>\n</div>\n',
      css: '.promo-description-section {\n  background: rgba(255, 255, 255, 0.05);\n  padding: 40px;\n  border-radius: 12px;\n  margin-bottom: 30px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n}\n\n.promo-description-section h2 {\n  font-size: 32px;\n  font-weight: 800;\n  margin: 0 0 20px 0;\n  color: #ffffff;\n}\n\n.promo-description-section p {\n  font-size: 18px;\n  line-height: 1.8;\n  color: rgba(255, 255, 255, 0.9);\n  margin: 0 0 16px 0;\n}\n\n.promo-description-section p:last-child {\n  margin-bottom: 0;\n}\n',
      cssSelector: '.promo-description-section',
      js: ''
    }
  });

  // Check if a prebuilt item is already added
  const isPrebuiltItemAdded = (type) => {
    const prebuiltItems = getPrebuiltItems();
    const item = prebuiltItems[type];
    if (!item || !item.cssSelector) return false;
    
    // Check if the CSS selector exists in the HTML
    const selectorWithoutDot = item.cssSelector.replace('.', '');
    return promoHTML.includes(`class="${selectorWithoutDot}"`) || promoHTML.includes(`class="${item.cssSelector.replace('.', '')}"`);
  };

  const handleAddPrebuilt = (type) => {
    const prebuiltItems = getPrebuiltItems();
    const item = prebuiltItems[type];
    if (!item) return;

    const newHTML = promoHTML ? promoHTML + '\n' + item.html : item.html;
    const cssExists = promoCSS && item.cssSelector && promoCSS.includes(item.cssSelector);
    const newCSS = cssExists ? promoCSS : (promoCSS ? promoCSS + '\n' + item.css : item.css);
    const newJS = item.js ? (promoJS ? promoJS + '\n' + item.js : promoJS) : promoJS;

    setPromoHTML(newHTML);
    setPromoCSS(newCSS);
    setPromoJS(newJS);
  };

  // Process HTML to add X buttons to prebuilt items in edit mode
  const processPreviewHTML = (html) => {
    if (!isEditMode || !html) return html;
    
    const prebuiltItems = getPrebuiltItems();
    let processedHTML = html;
    
    // Add X button to each prebuilt item - handle ALL instances
    Object.keys(prebuiltItems).forEach(type => {
      const item = prebuiltItems[type];
      if (!item || !item.cssSelector) return;
      
      const selectorWithoutDot = item.cssSelector.replace('.', '');
      // Match opening div tag with the class - use global flag to find ALL instances
      const classPattern = `class=["'][^"']*${selectorWithoutDot}[^"']*["']`;
      const openingTagRegex = new RegExp(`(<div[^>]*${classPattern}[^>]*>)`, 'gi');
      
      // Process all matches
      let lastIndex = 0;
      const matches = [];
      let match;
      
      // Find all matches first
      while ((match = openingTagRegex.exec(processedHTML)) !== null) {
        matches.push({
          index: match.index,
          match: match[0],
          openingTag: match[1]
        });
      }
      
      // Process matches in reverse order to preserve indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const { index, match: fullMatch, openingTag } = matches[i];
        
        // Skip if already has a remove button
        if (fullMatch.includes('prebuilt-item-remove-btn')) {
          continue;
        }
        
        // Add data attribute and X button
        const dataAttr = `data-prebuilt-item="${type}"`;
        const xButton = `<button class="prebuilt-item-remove-btn" data-remove-type="${type}" data-remove-class="${selectorWithoutDot}" title="Remove item">×</button>`;
        
        // Add data attribute to the tag
        let modifiedTag = openingTag;
        if (modifiedTag.includes('style=')) {
          modifiedTag = modifiedTag.replace('style=', `${dataAttr} style=`);
        } else {
          modifiedTag = modifiedTag.replace('>', ` ${dataAttr}>`);
        }
        
        // Replace in the HTML string
        const before = processedHTML.substring(0, index);
        const after = processedHTML.substring(index + fullMatch.length);
        processedHTML = before + modifiedTag + xButton + after;
      }
    });
    
    return processedHTML;
  };

  // Handle remove button clicks in preview
  useEffect(() => {
    if (!isEditMode || !previewRef.current) return;
    
    const handleRemoveClick = (e) => {
      const removeBtn = e.target.closest('.prebuilt-item-remove-btn');
      if (!removeBtn) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const type = removeBtn.getAttribute('data-remove-type');
      const removeClass = removeBtn.getAttribute('data-remove-class');
      
      if (type) {
        // Create a synthetic event that includes the target
        const syntheticEvent = {
          stopPropagation: () => {},
          preventDefault: () => {},
          target: {
            closest: (selector) => {
              if (selector === '.prebuilt-item-remove-btn') {
                return removeBtn;
              }
              return null;
            }
          }
        };
        handleRemovePrebuilt(type, syntheticEvent);
      }
    };
    
    const previewContent = previewRef.current?.querySelector('.promo-preview-content');
    if (previewContent) {
      previewContent.addEventListener('click', handleRemoveClick);
      return () => {
        previewContent.removeEventListener('click', handleRemoveClick);
      };
    }
  }, [isEditMode, promoHTML, promoCSS]);

  const handleRemovePrebuilt = (type, e) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering the add button
    }
    
    // Get the remove button element to find the class name
    const removeBtn = e?.target?.closest?.('.prebuilt-item-remove-btn');
    const removeClass = removeBtn?.getAttribute('data-remove-class');
    
    // If we have a specific class, try to remove by that
    if (removeClass) {
      const selectorWithoutDot = removeClass.split(/\s+/)[0].replace(/^\./, '');
      let newHTML = promoHTML;
      
      // Remove HTML block - handle nested divs properly
      const classPattern = `class=["'][^"']*${selectorWithoutDot}[^"']*["']`;
      const openingTagRegex = new RegExp(`<div[^>]*${classPattern}[^>]*>`, 'i');
      
      if (openingTagRegex.test(newHTML)) {
        let depth = 0;
        let startIndex = -1;
        let endIndex = -1;
        
        const match = newHTML.match(openingTagRegex);
        if (match) {
          startIndex = match.index;
          let i = startIndex;
          
          while (i < newHTML.length) {
            if (newHTML.substring(i).startsWith('<div')) {
              depth++;
            } else if (newHTML.substring(i).startsWith('</div>')) {
              depth--;
              if (depth === 0) {
                endIndex = i + 6;
                break;
              }
            }
            i++;
          }
          
          if (startIndex >= 0 && endIndex > startIndex) {
            newHTML = newHTML.substring(0, startIndex) + newHTML.substring(endIndex);
            newHTML = newHTML.trim();
          }
        }
      }
      
      // Check if there are still more instances of this class in the HTML
      const remainingInstances = (newHTML.match(new RegExp(classPattern, 'gi')) || []).length;
      
      // Only remove CSS if no instances remain
      let newCSS = promoCSS;
      if (newCSS && selectorWithoutDot && remainingInstances === 0) {
        const cssSelector = `.${selectorWithoutDot}`;
        const lines = newCSS.split('\n');
        let inBlock = false;
        let blockDepth = 0;
        const filteredLines = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const isSelectorLine = line.includes(cssSelector) && (line.includes('{') || line.includes('}'));
          
          if (isSelectorLine && !inBlock && line.includes('{')) {
            const selectorEscaped = cssSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`^${selectorEscaped}\\s*\\{`).test(line)) {
              inBlock = true;
              blockDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
              continue;
            }
          }
          
          if (inBlock) {
            blockDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            if (blockDepth <= 0) {
              inBlock = false;
              blockDepth = 0;
            }
            continue;
          }
          
          filteredLines.push(lines[i]);
        }
        
        newCSS = filteredLines.join('\n').trim();
      }
      
      setPromoHTML(newHTML);
      setPromoCSS(newCSS);
      return;
    }
    
    // Fallback to original prebuilt items removal logic
    const prebuiltItems = getPrebuiltItems();
    const item = prebuiltItems[type];
    if (!item || !item.cssSelector) return;

    // Remove HTML element matching the cssSelector
    const selectorWithoutDot = item.cssSelector.replace('.', '');
    let newHTML = promoHTML;
    
    // Remove HTML block - handle nested divs properly
    // Match opening tag with the class
    const classPattern = `class=["'][^"']*${selectorWithoutDot}[^"']*["']`;
    const openingTagRegex = new RegExp(`<div[^>]*${classPattern}[^>]*>`, 'i');
    
    if (openingTagRegex.test(newHTML)) {
      let depth = 0;
      let startIndex = -1;
      let endIndex = -1;
      
      // Find the opening tag
      const match = newHTML.match(openingTagRegex);
      if (match) {
        startIndex = match.index;
        let i = startIndex;
        
        // Find the matching closing tag
        while (i < newHTML.length) {
          if (newHTML.substring(i).startsWith('<div')) {
            depth++;
          } else if (newHTML.substring(i).startsWith('</div>')) {
            depth--;
            if (depth === 0) {
              endIndex = i + 6; // Length of '</div>'
              break;
            }
          }
          i++;
        }
        
        // Remove the matched block
        if (startIndex >= 0 && endIndex > startIndex) {
          newHTML = newHTML.substring(0, startIndex) + newHTML.substring(endIndex);
          newHTML = newHTML.trim();
        }
      }
    }

    // Check if there are still more instances of this class in the HTML
    const remainingInstances = (newHTML.match(new RegExp(classPattern, 'gi')) || []).length;

    // Remove CSS rules matching the cssSelector - only if no instances remain
    let newCSS = promoCSS;
    if (newCSS && item.cssSelector && remainingInstances === 0) {
      // Parse CSS to remove rules for this selector (including nested rules)
      const lines = newCSS.split('\n');
      let inBlock = false;
      let blockDepth = 0;
      const filteredLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const isSelectorLine = line.includes(item.cssSelector) && (line.includes('{') || line.includes('}'));
        
        if (isSelectorLine && !inBlock && line.includes('{')) {
          // Check if this is a selector line (starts with the selector)
          const selectorEscaped = item.cssSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (new RegExp(`^${selectorEscaped}\\s*\\{`).test(line)) {
            inBlock = true;
            blockDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            continue; // Skip this line
          }
        }
        
        if (inBlock) {
          blockDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
          if (blockDepth <= 0) {
            inBlock = false;
            blockDepth = 0;
          }
          continue; // Skip lines in the block
        }
        
        filteredLines.push(lines[i]);
      }
      
      newCSS = filteredLines.join('\n').trim();
    }

    setPromoHTML(newHTML);
    setPromoCSS(newCSS);
    // Note: JS removal is not implemented as items don't have JS currently
  };

  const handleLoadPrebuiltTemplate = (templateName) => {
    if (!game) return;

    // Get game data
    const gameName = game.name || 'Untitled Game';
    const gameDescription = game.description || 'A great game experience';
    const gameDeveloper = game.developer || 'Unknown Developer';
    const gameRating = stats.rating || 0;
    const gamePlayers = stats.players || '0';
    const gameTrending = stats.trending || '+0%';
    const gameTags = Array.isArray(game.tags) ? game.tags : (game.tags ? String(game.tags).split(/[,;\s]+/).filter(Boolean) : []);
    const tagList = gameTags.length > 0 ? gameTags.slice(0, 3).join(', ') : 'Action, Adventure';
    
    // Get images
    const bannerUrl = getImageUrl(game.image) || '';
    const screenshots = (game.screenshots || []).map(s => {
      if (typeof s === 'string') return s;
      if (s?.url) return s.url;
      if (s?.file) return getImageUrl(s.file);
      return getImageUrl(s);
    }).filter(Boolean);
    
    // Format players for display
    const formatPlayers = (players) => {
      const num = parseInt(players);
      if (isNaN(num)) return players;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };
    
    // Escape HTML for safe insertion
    const escapeHtml = (text) => {
      if (!text) return '';
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    };

    const templates = {
      minimal: {
        html: `<div class="promo-minimal">
  ${bannerUrl ? `<div class="minimal-banner" style="background-image: url('${bannerUrl}');"></div>` : ''}
  <div class="minimal-header">
    <h1>${escapeHtml(gameName)}</h1>
    <p class="minimal-subtitle">${escapeHtml(gameDescription.substring(0, 100))}${gameDescription.length > 100 ? '...' : ''}</p>
  </div>
  <div class="minimal-content">
    <div class="minimal-stats">
      <div class="minimal-stat">
        <span class="stat-label">Rating</span>
        <span class="stat-value">${gameRating.toFixed(1)}</span>
      </div>
      <div class="minimal-stat">
        <span class="stat-label">Players</span>
        <span class="stat-value">${formatPlayers(gamePlayers)}</span>
      </div>
      <div class="minimal-stat">
        <span class="stat-label">Trending</span>
        <span class="stat-value">${gameTrending}</span>
      </div>
    </div>
    ${screenshots.length > 0 ? `<div class="minimal-screenshots">
      ${screenshots.slice(0, 3).map(url => `<img src="${url}" alt="Screenshot" />`).join('\n      ')}
    </div>` : ''}
    <div class="minimal-description">
      <p>${escapeHtml(gameDescription)}</p>
    </div>
    <button class="minimal-play-btn">Play Now</button>
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0a0a0a;
  color: #ffffff;
  min-height: 100vh;
}

.promo-minimal {
  max-width: 1200px;
  margin: 0 auto;
}

.minimal-banner {
  width: 100%;
  height: 400px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
}

.minimal-header {
  text-align: center;
  margin-bottom: 60px;
  padding-bottom: 40px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.minimal-header h1 {
  font-size: 64px;
  font-weight: 900;
  margin: 0 0 16px 0;
  letter-spacing: -2px;
}

.minimal-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.minimal-stats {
  display: flex;
  gap: 40px;
  justify-content: center;
  margin-bottom: 60px;
}

.minimal-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.minimal-stat .stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.minimal-stat .stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
}

.minimal-screenshots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 60px;
}

.minimal-screenshots img {
  width: 100%;
  height: auto;
  border-radius: 12px;
  object-fit: cover;
  aspect-ratio: 16/9;
}

.minimal-description {
  text-align: center;
  margin-bottom: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.minimal-description p {
  font-size: 18px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.minimal-play-btn {
  display: block;
  margin: 0 auto;
  padding: 18px 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: none;
}

.minimal-play-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}`,
        js: ''
      },
      modern: {
        html: `<div class="promo-modern">
  <div class="modern-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-badge">FEATURED</div>
      <h1 class="hero-title">${escapeHtml(gameName)}</h1>
      <p class="hero-description">${escapeHtml(gameDescription.substring(0, 80))}${gameDescription.length > 80 ? '...' : ''}</p>
      <div class="hero-stats">
        <div class="hero-stat">
          <span class="stat-icon">⭐</span>
          <span class="stat-text">${gameRating.toFixed(1)} Rating</span>
        </div>
        <div class="hero-stat">
          <span class="stat-icon">👥</span>
          <span class="stat-text">${formatPlayers(gamePlayers)} Players</span>
        </div>
        <div class="hero-stat">
          <span class="stat-icon">📈</span>
          <span class="stat-text">${gameTrending} Trending</span>
        </div>
      </div>
      <button class="hero-play-btn">Play Now</button>
    </div>
  </div>
  <div class="modern-section">
    <h2 class="section-title">About</h2>
    <p class="section-text">${escapeHtml(gameDescription)}</p>
  </div>
  ${screenshots.length > 0 ? `<div class="modern-section">
    <h2 class="section-title">Screenshots</h2>
    <div class="screenshots-grid">
      ${screenshots.map(url => `<img src="${url}" alt="Screenshot" />`).join('\n      ')}
    </div>
  </div>` : ''}
  <div class="modern-section">
    <h2 class="section-title">Tags</h2>
    <ul class="features-list">
      ${gameTags.length > 0 ? gameTags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('\n      ') : '<li>Adventure</li><li>Action</li><li>RPG</li>'}
    </ul>
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0a0a0a;
  color: #ffffff;
}

.promo-modern {
  width: 100%;
  min-height: 100vh;
}

.modern-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
}

.hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px;
  max-width: 800px;
}

.hero-badge {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
}

.hero-title {
  font-size: 72px;
  font-weight: 900;
  margin: 0 0 20px 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  letter-spacing: -2px;
}

.hero-description {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 40px 0;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  gap: 32px;
  justify-content: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.hero-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 24px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-icon {
  font-size: 20px;
}

.stat-text {
  font-size: 16px;
  font-weight: 600;
}

.hero-play-btn {
  padding: 20px 48px;
  background: #ffffff;
  border: none;
  border-radius: 12px;
  color: #667eea;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: none;
}

.hero-play-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.modern-section {
  padding: 80px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 48px;
  font-weight: 800;
  margin: 0 0 24px 0;
}

.section-text {
  font-size: 18px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.screenshots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.screenshots-grid img {
  width: 100%;
  height: auto;
  border-radius: 12px;
  object-fit: cover;
  aspect-ratio: 16/9;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.features-list li {
  padding: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 18px;
}`,
        js: ''
      },
      gaming: {
        category: 'Action',
        description: 'Wild multi-color gaming style',
        html: `<div class="promo-gaming">
  <div class="gaming-banner" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="banner-overlay"></div>
    <div class="banner-content">
      <div class="banner-badges">
        ${isNewRelease(game) ? '<span class="badge badge-new">NEW!</span>' : ''}
        <span class="badge badge-hot">🔥 HOT</span>
        <span class="badge badge-epic">⚡ EPIC</span>
      </div>
      <h1 class="gaming-title">${escapeHtml(gameName.toUpperCase())}</h1>
      <p class="gaming-tagline">🎮 THE ULTIMATE GAMING EXPERIENCE 🎮</p>
      <div class="gaming-meta">
        <div class="meta-item meta-rating">
          <span class="meta-icon">⭐</span>
          <span class="meta-value">${gameRating.toFixed(1)}</span>
          <span class="meta-label">RATING</span>
        </div>
        <div class="meta-item meta-players">
          <span class="meta-icon">👥</span>
          <span class="meta-value">${formatPlayers(gamePlayers)}</span>
          <span class="meta-label">PLAYERS</span>
        </div>
        <div class="meta-item meta-trending">
          <span class="meta-icon">🚀</span>
          <span class="meta-value">${gameTrending}</span>
          <span class="meta-label">TRENDING</span>
        </div>
      </div>
      <button class="gaming-btn">🎮 PLAY NOW 🎮</button>
    </div>
  </div>
  <div class="gaming-content">
    <div class="content-section section-about">
      <h2>🎯 ABOUT THE GAME</h2>
      <p>${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="content-section section-screenshots">
      <h2>📸 EPIC SCREENSHOTS</h2>
      <div class="gaming-screenshots">
        ${screenshots.map(url => `<div class="screenshot-wrapper"><img src="${url}" alt="Screenshot" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="content-section section-features">
      <h2>✨ FEATURES</h2>
      <div class="gaming-features">
        ${gameTags.map(tag => `<div class="feature-tag">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #000000;
  color: #ffffff;
  overflow-x: hidden;
}

.promo-gaming {
  width: 100%;
  min-height: 100vh;
}

.gaming-banner {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 25%, #3a86ff 50%, #06ffa5 75%, #ffbe0b 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.6) 100%);
}

.banner-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px;
}

.banner-badges {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.badge {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  border: 3px solid;
  text-transform: uppercase;
  animation: none;
  box-shadow: 0 0 20px currentColor;
}

.badge-new {
  background: #ff006e;
  border-color: #ff006e;
  color: #ffffff;
  box-shadow: 0 0 30px rgba(255, 0, 110, 0.8);
}

.badge-hot {
  background: #ffbe0b;
  border-color: #ffbe0b;
  color: #000000;
  box-shadow: 0 0 30px rgba(255, 190, 11, 0.8);
}

.badge-epic {
  background: #8338ec;
  border-color: #8338ec;
  color: #ffffff;
  box-shadow: 0 0 30px rgba(131, 56, 236, 0.8);
}


  50% { transform: scale(1.05); }
}

.gaming-title {
  font-size: 110px;
  font-weight: 900;
  margin: 0 0 20px 0;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 25%, #3a86ff 50%, #06ffa5 75%, #ffbe0b 100%);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 8px;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
  line-height: 1;
}

.gaming-tagline {
  font-size: 24px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 50px 0;
  font-weight: 700;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
}

.gaming-meta {
  display: flex;
  gap: 30px;
  justify-content: center;
  margin-bottom: 50px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border: 3px solid;
  border-radius: 20px;
  min-width: 140px;
  transition: 'none';
}

.meta-item:hover {
  transform: translateY(-5px) scale(1.05);
}

.meta-rating {
  border-color: #ff006e;
  box-shadow: 0 0 25px rgba(255, 0, 110, 0.5);
}

.meta-players {
  border-color: #3a86ff;
  box-shadow: 0 0 25px rgba(58, 134, 255, 0.5);
}

.meta-trending {
  border-color: #06ffa5;
  box-shadow: 0 0 25px rgba(6, 255, 165, 0.5);
}

.meta-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px currentColor);
}

.meta-value {
  font-size: 36px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
}

.meta-label {
  font-size: 12px;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
  text-transform: uppercase;
}

.gaming-btn {
  padding: 24px 70px;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%);
  border: 4px solid #ffffff;
  color: #ffffff;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 4px;
  cursor: pointer;
  transition: 'none';
  text-transform: uppercase;
  box-shadow: 0 0 40px rgba(255, 0, 110, 0.6);
  border-radius: 15px;
  animation: none;
}


  50% { box-shadow: 0 0 60px rgba(131, 56, 236, 0.8), 0 0 80px rgba(58, 134, 255, 0.6); }
}

.gaming-btn:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 0 80px rgba(255, 0, 110, 0.9);
}

.gaming-content {
  padding: 80px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.content-section {
  margin-bottom: 80px;
  padding: 50px;
  border-radius: 25px;
  position: relative;
  overflow: hidden;
}

.section-about {
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.2) 0%, rgba(131, 56, 236, 0.2) 100%);
  border: 3px solid rgba(255, 0, 110, 0.5);
  box-shadow: 0 0 40px rgba(255, 0, 110, 0.3);
}

.section-screenshots {
  background: linear-gradient(135deg, rgba(58, 134, 255, 0.2) 0%, rgba(6, 255, 165, 0.2) 100%);
  border: 3px solid rgba(58, 134, 255, 0.5);
  box-shadow: 0 0 40px rgba(58, 134, 255, 0.3);
}

.section-features {
  background: linear-gradient(135deg, rgba(255, 190, 11, 0.2) 0%, rgba(255, 0, 110, 0.2) 100%);
  border: 3px solid rgba(255, 190, 11, 0.5);
  box-shadow: 0 0 40px rgba(255, 190, 11, 0.3);
}

.content-section h2 {
  font-size: 42px;
  font-weight: 900;
  margin: 0 0 30px 0;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  letter-spacing: 3px;
}

.content-section p {
  font-size: 20px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.95);
}

.gaming-screenshots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 30px;
}

.screenshot-wrapper {
  overflow: hidden;
  border-radius: 20px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.2);
  transition: 'none';
}

.screenshot-wrapper:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 50px rgba(255, 255, 255, 0.4);
}

.gaming-screenshots img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  display: block;
}

.gaming-features {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 30px;
  justify-content: center;
}

.feature-tag {
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.3) 0%, rgba(131, 56, 236, 0.3) 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #ffffff;
  transition: 'none';
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.feature-tag:hover {
  transform: translateY(-5px) scale(1.1);
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.5) 0%, rgba(131, 56, 236, 0.5) 100%);
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.4);
}`,
        js: ''
      },
      fps: {
        category: 'FPS',
        description: 'Fast-paced action shooter',
        html: `<div class="promo-fps">
  <div class="fps-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="fps-overlay"></div>
    <div class="fps-hero-content">
      <div class="fps-badges">
        ${isNewRelease(game) ? '<span class="fps-badge">NEW</span>' : ''}
        <span class="fps-badge fps-badge-featured">FEATURED</span>
      </div>
      <h1 class="fps-title">${escapeHtml(gameName)}</h1>
      <p class="fps-subtitle">${escapeHtml(gameDescription.substring(0, 70))}${gameDescription.length > 70 ? '...' : ''}</p>
      <div class="fps-hero-stats">
        <div class="fps-hero-stat">
          <span class="fps-stat-icon">🎯</span>
          <span class="fps-stat-value">${gameRating.toFixed(1)}</span>
        </div>
        <div class="fps-hero-stat">
          <span class="fps-stat-icon">🔫</span>
          <span class="fps-stat-value">${formatPlayers(gamePlayers)}</span>
        </div>
        <div class="fps-hero-stat">
          <span class="fps-stat-icon">⚡</span>
          <span class="fps-stat-value">${gameTrending}</span>
        </div>
      </div>
      <button class="fps-action-btn">JOIN THE BATTLE</button>
    </div>
  </div>
  <div class="fps-content">
    <div class="fps-section">
      <h2 class="fps-section-title">GAME OVERVIEW</h2>
      <p class="fps-section-text">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="fps-section">
      <h2 class="fps-section-title">GAMEPLAY</h2>
      <div class="fps-screenshots">
        ${screenshots.map(url => `<img src="${url}" alt="Gameplay" />`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="fps-section">
      <h2 class="fps-section-title">FEATURES</h2>
      <div class="fps-features">
        ${gameTags.map(tag => `<div class="fps-feature">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0a0a0a;
  color: #ffffff;
}

.promo-fps {
  width: 100%;
  min-height: 100vh;
}

.fps-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 50%, #880000 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.fps-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%);
}

.fps-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px;
  max-width: 900px;
}

.fps-badges {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.fps-badge {
  padding: 8px 20px;
  background: rgba(255, 68, 68, 0.9);
  border: 2px solid #ff4444;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
}

.fps-badge-featured {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.fps-title {
  font-size: 84px;
  font-weight: 900;
  margin: 0 0 20px 0;
  text-shadow: 0 0 30px rgba(255, 68, 68, 0.8), 0 4px 20px rgba(0, 0, 0, 0.8);
  letter-spacing: -1px;
  text-transform: uppercase;
}

.fps-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 40px 0;
  font-weight: 600;
}

.fps-hero-stats {
  display: flex;
  gap: 40px;
  justify-content: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.fps-hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: rgba(255, 68, 68, 0.15);
  padding: 16px 28px;
  border: 2px solid rgba(255, 68, 68, 0.4);
  backdrop-filter: blur(10px);
}

.fps-stat-icon {
  font-size: 28px;
}

.fps-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

.fps-action-btn {
  padding: 22px 56px;
  background: #ff4444;
  border: none;
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 0 30px rgba(255, 68, 68, 0.5);
}

.fps-action-btn:hover {
  background: #ff6666;
  transform: translateY(-3px);
  box-shadow: 0 0 50px rgba(255, 68, 68, 0.8);
}

.fps-content {
  padding: 80px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.fps-section {
  margin-bottom: 80px;
}

.fps-section-title {
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 32px 0;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #ff4444;
  text-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
}

.fps-section-text {
  font-size: 18px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.fps-screenshots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.fps-screenshots img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  border: 2px solid rgba(255, 68, 68, 0.3);
}

.fps-features {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 24px;
}

.fps-feature {
  padding: 12px 24px;
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}`,
        js: ''
      },
      rpg: {
        category: 'RPG',
        description: 'Fantasy adventure epic',
        html: `<div class="promo-rpg">
  <div class="rpg-banner" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="rpg-banner-overlay"></div>
    <div class="rpg-banner-content">
      <div class="rpg-logo-section">
        <h1 class="rpg-title">${escapeHtml(gameName)}</h1>
        <p class="rpg-tagline">${escapeHtml(gameDescription.substring(0, 60))}${gameDescription.length > 60 ? '...' : ''}</p>
      </div>
      <div class="rpg-stats-bar">
        <div class="rpg-stat">
          <span class="rpg-stat-label">Rating</span>
          <span class="rpg-stat-value">${gameRating.toFixed(1)}</span>
        </div>
        <div class="rpg-stat">
          <span class="rpg-stat-label">Players</span>
          <span class="rpg-stat-value">${formatPlayers(gamePlayers)}</span>
        </div>
        <div class="rpg-stat">
          <span class="rpg-stat-label">Trending</span>
          <span class="rpg-stat-value">${gameTrending}</span>
        </div>
      </div>
      <button class="rpg-play-btn">Begin Your Journey</button>
    </div>
  </div>
  <div class="rpg-content">
    <div class="rpg-story-section">
      <h2 class="rpg-section-header">The Story</h2>
      <p class="rpg-story-text">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="rpg-gallery-section">
      <h2 class="rpg-section-header">World Gallery</h2>
      <div class="rpg-gallery">
        ${screenshots.map(url => `<div class="rpg-gallery-item"><img src="${url}" alt="World" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="rpg-features-section">
      <h2 class="rpg-section-header">Key Features</h2>
      <div class="rpg-features-grid">
        ${gameTags.map(tag => `<div class="rpg-feature-card">
          <div class="rpg-feature-icon">⚔️</div>
          <div class="rpg-feature-name">${escapeHtml(tag)}</div>
        </div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0f0a0a;
  color: #f5e6d3;
}

.promo-rpg {
  width: 100%;
  min-height: 100vh;
}

.rpg-banner {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #2d1810 0%, #1a0f0a 50%, #0a0505 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.rpg-banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
}

.rpg-banner-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 60px 40px;
  max-width: 1000px;
}

.rpg-logo-section {
  margin-bottom: 50px;
}

.rpg-title {
  font-size: 96px;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: #d4af37;
  text-shadow: 0 0 30px rgba(212, 175, 55, 0.6), 0 4px 20px rgba(0, 0, 0, 0.8);
  letter-spacing: 4px;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.rpg-tagline {
  font-size: 24px;
  color: rgba(245, 230, 211, 0.9);
  margin: 0;
  font-style: italic;
}

.rpg-stats-bar {
  display: flex;
  gap: 50px;
  justify-content: center;
  margin-bottom: 50px;
  padding: 30px;
  background: rgba(45, 24, 16, 0.6);
  border: 2px solid rgba(212, 175, 55, 0.3);
  backdrop-filter: blur(10px);
}

.rpg-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.rpg-stat-label {
  font-size: 14px;
  color: rgba(245, 230, 211, 0.7);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.rpg-stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #d4af37;
  text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
}

.rpg-play-btn {
  padding: 24px 64px;
  background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
  border: 2px solid #d4af37;
  color: #0f0a0a;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.4);
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.rpg-play-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 50px rgba(212, 175, 55, 0.7);
}

.rpg-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.rpg-story-section,
.rpg-gallery-section,
.rpg-features-section {
  margin-bottom: 100px;
}

.rpg-section-header {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 40px 0;
  color: #d4af37;
  text-align: center;
  text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
  letter-spacing: 3px;
}

.rpg-story-text {
  font-size: 20px;
  line-height: 2;
  color: rgba(245, 230, 211, 0.9);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.rpg-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.rpg-gallery-item {
  overflow: hidden;
  border: 2px solid rgba(212, 175, 55, 0.3);
}

.rpg-gallery-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  transition: 'none';
}

.rpg-gallery-item:hover img {
  transform: scale(1.05);
}

.rpg-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.rpg-feature-card {
  padding: 32px;
  background: rgba(45, 24, 16, 0.5);
  border: 2px solid rgba(212, 175, 55, 0.3);
  text-align: center;
  transition: 'none';
}

.rpg-feature-card:hover {
  border-color: rgba(212, 175, 55, 0.6);
  background: rgba(45, 24, 16, 0.7);
}

.rpg-feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.rpg-feature-name {
  font-size: 18px;
  font-weight: 600;
  color: #d4af37;
  text-transform: uppercase;
  letter-spacing: 1px;
}`,
        js: ''
      },
      strategy: {
        category: 'Strategy',
        description: 'Tactical command center',
        html: `<div class="promo-strategy">
  <div class="strategy-header" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="strategy-header-overlay"></div>
    <div class="strategy-header-content">
      <div class="strategy-title-section">
        <h1 class="strategy-title">${escapeHtml(gameName)}</h1>
        <p class="strategy-subtitle">${escapeHtml(gameDescription.substring(0, 80))}${gameDescription.length > 80 ? '...' : ''}</p>
      </div>
      <div class="strategy-info-grid">
        <div class="strategy-info-item">
          <div class="strategy-info-label">RATING</div>
          <div class="strategy-info-value">${gameRating.toFixed(1)}</div>
        </div>
        <div class="strategy-info-item">
          <div class="strategy-info-label">PLAYERS</div>
          <div class="strategy-info-value">${formatPlayers(gamePlayers)}</div>
        </div>
        <div class="strategy-info-item">
          <div class="strategy-info-label">TRENDING</div>
          <div class="strategy-info-value">${gameTrending}</div>
        </div>
      </div>
      <button class="strategy-cta-btn">COMMAND NOW</button>
    </div>
  </div>
  <div class="strategy-body">
    <div class="strategy-content-section">
      <h2 class="strategy-section-title">STRATEGY OVERVIEW</h2>
      <p class="strategy-description">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="strategy-content-section">
      <h2 class="strategy-section-title">BATTLEFIELD SHOWCASE</h2>
      <div class="strategy-showcase">
        ${screenshots.map(url => `<div class="strategy-showcase-item"><img src="${url}" alt="Battlefield" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="strategy-content-section">
      <h2 class="strategy-section-title">KEY FEATURES</h2>
      <div class="strategy-features">
        ${gameTags.map(tag => `<div class="strategy-feature">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0a0f1a;
  color: #ffffff;
}

.promo-strategy {
  width: 100%;
  min-height: 100vh;
}

.strategy-header {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a2332 0%, #0a0f1a 50%, #050810 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.strategy-header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 100%);
}

.strategy-header-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 50px 40px;
  max-width: 1000px;
}

.strategy-title-section {
  margin-bottom: 50px;
}

.strategy-title {
  font-size: 88px;
  font-weight: 900;
  margin: 0 0 24px 0;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: #4a9eff;
  text-shadow: 0 0 30px rgba(74, 158, 255, 0.6), 0 4px 20px rgba(0, 0, 0, 0.8);
}

.strategy-subtitle {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: 400;
}

.strategy-info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-bottom: 50px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.strategy-info-item {
  padding: 24px;
  background: rgba(74, 158, 255, 0.1);
  border: 2px solid rgba(74, 158, 255, 0.3);
  backdrop-filter: blur(10px);
}

.strategy-info-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.strategy-info-value {
  font-size: 32px;
  font-weight: 700;
  color: #4a9eff;
}

.strategy-cta-btn {
  padding: 22px 60px;
  background: transparent;
  border: 3px solid #4a9eff;
  color: #4a9eff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 0 30px rgba(74, 158, 255, 0.3);
}

.strategy-cta-btn:hover {
  background: #4a9eff;
  color: #0a0f1a;
  box-shadow: 0 0 50px rgba(74, 158, 255, 0.6);
  transform: translateY(-3px);
}

.strategy-body {
  padding: 80px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.strategy-content-section {
  margin-bottom: 80px;
}

.strategy-section-title {
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 40px 0;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: #4a9eff;
  text-align: center;
  text-shadow: 0 0 15px rgba(74, 158, 255, 0.5);
}

.strategy-description {
  font-size: 18px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.strategy-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.strategy-showcase-item {
  overflow: hidden;
  border: 2px solid rgba(74, 158, 255, 0.3);
}

.strategy-showcase-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  transition: 'none';
}

.strategy-showcase-item:hover img {
  transform: scale(1.05);
}

.strategy-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.strategy-feature {
  padding: 20px;
  background: rgba(74, 158, 255, 0.1);
  border: 1px solid rgba(74, 158, 255, 0.3);
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: 'none';
}

.strategy-feature:hover {
  background: rgba(74, 158, 255, 0.2);
  border-color: rgba(74, 158, 255, 0.5);
}`,
        js: ''
      },
      competitive: {
        category: 'Competitive',
        description: 'Esports tournament ready',
        html: `<div class="promo-competitive">
  <div class="comp-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="comp-hero-overlay"></div>
    <div class="comp-hero-content">
      <div class="comp-title-wrapper">
        <h1 class="comp-title">${escapeHtml(gameName.toUpperCase())}</h1>
        <div class="comp-divider"></div>
        <p class="comp-subtitle">COMPETITIVE GAMING AT ITS FINEST</p>
      </div>
      <div class="comp-stats-row">
        <div class="comp-stat-box">
          <div class="comp-stat-number">${gameRating.toFixed(1)}</div>
          <div class="comp-stat-label">RATING</div>
        </div>
        <div class="comp-stat-box">
          <div class="comp-stat-number">${formatPlayers(gamePlayers)}</div>
          <div class="comp-stat-label">PLAYERS</div>
        </div>
        <div class="comp-stat-box">
          <div class="comp-stat-number">${gameTrending}</div>
          <div class="comp-stat-label">TRENDING</div>
        </div>
      </div>
      <button class="comp-play-btn">ENTER ARENA</button>
    </div>
  </div>
  <div class="comp-content">
    <div class="comp-section">
      <h2 class="comp-section-title">COMPETITIVE EXPERIENCE</h2>
      <p class="comp-description">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="comp-section">
      <h2 class="comp-section-title">MATCH HIGHLIGHTS</h2>
      <div class="comp-highlights">
        ${screenshots.map(url => `<div class="comp-highlight-item"><img src="${url}" alt="Highlight" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="comp-section">
      <h2 class="comp-section-title">COMPETITIVE FEATURES</h2>
      <div class="comp-features-list">
        ${gameTags.map(tag => `<div class="comp-feature-item">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #000000;
  color: #ffffff;
}

.promo-competitive {
  width: 100%;
  min-height: 100vh;
}

.comp-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #ff6b00 0%, #ff3300 50%, #cc0000 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.comp-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%);
}

.comp-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 50px 40px;
  max-width: 1000px;
}

.comp-title-wrapper {
  margin-bottom: 50px;
}

.comp-title {
  font-size: 120px;
  font-weight: 900;
  margin: 0 0 20px 0;
  text-transform: uppercase;
  letter-spacing: 8px;
  color: #ffffff;
  text-shadow: 0 0 40px rgba(255, 107, 0, 0.8), 0 4px 20px rgba(0, 0, 0, 0.9);
  line-height: 1;
}

.comp-divider {
  width: 200px;
  height: 4px;
  background: linear-gradient(90deg, transparent, #ff6b00, transparent);
  margin: 0 auto 20px;
}

.comp-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  letter-spacing: 4px;
  font-weight: 600;
}

.comp-stats-row {
  display: flex;
  gap: 40px;
  justify-content: center;
  margin-bottom: 50px;
  flex-wrap: wrap;
}

.comp-stat-box {
  padding: 30px 40px;
  background: rgba(255, 107, 0, 0.15);
  border: 3px solid rgba(255, 107, 0, 0.5);
  backdrop-filter: blur(10px);
  min-width: 150px;
}

.comp-stat-number {
  font-size: 48px;
  font-weight: 900;
  color: #ff6b00;
  text-shadow: 0 0 20px rgba(255, 107, 0, 0.8);
  margin-bottom: 8px;
}

.comp-stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.comp-play-btn {
  padding: 24px 70px;
  background: #ff6b00;
  border: none;
  color: #000000;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 4px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 0 40px rgba(255, 107, 0, 0.6);
}

.comp-play-btn:hover {
  background: #ff8833;
  transform: translateY(-3px);
  box-shadow: 0 0 60px rgba(255, 107, 0, 0.9);
}

.comp-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.comp-section {
  margin-bottom: 100px;
}

.comp-section-title {
  font-size: 52px;
  font-weight: 900;
  margin: 0 0 40px 0;
  text-transform: uppercase;
  letter-spacing: 6px;
  color: #ff6b00;
  text-align: center;
  text-shadow: 0 0 20px rgba(255, 107, 0, 0.6);
}

.comp-description {
  font-size: 20px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.comp-highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 30px;
}

.comp-highlight-item {
  overflow: hidden;
  border: 3px solid rgba(255, 107, 0, 0.4);
}

.comp-highlight-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  transition: 'none';
}

.comp-highlight-item:hover img {
  transform: scale(1.08);
}

.comp-features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.comp-feature-item {
  padding: 24px;
  background: rgba(255, 107, 0, 0.1);
  border: 2px solid rgba(255, 107, 0, 0.4);
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: 'none';
}

.comp-feature-item:hover {
  background: rgba(255, 107, 0, 0.2);
  border-color: rgba(255, 107, 0, 0.7);
  transform: translateY(-3px);
}`,
        js: ''
      },
      adventure: {
        category: 'Adventure',
        description: 'Epic journey explorer',
        html: `<div class="promo-adventure">
  <div class="adv-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="adv-hero-overlay"></div>
    <div class="adv-hero-content">
      <div class="adv-badge">NEW ADVENTURE AWAITS</div>
      <h1 class="adv-title">${escapeHtml(gameName)}</h1>
      <p class="adv-tagline">${escapeHtml(gameDescription.substring(0, 75))}${gameDescription.length > 75 ? '...' : ''}</p>
      <div class="adv-quick-stats">
        <div class="adv-quick-stat">
          <span class="adv-stat-icon">⭐</span>
          <span>${gameRating.toFixed(1)}</span>
        </div>
        <div class="adv-quick-stat">
          <span class="adv-stat-icon">👥</span>
          <span>${formatPlayers(gamePlayers)}</span>
        </div>
        <div class="adv-quick-stat">
          <span class="adv-stat-icon">📈</span>
          <span>${gameTrending}</span>
        </div>
      </div>
      <button class="adv-explore-btn">Start Your Journey</button>
    </div>
  </div>
  <div class="adv-content">
    <div class="adv-story-box">
      <h2 class="adv-content-title">About This Adventure</h2>
      <p class="adv-story-text">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="adv-gallery-box">
      <h2 class="adv-content-title">Explore the World</h2>
      <div class="adv-gallery-grid">
        ${screenshots.map(url => `<div class="adv-gallery-card"><img src="${url}" alt="Adventure" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="adv-features-box">
      <h2 class="adv-content-title">Adventure Features</h2>
      <div class="adv-features-wrap">
        ${gameTags.map(tag => `<span class="adv-feature-tag">${escapeHtml(tag)}</span>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0f1419;
  color: #e8dcc6;
}

.promo-adventure {
  width: 100%;
  min-height: 100vh;
}

.adv-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #2d4a5c 0%, #1a2d3a 50%, #0f1419 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.adv-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%);
}

.adv-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 60px 40px;
  max-width: 900px;
}

.adv-badge {
  display: inline-block;
  padding: 10px 24px;
  background: rgba(232, 220, 198, 0.15);
  border: 2px solid rgba(232, 220, 198, 0.4);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  color: #e8dcc6;
}

.adv-title {
  font-size: 92px;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: #d4a574;
  text-shadow: 0 0 30px rgba(212, 165, 116, 0.5), 0 4px 20px rgba(0, 0, 0, 0.8);
  letter-spacing: 2px;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.adv-tagline {
  font-size: 22px;
  color: rgba(232, 220, 198, 0.9);
  margin: 0 0 50px 0;
  font-style: italic;
  line-height: 1.6;
}

.adv-quick-stats {
  display: flex;
  gap: 50px;
  justify-content: center;
  margin-bottom: 50px;
  flex-wrap: wrap;
}

.adv-quick-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  background: rgba(212, 165, 116, 0.1);
  border: 2px solid rgba(212, 165, 116, 0.3);
  backdrop-filter: blur(10px);
}

.adv-stat-icon {
  font-size: 24px;
}

.adv-quick-stat span:last-child {
  font-size: 24px;
  font-weight: 700;
  color: #d4a574;
}

.adv-explore-btn {
  padding: 22px 64px;
  background: linear-gradient(135deg, #d4a574 0%, #b8945f 100%);
  border: 2px solid #d4a574;
  color: #0f1419;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 0 30px rgba(212, 165, 116, 0.4);
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.adv-explore-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 50px rgba(212, 165, 116, 0.7);
}

.adv-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.adv-story-box,
.adv-gallery-box,
.adv-features-box {
  margin-bottom: 100px;
}

.adv-content-title {
  font-size: 44px;
  font-weight: 700;
  margin: 0 0 40px 0;
  color: #d4a574;
  text-align: center;
  text-shadow: 0 0 15px rgba(212, 165, 116, 0.5);
  letter-spacing: 2px;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.adv-story-text {
  font-size: 20px;
  line-height: 2;
  color: rgba(232, 220, 198, 0.9);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.adv-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
  gap: 30px;
}

.adv-gallery-card {
  overflow: hidden;
  border: 2px solid rgba(212, 165, 116, 0.3);
}

.adv-gallery-card img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  transition: 'none';
}

.adv-gallery-card:hover img {
  transform: scale(1.06);
}

.adv-features-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

.adv-feature-tag {
  padding: 14px 28px;
  background: rgba(212, 165, 116, 0.1);
  border: 2px solid rgba(212, 165, 116, 0.4);
  font-size: 16px;
  font-weight: 600;
  color: #d4a574;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: 'none';
}

.adv-feature-tag:hover {
  background: rgba(212, 165, 116, 0.2);
  border-color: rgba(212, 165, 116, 0.6);
}`,
        js: ''
      },
      indie: {
        category: 'Indie',
        description: 'Creative and artistic',
        html: `<div class="promo-indie">
  <div class="indie-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="indie-hero-overlay"></div>
    <div class="indie-hero-content">
      <div class="indie-title-wrapper">
        <h1 class="indie-title">${escapeHtml(gameName)}</h1>
        <p class="indie-subtitle">${escapeHtml(gameDescription.substring(0, 90))}${gameDescription.length > 90 ? '...' : ''}</p>
      </div>
      <div class="indie-stats">
        <div class="indie-stat">
          <div class="indie-stat-label">Rating</div>
          <div class="indie-stat-value">${gameRating.toFixed(1)}</div>
        </div>
        <div class="indie-stat">
          <div class="indie-stat-label">Players</div>
          <div class="indie-stat-value">${formatPlayers(gamePlayers)}</div>
        </div>
        <div class="indie-stat">
          <div class="indie-stat-label">Trending</div>
          <div class="indie-stat-value">${gameTrending}</div>
        </div>
      </div>
      <button class="indie-play-btn">Play Now</button>
    </div>
  </div>
  <div class="indie-content">
    <div class="indie-section">
      <h2 class="indie-section-title">About</h2>
      <p class="indie-description">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="indie-section">
      <h2 class="indie-section-title">Screenshots</h2>
      <div class="indie-gallery">
        ${screenshots.map(url => `<div class="indie-gallery-item"><img src="${url}" alt="Screenshot" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="indie-section">
      <h2 class="indie-section-title">Tags</h2>
      <div class="indie-tags">
        ${gameTags.map(tag => `<span class="indie-tag">${escapeHtml(tag)}</span>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #fafafa;
  color: #2d2d2d;
}

.promo-indie {
  width: 100%;
  min-height: 100vh;
}

.indie-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.indie-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 100%);
}

.indie-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 60px 40px;
  max-width: 900px;
}

.indie-title-wrapper {
  margin-bottom: 50px;
}

.indie-title {
  font-size: 76px;
  font-weight: 800;
  margin: 0 0 24px 0;
  color: #2d2d2d;
  letter-spacing: -1px;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.indie-subtitle {
  font-size: 22px;
  color: rgba(45, 45, 45, 0.8);
  margin: 0;
  font-weight: 400;
  line-height: 1.6;
}

.indie-stats {
  display: flex;
  gap: 50px;
  justify-content: center;
  margin-bottom: 50px;
  flex-wrap: wrap;
}

.indie-stat {
  text-align: center;
}

.indie-stat-label {
  font-size: 14px;
  color: rgba(45, 45, 45, 0.7);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-weight: 600;
}

.indie-stat-value {
  font-size: 36px;
  font-weight: 800;
  color: #2d2d2d;
}

.indie-play-btn {
  padding: 20px 56px;
  background: #2d2d2d;
  border: none;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 4px 20px rgba(45, 45, 45, 0.2);
}

.indie-play-btn:hover {
  background: #3d3d3d;
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(45, 45, 45, 0.3);
}

.indie-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.indie-section {
  margin-bottom: 100px;
}

.indie-section-title {
  font-size: 42px;
  font-weight: 800;
  margin: 0 0 32px 0;
  color: #2d2d2d;
  text-align: center;
  letter-spacing: -1px;
}

.indie-description {
  font-size: 20px;
  line-height: 1.9;
  color: rgba(45, 45, 45, 0.85);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.indie-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.indie-gallery-item {
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.indie-gallery-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  transition: 'none';
}

.indie-gallery-item:hover img {
  transform: scale(1.05);
}

.indie-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.indie-tag {
  padding: 10px 24px;
  background: rgba(45, 45, 45, 0.05);
  border: 2px solid rgba(45, 45, 45, 0.1);
  font-size: 14px;
  font-weight: 600;
  color: #2d2d2d;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: 'none';
}

.indie-tag:hover {
  background: rgba(45, 45, 45, 0.1);
  border-color: rgba(45, 45, 45, 0.3);
}`,
        js: ''
      },
      horror: {
        category: 'Horror',
        description: 'Dark and atmospheric',
        html: `<div class="promo-horror">
  <div class="horror-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="horror-hero-overlay"></div>
    <div class="horror-hero-content">
      <div class="horror-badge">ENTER IF YOU DARE</div>
      <h1 class="horror-title">${escapeHtml(gameName.toUpperCase())}</h1>
      <p class="horror-subtitle">${escapeHtml(gameDescription.substring(0, 85))}${gameDescription.length > 85 ? '...' : ''}</p>
      <div class="horror-meta">
        <div class="horror-meta-item">
          <span class="horror-meta-label">RATING</span>
          <span class="horror-meta-value">${gameRating.toFixed(1)}</span>
        </div>
        <div class="horror-meta-item">
          <span class="horror-meta-label">PLAYERS</span>
          <span class="horror-meta-value">${formatPlayers(gamePlayers)}</span>
        </div>
        <div class="horror-meta-item">
          <span class="horror-meta-label">TRENDING</span>
          <span class="horror-meta-value">${gameTrending}</span>
        </div>
      </div>
      <button class="horror-btn">FACE YOUR FEAR</button>
    </div>
  </div>
  <div class="horror-content">
    <div class="horror-section">
      <h2 class="horror-section-title">THE HORROR</h2>
      <p class="horror-description">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="horror-section">
      <h2 class="horror-section-title">TERRIFYING MOMENTS</h2>
      <div class="horror-gallery">
        ${screenshots.map(url => `<div class="horror-gallery-item"><img src="${url}" alt="Horror" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="horror-section">
      <h2 class="horror-section-title">FEATURES</h2>
      <div class="horror-features">
        ${gameTags.map(tag => `<div class="horror-feature">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #0a0a0a;
  color: #c41e3a;
  overflow-x: hidden;
}

.promo-horror {
  width: 100%;
  min-height: 100vh;
}

.horror-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a0000 0%, #0a0000 50%, #000000 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.horror-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(196, 30, 58, 0.1) 0%, rgba(0, 0, 0, 0.9) 100%);
}

.horror-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 60px 40px;
  max-width: 1000px;
}

.horror-badge {
  display: inline-block;
  padding: 10px 24px;
  background: rgba(196, 30, 58, 0.2);
  border: 2px solid #c41e3a;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 30px;
  color: #c41e3a;
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.5);
}

.horror-title {
  font-size: 110px;
  font-weight: 900;
  margin: 0 0 24px 0;
  text-transform: uppercase;
  letter-spacing: 8px;
  color: #c41e3a;
  text-shadow: 0 0 30px rgba(196, 30, 58, 0.8), 0 0 60px rgba(196, 30, 58, 0.5), 0 4px 20px rgba(0, 0, 0, 0.9);
  line-height: 1;
}

.horror-subtitle {
  font-size: 20px;
  color: rgba(196, 30, 58, 0.9);
  margin: 0 0 50px 0;
  font-weight: 600;
  letter-spacing: 2px;
}

.horror-meta {
  display: flex;
  gap: 50px;
  justify-content: center;
  margin-bottom: 50px;
  flex-wrap: wrap;
}

.horror-meta-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 30px;
  background: rgba(196, 30, 58, 0.1);
  border: 2px solid rgba(196, 30, 58, 0.4);
  backdrop-filter: blur(10px);
}

.horror-meta-label {
  font-size: 12px;
  color: rgba(196, 30, 58, 0.7);
  text-transform: uppercase;
  letter-spacing: 3px;
}

.horror-meta-value {
  font-size: 36px;
  font-weight: 900;
  color: #c41e3a;
  text-shadow: 0 0 15px rgba(196, 30, 58, 0.8);
}

.horror-btn {
  padding: 24px 70px;
  background: transparent;
  border: 3px solid #c41e3a;
  color: #c41e3a;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 4px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 0 30px rgba(196, 30, 58, 0.5);
}

.horror-btn:hover {
  background: #c41e3a;
  color: #000000;
  box-shadow: 0 0 50px rgba(196, 30, 58, 0.9);
  transform: scale(1.05);
}

.horror-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.horror-section {
  margin-bottom: 100px;
}

.horror-section-title {
  font-size: 52px;
  font-weight: 900;
  margin: 0 0 40px 0;
  text-transform: uppercase;
  letter-spacing: 6px;
  color: #c41e3a;
  text-align: center;
  text-shadow: 0 0 20px rgba(196, 30, 58, 0.6);
}

.horror-description {
  font-size: 20px;
  line-height: 1.9;
  color: rgba(196, 30, 58, 0.9);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.horror-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 30px;
}

.horror-gallery-item {
  overflow: hidden;
  border: 3px solid rgba(196, 30, 58, 0.4);
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.3);
}

.horror-gallery-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  filter: brightness(0.7);
  transition: none;
}

.horror-gallery-item:hover img {
  filter: brightness(1);
  transform: scale(1.05);
}

.horror-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.horror-feature {
  padding: 24px;
  background: rgba(196, 30, 58, 0.1);
  border: 2px solid rgba(196, 30, 58, 0.4);
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #c41e3a;
  transition: 'none';
}

.horror-feature:hover {
  background: rgba(196, 30, 58, 0.2);
  border-color: rgba(196, 30, 58, 0.7);
  box-shadow: 0 0 20px rgba(196, 30, 58, 0.4);
}`,
        js: ''
      },
      sports: {
        category: 'Sports',
        description: 'Athletic and energetic',
        html: `<div class="promo-sports">
  <div class="sports-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="sports-hero-overlay"></div>
    <div class="sports-hero-content">
      <div class="sports-header">
        <h1 class="sports-title">${escapeHtml(gameName)}</h1>
        <p class="sports-tagline">${escapeHtml(gameDescription.substring(0, 70))}${gameDescription.length > 70 ? '...' : ''}</p>
      </div>
      <div class="sports-stats-container">
        <div class="sports-stat">
          <div class="sports-stat-number">${gameRating.toFixed(1)}</div>
          <div class="sports-stat-label">RATING</div>
        </div>
        <div class="sports-stat">
          <div class="sports-stat-number">${formatPlayers(gamePlayers)}</div>
          <div class="sports-stat-label">PLAYERS</div>
        </div>
        <div class="sports-stat">
          <div class="sports-stat-number">${gameTrending}</div>
          <div class="sports-stat-label">TRENDING</div>
        </div>
      </div>
      <button class="sports-action-btn">PLAY NOW</button>
    </div>
  </div>
  <div class="sports-content">
    <div class="sports-section">
      <h2 class="sports-section-title">GAME OVERVIEW</h2>
      <p class="sports-description">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="sports-section">
      <h2 class="sports-section-title">ACTION SHOTS</h2>
      <div class="sports-gallery">
        ${screenshots.map(url => `<div class="sports-gallery-item"><img src="${url}" alt="Action" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="sports-section">
      <h2 class="sports-section-title">FEATURES</h2>
      <div class="sports-features">
        ${gameTags.map(tag => `<div class="sports-feature">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #1a1a1a;
}

.promo-sports {
  width: 100%;
  min-height: 100vh;
}

.sports-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #00d4ff 0%, #090979 50%, #020024 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sports-hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.6) 100%);
}

.sports-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 60px 40px;
  max-width: 1000px;
}

.sports-header {
  margin-bottom: 60px;
}

.sports-title {
  font-size: 100px;
  font-weight: 900;
  margin: 0 0 24px 0;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: #ffffff;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
  line-height: 1;
}

.sports-tagline {
  font-size: 24px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  font-weight: 600;
  letter-spacing: 2px;
}

.sports-stats-container {
  display: flex;
  gap: 60px;
  justify-content: center;
  margin-bottom: 60px;
  flex-wrap: wrap;
}

.sports-stat {
  text-align: center;
  padding: 30px 40px;
  background: rgba(255, 255, 255, 0.15);
  border: 3px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  min-width: 140px;
}

.sports-stat-number {
  font-size: 56px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  margin-bottom: 8px;
}

.sports-stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 3px;
  font-weight: 700;
}

.sports-action-btn {
  padding: 26px 80px;
  background: #ffffff;
  border: none;
  color: #090979;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 4px;
  text-transform: uppercase;
  cursor: pointer;
  transition: 'none';
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.sports-action-btn:hover {
  background: #00d4ff;
  color: #ffffff;
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 212, 255, 0.5);
}

.sports-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.sports-section {
  margin-bottom: 100px;
}

.sports-section-title {
  font-size: 56px;
  font-weight: 900;
  margin: 0 0 40px 0;
  text-transform: uppercase;
  letter-spacing: 6px;
  color: #090979;
  text-align: center;
}

.sports-description {
  font-size: 22px;
  line-height: 1.9;
  color: rgba(26, 26, 26, 0.9);
  text-align: center;
  max-width: 900px;
  margin: 0 auto;
}

.sports-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 30px;
}

.sports-gallery-item {
  overflow: hidden;
  border: 4px solid #090979;
  box-shadow: 0 4px 20px rgba(9, 9, 121, 0.2);
}

.sports-gallery-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  transition: 'none';
}

.sports-gallery-item:hover img {
  transform: scale(1.08);
}

.sports-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.sports-feature {
  padding: 28px;
  background: linear-gradient(135deg, #00d4ff 0%, #090979 100%);
  color: #ffffff;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  transition: 'none';
  box-shadow: 0 4px 20px rgba(9, 9, 121, 0.2);
}

.sports-feature:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(9, 9, 121, 0.4);
}`,
        js: ''
      },
      dank: {
        category: 'Meme',
        description: 'Ultimate 2000s dank meme vibes',
        html: `<div class="promo-dank">
  <div class="dank-hero" ${bannerUrl ? `style="background-image: url('${bannerUrl}');"` : ''}>
    <div class="dank-overlay"></div>
    <div class="dank-hero-content">
      <div class="dank-badges">
        ${isNewRelease(game) ? '<span class="dank-badge dank-badge-new">🔥 NEW 🔥</span>' : ''}
        <span class="dank-badge dank-badge-dank">💯 DANK 💯</span>
        <span class="dank-badge dank-badge-epic">👌 EPIC 👌</span>
      </div>
      <h1 class="dank-title">${escapeHtml(gameName.toUpperCase())}</h1>
      <p class="dank-subtitle">${escapeHtml(gameDescription.substring(0, 60))}${gameDescription.length > 60 ? '...' : ''}</p>
      <div class="dank-stats">
        <div class="dank-stat dank-stat-rating">
          <div class="dank-stat-icon">⭐</div>
          <div class="dank-stat-value">${gameRating.toFixed(1)}</div>
          <div class="dank-stat-label">RATING</div>
        </div>
        <div class="dank-stat dank-stat-players">
          <div class="dank-stat-icon">👥</div>
          <div class="dank-stat-value">${formatPlayers(gamePlayers)}</div>
          <div class="dank-stat-label">PLAYERS</div>
        </div>
        <div class="dank-stat dank-stat-trending">
          <div class="dank-stat-icon">🚀</div>
          <div class="dank-stat-value">${gameTrending}</div>
          <div class="dank-stat-label">TRENDING</div>
        </div>
      </div>
      <button class="dank-btn">🎮 PLAY NOW 🎮</button>
    </div>
    <div class="dank-floating-elements">
      <div class="dank-illuminati">▲</div>
      <div class="dank-snoop">💨</div>
      <div class="dank-420">420</div>
      <div class="dank-fire">🔥</div>
    </div>
  </div>
  <div class="dank-content">
    <div class="dank-section dank-section-about">
      <h2 class="dank-section-title">📝 ABOUT THIS GAME 📝</h2>
      <p class="dank-description">${escapeHtml(gameDescription)}</p>
    </div>
    ${screenshots.length > 0 ? `<div class="dank-section dank-section-screenshots">
      <h2 class="dank-section-title">📸 SCREENSHOTS 📸</h2>
      <div class="dank-gallery">
        ${screenshots.map(url => `<div class="dank-gallery-item"><img src="${url}" alt="Screenshot" /></div>`).join('\n        ')}
      </div>
    </div>` : ''}
    ${gameTags.length > 0 ? `<div class="dank-section dank-section-features">
      <h2 class="dank-section-title">✨ FEATURES ✨</h2>
      <div class="dank-features">
        ${gameTags.map(tag => `<div class="dank-feature">${escapeHtml(tag)}</div>`).join('\n        ')}
      </div>
    </div>` : ''}
  </div>
</div>`,
        css: `body {
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  margin: 0;
  padding: 0;
  background: #000000;
  color: #ffffff;
  overflow-x: hidden;
}

.promo-dank {
  width: 100%;
  min-height: 100vh;
}

.dank-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dank-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(135deg, 
      rgba(76, 175, 80, 0.4) 0%, 
      rgba(102, 187, 106, 0.4) 15%, 
      rgba(124, 179, 66, 0.4) 30%, 
      rgba(139, 195, 74, 0.4) 45%, 
      rgba(156, 204, 101, 0.4) 60%, 
      rgba(67, 160, 71, 0.4) 75%, 
      rgba(46, 125, 50, 0.4) 90%, 
      rgba(76, 175, 80, 0.4) 100%);
  background-size: 300% 300%;
  animation: none;
  mix-blend-mode: color;
  filter: contrast(1.2) brightness(1.1);
  z-index: 1;
}

.dank-hero::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 30% 50%, rgba(76, 175, 80, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 70% 50%, rgba(139, 195, 74, 0.3) 0%, transparent 50%),
    linear-gradient(45deg, 
      rgba(124, 179, 66, 0.2) 0%, 
      transparent 25%, 
      rgba(102, 187, 106, 0.2) 50%, 
      transparent 75%, 
      rgba(67, 160, 71, 0.2) 100%);
  background-size: 200% 200%;
  animation: none;
  mix-blend-mode: overlay;
  filter: blur(2px) contrast(1.3);
  opacity: 0.7;
  z-index: 1;
}


  33% { 
    background-position: 100% 50%;
    filter: contrast(1.3) brightness(1.2) hue-rotate(30deg);
  }
  66% { 
    background-position: 50% 100%;
    filter: contrast(1.25) brightness(1.15) hue-rotate(60deg);
  }
  100% { 
    background-position: 0% 50%;
    filter: contrast(1.2) brightness(1.1) hue-rotate(0deg);
  }
}


  25% { 
    background-position: 100% 0%;
    transform: scale(1.02) rotate(1deg);
    filter: blur(2.5px) contrast(1.35) hue-rotate(15deg);
  }
  50% { 
    background-position: 100% 100%;
    transform: scale(1.01) rotate(-1deg);
    filter: blur(2px) contrast(1.3) hue-rotate(30deg);
  }
  75% { 
    background-position: 0% 100%;
    transform: scale(1.02) rotate(1deg);
    filter: blur(2.5px) contrast(1.35) hue-rotate(15deg);
  }
  100% { 
    background-position: 0% 0%;
    transform: scale(1) rotate(0deg);
    filter: blur(2px) contrast(1.3) hue-rotate(0deg);
  }
}

.dank-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.6) 100%);
  z-index: 1;
}

.dank-hero-content {
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 40px;
}

.dank-badges {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.dank-badge {
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 2px;
  border: 4px solid;
  text-transform: uppercase;
  animation: none;
  box-shadow: 0 0 30px currentColor;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.dank-badge-new {
  background: #ff006e;
  border-color: #ff006e;
  color: #ffffff;
  box-shadow: 0 0 40px rgba(255, 0, 110, 0.9);
}

.dank-badge-dank {
  background: #ffbe0b;
  border-color: #ffbe0b;
  color: #000000;
  box-shadow: 0 0 40px rgba(255, 190, 11, 0.9);
}

.dank-badge-epic {
  background: #8338ec;
  border-color: #8338ec;
  color: #ffffff;
  box-shadow: 0 0 40px rgba(131, 56, 236, 0.9);
}


  50% { transform: scale(1.1); }
}


  100% { transform: rotate(360deg); }
}

.dank-title {
  font-size: 120px;
  font-weight: 900;
  margin: 0 0 30px 0;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 25%, #3a86ff 50%, #06ffa5 75%, #ffbe0b 100%);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: none;
  letter-spacing: 8px;
  text-shadow: 0 0 60px rgba(255, 255, 255, 0.8);
  line-height: 1;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  text-transform: uppercase;
}


  50% { transform: translateY(-10px); }
}

.dank-subtitle {
  font-size: 28px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 50px 0;
  font-weight: 700;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.8);
  animation: none;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}


  50% { opacity: 0.5; }
}

.dank-stats {
  display: flex;
  gap: 40px;
  justify-content: center;
  margin-bottom: 60px;
  flex-wrap: wrap;
}

.dank-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 30px 40px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(15px);
  border: 5px solid;
  border-radius: 25px;
  min-width: 160px;
  transition: 'none';
  animation: none;
}

.dank-stat:nth-child(1) {
  animation-delay: 0s;
  border-color: #ff006e;
  box-shadow: 0 0 40px rgba(255, 0, 110, 0.6);
}

.dank-stat:nth-child(2) {
  animation-delay: 0.5s;
  border-color: #3a86ff;
  box-shadow: 0 0 40px rgba(58, 134, 255, 0.6);
}

.dank-stat:nth-child(3) {
  animation-delay: 1s;
  border-color: #06ffa5;
  box-shadow: 0 0 40px rgba(6, 255, 165, 0.6);
}


  50% { transform: translateY(-15px) rotate(5deg); }
}

.dank-stat:hover {
  transform: scale(1.15) rotate(5deg);
  animation: none;
}

.dank-stat-icon {
  font-size: 40px;
  filter: drop-shadow(0 0 15px currentColor);
  animation: none;
}


  100% { transform: rotate(360deg); }
}

.dank-stat-value {
  font-size: 48px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 0 25px rgba(255, 255, 255, 0.9);
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.dank-stat-label {
  font-size: 14px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 900;
  text-transform: uppercase;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.dank-btn {
  padding: 28px 80px;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%);
  border: 6px solid #ffffff;
  color: #ffffff;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 6px;
  cursor: pointer;
  transition: 'none';
  text-transform: uppercase;
  box-shadow: 0 0 60px rgba(255, 0, 110, 0.8);
  border-radius: 20px;
  animation: none;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}


  50% { box-shadow: 0 0 100px rgba(131, 56, 236, 1), 0 0 120px rgba(58, 134, 255, 0.8); }
}


  50% { transform: translateY(-8px); }
}

.dank-btn:hover {
  transform: translateY(-10px) scale(1.1) rotate(5deg);
  box-shadow: 0 0 120px rgba(255, 0, 110, 1);
  animation: none;
}


  100% { transform: translateY(-10px) scale(1.1) rotate(365deg); }
}

.dank-floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

.dank-illuminati {
  position: absolute;
  top: 20%;
  left: 10%;
  font-size: 80px;
  color: #ffbe0b;
  animation: none;
  text-shadow: 0 0 30px #ffbe0b;
  filter: drop-shadow(0 0 20px #ffbe0b);
}


  50% { transform: rotate(180deg) scale(1.2); }
  100% { transform: rotate(360deg) scale(1); }
}

.dank-snoop {
  position: absolute;
  top: 30%;
  right: 15%;
  font-size: 60px;
  animation: none;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8));
}


  25% { transform: translate(20px, -20px) rotate(90deg); }
  50% { transform: translate(-20px, -40px) rotate(180deg); }
  75% { transform: translate(-20px, 20px) rotate(270deg); }
}

.dank-420 {
  position: absolute;
  bottom: 25%;
  left: 8%;
  font-size: 72px;
  font-weight: 900;
  color: #06ffa5;
  text-shadow: 0 0 40px #06ffa5;
  animation: none;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}


  50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
}

.dank-fire {
  position: absolute;
  bottom: 30%;
  right: 12%;
  font-size: 80px;
  animation: none;
  filter: drop-shadow(0 0 30px #ff006e);
}


  100% { transform: rotate(360deg) scale(1.2); }
}

.dank-content {
  padding: 100px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.dank-section {
  margin-bottom: 100px;
  padding: 60px;
  border-radius: 30px;
  position: relative;
  overflow: hidden;
  animation: none;
}


  50% { transform: translateY(-10px); }
}

.dank-section-about {
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.3) 0%, rgba(131, 56, 236, 0.3) 100%);
  border: 5px solid rgba(255, 0, 110, 0.6);
  box-shadow: 0 0 60px rgba(255, 0, 110, 0.4);
}

.dank-section-screenshots {
  background: linear-gradient(135deg, rgba(58, 134, 255, 0.3) 0%, rgba(6, 255, 165, 0.3) 100%);
  border: 5px solid rgba(58, 134, 255, 0.6);
  box-shadow: 0 0 60px rgba(58, 134, 255, 0.4);
}

.dank-section-features {
  background: linear-gradient(135deg, rgba(255, 190, 11, 0.3) 0%, rgba(255, 0, 110, 0.3) 100%);
  border: 5px solid rgba(255, 190, 11, 0.6);
  box-shadow: 0 0 60px rgba(255, 190, 11, 0.4);
}

.dank-section-title {
  font-size: 56px;
  font-weight: 900;
  margin: 0 0 40px 0;
  background: linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
  text-align: center;
  animation: none;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  text-transform: uppercase;
}


  100% { filter: hue-rotate(360deg); }
}

.dank-description {
  font-size: 24px;
  line-height: 2;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.dank-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 40px;
  margin-top: 40px;
}

.dank-gallery-item {
  overflow: hidden;
  border-radius: 25px;
  border: 6px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 50px rgba(255, 255, 255, 0.3);
  transition: 'none';
  animation: none;
}

.dank-gallery-item:nth-child(1) { animation-delay: 0s; }
.dank-gallery-item:nth-child(2) { animation-delay: 0.3s; }
.dank-gallery-item:nth-child(3) { animation-delay: 0.6s; }


  50% { transform: translateY(-15px) rotate(3deg); }
}

.dank-gallery-item:hover {
  transform: translateY(-20px) scale(1.1) rotate(5deg);
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 80px rgba(255, 255, 255, 0.6);
  animation: none;
}


  100% { transform: translateY(-20px) scale(1.1) rotate(365deg); }
}

.dank-gallery-item img {
  width: 100%;
  height: auto;
  object-fit: cover;
  aspect-ratio: 16/9;
  display: block;
}

.dank-features {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: center;
  margin-top: 40px;
}

.dank-feature {
  padding: 20px 40px;
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.4) 0%, rgba(131, 56, 236, 0.4) 100%);
  border: 4px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  font-size: 22px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: #ffffff;
  transition: 'none';
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
  animation: none;
  font-family: 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.dank-feature:nth-child(odd) {
  animation-delay: 0s;
}

.dank-feature:nth-child(even) {
  animation-delay: 0.5s;
}


  50% { transform: scale(1.1); }
}

.dank-feature:hover {
  transform: translateY(-10px) scale(1.2) rotate(5deg);
  background: linear-gradient(135deg, rgba(255, 0, 110, 0.6) 0%, rgba(131, 56, 236, 0.6) 100%);
  box-shadow: 0 0 60px rgba(255, 255, 255, 0.6);
  animation: none;
}


  100% { transform: translateY(-10px) scale(1.2) rotate(365deg); }
}`,
        js: ''
      }
    };

    const template = templates[templateName];
    if (!template) return;

    setPromoHTML(template.html);
    setPromoCSS(template.css);
    setPromoJS(template.js || '');
    // Don't switch to custom mode - stay in prebuilt mode
    // Preview will show automatically because content exists
  };

  const handleSave = () => {
    // Explicitly save all promo data to localStorage
    if (gameId) {
      try {
        localStorage.setItem(`gamePromoHTML_${gameId}`, promoHTML);
        localStorage.setItem(`gamePromoCSS_${gameId}`, promoCSS);
        localStorage.setItem(`gamePromoJS_${gameId}`, promoJS);
        localStorage.setItem(`gamePromoPreviewHeight_${gameId}`, previewHeight.toString());
        localStorage.setItem(`gamePromoPreviewWidth_${gameId}`, previewWidth.toString());
        localStorage.setItem(`gamePromoPreviewLabels_${gameId}`, showPreviewLabels.toString());
        localStorage.setItem(`gamePromoMode_${gameId}`, promoMode);
        localStorage.setItem(`gamePromoCodeLayout_${gameId}`, codeLayoutMode);
      } catch (_) {}
    }
    setIsEditMode(false);
  };

  const handleCancel = () => {
    // Reload from localStorage to discard changes
    try {
      if (gameId) {
        setPromoHTML(localStorage.getItem(`gamePromoHTML_${gameId}`) || '');
        setPromoCSS(localStorage.getItem(`gamePromoCSS_${gameId}`) || '');
        setPromoJS(localStorage.getItem(`gamePromoJS_${gameId}`) || '');
        const savedHeight = localStorage.getItem(`gamePromoPreviewHeight_${gameId}`);
        if (savedHeight) setPreviewHeight(parseInt(savedHeight, 10));
        const savedWidth = localStorage.getItem(`gamePromoPreviewWidth_${gameId}`);
        if (savedWidth) setPreviewWidth(parseInt(savedWidth, 10));
        const savedLabels = localStorage.getItem(`gamePromoPreviewLabels_${gameId}`);
        if (savedLabels !== null) setShowPreviewLabels(savedLabels === 'true');
        const savedMode = localStorage.getItem(`gamePromoMode_${gameId}`);
        if (savedMode) setPromoMode(savedMode);
        const savedLayout = localStorage.getItem(`gamePromoCodeLayout_${gameId}`);
        if (savedLayout) setCodeLayoutMode(savedLayout);
      }
    } catch (_) {}
    setIsEditMode(false);
    setShowCustomCode(false);
  };

  const getPriceValue = (game) => {
    if (!game) return 0;
    const raw = game.price ?? game.original?.price ?? game.original?.fullFormData?.price ?? 0;
    if (raw == null || raw === '') return 0;
    const cleaned = String(raw).trim().replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(/,/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const displayPrice = (game) => {
    const price = getPriceValue(game);
    if (price === 0) return 'Free to Play';
    return `$${price.toFixed(2)}`;
  };

  if (!game) {
    return (
      <div className="game-promo-page">
        <div className="promo-not-found">
          <h1>Game Not Found</h1>
          <button onClick={() => navigate('/store')}>Back to Store</button>
        </div>
      </div>
    );
  }

  // Filter CSS code based on selected filter
  const getFilteredCSS = (css) => {
    if (cssFilter === 'all' || !css) return css;
    
    const lines = css.split('\n');
    const filteredLines = [];
    let inBlock = false;
    let blockType = '';
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Count braces for this line
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const prevBraceCount = braceCount;
      braceCount += openBraces - closeBraces;
      
      if (cssFilter === 'keyframes') {
        if (trimmed.startsWith('@keyframes')) {
          inBlock = true;
          blockType = 'keyframes';
          filteredLines.push(line);
        } else if (inBlock && blockType === 'keyframes') {
          filteredLines.push(line);
          // End block when braces are balanced and we just closed a brace
          if (prevBraceCount > 0 && braceCount === 0) {
            inBlock = false;
            blockType = '';
          }
        }
      } else if (cssFilter === 'media') {
        if (trimmed.startsWith('@media')) {
          inBlock = true;
          blockType = 'media';
          filteredLines.push(line);
        } else if (inBlock && blockType === 'media') {
          filteredLines.push(line);
          if (prevBraceCount > 0 && braceCount === 0) {
            inBlock = false;
            blockType = '';
          }
        }
      } else if (cssFilter === 'import') {
        if (trimmed.startsWith('@import')) {
          filteredLines.push(line);
        }
      } else if (cssFilter === 'variables') {
        if (trimmed.startsWith(':root')) {
          inBlock = true;
          blockType = 'variables';
          filteredLines.push(line);
        } else if (inBlock && blockType === 'variables') {
          // Include all lines inside :root block
          filteredLines.push(line);
          if (prevBraceCount > 0 && braceCount === 0) {
            inBlock = false;
            blockType = '';
          }
        } else if (trimmed.startsWith('--') && !inBlock) {
          // Standalone CSS variables (not in :root)
          filteredLines.push(line);
        }
      }
    }
    
    return filteredLines.length > 0 ? filteredLines.join('\n') : '';
  };

  // Render Edit Mode
  if (isEditMode && isOwned) {
    return (
      <div className="game-promo-page promo-edit-mode">
        <div className="promo-edit-container">
          {/* Main Content Area */}
          <div className={`promo-edit-content ${isEditMode ? 'sidebar-open' : ''} code-layout-${codeLayoutMode}`}>
            {/* Preview Area - Always visible when there's content, takes full available space */}
            {(promoHTML || promoCSS || promoJS) && (
              <div 
                className={`promo-preview-wrapper ${isResizing ? 'resizing' : ''}`}
                ref={previewRef}
                style={{ 
                  height: showCustomCode && codeLayoutMode === 'bottom' ? `${previewHeight}px` : '100%', 
                  flex: showCustomCode && codeLayoutMode === 'bottom' ? 'none' : (showCustomCode && (codeLayoutMode === 'left' || codeLayoutMode === 'right') ? '0 0 auto' : '1'),
                  width: showCustomCode && (codeLayoutMode === 'left' || codeLayoutMode === 'right') ? `${previewWidth}px` : '100%'
                }}
              >
                {showPreviewLabels && (
                  <>
                    <div className="promo-preview-label promo-preview-label-top-left">Preview</div>
                    <div className="promo-preview-label promo-preview-label-top-right">Preview</div>
                    <div className="promo-preview-label promo-preview-label-bottom-left">Preview</div>
                    <div className="promo-preview-label promo-preview-label-bottom-right">Preview</div>
                  </>
                )}
                <div 
                  className={`promo-preview-content ${isResizing ? 'resizing' : ''}`}
                  dangerouslySetInnerHTML={{ 
                    __html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <style>${promoCSS}</style>
                        <style>
                          [data-prebuilt-item] {
                            position: relative !important;
                          }
                          .prebuilt-item-remove-btn {
                            position: absolute !important;
                            top: 8px !important;
                            right: 8px !important;
                            width: 28px !important;
                            height: 28px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            background: rgba(255, 77, 77, 0.9) !important;
                            border: 2px solid rgba(255, 255, 255, 0.3) !important;
                            border-radius: 6px !important;
                            color: #ffffff !important;
                            cursor: pointer !important;
                            font-size: 20px !important;
                            font-weight: bold !important;
                            line-height: 1 !important;
                            padding: 0 !important;
                            z-index: 1000 !important;
                            transition: 'none';
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
                          }
                          .prebuilt-item-remove-btn:hover {
                            background: rgba(255, 77, 77, 1) !important;
                            transform: scale(1.1) !important;
                            box-shadow: 0 4px 12px rgba(255, 77, 77, 0.5) !important;
                          }
                          .prebuilt-item-remove-btn:active {
                            transform: scale(0.95) !important;
                          }
                        </style>
                      </head>
                      <body>
                        ${processPreviewHTML(promoHTML)}
                        <script>${promoJS}</script>
                      </body>
                      </html>
                    `
                  }}
                />
              </div>
            )}

            {/* Resize Handle - Positioned between preview and code editor based on layout mode */}
            {showCustomCode && (promoHTML || promoCSS || promoJS) && (
              <>
                {codeLayoutMode === 'bottom' && (
                  <div 
                    className="promo-resize-handle promo-resize-handle-bottom"
                    onMouseDown={handleResizeStart}
                  />
                )}
                {codeLayoutMode === 'left' && (
                  <div 
                    className="promo-resize-handle promo-resize-handle-left"
                    onMouseDown={handleResizeStart}
                  />
                )}
                {codeLayoutMode === 'right' && (
                  <div 
                    className="promo-resize-handle promo-resize-handle-right"
                    onMouseDown={handleResizeStart}
                  />
                )}
              </>
            )}

            {/* Placeholder or Code Editor */}
            {!promoHTML && !promoCSS && !promoJS ? (
              <div className="promo-edit-placeholder">
                <p>Choose a prebuilt template or add items to start building your promo page</p>
              </div>
            ) : showCustomCode ? (
              <>
                {/* Code Editor with Tabs */}
                <div 
                  className="promo-editor-wrapper" 
                  ref={editorRef}
                  style={{
                    width: codeLayoutMode === 'left' || codeLayoutMode === 'right' ? 'auto' : '100%',
                    flex: codeLayoutMode === 'bottom' ? '1 1 300px' : '1',
                    height: codeLayoutMode === 'bottom' ? 'auto' : '100%',
                    minHeight: codeLayoutMode === 'bottom' ? '300px' : '0',
                    minWidth: codeLayoutMode === 'left' || codeLayoutMode === 'right' ? '480px' : '0'
                  }}
                >
                  <div className={`code-section-tabs ${isTabsCompact ? 'compact' : ''}`} ref={editorTabsRef}>
                    <button
                      className={`code-tab code-tab-html ${activeTab === 'html' ? 'active html-active' : ''}`}
                      onClick={() => setActiveTab('html')}
                      title="HTML"
                    >
                      <FileCode size={14} />
                      {!isTabsCompact && <span>HTML</span>}
                    </button>
                    <button
                      className={`code-tab code-tab-css ${activeTab === 'css' ? 'active css-active' : ''}`}
                      onClick={() => setActiveTab('css')}
                      title="CSS"
                    >
                      <Paintbrush size={14} />
                      {!isTabsCompact && <span>CSS</span>}
                    </button>
                    <button
                      className={`code-tab code-tab-js ${activeTab === 'js' ? 'active js-active' : ''}`}
                      onClick={() => setActiveTab('js')}
                      title="JavaScript"
                    >
                      <Brackets size={14} />
                      {!isTabsCompact && <span>JavaScript</span>}
                    </button>
                    
                    <div className="code-layout-controls">
                      <button
                        className={`layout-btn ${codeLayoutMode === 'right' ? 'active' : ''}`}
                        onClick={() => setCodeLayoutMode('right')}
                        title="Code on right side"
                      >
                        <PanelRightClose size={18} />
                      </button>
                      <button
                        className={`layout-btn ${codeLayoutMode === 'bottom' ? 'active' : ''}`}
                        onClick={() => setCodeLayoutMode('bottom')}
                        title="Code below preview"
                      >
                        <Rows size={18} />
                      </button>
                      <button
                        className={`layout-btn ${codeLayoutMode === 'left' ? 'active' : ''}`}
                        onClick={() => setCodeLayoutMode('left')}
                        title="Code on left side"
                      >
                        <PanelLeftClose size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="code-section-content">
                    {activeTab === 'html' && (
                      <CodeEditor
                        value={promoHTML}
                        onChange={(e) => setPromoHTML(e.target.value)}
                        language="html"
                        placeholder="Enter your HTML code here..."
                      />
                    )}

                    {activeTab === 'css' && (
                      <CodeEditor
                        value={cssFilter === 'all' ? promoCSS : getFilteredCSS(promoCSS)}
                        onChange={(e) => {
                          if (cssFilter === 'all') {
                            setPromoCSS(e.target.value);
                          }
                          // When filtering, don't allow editing - user must switch to 'all' first
                        }}
                        language="css"
                        placeholder={cssFilter === 'all' ? "Enter your CSS code here..." : "Switch to 'All' filter to edit CSS"}
                        readOnly={cssFilter !== 'all'}
                      />
                    )}

                    {activeTab === 'js' && (
                      <CodeEditor
                        value={promoJS}
                        onChange={(e) => setPromoJS(e.target.value)}
                        language="javascript"
                        placeholder="Enter your JavaScript code here..."
                      />
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className={`promo-edit-sidebar ${isEditMode ? 'open' : ''}`}>
            <div className="sidebar-header">
              <h3>Options</h3>
            </div>

            <div className="sidebar-content">
              {/* Preview Labels Toggle */}
              {(promoHTML || promoCSS || promoJS) && (
                <div className="preview-labels-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={showPreviewLabels}
                      onChange={(e) => setShowPreviewLabels(e.target.checked)}
                    />
                    <span>Show Preview Labels</span>
                  </label>
                </div>
              )}

              {(promoHTML || promoCSS || promoJS) && <div className="sidebar-divider" />}

              {/* Prebuilt Templates */}
              <div className="prebuilt-templates">
                <div className="prebuilt-templates-header" onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}>
                  <h4>Prebuilt Templates</h4>
                  {isTemplatesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                
                {isTemplatesExpanded && (
                  <div className="template-grid">
                    <button className="template-square-btn template-minimal" onClick={() => handleLoadPrebuiltTemplate('minimal')}>
                      <Minimize2 size={20} />
                      <span className="template-square-name">Minimal</span>
                    </button>

                    <button className="template-square-btn template-modern" onClick={() => handleLoadPrebuiltTemplate('modern')}>
                      <Sparkles size={20} />
                      <span className="template-square-name">Modern</span>
                    </button>

                    <button className="template-square-btn template-gaming" onClick={() => handleLoadPrebuiltTemplate('gaming')}>
                      <Play size={20} />
                      <span className="template-square-name">Gaming</span>
                    </button>

                    <button className="template-square-btn template-fps" onClick={() => handleLoadPrebuiltTemplate('fps')}>
                      <Target size={20} />
                      <span className="template-square-name">FPS</span>
                    </button>

                    <button className="template-square-btn template-rpg" onClick={() => handleLoadPrebuiltTemplate('rpg')}>
                      <Sword size={20} />
                      <span className="template-square-name">RPG</span>
                    </button>

                    <button className="template-square-btn template-strategy" onClick={() => handleLoadPrebuiltTemplate('strategy')}>
                      <Shield size={20} />
                      <span className="template-square-name">Strategy</span>
                    </button>

                    <button className="template-square-btn template-competitive" onClick={() => handleLoadPrebuiltTemplate('competitive')}>
                      <Trophy size={20} />
                      <span className="template-square-name">Competitive</span>
                    </button>

                    <button className="template-square-btn template-adventure" onClick={() => handleLoadPrebuiltTemplate('adventure')}>
                      <Mountain size={20} />
                      <span className="template-square-name">Adventure</span>
                    </button>

                    <button className="template-square-btn template-indie" onClick={() => handleLoadPrebuiltTemplate('indie')}>
                      <Heart size={20} />
                      <span className="template-square-name">Indie</span>
                    </button>

                    <button className="template-square-btn template-horror" onClick={() => handleLoadPrebuiltTemplate('horror')}>
                      <Skull size={20} />
                      <span className="template-square-name">Horror</span>
                    </button>

                    <button className="template-square-btn template-sports" onClick={() => handleLoadPrebuiltTemplate('sports')}>
                      <Activity size={20} />
                      <span className="template-square-name">Sports</span>
                    </button>

                    <button className="template-square-btn template-dank" onClick={() => handleLoadPrebuiltTemplate('dank')}>
                      <Laugh size={20} />
                      <span className="template-square-name">Dank</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="sidebar-divider" />

              {/* Pre-built Items */}
              <div className="prebuilt-items">
                <h4>Pre-built Items</h4>
                
                <button 
                  className={`prebuilt-item-btn ${isPrebuiltItemAdded('header') ? 'added' : ''}`}
                  onClick={() => handleAddPrebuilt('header')}
                >
                  <Layout size={20} />
                  <span>Header</span>
                </button>

                <button 
                  className={`prebuilt-item-btn ${isPrebuiltItemAdded('stats') ? 'added' : ''}`}
                  onClick={() => handleAddPrebuilt('stats')}
                >
                  <BarChart3 size={20} />
                  <span>Stats</span>
                </button>

                <button 
                  className={`prebuilt-item-btn ${isPrebuiltItemAdded('gallery') ? 'added' : ''}`}
                  onClick={() => handleAddPrebuilt('gallery')}
                >
                  <Image size={20} />
                  <span>Gallery</span>
                </button>

                <button 
                  className={`prebuilt-item-btn ${isPrebuiltItemAdded('description') ? 'added' : ''}`}
                  onClick={() => handleAddPrebuilt('description')}
                >
                  <List size={20} />
                  <span>Description</span>
                </button>
              </div>
            </div>

            {/* Sidebar Footer with Save/Cancel buttons */}
            <div className="sidebar-footer">
              {(promoHTML || promoCSS || promoJS) && (
                <button 
                  className="promo-custom-code-toggle-btn" 
                  onClick={() => setShowCustomCode(!showCustomCode)}
                  title={showCustomCode ? 'Hide Code' : 'Show Code'}
                >
                  <span className="code-symbol">&lt;/&gt;</span>
                  <span className="code-btn-text">{showCustomCode ? 'exit code view' : 'add custom design to current'}</span>
                </button>
              )}
              <div className="button-row">
                <button className="cancel-promo-btn" onClick={handleCancel}>
                  <X size={18} />
                </button>
                <button className="save-promo-btn" onClick={handleSave}>
                  <Save size={16} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render View Mode - Show custom code if available, otherwise show default promo
  const hasCustomPromo = promoHTML || promoCSS || promoJS;

  return (
    <div className="game-promo-page">
      {hasCustomPromo ? (
        // Custom Promo Page
        <div className="promo-custom-content-wrapper">
          {isOwned && (
            <button className="promo-edit-mode-btn" onClick={() => setIsEditMode(true)}>
              <Edit2 size={18} />
              Edit Promo Page
            </button>
          )}
          <div 
            className="promo-custom-content"
            dangerouslySetInnerHTML={{ 
              __html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>${promoCSS}</style>
                </head>
                <body>
                  ${promoHTML}
                  <script>${promoJS}</script>
                </body>
                </html>
              `
            }}
          />
        </div>
      ) : (
        // Default Promo Page (existing code)
        <>
          {/* Hero Section */}
          <div className="promo-hero">
            <div 
              className="promo-hero-background"
              style={game.image ? {
                backgroundImage: `url(${getImageUrl(game.image)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              } : undefined}
            >
              {!game.image && <div className="promo-hero-placeholder">🎮</div>}
            </div>
            <div className="promo-hero-overlay"></div>
            
            <button className="promo-back-btn" onClick={() => navigate('/store')}>
              <ArrowLeft size={20} />
              Back to Store
            </button>

            {isOwned && (
              <button className="promo-edit-mode-btn" onClick={() => setIsEditMode(true)}>
                <Edit2 size={18} />
                Edit Promo Page
              </button>
            )}

            <div className="promo-hero-content">
              <div className="promo-hero-badges">
                <div className="promo-badge">FEATURED</div>
                {isNewRelease(game) && (
                  <div className="promo-badge promo-badge-new">NEW</div>
                )}
                {isOwned && (
                  <div className="promo-badge promo-badge-owned">
                    <CheckCircle2 size={14} />
                    <span>OWNED</span>
                  </div>
                )}
              </div>

              <h1 className="promo-hero-title">{game.name}</h1>

              <div className="promo-hero-stats">
                <div 
                  className="promo-hero-stat"
                  style={{ color: getColorForRating(stats.rating) }}
                >
                  <Star size={22} fill={getColorForRating(stats.rating)} color={getColorForRating(stats.rating)} />
                  <span>{stats.rating || '0'}</span>
                </div>
                <div className="promo-hero-stat">
                  <Users size={22} />
                  <span>{stats.players || '0'}</span>
                </div>
                <div className={`promo-hero-stat ${!getTrendingDisplay(stats.trending).isPositive ? 'negative' : ''}`}>
                  {React.createElement(getTrendingIcon(stats.trending), { size: 22 })}
                  <span>{getTrendingDisplay(stats.trending).value}</span>
                </div>
              </div>

              <p className="promo-hero-description">{game.description || 'No description available.'}</p>

              <div className="promo-hero-tags">
                {game.tags && game.tags.length > 0 ? (
                  game.tags.map(tag => (
                    <span key={tag} className="promo-tag">{tag}</span>
                  ))
                ) : (
                  <span className="promo-tag">Game</span>
                )}
              </div>

              <div className="promo-hero-actions">
                {isOwned ? (
                  <button className="promo-hero-btn promo-hero-btn-primary" onClick={() => navigate(`/game/${gameId}`)}>
                    <Play size={24} />
                    Play Now
                  </button>
                ) : (
                  <button className={`promo-hero-btn promo-hero-btn-primary ${getPriceValue(game) > 0 ? 'promo-hero-btn-buy' : ''}`}>
                    <Play size={24} />
                    {getPriceValue(game) === 0 ? 'Play Free' : `Buy for ${displayPrice(game)}`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Media Showcase Section */}
          {media.length > 0 && (
            <div className="promo-media-section">
              <div className="promo-section-header">
                <h2>Media Showcase</h2>
                <p>Explore screenshots and trailers</p>
              </div>
              
              <div 
                className="promo-media-showcase"
                onMouseEnter={() => setIsMediaSlideshowHovered(true)}
                onMouseLeave={() => setIsMediaSlideshowHovered(false)}
              >
                <div className="promo-media-main">
                  {media.map((mediaItem, idx) => {
                    const isActive = idx === currentMediaIndex;
                    const mediaUrl = typeof mediaItem === 'string' ? getImageUrl(mediaItem) : getImageUrl(mediaItem.src || mediaItem.url);
                    const mediaType = typeof mediaItem === 'string' ? 'image' : (mediaItem.type || 'image');
                    
                    return (
                      <div key={idx} className={`promo-media-main-item ${isActive ? 'active' : ''}`}>
                        {mediaType === 'video' ? (
                          <>
                            <video
                              ref={el => { if (el) mediaVideoRefs.current[idx] = el; }}
                              src={mediaUrl}
                              muted={isMediaMuted}
                              loop
                              playsInline
                              className="promo-media-main-video"
                            />
                            <button
                              className="promo-media-sound-toggle"
                              onClick={() => setIsMediaMuted(!isMediaMuted)}
                            >
                              {isMediaMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                          </>
                        ) : (
                          <img src={mediaUrl} alt={`${game.name} screenshot ${idx + 1}`} className="promo-media-main-image" />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {media.length > 1 && (
                  <>
                    <button
                      className="promo-media-nav promo-media-prev"
                      onClick={() => setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length)}
                    >
                      <ChevronLeft size={28} />
                    </button>
                    <button
                      className="promo-media-nav promo-media-next"
                      onClick={() => setCurrentMediaIndex((prev) => (prev + 1) % media.length)}
                    >
                      <ChevronRight size={28} />
                    </button>
                    <div className="promo-media-thumbnails">
                      {media.map((mediaItem, idx) => {
                        const mediaUrl = typeof mediaItem === 'string' ? getImageUrl(mediaItem) : getImageUrl(mediaItem.src || mediaItem.url);
                        return (
                          <button
                            key={idx}
                            className={`promo-media-thumbnail ${idx === currentMediaIndex ? 'active' : ''}`}
                            onClick={() => setCurrentMediaIndex(idx)}
                          >
                            <img src={mediaUrl} alt={`Thumbnail ${idx + 1}`} />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* About Section */}
          <div className="promo-about-section">
            <div className="promo-section-header">
              <h2>About This Game</h2>
            </div>
            <div className="promo-about-content">
              <div className="promo-about-main">
                <p className="promo-about-description">{game.description || 'No description available.'}</p>
                
                {game.developer && (
                  <div className="promo-about-info">
                    <div className="promo-info-item">
                      <strong>Developer:</strong>
                      <span>{game.developer}</span>
                    </div>
                    {game.tags && game.tags.length > 0 && (
                      <div className="promo-info-item">
                        <strong>Genres:</strong>
                        <div className="promo-info-tags">
                          {game.tags.map(tag => (
                            <span key={tag} className="promo-info-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="promo-about-sidebar">
                <div className="promo-features-card">
                  <h3>Game Features</h3>
                  <ul className="promo-features-list">
                    <li>Immersive Gameplay</li>
                    <li>High-Quality Graphics</li>
                    <li>Regular Updates</li>
                    <li>Community Support</li>
                  </ul>
                </div>
                
                <div className="promo-stats-card">
                  <h3>Live Stats</h3>
                  <div className="promo-stats-grid">
                    <div className="promo-stat-item">
                      <Star size={18} fill={getColorForRating(stats.rating)} color={getColorForRating(stats.rating)} />
                      <div>
                        <div className="promo-stat-label">Rating</div>
                        <div className="promo-stat-value" style={{ color: getColorForRating(stats.rating) }}>{stats.rating || '0'}</div>
                      </div>
                    </div>
                    <div className="promo-stat-item">
                      <Users size={18} />
                      <div>
                        <div className="promo-stat-label">Players</div>
                        <div className="promo-stat-value">{stats.players || '0'}</div>
                      </div>
                    </div>
                    <div className="promo-stat-item">
                      {React.createElement(getTrendingIcon(stats.trending), { size: 18 })}
                      <div>
                        <div className="promo-stat-label">Trending</div>
                        <div className={`promo-stat-value ${!getTrendingDisplay(stats.trending).isPositive ? 'negative' : ''}`}>
                          {getTrendingDisplay(stats.trending).value}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GamePromo;
