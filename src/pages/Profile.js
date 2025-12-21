import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Edit2, X, Plus, Layout, BarChart3, Image, List, Code, Save, Terminal, Bug, FileText, AlertCircle, Package, Settings, History, Award, ShoppingBag, Heart, ChevronDown, ChevronUp, Minimize2, Sparkles, Target, Sword, Shield, Trophy, Mountain, Skull, Activity, Laugh, FileCode, Paintbrush, Brackets, Search, Filter, Grid, Eye, EyeOff } from 'lucide-react';
import { getUserData, saveUserData, getAllUsersData } from '../utils/UserDataManager';
import CodeEditor from '../components/CodeEditor';
import './Profile.css';
import './GamePromo.css';
import './Market.css';

const Profile = ({ navigate }) => {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const u = localStorage.getItem('authUser');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showCustomCode, setShowCustomCode] = useState(false);
  const [profileHTML, setProfileHTML] = useState(() => {
    try {
      return getUserData('profileHTML', '');
    } catch (_) {
      return '';
    }
  });
  const [profileCSS, setProfileCSS] = useState(() => {
    try {
      return getUserData('profileCSS', '');
    } catch (_) {
      return '';
    }
  });
  const [profileJS, setProfileJS] = useState(() => {
    try {
      return getUserData('profileJS', '');
    } catch (_) {
      return '';
    }
  });
  const [previewHeight, setPreviewHeight] = useState(() => {
    try {
      const saved = getUserData('profilePreviewHeight', null);
      return saved !== null ? saved : 400;
    } catch (_) {
      return 400;
    }
  });
  const [previewWidth, setPreviewWidth] = useState(() => {
    try {
      const saved = getUserData('profilePreviewWidth', null);
      return saved !== null ? saved : 700;
    } catch (_) {
      return 700;
    }
  });

  // Right sidebar resizing state
  const [profileRightSidebarWidth, setProfileRightSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('profileRightSidebarWidth');
      return saved ? parseInt(saved, 10) : 260;
    } catch (_) {
      return 260;
    }
  });
  const [isRightSidebarResizing, setIsRightSidebarResizing] = useState(false);
  const rightSidebarResizeRef = useRef(null);

  const [showPreviewLabels, setShowPreviewLabels] = useState(() => {
    try {
      const saved = getUserData('profilePreviewLabels', null);
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const [codeLayoutMode, setCodeLayoutMode] = useState(() => {
    try {
      return getUserData('profileCodeLayout', 'bottom');
    } catch (_) {
      return 'bottom';
    }
  });
  const [isTabsCompact, setIsTabsCompact] = useState(false);
  const editorTabsRef = useRef(null);
  const [activeTab, setActiveTab] = useState('html');
  const [searchQuery, setSearchQuery] = useState('');
  const [cssFilter, setCssFilter] = useState('all');
  const [debugConsole, setDebugConsole] = useState([]);
  const [output, setOutput] = useState([]);
  const [terminal, setTerminal] = useState([]);
  const [problems, setProblems] = useState([]);
  const [profileView, setProfileView] = useState('overview');
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [inventoryViewMode, setInventoryViewMode] = useState('grid');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [inventoryRarityFilter, setInventoryRarityFilter] = useState('all');
  const [inventoryGameFilter, setInventoryGameFilter] = useState('all');

  const previewRef = useRef(null);
  const editorRef = useRef(null);
  const isResizingRef = useRef(false);
  const editContentRef = useRef(null);

  useEffect(() => {
    const handleUserChange = () => {
      try {
        const u = localStorage.getItem('authUser');
        setAuthUser(u ? JSON.parse(u) : null);
        setProfileHTML(getUserData('profileHTML', ''));
        setProfileCSS(getUserData('profileCSS', ''));
        setProfileJS(getUserData('profileJS', ''));
      } catch (_) {}
    };

    window.addEventListener('user-changed', handleUserChange);
    return () => window.removeEventListener('user-changed', handleUserChange);
  }, []);

  useEffect(() => {
    saveUserData('profileHTML', profileHTML);
  }, [profileHTML]);

  useEffect(() => {
    saveUserData('profileCSS', profileCSS);
  }, [profileCSS]);

  useEffect(() => {
    saveUserData('profileJS', profileJS);
  }, [profileJS]);

  useEffect(() => {
    saveUserData('profilePreviewHeight', previewHeight);
  }, [previewHeight]);

  useEffect(() => {
    saveUserData('profilePreviewWidth', previewWidth);
  }, [previewWidth]);

  useEffect(() => {
    saveUserData('profilePreviewLabels', showPreviewLabels.toString());
  }, [showPreviewLabels]);

  useEffect(() => {
    saveUserData('profileCodeLayout', codeLayoutMode);
  }, [codeLayoutMode]);

  // Set showCustomCode to true when entering edit mode and initialize preview height to half
  useEffect(() => {
    if (isEditMode) {
      setShowCustomCode(true);
      // Calculate half height of the container
      const calculateHalfHeight = () => {
        if (editContentRef.current) {
          const containerHeight = editContentRef.current.offsetHeight;
          const halfHeight = Math.floor(containerHeight / 2);
          // Always set to half when entering edit mode (will be saved if user resizes)
          setPreviewHeight(halfHeight);
        }
      };
      // Calculate after a short delay to ensure container is rendered
      const timeout = setTimeout(calculateHalfHeight, 100);
      const timeout2 = setTimeout(calculateHalfHeight, 300);
      return () => {
        clearTimeout(timeout);
        clearTimeout(timeout2);
      };
    }
  }, [isEditMode]);

  // Check if tabs should be compact based on editor width
  useEffect(() => {
    if (!editorRef.current || codeLayoutMode === 'bottom') {
      setIsTabsCompact(false);
      return;
    }
    
    const checkCompact = () => {
      const editorWidth = editorRef.current?.offsetWidth || 0;
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

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    if (codeLayoutMode === 'bottom') {
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
        const codeEditorMinWidth = 480;
        const previewMaxWidth = containerWidth - codeEditorMinWidth;
        
        let deltaX;
        if (codeLayoutMode === 'left') {
          deltaX = e.clientX - startX;
        } else {
          deltaX = startX - e.clientX;
        }
        
        const maxWidth = Math.max(400, previewMaxWidth);
        const minWidth = Math.max(400, containerWidth * 0.25);
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

  // Right sidebar resize handlers
  const handleRightSidebarResizeStart = (e) => {
    setIsRightSidebarResizing(true);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isRightSidebarResizing) return;

    const handleResize = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const windowWidth = window.innerWidth;
      const clientX = e.clientX !== undefined ? e.clientX : windowWidth;
      const newWidth = windowWidth - clientX;
      const minWidth = 200;
      const maxWidth = 250;
      
      // Clamp to boundaries
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setProfileRightSidebarWidth(clampedWidth);
    };

    const handleResizeEnd = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsRightSidebarResizing(false);
      // Save to localStorage only at the end
      try {
        localStorage.setItem('profileRightSidebarWidth', profileRightSidebarWidth.toString());
      } catch (_) {}
    };

    const handleMouseLeave = () => {
      // When mouse leaves window, clamp to boundaries
      const minWidth = 200;
      const maxWidth = 250;
      const currentWidth = profileRightSidebarWidth;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, currentWidth));
      if (clampedWidth !== currentWidth) {
        setProfileRightSidebarWidth(clampedWidth);
      }
    };

    // Use capture phase to ensure we catch events even outside the window
    document.addEventListener('mousemove', handleResize, true);
    document.addEventListener('mouseup', handleResizeEnd, true);
    window.addEventListener('mouseup', handleResizeEnd, true);
    window.addEventListener('mouseleave', handleMouseLeave);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleResize, true);
      document.removeEventListener('mouseup', handleResizeEnd, true);
      window.removeEventListener('mouseup', handleResizeEnd, true);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isRightSidebarResizing, profileRightSidebarWidth]);

  // Get prebuilt items definition
  const getPrebuiltItems = () => ({
      header: {
      html: '<div class="promo-header">\n  <h1>Profile Header</h1>\n  <p class="promo-subtitle">Welcome to my profile</p>\n</div>\n',
      css: '.promo-header {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  padding: 60px 40px;\n  text-align: center;\n  color: #ffffff;\n  border-radius: 12px;\n  margin-bottom: 30px;\n}\n\n.promo-header h1 {\n  font-size: 48px;\n  font-weight: 900;\n  margin: 0 0 16px 0;\n}\n\n.promo-header .promo-subtitle {\n  font-size: 20px;\n  margin: 0;\n  opacity: 0.9;\n}\n',
      cssSelector: '.promo-header',
        js: ''
      },
      stats: {
      html: '<div class="promo-stats-section">\n  <div class="stat-card">\n    <span class="stat-label">STAT LABEL</span>\n    <span class="stat-value">0</span>\n  </div>\n  <div class="stat-card">\n    <span class="stat-label">ANOTHER STAT</span>\n    <span class="stat-value">0</span>\n  </div>\n</div>\n',
      css: '.promo-stats-section {\n  display: flex;\n  gap: 20px;\n  margin-bottom: 30px;\n}\n\n.promo-stats-section .stat-card {\n  flex: 1;\n  background: rgba(255, 255, 255, 0.1);\n  padding: 24px;\n  border-radius: 12px;\n  backdrop-filter: blur(10px);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n.promo-stats-section .stat-label {\n  display: block;\n  font-size: 14px;\n  color: rgba(255, 255, 255, 0.7);\n  margin-bottom: 8px;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n}\n\n.promo-stats-section .stat-value {\n  display: block;\n  font-size: 32px;\n  font-weight: 700;\n  color: #ffffff;\n}\n',
      cssSelector: '.promo-stats-section',
        js: ''
      },
      gallery: {
      html: '<div class="promo-gallery">\n  <h2 class="gallery-title">Gallery</h2>\n  <div class="gallery-grid">\n    <div class="gallery-item">\n      <div class="gallery-placeholder">Screenshot 1</div>\n    </div>\n    <div class="gallery-item">\n      <div class="gallery-placeholder">Screenshot 2</div>\n    </div>\n    <div class="gallery-item">\n      <div class="gallery-placeholder">Screenshot 3</div>\n    </div>\n  </div>\n</div>\n',
      css: '.promo-gallery {\n  margin-bottom: 30px;\n}\n\n.promo-gallery .gallery-title {\n  font-size: 32px;\n  font-weight: 800;\n  margin: 0 0 24px 0;\n  color: #ffffff;\n}\n\n.promo-gallery .gallery-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));\n  gap: 20px;\n}\n\n.promo-gallery .gallery-item {\n  aspect-ratio: 16/9;\n  border-radius: 12px;\n  overflow: hidden;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n.promo-gallery .gallery-placeholder {\n  width: 100%;\n  height: 100%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: rgba(255, 255, 255, 0.5);\n  font-size: 16px;\n}\n',
      cssSelector: '.promo-gallery',
        js: ''
      },
    description: {
      html: '<div class="promo-description-section">\n  <h2>About Me</h2>\n  <p>Write a compelling description about yourself here. Tell people what makes you special, what you enjoy, and why they should connect with you.</p>\n  <p>You can add multiple paragraphs to provide more details and create an engaging narrative.</p>\n</div>\n',
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
    
    // Ensure profileHTML is a string
    const htmlString = typeof profileHTML === 'string' ? profileHTML : String(profileHTML || '');
    
    const selectorWithoutDot = item.cssSelector.replace('.', '');
    return htmlString.includes(`class="${selectorWithoutDot}"`) || htmlString.includes(`class="${item.cssSelector.replace('.', '')}"`);
  };

  // Process HTML to add X buttons to prebuilt items in edit mode
  const processPreviewHTML = (html) => {
    if (!isEditMode || !html) return html;
    
    const prebuiltItems = getPrebuiltItems();
    let processedHTML = html;
    
    Object.keys(prebuiltItems).forEach(type => {
      const item = prebuiltItems[type];
      if (!item || !item.cssSelector) return;
      
      const selectorWithoutDot = item.cssSelector.replace('.', '');
      const classPattern = `class=["'][^"']*${selectorWithoutDot}[^"']*["']`;
      const openingTagRegex = new RegExp(`(<div[^>]*${classPattern}[^>]*>)`, 'gi');
      
      let lastIndex = 0;
      const matches = [];
      let match;
      
      while ((match = openingTagRegex.exec(processedHTML)) !== null) {
        matches.push({
          index: match.index,
          match: match[0],
          openingTag: match[1]
        });
      }
      
      for (let i = matches.length - 1; i >= 0; i--) {
        const { index, match: fullMatch, openingTag } = matches[i];
        
        if (fullMatch.includes('prebuilt-item-remove-btn')) {
          continue;
        }
        
        const dataAttr = `data-prebuilt-item="${type}"`;
        const xButton = `<button class="prebuilt-item-remove-btn" data-remove-type="${type}" data-remove-class="${selectorWithoutDot}" title="Remove item">×</button>`;
        
        let modifiedTag = openingTag;
        if (modifiedTag.includes('style=')) {
          modifiedTag = modifiedTag.replace('style=', `${dataAttr} style=`);
        } else {
          modifiedTag = modifiedTag.replace('>', ` ${dataAttr}>`);
        }
        
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
        handleRemovePrebuilt(type, { target: { closest: () => removeBtn } });
      }
    };
    
    const previewContent = previewRef.current?.querySelector('.promo-preview-content');
    if (previewContent) {
      previewContent.addEventListener('click', handleRemoveClick);
      return () => {
        previewContent.removeEventListener('click', handleRemoveClick);
      };
    }
  }, [isEditMode, profileHTML, profileCSS]);

  const handleRemovePrebuilt = (type, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    const removeBtn = e?.target?.closest?.('.prebuilt-item-remove-btn');
    const removeClass = removeBtn?.getAttribute('data-remove-class');
    
    if (removeClass) {
      const selectorWithoutDot = removeClass.split(/\s+/)[0].replace(/^\./, '');
      let newHTML = profileHTML;
      
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
      
      const remainingInstances = (newHTML.match(new RegExp(classPattern, 'gi')) || []).length;
      
      let newCSS = profileCSS;
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
      
      setProfileHTML(newHTML);
      setProfileCSS(newCSS);
      return;
    }
  };

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
        if (trimmed.startsWith('--') || trimmed.includes(':root') || trimmed.includes('--')) {
          filteredLines.push(line);
        }
      }
    }
    
    return filteredLines.length > 0 ? filteredLines.join('\n') : '';
  };

  const userName = authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'Player';

  // Get all inventory items from all games
  const getAllInventoryItems = () => {
    try {
      const allItems = [];
      
      // Get all games from all users
      const allGames = getAllUsersData('customGames');
      
      // Create a map of gameId to game name
      const gameMap = {};
      allGames.forEach(game => {
        const gameId = game.gameId || game.id;
        if (gameId) {
          gameMap[gameId] = game.name || game.gameName || gameId;
        }
      });
      
      // Get inventory for each game
      Object.keys(gameMap).forEach(gameId => {
        const inventory = getUserData(`inventory_${gameId}`, []);
        if (inventory && Array.isArray(inventory) && inventory.length > 0) {
          inventory.forEach(item => {
            allItems.push({
              ...item,
              gameId,
              gameName: gameMap[gameId]
            });
          });
        }
      });
      
      // Also check localStorage directly for any inventory_ keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('inventory_')) {
          const gameId = key.replace('inventory_', '');
          if (!gameMap[gameId]) {
            // Game not in customGames, use gameId as name
            gameMap[gameId] = gameId;
          }
          try {
            const inventory = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(inventory) && inventory.length > 0) {
              inventory.forEach(item => {
                // Check if item already added
                const exists = allItems.some(existing => 
                  existing.gameId === gameId && existing.id === item.id
                );
                if (!exists) {
                  allItems.push({
                    ...item,
                    gameId,
                    gameName: gameMap[gameId]
                  });
                }
              });
            }
          } catch (_) {
            // Skip invalid inventory data
          }
        }
      }
      
      return allItems;
    } catch (_) {
      return [];
    }
  };

  const [inventoryRefresh, setInventoryRefresh] = useState(0);
  
  useEffect(() => {
    const handleStorageChange = () => {
      setInventoryRefresh(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-changed', handleStorageChange);
    };
  }, []);

  const allInventoryItems = useMemo(() => getAllInventoryItems(), [authUser, inventoryRefresh]);

  // Get unique games from inventory
  const inventoryGames = useMemo(() => {
    const games = new Set();
    allInventoryItems.forEach(item => {
      if (item.gameId && item.gameName) {
        games.add(JSON.stringify({ id: item.gameId, name: item.gameName }));
      }
    });
    return Array.from(games).map(g => JSON.parse(g));
  }, [allInventoryItems]);

  // Filter and sort inventory items
  const filteredInventoryItems = useMemo(() => {
    let filtered = [...allInventoryItems];

    // Search filter
    if (inventorySearch) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(inventorySearch.toLowerCase())
      );
    }

    // Game filter
    if (inventoryGameFilter !== 'all') {
      filtered = filtered.filter(item => item.gameId === inventoryGameFilter);
    }

    // Rarity filter
    if (inventoryRarityFilter !== 'all') {
      filtered = filtered.filter(item =>
        item.rarity?.toLowerCase() === inventoryRarityFilter.toLowerCase()
      );
    }

    return filtered;
  }, [allInventoryItems, inventorySearch, inventoryGameFilter, inventoryRarityFilter]);

  const handleSellItem = (item) => {
    if (navigate && item.gameId) {
      navigate(`/market/${item.gameId}`);
    }
  };

  // Test functions for adding/removing dummy items
  const handleAddDummyItems = () => {
    const dummyItems = [
      {
        id: `dummy-${Date.now()}-1`,
        name: 'Epic Sword',
        description: 'A powerful legendary weapon',
        rarity: 'epic',
        type: 'Weapon',
        image: '⚔️',
        gameId: 'test-game-1',
        gameName: 'Test Game 1'
      },
      {
        id: `dummy-${Date.now()}-2`,
        name: 'Rare Shield',
        description: 'A sturdy defensive item',
        rarity: 'rare',
        type: 'Armor',
        image: '🛡️',
        gameId: 'test-game-1',
        gameName: 'Test Game 1'
      },
      {
        id: `dummy-${Date.now()}-3`,
        name: 'Legendary Potion',
        description: 'Restores health completely',
        rarity: 'legendary',
        type: 'Consumable',
        image: '🧪',
        gameId: 'test-game-2',
        gameName: 'Test Game 2'
      },
      {
        id: `dummy-${Date.now()}-4`,
        name: 'Common Boots',
        description: 'Basic footwear',
        rarity: 'common',
        type: 'Armor',
        image: '👢',
        gameId: 'test-game-2',
        gameName: 'Test Game 2'
      }
    ];

    dummyItems.forEach(item => {
      const inventory = getUserData(`inventory_${item.gameId}`, []);
      inventory.push(item);
      saveUserData(`inventory_${item.gameId}`, inventory);
    });

    // Force re-render
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('user-changed'));
  };

  const handleRemoveDummyItems = () => {
    // Remove all dummy items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('inventory_')) {
        try {
          const inventory = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(inventory)) {
            const filtered = inventory.filter(item => !item.id || !item.id.startsWith('dummy-'));
            if (filtered.length !== inventory.length) {
              saveUserData(key.replace('inventory_', ''), filtered);
            }
          }
        } catch (_) {
          // Skip invalid data
        }
      }
    }

    // Force re-render
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('user-changed'));
  };

  const handleAddPrebuilt = (type) => {
    const prebuiltItems = getPrebuiltItems();
    const item = prebuiltItems[type];
    if (!item) return;

    // Ensure all values are strings
    const htmlString = typeof profileHTML === 'string' ? profileHTML : String(profileHTML || '');
    const cssString = typeof profileCSS === 'string' ? profileCSS : String(profileCSS || '');
    const jsString = typeof profileJS === 'string' ? profileJS : String(profileJS || '');

    const newHTML = htmlString ? htmlString + '\n' + item.html : item.html;
    const cssExists = cssString && item.cssSelector && cssString.includes(item.cssSelector);
    const newCSS = cssExists ? cssString : (cssString ? cssString + '\n' + item.css : item.css);
    const newJS = item.js ? (jsString ? jsString + '\n' + item.js : jsString) : jsString;

    setProfileHTML(newHTML);
    setProfileCSS(newCSS);
    setProfileJS(newJS);
  };

  const handleSave = () => {
    saveUserData('profileHTML', profileHTML);
    saveUserData('profileCSS', profileCSS);
    saveUserData('profileJS', profileJS);
    saveUserData('profilePreviewHeight', previewHeight.toString());
    saveUserData('profilePreviewWidth', previewWidth.toString());
    saveUserData('profilePreviewLabels', showPreviewLabels.toString());
    saveUserData('profileCodeLayout', codeLayoutMode);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setProfileHTML(getUserData('profileHTML', ''));
    setProfileCSS(getUserData('profileCSS', ''));
    setProfileJS(getUserData('profileJS', ''));
    const savedHeight = getUserData('profilePreviewHeight', null);
    if (savedHeight !== null) setPreviewHeight(savedHeight);
    const savedWidth = getUserData('profilePreviewWidth', null);
    if (savedWidth !== null) setPreviewWidth(savedWidth);
    const savedLabels = getUserData('profilePreviewLabels', null);
    if (savedLabels !== null) setShowPreviewLabels(savedLabels === 'true');
    const savedLayout = getUserData('profileCodeLayout', null);
    if (savedLayout) setCodeLayoutMode(savedLayout);
    setIsEditMode(false);
    setShowCustomCode(false);
  };

  // Render view mode
  if (!isEditMode) {
    return (
      <div className="profile">
        <div className="profile-container">
          <div className="profile-view-mode">
            <div className="profile-main-content">
              <div className="profile-main-content-inner">
                {/* Render content based on selected view */}
                {profileView === 'overview' && (
                  <div className="profile-section">
                    <div className="profile-overview-content">
                      {(profileHTML || profileCSS || profileJS) ? (
                        <div 
                          className="profile-content-preview"
                          dangerouslySetInnerHTML={{ 
                            __html: `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <style>${profileCSS || ''}</style>
                              </head>
                              <body>
                                ${profileHTML}
                                <script>${profileJS}</script>
                              </body>
                              </html>
                            `
                          }}
                        />
                      ) : (
                        <div className="profile-placeholder">
                          <User size={64} />
                          <h2>{userName}</h2>
                          <p>Your custom profile page will appear here</p>
                          <button className="edit-profile-btn" onClick={() => setIsEditMode(true)}>
                            <Edit2 size={16} />
                            Edit Profile
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {profileView === 'inventory' && (
                  <div className="profile-section">
                    <div className="profile-section-header">
                      <h1 className="profile-section-title">Inventory</h1>
                      <div className="inventory-controls">
                        <div className="inventory-search">
                          <Search size={16} />
                          <input
                            type="text"
                            placeholder="Search items..."
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            className="inventory-search-input"
                          />
                        </div>
                        <div className="view-mode-controls">
                          <button
                            className={`view-mode-btn ${inventoryViewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setInventoryViewMode('grid')}
                            title="Grid view"
                          >
                            <Grid size={16} />
                          </button>
                          <button
                            className={`view-mode-btn ${inventoryViewMode === 'row' ? 'active' : ''}`}
                            onClick={() => setInventoryViewMode('row')}
                            title="List view"
                          >
                            <List size={16} />
                          </button>
                        </div>
                        <div className="inventory-test-controls">
                          <button
                            className="test-btn test-add-btn"
                            onClick={handleAddDummyItems}
                            title="Add dummy items"
                          >
                            <Plus size={14} />
                            Add Test Items
                          </button>
                          <button
                            className="test-btn test-remove-btn"
                            onClick={handleRemoveDummyItems}
                            title="Remove dummy items"
                          >
                            <X size={14} />
                            Remove Test Items
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="profile-inventory-content">
                      <div className="inventory-filters">
                        <select
                          className="inventory-filter-select"
                          value={inventoryGameFilter}
                          onChange={(e) => setInventoryGameFilter(e.target.value)}
                        >
                          <option value="all">All Games</option>
                          {inventoryGames.map(game => (
                            <option key={game.id} value={game.id}>{game.name}</option>
                          ))}
                        </select>
                        <select
                          className="inventory-filter-select"
                          value={inventoryRarityFilter}
                          onChange={(e) => setInventoryRarityFilter(e.target.value)}
                        >
                          <option value="all">All Rarities</option>
                          <option value="common">Common</option>
                          <option value="rare">Rare</option>
                          <option value="epic">Epic</option>
                          <option value="legendary">Legendary</option>
                        </select>
                        {filteredInventoryItems.length > 0 && (
                          <div className="inventory-count">{filteredInventoryItems.length} {filteredInventoryItems.length === 1 ? 'item' : 'items'}</div>
                        )}
                      </div>
                      {filteredInventoryItems.length === 0 ? (
                        <div className="profile-empty-state">
                          <Package size={64} />
                          <h2>No items in inventory</h2>
                          <p>{allInventoryItems.length === 0 ? 'Items you own will appear here' : 'No items match your filters'}</p>
                        </div>
                      ) : (
                        <div className={`items-grid ${inventoryViewMode === 'grid' ? 'grid-view' : 'row-view'}`}>
                          {filteredInventoryItems.map((item, index) => (
                            <div key={`${item.gameId}-${item.id || index}`} className="inventory-item-card">
                              <div className="inventory-item-image">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className="inventory-item-icon" style={{ display: item.imageUrl ? 'none' : 'flex' }}>
                                  {item.image || '📦'}
                                </div>
                                <div className={`inventory-rarity-badge rarity-${(item.rarity || 'common').toLowerCase()}`}>
                                  {(item.rarity || 'common').toUpperCase()}
                                </div>
                              </div>
                              {inventoryViewMode === 'row' && (
                                <div className={`inventory-rarity-line-vertical rarity-${(item.rarity || 'common').toLowerCase()}`}></div>
                              )}
                              <div className={`inventory-rarity-line rarity-${(item.rarity || 'common').toLowerCase()}`}></div>
                              <div className="inventory-item-info">
                                <div className="inventory-item-header">
                                  <h3 className="inventory-item-name">{item.name || 'Unnamed Item'}</h3>
                                  {item.gameName && (
                                    <span className="inventory-game-badge">{item.gameName}</span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="inventory-item-description">{item.description}</p>
                                )}
                                <div className="inventory-item-footer">
                                  <span className="inventory-item-type">{item.type || 'Item'}</span>
                                  <button
                                    className="inventory-sell-btn"
                                    onClick={() => handleSellItem(item)}
                                  >
                                    <ShoppingBag size={14} />
                                    Sell
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {profileView === 'purchases' && (
                  <div className="profile-section">
                    <h1 className="profile-section-title">Purchases</h1>
                    <div className="profile-purchases-content">
                      <div className="profile-empty-state">
                        <ShoppingBag size={64} />
                        <h2>No purchases yet</h2>
                        <p>Your purchase history will appear here</p>
                      </div>
                    </div>
                  </div>
                )}

                {profileView === 'favorites' && (
                  <div className="profile-section">
                    <h1 className="profile-section-title">Favorites</h1>
                    <div className="profile-favorites-content">
                      <div className="profile-empty-state">
                        <Heart size={64} />
                        <h2>No favorites yet</h2>
                        <p>Games and items you favorite will appear here</p>
                      </div>
                    </div>
                  </div>
                )}

                {profileView === 'achievements' && (
                  <div className="profile-section">
                    <h1 className="profile-section-title">Achievements</h1>
                    <div className="profile-achievements-content">
                      <div className="profile-empty-state">
                        <Award size={64} />
                        <h2>No achievements yet</h2>
                        <p>Your achievements will appear here</p>
                      </div>
                    </div>
                  </div>
                )}

                {profileView === 'history' && (
                  <div className="profile-section">
                    <h1 className="profile-section-title">History</h1>
                    <div className="profile-history-content">
                      <div className="profile-empty-state">
                        <History size={64} />
                        <h2>No activity history</h2>
                        <p>Your activity history will appear here</p>
                      </div>
                    </div>
                  </div>
                )}

                {profileView === 'settings' && (
                  <div className="profile-section">
                    <h1 className="profile-section-title">Settings</h1>
                    <div className="profile-settings-content">
                      <div className="settings-section">
                        <h3 className="settings-section-title">Profile Settings</h3>
                        <div className="settings-item">
                          <label className="settings-label">Display Name</label>
                          <input 
                            type="text" 
                            className="settings-input" 
                            value={userName}
                            readOnly
                          />
                        </div>
                        <div className="settings-item">
                          <label className="settings-label">Email</label>
                          <input 
                            type="email" 
                            className="settings-input" 
                            value={authUser?.email || ''}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="settings-section">
                        <h3 className="settings-section-title">Preferences</h3>
                        <div className="settings-item">
                          <label className="settings-label">
                            <input type="checkbox" className="settings-checkbox" />
                            <span>Enable notifications</span>
                          </label>
                        </div>
                        <div className="settings-item">
                          <label className="settings-label">
                            <input type="checkbox" className="settings-checkbox" />
                            <span>Show online status</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>

            {/* Right Sidebar Navigation - Inside Content */}
            <div className="profile-content-right">
              {/* Right Sidebar Resizer */}
              <div 
                ref={rightSidebarResizeRef}
                className={`sidebar-resizer ${isRightSidebarResizing ? 'resizing' : ''}`}
                onMouseDown={handleRightSidebarResizeStart}
              />

              {/* Right Sidebar Navigation */}
              <aside 
                className={`marketplace-sidebar ${isRightSidebarResizing ? 'resizing' : ''}`}
                style={{ width: profileRightSidebarWidth }}
              >
              <div className="sidebar-title">Profile</div>
              {profileView === 'overview' && (
                <div className="sidebar-edit-button">
                  <button className="edit-profile-btn" onClick={() => setIsEditMode(true)}>
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                </div>
              )}
              <nav className="sidebar-nav">
                {/* Main Section */}
                <div className="sidebar-nav-section sidebar-nav-main">
                  <button 
                    className={`sidebar-nav-item sidebar-nav-main-item ${profileView === 'overview' ? 'active' : ''}`}
                    onClick={() => setProfileView('overview')}
                  >
                    <User size={20} />
                    <span>Overview</span>
                  </button>
        </div>
                
                <div className="sidebar-nav-section">
                  <h3 className="sidebar-section-title">Profile</h3>
                  <button 
                    className={`sidebar-nav-item ${profileView === 'inventory' ? 'active' : ''}`}
                    onClick={() => setProfileView('inventory')}
                  >
                    <Package size={18} />
                    <span>Inventory</span>
                  </button>
                  <button 
                    className={`sidebar-nav-item ${profileView === 'purchases' ? 'active' : ''}`}
                    onClick={() => setProfileView('purchases')}
                  >
                    <ShoppingBag size={18} />
                    <span>Purchases</span>
                  </button>
                  <button 
                    className={`sidebar-nav-item ${profileView === 'favorites' ? 'active' : ''}`}
                    onClick={() => setProfileView('favorites')}
                  >
                    <Heart size={18} />
                    <span>Favorites</span>
                  </button>
      </div>
                
                <div className="sidebar-nav-section">
                  <h3 className="sidebar-section-title">Activity</h3>
                  <button 
                    className={`sidebar-nav-item ${profileView === 'achievements' ? 'active' : ''}`}
                    onClick={() => setProfileView('achievements')}
                  >
                    <Award size={18} />
                    <span>Achievements</span>
              </button>
                  <button 
                    className={`sidebar-nav-item ${profileView === 'history' ? 'active' : ''}`}
                    onClick={() => setProfileView('history')}
                  >
                    <History size={18} />
                    <span>History</span>
              </button>
          </div>

                <div className="sidebar-nav-section">
                  <h3 className="sidebar-section-title">Settings</h3>
                  <button 
                    className={`sidebar-nav-item ${profileView === 'settings' ? 'active' : ''}`}
                    onClick={() => setProfileView('settings')}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
            </div>
              </nav>
              </aside>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render edit mode
  return (
    <div className="game-promo-page promo-edit-mode">
      <div className="promo-edit-container">
        {/* Main Content Area */}
        <div 
          ref={editContentRef}
          className={`promo-edit-content ${isEditMode ? 'sidebar-open' : ''} code-layout-${codeLayoutMode}`}
        >
          {/* Preview Area - Always visible in edit mode, takes full available space */}
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
                        <style>${profileCSS || ''}</style>
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
                      ${processPreviewHTML(profileHTML || '')}
                        <script>${profileJS || ''}</script>
                      </body>
                      </html>
                    `
                  }}
                />
          </div>

          {/* Resize Handle - Positioned between preview and code editor based on layout mode */}
          {showCustomCode && codeLayoutMode === 'bottom' && (
            <div 
              className="promo-resize-handle promo-resize-handle-bottom"
              onMouseDown={handleResizeStart}
            />
          )}
          {showCustomCode && codeLayoutMode === 'left' && (
            <div 
              className="promo-resize-handle promo-resize-handle-left"
              onMouseDown={handleResizeStart}
            />
          )}
          {showCustomCode && codeLayoutMode === 'right' && (
            <div 
              className="promo-resize-handle promo-resize-handle-right"
              onMouseDown={handleResizeStart}
            />
          )}

          {/* Code Editor - Always visible when showCustomCode is true */}
          {showCustomCode && (
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
                </div>

                <div className="code-section-content">
                  {activeTab === 'html' && (
                    <CodeEditor
                      key="html-editor"
                      value={profileHTML}
                      onChange={(e) => setProfileHTML(e.target.value)}
                      language="html"
                      placeholder="Enter your HTML code here..."
                    />
                  )}

                  {activeTab === 'css' && (
                    <CodeEditor
                      key={`css-editor-${cssFilter}`}
                      value={cssFilter === 'all' ? profileCSS : getFilteredCSS(profileCSS)}
                      onChange={(e) => {
                        if (cssFilter === 'all') {
                          setProfileCSS(e.target.value);
                        }
                      }}
                      language="css"
                      placeholder={cssFilter === 'all' ? "Enter your CSS code here..." : "Switch to 'All' filter to edit CSS"}
                      readOnly={cssFilter !== 'all'}
                    />
                  )}

                  {activeTab === 'js' && (
                    <CodeEditor
                      key="js-editor"
                      value={profileJS}
                      onChange={(e) => setProfileJS(e.target.value)}
                      language="javascript"
                      placeholder="Enter your JavaScript code here..."
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className={`promo-edit-sidebar ${isEditMode ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Options</h3>
          </div>

          <div className="sidebar-content">
            {/* Preview Labels Toggle */}
            {(profileHTML || profileCSS || profileJS) && (
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

            {(profileHTML || profileCSS || profileJS) && <div className="sidebar-divider" />}

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
            <button 
              className={`promo-custom-code-toggle-btn ${showCustomCode ? 'active' : ''}`}
              onClick={() => setShowCustomCode(!showCustomCode)}
              title={showCustomCode ? 'Close Code View' : 'Open Code View'}
            >
              <span className="code-symbol">&lt;/&gt;</span>
              <span className="code-btn-text">{showCustomCode ? 'close code view' : 'open code view'}</span>
            </button>
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
};

export default Profile;
