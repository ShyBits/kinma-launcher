import React, { useState, useEffect, useRef, useMemo } from 'react';
import { setSpeed as setGlobalDownloadSpeed, clearSpeed as clearGlobalDownloadSpeed, subscribe as subscribeDownloadSpeed, setPaused as setGlobalPaused, getPaused as getGlobalPaused, startDownload as startGlobalDownload, stopDownload as stopGlobalDownload } from '../utils/DownloadSpeedStore';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Users, TrendingUp, TrendingDown, Clock, Download, Play, MessageSquare, ShoppingCart, Image as ImageIcon, X, Settings, Info, FolderOpen, Trash2, EyeOff, RefreshCw, HardDrive, Activity, Save, Download as DownloadIcon, Package, Calendar, Check, ChevronUp, ChevronDown, ArrowDownUp, Pause } from 'lucide-react';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

const PatchCommentMedia = ({ media }) => {
  if (media.type === 'image') {
    return <img src={media.src} alt="Comment media" />;
  } else if (media.type === 'video') {
    return <CustomVideoPlayer src={media.src} />;
  }
  return null;
};

import './Game.css';

const Game = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const commentsRef = useRef(null);
  const downloadIntervalRef = useRef(null);
  
  // Load game-specific state from localStorage
  const getGameState = () => {
    const savedState = localStorage.getItem(`game_${gameId}_state`);
    return savedState ? JSON.parse(savedState) : { isDownloaded: false, isDownloading: false };
  };
  
  const [gameState, setGameState] = useState(getGameState());
  const [isDownloaded, setIsDownloaded] = useState(gameState.isDownloaded);
  const [isDownloading, setIsDownloading] = useState(gameState.isDownloading);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [graphScale, setGraphScale] = useState({ min: 0, max: 3 }); // Fixed scale
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsButtonRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [showSwitchGameModal, setShowSwitchGameModal] = useState(false);
  const [currentlyPlayingGameId, setCurrentlyPlayingGameId] = useState(null);
  const [propertiesSection, setPropertiesSection] = useState('general');
  const [newComment, setNewComment] = useState('');
  const [bannerHeight, setBannerHeight] = useState(130);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [visibleMedia, setVisibleMedia] = useState(new Set());
  const mediaRefs = useRef({});
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [contentSection, setContentSection] = useState('description'); // 'description' or 'patchnotes'
  const [ratings, setRatings] = useState(() => {
    const gameRatings = {
      "the-finals": [
        { id: 1, user: 'GamerPro99', rating: 5, comment: 'Absolutely love this game! Best purchase ever.' },
        { id: 2, user: 'FPSFan2024', rating: 5, comment: 'The destruction mechanics are revolutionary!' },
        { id: 3, user: 'BattleRoyaleKing', rating: 4, comment: 'Great game but needs more maps.' },
        { id: 4, user: 'CasualShooter', rating: 5, comment: 'Perfect for quick matches after work.' },
        { id: 5, user: 'ProPlayer', rating: 4, comment: 'Competitive scene is growing nicely.' },
      ],
      "cs2": [
        { id: 1, user: 'CompetitivePlayer', rating: 5, comment: 'The definitive tactical shooter experience.' },
        { id: 2, user: 'GlobalElite', rating: 5, comment: 'Everything I loved about CS:GO but better.' },
        { id: 3, user: 'TacticalMind', rating: 5, comment: 'The strategy depth is incredible.' },
        { id: 4, user: 'NewPlayer', rating: 4, comment: 'Steep learning curve but worth it.' },
        { id: 5, user: 'Veteran', rating: 5, comment: 'Best CS game ever made.' },
      ],
      "skate": [
        { id: 1, user: 'Skateboarder420', rating: 5, comment: 'Most authentic skate game ever!' },
        { id: 2, user: 'StreetSkater', rating: 4, comment: 'Physics are spot on, controls take time.' },
        { id: 3, user: 'RampMaster', rating: 5, comment: 'Love the trick system and customization.' },
        { id: 4, user: 'CasualRider', rating: 4, comment: 'Fun but challenging for beginners.' },
      ],
      "hellblade": [
        { id: 1, user: 'StoryLover', rating: 5, comment: 'Powerful and emotional journey.' },
        { id: 2, user: 'NinjaTheoryFan', rating: 5, comment: 'Incredible sound design and voice acting.' },
        { id: 3, user: 'MentalHealthAware', rating: 5, comment: 'Important representation of mental health.' },
        { id: 4, user: 'GamerGirl', rating: 5, comment: 'Senua is such a strong character.' },
        { id: 5, user: 'IndieFan', rating: 4, comment: 'Short but impactful experience.' },
      ],
      "cyberpunk": [
        { id: 1, user: 'NightCityDweller', rating: 4, comment: 'Finally living up to its potential!' },
        { id: 2, user: 'RPGMaster', rating: 5, comment: 'Night City feels alive and immersive.' },
        { id: 3, user: 'CyberpunkFan', rating: 4, comment: 'Great story and characters.' },
        { id: 4, user: 'OpenWorldExplorer', rating: 5, comment: 'So much to discover in this world.' },
        { id: 5, user: 'CriticalGamer', rating: 3, comment: 'Good after updates, but launch was rough.' },
      ],
      "valorant": [
        { id: 1, user: 'TacticalShooter', rating: 5, comment: 'Perfect blend of strategy and skill.' },
        { id: 2, user: 'RiotFan', rating: 4, comment: 'Love the agent abilities and gunplay.' },
        { id: 3, user: 'CompetitivePlayer', rating: 5, comment: 'Best tactical shooter on the market.' },
        { id: 4, user: 'NewToFPS', rating: 4, comment: 'Great for learning tactical gameplay.' },
        { id: 5, user: 'ProPlayer', rating: 4, comment: 'Balanced and competitive scene is strong.' },
      ]
    };
    return gameRatings[gameId] || [
      { id: 1, user: 'GamerPro99', rating: 5, comment: 'Absolutely love this game! Best purchase ever.' },
      { id: 2, user: 'CasualPlayer', rating: 5, comment: 'Perfect for relaxing after work.' },
      { id: 3, user: 'SpeedRunner', rating: 4, comment: 'Great replay value.' },
      { id: 4, user: 'Explorer123', rating: 5, comment: 'Incredible world design.' },
      { id: 5, user: 'ReviewMaster', rating: 4, comment: 'Solid game overall.' },
    ];
  });
  const [newRatingComment, setNewRatingComment] = useState('');
  const [selectedStars, setSelectedStars] = useState(0);

  const [comments, setComments] = useState(() => {
    const gameComments = {
      "the-finals": [
        {
          id: 1,
          author: 'GamerPro99',
          time: '2 hours ago',
          text: 'The destruction mechanics in this game are absolutely insane! Loving every match!',
          avatar: 'G',
          media: []
        },
        {
          id: 2,
          author: 'FPSFan2024',
          time: '4 hours ago',
          text: 'Best battle royale since Warzone. The building destruction adds so much strategy.',
          avatar: 'F',
          media: []
        }
      ],
      "cs2": [
        {
          id: 1,
          author: 'CompetitivePlayer',
          time: '1 hour ago',
          text: 'The new smokes and movement feel so much better. Valve really nailed this update!',
          avatar: 'C',
          media: []
        },
        {
          id: 2,
          author: 'GlobalElite',
          time: '3 hours ago',
          text: 'Finally, CS with modern graphics. The gameplay still feels classic though.',
          avatar: 'G',
          media: []
        }
      ],
      "skate": [
        {
          id: 1,
          author: 'Skateboarder420',
          time: '5 hours ago',
          text: 'The physics feel so authentic! Finally a skate game that gets it right.',
          avatar: 'S',
          media: []
        }
      ],
      "hellblade": [
        {
          id: 1,
          author: 'StoryLover',
          time: '1 day ago',
          text: 'This game touched my soul. The portrayal of mental health is incredibly powerful.',
          avatar: 'S',
          media: []
        },
        {
          id: 2,
          author: 'NinjaTheoryFan',
          time: '2 days ago',
          text: 'The voice acting and sound design are phenomenal. Worth every penny.',
          avatar: 'N',
          media: []
        }
      ],
      "cyberpunk": [
        {
          id: 1,
          author: 'NightCityDweller',
          time: '30 minutes ago',
          text: 'After all the updates, this game is finally what it should have been at launch. Amazing open world!',
          avatar: 'N',
          media: []
        },
        {
          id: 2,
          author: 'RPGMaster',
          time: '2 hours ago',
          text: 'The story and characters are incredible. Night City feels alive!',
          avatar: 'R',
          media: []
        }
      ],
      "valorant": [
        {
          id: 1,
          author: 'TacticalShooter',
          time: '45 minutes ago',
          text: 'Reyna main here. The agent balancing this season is actually really good!',
          avatar: 'T',
          media: []
        },
        {
          id: 2,
          author: 'RiotFan',
          time: '1 hour ago',
          text: 'Love the new map. The tactical possibilities are endless.',
          avatar: 'R',
          media: []
        }
      ]
    };
    return gameComments[gameId] || [
      {
        id: 1,
        author: 'Player123',
        time: '2 hours ago',
        text: 'Amazing game! The visuals are stunning and the gameplay is engaging. Highly recommend!',
        avatar: 'A',
        media: []
      }
    ];
  });

  const openLightbox = (imageUrl) => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const navigateToProfile = (authorName) => {
    // Navigate to user profile
    window.location.href = `/profile/${authorName}`;
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = e.target.scrollTop;
          const maxScroll = 500;
          const scrollRatio = Math.min(scrollTop / maxScroll, 1);
          const newHeight = 150 - (scrollRatio * 90);
          setBannerHeight(Math.max(40, newHeight));
          ticking = false;
        });
        ticking = true;
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Intersection Observer for lazy loading media
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const elementId = entry.target.getAttribute('data-media-id');
          if (elementId) {
            setVisibleMedia((prev) => new Set([...prev, elementId]));
          }
        }
      });
    }, { threshold: 0.1 });

    Object.values(mediaRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.values(mediaRefs.current).forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [comments, selectedMedia]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsButtonRef.current && 
        !settingsButtonRef.current.contains(event.target) &&
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target)
      ) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSettingsMenu]);

  // Get user's download speed
  useEffect(() => {
    // Try to get download speed from NetworkInformation API
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        if (downlink) {
          // Convert Mbps to MB/s (multiply Mbps by 1024 then divide by 8 to get KB/s)
          const speedInKBps = (downlink * 1024) / 8;
          setDownloadSpeed(speedInKBps);
        } else if (effectiveType) {
          // Fallback based on effective type (in KB/s)
          const speedMap = {
            'slow-2g': 20,    // ~20 KB/s
            '2g': 50,         // ~50 KB/s
            '3g': 400,        // ~400 KB/s
            '4g': 4000        // ~4 MB/s = 4000 KB/s
          };
          setDownloadSpeed(speedMap[effectiveType] || 2000); // Default to 2 MB/s
        }
      }
    }
  }, []);

  // Set default speed if not detected
  useEffect(() => {
    if (downloadSpeed === 0) {
      setDownloadSpeed(2000); // Default to 2 MB/s
    }
  }, [downloadSpeed]);

  // Scroll to comments when coming from library
  useEffect(() => {
    const shouldScrollToComments = sessionStorage.getItem('scrollToComments');
    if (shouldScrollToComments === 'true' && commentsRef.current) {
      setTimeout(() => {
        commentsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sessionStorage.removeItem('scrollToComments');
      }, 300);
    }
  }, [gameId]);

  // Load custom games from localStorage
  const [customGames, setCustomGames] = useState(() => {
    try {
      const stored = localStorage.getItem('customGames');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error loading custom games:', e);
      return [];
    }
  });

  // Listen for custom game updates and reload on mount
  useEffect(() => {
    const loadCustomGames = () => {
      try {
        const stored = localStorage.getItem('customGames');
        if (stored) {
          setCustomGames(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error loading custom games:', e);
      }
    };
    
    const handleCustomGameUpdate = () => {
      loadCustomGames();
    };
    
    const handleStorageChange = (e) => {
      if (e.key === 'customGames') {
        loadCustomGames();
      }
    };
    
    // Load on mount
    loadCustomGames();
    
    window.addEventListener('customGameUpdate', handleCustomGameUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('customGameUpdate', handleCustomGameUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [gameId]);

  // Build custom games data - recalculate when customGames changes
  const customGamesDataMemo = useMemo(() => {
    const data = {};
    customGames.forEach(game => {
      console.log('Processing custom game:', game);
      const ff = game.fullFormData || {};
      data[game.gameId] = {
        name: game.name || 'Untitled Game',
        icon: game.icon || game.name?.charAt(0).toUpperCase() || '?',
        banner: game.banner || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        logo: game.logo,
        title: game.title,
        card: game.card,
        screenshots: game.screenshots || [],
        rating: game.rating || 0,
        playerCount: game.playerCount || '0',
        currentPlaying: game.currentPlaying || '0',
        trending: game.trending || '0%',
        description: game.description || 'No description available.',
        tags: game.tags || [],
        playtime: game.playtime || '0h',
        lastPlayed: game.lastPlayed || 'Never',
        size: game.size || '0 GB',
        developer: game.developer || 'Unknown',
        releaseDate: game.releaseDate || 'Unknown',
        bannerHeight: game.bannerHeight || ff.bannerHeight || 60,
        // positioning + zoom coming from studio
        bannerPosition: ff.bannerPosition || { x: 50, y: 50 },
        bannerZoom: ff.bannerZoom || 1,
        cardPosition: ff.cardPosition || { x: 50, y: 50 },
        cardZoom: ff.cardZoom || 1,
        logoPositionCustom: ff.logoPositionCustom || { x: 50, y: 50 },
        titlePosition: ff.titlePosition || { x: 50, y: 50 }
      };
    });
    return data;
  }, [customGames]);

  const gamesData = useMemo(() => {
    console.log('Building gamesData with customGames:', customGames);
    console.log('customGamesData:', customGamesDataMemo);
    return {
      ...customGamesDataMemo,
      "the-finals": {
      name: 'THE FINALS',
      icon: 'T',
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
      rating: 4.7,
      playerCount: '1.2M',
      currentPlaying: '245K',
      trending: '+8%',
      description: 'A free-to-play, team-based, first-person shooter that puts you in the middle of a virtual game show. Fight alongside your teammates in virtual arenas that you can alter, exploit, and even destroy.',
      tags: ['FPS', 'Battle Royale', 'Free to Play', 'Multiplayer'],
      playtime: '127h 45m',
      lastPlayed: 'now',
      size: '25.4 GB',
      developer: 'Embark Studios',
      releaseDate: 'Dec 2023'
    },
    "cs2": {
      name: 'Counter-Strike 2',
      icon: 'C',
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
      rating: 4.9,
      playerCount: '1.8M',
      currentPlaying: '892K',
      trending: '+12%',
      description: 'The next evolution of the world\'s most popular competitive shooter. Counter-Strike 2 features upgraded visuals, new gameplay mechanics, and enhanced maps while maintaining the classic CS experience.',
      tags: ['FPS', 'Competitive', 'Tactical', 'Multiplayer'],
      playtime: '234h 12m',
      lastPlayed: '1 hour ago',
      size: '32.1 GB',
      developer: 'Valve',
      releaseDate: 'Sep 2023'
    },
    "skate": {
      name: 'skate.',
      icon: 'S',
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
      rating: 4.5,
      playerCount: '340K',
      currentPlaying: '45K',
      trending: '+25%',
      description: 'Experience the most authentic skateboarding simulation ever created. Built from the ground up by skaters for skaters, featuring realistic physics and endless customization options.',
      tags: ['Sports', 'Simulation', 'Realistic', 'Single Player'],
      playtime: '89h 23m',
      lastPlayed: '3 days ago',
      size: '18.7 GB',
      developer: 'Full Circle',
      releaseDate: '2024'
    },
    "hellblade": {
      name: 'Hellblade: Senua\'s Sacrifice',
      icon: 'H',
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
      rating: 4.8,
      playerCount: '2.1M',
      currentPlaying: '12K',
      trending: '+3%',
      description: 'From the makers of Heavenly Sword, Enslaved: Odyssey to the West, and DmC: Devil May Cry, comes a warrior\'s brutal journey into myth and madness.',
      tags: ['Action', 'Adventure', 'Story Rich', 'Atmospheric'],
      playtime: '8h 45m',
      lastPlayed: '1 week ago',
      size: '12.3 GB',
      developer: 'Ninja Theory',
      releaseDate: 'Aug 2017'
    },
    "cyberpunk": {
      name: 'Cyberpunk 2077',
      icon: 'C',
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
      rating: 4.3,
      playerCount: '890K',
      currentPlaying: '34K',
      trending: '-2%',
      description: 'Cyberpunk 2077 is an open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
      tags: ['RPG', 'Open World', 'Sci-Fi', 'Single Player'],
      playtime: '156h 32m',
      lastPlayed: '2 days ago',
      size: '70.2 GB',
      developer: 'CD Projekt RED',
      releaseDate: 'Dec 2020'
    },
    "valorant": {
      name: 'VALORANT',
      icon: 'V',
      banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
      rating: 4.6,
      playerCount: '1.5M',
      currentPlaying: '456K',
      trending: '+15%',
      description: 'A 5v5 character-based tactical shooter where precise gunplay meets unique agent abilities. Think Counter-Strike meets Overwatch.',
      tags: ['FPS', 'Tactical', 'Competitive', 'Multiplayer'],
      playtime: '198h 17m',
      lastPlayed: '5 hours ago',
      size: '23.8 GB',
      developer: 'Riot Games',
      releaseDate: 'Jun 2020'
    }
    };
  }, [customGamesDataMemo]);
  
  useEffect(() => {
    console.log('Current game from gamesData:', gamesData[gameId]);
    console.log('gameId:', gameId);
    console.log('gamesData:', gamesData);
  }, [gameId, gamesData]);

  // Helper function to get image URL
  const getImageUrl = (url) => {
    if (!url) return '';
    // If it's already a valid URL (http/https/data), return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    // Handle file:// URLs - browsers block these, so return empty or placeholder
    if (url.startsWith('file://')) {
      // Return empty to let the browser show no image, or a placeholder
      console.warn('file:// URL blocked by browser:', url);
      return '';
    }
    // Otherwise, treat as a relative path
    return url.startsWith('/') ? url : `/${url}`;
  };

  const game = gamesData[gameId] || {
    name: 'Game',
    icon: '?',
    banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
    rating: 4.0,
    playerCount: '0',
    currentPlaying: '0',
    trending: '0%',
    description: 'Your game',
    tags: [],
    playtime: '0h',
    lastPlayed: 'Never',
    size: '0 GB',
    developer: 'Kinma',
    releaseDate: 'Unknown'
  };

  // Reload state when gameId changes
  useEffect(() => {
    const savedState = getGameState();
    setIsDownloaded(savedState.isDownloaded);
    setIsDownloading(savedState.isDownloading);
    setDownloadProgress(savedState.downloadProgress || 0);
    
    // Check if game is playing from localStorage
    const playingGames = JSON.parse(localStorage.getItem('playingGames') || '{}');
    setIsPlaying(playingGames[gameId] || false);

    // Detect ongoing operation started elsewhere before opening this page
    try {
      const status = localStorage.getItem(`game_${gameId}_status`);
      if (status === 'update') {
        setIsUpdating(true);
        setIsDownloading(false);
      } else if (status === 'download') {
        setIsDownloading(true);
        setIsUpdating(false);
      } else {
        setIsUpdating(false);
      }
    } catch (_) {}
  }, [gameId]);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    const gameStateToSave = { isDownloaded, isDownloading, downloadProgress };
    localStorage.setItem(`game_${gameId}_state`, JSON.stringify(gameStateToSave));
  }, [isDownloaded, isDownloading, gameId, downloadProgress]);

  // Listen for game status changes (update events from sidebar)
  useEffect(() => {
    const handleGameStatusChange = (e) => {
      const { gameId: eventGameId, status } = e.detail;
      if (eventGameId === gameId) {
        if (status === 'update') {
          setIsUpdating(true);
          setIsDownloading(false);
        } else if (status === null) {
          setIsUpdating(false);
          setIsDownloading(false);
          setDownloadProgress(0);
          setCurrentSpeed(0);
          setSpeedHistory([]);
        }
      }
    };

    window.addEventListener('gameStatusChanged', handleGameStatusChange);
    return () => window.removeEventListener('gameStatusChanged', handleGameStatusChange);
  }, [gameId]);

  // Subscribe to global download speed updates
  useEffect(() => {
    const unsubscribe = subscribeDownloadSpeed(gameId, ({ speed, progress, isPaused: paused }) => {
      // Update paused state when it changes globally (e.g., from footer)
      if (paused !== isPaused) {
        setIsPaused(paused);
      }
      
      // If download/update is cleared externally (e.g., from footer cancel button)
      if (speed === 0 && progress === 0) {
        if (isDownloading && downloadIntervalRef.current) {
          clearInterval(downloadIntervalRef.current);
          downloadIntervalRef.current = null;
          setIsDownloading(false);
          setIsPaused(false);
          setDownloadProgress(0);
          setCurrentSpeed(0);
          setSpeedHistory([]);
        }
        if (isUpdating) {
          setIsUpdating(false);
          setDownloadProgress(0);
          setCurrentSpeed(0);
          setSpeedHistory([]);
        }
      }
      
      // Update progress from global store (for both downloads and updates)
      if (speed > 0 || progress > 0) {
        setDownloadProgress(progress);
        setCurrentSpeed(speed);
        // When paused, don't push new points so the graph freezes
        if (!paused) {
          setSpeedHistory(prev => {
            const newHistory = [...prev, speed];
            // Keep last 50 values for smooth scrolling graph
            return newHistory.slice(-50);
          });
        }
      }
    });
    return unsubscribe;
  }, [gameId, isPaused, isDownloading, isUpdating]);

  // Update isDownloading state when download completes
  useEffect(() => {
    if (downloadProgress >= 100 && isDownloading) {
      setIsDownloaded(true);
      setIsDownloading(false);
    }
  }, [downloadProgress, isDownloading]);

  // Cleanup interval only on gameId change or unmount
  useEffect(() => {
    return () => {
      // Don't clear interval when unmounting - let download continue in background
      // Only clean up when we're done with this game
      if (downloadIntervalRef.current) {
        // Keep the download running by not clearing the interval
        // The interval will be managed by the pause/resume logic
      }
    };
  }, [gameId]);

  const handleDownload = () => {
    // Clear any existing interval
    if (downloadIntervalRef.current) {
      clearInterval(downloadIntervalRef.current);
      downloadIntervalRef.current = null;
    }
    
    // Reset all download states before starting
    // Always start from 0 for a fresh download
    setDownloadProgress(0);
    setIsPaused(false);
    setGlobalPaused(gameId, false);
    
    // Clear any existing global speed state
    clearGlobalDownloadSpeed(gameId);
    
    // Start download in global store (will run independently), reset progress for fresh download
    startGlobalDownload(gameId, true);
    
    // Set downloading state
    setIsDownloading(true);
    setSpeedHistory([]);
    setCurrentSpeed(0);
    setGraphScale({ min: 0.5, max: 3.0 }); // Set fixed scale
  };

  const handlePauseDownload = () => {
    if (isPaused) {
      // Resume - flip state, useEffect will handle restarting interval
      setIsPaused(false);
      setGlobalPaused(gameId, false);
    } else {
      // Pause - flip state, useEffect will handle stopping interval
      setIsPaused(true);
      setGlobalPaused(gameId, true);
    }
  };

  const handleCancelDownload = () => {
    // Stop the global download
    stopGlobalDownload(gameId);
    
    if (downloadIntervalRef.current) {
      clearInterval(downloadIntervalRef.current);
      downloadIntervalRef.current = null;
    }
    setIsDownloading(false);
    setIsPaused(false);
    setDownloadProgress(0);
    setCurrentSpeed(0);
    setSpeedHistory([]);
    setGlobalPaused(gameId, false);
    clearGlobalDownloadSpeed(gameId);
    
    // Save cancelled state to localStorage
    const gameStateToSave = { isDownloaded: false, isDownloading: false, downloadProgress: 0 };
    localStorage.setItem(`game_${gameId}_state`, JSON.stringify(gameStateToSave));
  };

  const handlePlay = () => {
    if (isPlaying) {
      // Terminate the game
      setIsPlaying(false);
      // Clear playing status from localStorage
      const playingGames = JSON.parse(localStorage.getItem('playingGames') || '{}');
      delete playingGames[gameId];
      localStorage.setItem('playingGames', JSON.stringify(playingGames));
      // Dispatch custom event to notify sidebar
      window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId, status: null } }));
      console.log('Game terminated:', gameId);
      // Add any cleanup or game termination logic here
    } else {
      // Check if another game is currently playing
      const playingGames = JSON.parse(localStorage.getItem('playingGames') || '{}');
      const otherPlayingGameId = Object.keys(playingGames).find(id => id !== gameId && playingGames[id]);
      
      if (otherPlayingGameId) {
        // Another game is playing, show confirmation modal
        setCurrentlyPlayingGameId(otherPlayingGameId);
        setShowSwitchGameModal(true);
      } else {
        // No other game playing, start this game
        startGame();
      }
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    // Save playing status to localStorage
    const playingGames = JSON.parse(localStorage.getItem('playingGames') || '{}');
    playingGames[gameId] = true;
    localStorage.setItem('playingGames', JSON.stringify(playingGames));
    // Dispatch custom event to notify sidebar
    window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId, status: 'playing' } }));
    console.log('Starting game:', gameId);
    // Close settings menu when starting game
    setShowSettingsMenu(false);
    // Add any game startup logic here
  };

  const handleConfirmSwitchGame = () => {
    // Terminate the currently playing game
    if (currentlyPlayingGameId) {
      const playingGames = JSON.parse(localStorage.getItem('playingGames') || '{}');
      delete playingGames[currentlyPlayingGameId];
      localStorage.setItem('playingGames', JSON.stringify(playingGames));
      // Dispatch custom event to notify sidebar
      window.dispatchEvent(new CustomEvent('gameStatusChanged', { detail: { gameId: currentlyPlayingGameId, status: null } }));
      console.log('Terminated game:', currentlyPlayingGameId);
    }
    
    // Start the new game
    setShowSwitchGameModal(false);
    setCurrentlyPlayingGameId(null);
    startGame();
  };

  const handleCancelSwitchGame = () => {
    setShowSwitchGameModal(false);
    setCurrentlyPlayingGameId(null);
  };

  const handleSettingsMenuAction = (action) => {
    setShowSettingsMenu(false);
    
    switch (action) {
      case 'properties':
        console.log('Opening game properties...');
        setShowPropertiesModal(true);
        break;
      case 'browse':
        console.log('Opening game files location...');
        // Open file explorer at game installation path
        // electron.shell.openPath(gamePath)
        break;
      case 'uninstall':
        if (window.confirm('Are you sure you want to uninstall this game?')) {
          console.log('Uninstalling game...');
          setIsDownloaded(false);
          setIsDownloading(false);
          setDownloadProgress(0);
          setSpeedHistory([]);
          setIsPaused(false);
          clearGlobalDownloadSpeed(gameId);
          // Clear localStorage state
          localStorage.removeItem(`game_${gameId}_state`);
          // Actual uninstall logic would go here
        }
        break;
      case 'hide':
        if (window.confirm('Are you sure you want to hide this game?')) {
          console.log('Hiding game...');
          // Navigate back to library or mark game as hidden
        }
        break;
      default:
        break;
    }
  };

  const handleMarketClick = () => {
    navigate(`/game/${gameId}/market`);
  };

  const handleCommunityClick = () => {
    navigate(`/game/${gameId}/community`);
  };

  const handleSectionChange = (section) => {
    setContentSection(section);
  };

  // Patch Notes data
  const [expandedPatches, setExpandedPatches] = useState({});
  const [selectedPatchComments, setSelectedPatchComments] = useState(null);
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [commentSort, setCommentSort] = useState('newest'); // 'newest', 'oldest', 'most-upvoted', 'most-downvoted'
  const [showCommentSortMenu, setShowCommentSortMenu] = useState(false);
  const [patchVotes, setPatchVotes] = useState(() => ({
    0: { upvotes: 42, downvotes: 3, userVote: null },
    1: { upvotes: 28, downvotes: 1, userVote: null },
    2: { upvotes: 156, downvotes: 12, userVote: null }
  }));
  const [patchCommentsData, setPatchCommentsData] = useState(() => ({
    0: [
      { id: 1, user: 'Player123', avatar: 'P', text: 'Great update! Loving the new achievements.', time: '2 hours ago', upvotes: 42, downvotes: 2, userVote: null },
      { id: 2, user: 'GamerPro', avatar: 'G', text: 'The marketplace feature is awesome!', time: '5 hours ago', upvotes: 28, downvotes: 1, userVote: null },
      { id: 3, user: 'CoolGamer', avatar: 'C', text: 'Performance improvements are noticeable!', time: '1 day ago', upvotes: 15, downvotes: 0, userVote: null }
    ],
    1: [
      { id: 1, user: 'DesignLover', avatar: 'D', text: 'New customization options are great!', time: '3 hours ago', upvotes: 19, downvotes: 0, userVote: null },
      { id: 2, user: 'UIEnthusiast', avatar: 'U', text: 'Love the updated UI!', time: '1 day ago', upvotes: 8, downvotes: 0, userVote: null }
    ],
    2: [
      { id: 1, user: 'ArenaMaster', avatar: 'A', text: 'Arena mode is so fun!', time: '1 hour ago', upvotes: 67, downvotes: 3, userVote: null },
      { id: 2, user: 'CompetitivePlayer', avatar: 'C', text: 'Daily challenges keep me coming back.', time: '4 hours ago', upvotes: 34, downvotes: 1, userVote: null },
      { id: 3, user: 'GraphicsFan', avatar: 'G', text: 'Enhanced graphics are beautiful!', time: '2 days ago', upvotes: 12, downvotes: 0, userVote: null }
    ]
  }));
  const patchNotes = [
    {
      version: '1.5.0',
      date: 'October 26, 2024',
      type: 'major',
      title: 'The Big Update',
      description: 'Diese Woche haben wir für euch etwas Großes vorbereitet! Mit dem Achievement-System könnt ihr euch nun neue Herausforderungen stellen und euren Fortschritt verfolgen. Außerdem haben wir den Marketplace für euch geöffnet, wo ihr mit anderen Spielern handeln könnt.',
      changes: [
        { category: 'New Features', items: [
          { type: 'added', text: 'New achievement system with 50+ achievements' },
          { type: 'added', text: 'Marketplace trading feature' }
        ]},
        { category: 'Improvements', items: [
          { type: 'improved', text: 'Performance optimizations for better FPS' }
        ]},
        { category: 'Bug Fixes', items: [
          { type: 'fixed', text: 'Resolved memory leak in character inventory' }
        ]}
      ]
    },
    {
      version: '1.4.2',
      date: 'October 19, 2024',
      type: 'patch',
      title: 'UI Improvements',
      description: 'Wir haben fleißig an der Benutzerfreundlichkeit gearbeitet. Mit den neuen Anpassungsoptionen könnt ihr euren Charakter noch individueller gestalten.',
      changes: [
        { category: 'New Features', items: [
          { type: 'added', text: 'New character customization options' }
        ]},
        { category: 'Improvements', items: [
          { type: 'improved', text: 'Updated UI for better accessibility' }
        ]},
        { category: 'Bug Fixes', items: [
          { type: 'fixed', text: 'Fixed crash on startup for some users' }
        ]}
      ]
    },
    {
      version: '1.4.0',
      date: 'October 12, 2024',
      type: 'major',
      title: 'Arena Mode Release',
      description: 'Der lang ersehnte Multiplayer Arena Mode ist endlich da! Erlebt intensive Kämpfe mit euren Freunden und sammelt Belohnungen durch tägliche Herausforderungen.',
      changes: [
        { category: 'New Features', items: [
          { type: 'added', text: 'New multiplayer arena mode' },
          { type: 'added', text: 'Daily challenges and rewards' }
        ]},
        { category: 'Improvements', items: [
          { type: 'improved', text: 'Enhanced graphics and lighting' }
        ]},
        { category: 'Balancing', items: [
          { type: 'fixed', text: 'Balanced difficulty curve' }
        ]}
      ]
    }
  ];

  const togglePatchExpansion = (index) => {
    setExpandedPatches(prev => {
      // Close all other patches and toggle current one
      const newState = {};
      newState[index] = !prev[index];
      return newState;
    });
  };

  const handlePatchClick = (index) => {
    setSelectedPatchComments(index);
    setShowCommentSection(false);
  };

  const handleCommentButtonClick = (index, e) => {
    e.stopPropagation();
    setSelectedPatchComments(index);
    setShowCommentSection(true);
  };

  const handlePatchVote = (patchIndex, voteType, e) => {
    e.stopPropagation();
    setPatchVotes(prev => {
      const current = prev[patchIndex];
      const newVotes = { ...prev };
      
      if (current.userVote === voteType) {
        // Remove vote if clicking the same button
        newVotes[patchIndex] = {
          ...current,
          userVote: null,
          upvotes: voteType === 'up' ? current.upvotes - 1 : current.upvotes,
          downvotes: voteType === 'down' ? current.downvotes - 1 : current.downvotes
        };
      } else if (current.userVote === null) {
        // Add new vote
        newVotes[patchIndex] = {
          ...current,
          userVote: voteType,
          upvotes: voteType === 'up' ? current.upvotes + 1 : current.upvotes,
          downvotes: voteType === 'down' ? current.downvotes + 1 : current.downvotes
        };
      } else {
        // Switch vote
        const oldUpvotes = current.userVote === 'up' ? current.upvotes - 1 : current.upvotes;
        const oldDownvotes = current.userVote === 'down' ? current.downvotes - 1 : current.downvotes;
        
        newVotes[patchIndex] = {
          ...current,
          userVote: voteType,
          upvotes: voteType === 'up' ? oldUpvotes + 1 : oldUpvotes,
          downvotes: voteType === 'down' ? oldDownvotes + 1 : oldDownvotes
        };
      }
      
      return newVotes;
    });
  };

  const handleCommentVote = (patchIndex, commentId, voteType, e) => {
    e.stopPropagation();
    setPatchCommentsData(prev => {
      const patchComments = prev[patchIndex];
      const updatedComments = patchComments.map(comment => {
        if (comment.id === commentId) {
          const current = comment;
          
          if (current.userVote === voteType) {
            // Remove vote
            return {
              ...current,
              userVote: null,
              upvotes: voteType === 'up' ? current.upvotes - 1 : current.upvotes,
              downvotes: voteType === 'down' ? current.downvotes - 1 : current.downvotes
            };
          } else if (current.userVote === null) {
            // Add new vote
            return {
              ...current,
              userVote: voteType,
              upvotes: voteType === 'up' ? current.upvotes + 1 : current.upvotes,
              downvotes: voteType === 'down' ? current.downvotes + 1 : current.downvotes
            };
          } else {
            // Switch vote
            const oldUpvotes = current.userVote === 'up' ? current.upvotes - 1 : current.upvotes;
            const oldDownvotes = current.userVote === 'down' ? current.downvotes - 1 : current.downvotes;
            
            return {
              ...current,
              userVote: voteType,
              upvotes: voteType === 'up' ? oldUpvotes + 1 : oldUpvotes,
              downvotes: voteType === 'down' ? oldDownvotes + 1 : oldDownvotes
            };
          }
        }
        return comment;
      });
      
      return {
        ...prev,
        [patchIndex]: updatedComments
      };
    });
  };

  const handlePostComment = () => {
    if (!newComment.trim() && selectedMedia.length === 0) return;

    const newCommentObj = {
      id: comments.length + 1,
      author: 'You',
      time: 'now',
      text: newComment,
      avatar: 'Y',
      media: selectedMedia
    };

    setComments([...comments, newCommentObj]);
    setNewComment('');
    setSelectedMedia([]);
  };

  const handlePostPatchComment = () => {
    if (!newComment.trim() && selectedMedia.length === 0 || selectedPatchComments === null) return;

    const newCommentObj = {
      id: patchCommentsData[selectedPatchComments].length + 1,
      user: 'You',
      avatar: 'Y',
      text: newComment,
      time: 'just now',
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      media: selectedMedia
    };

    setPatchCommentsData(prev => ({
      ...prev,
      [selectedPatchComments]: [...prev[selectedPatchComments], newCommentObj]
    }));

    setNewComment('');
    setSelectedMedia([]);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Security checks
    const maxFileSize = 50 * 1024 * 1024; // 50MB max
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

    files.forEach(file => {
      if (file.size > maxFileSize) {
        alert('File size must be less than 50MB');
        return;
      }

      const isImage = allowedImageTypes.includes(file.type);
      const isVideo = allowedVideoTypes.includes(file.type);

      if (!isImage && !isVideo) {
        alert('Only images (JPG, PNG, GIF, WEBP, AVIF) and videos (MP4, WebM, MOV) are allowed');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const mediaType = isImage ? 'image' : 'video';
        setSelectedMedia(prev => [...prev, {
          src: event.target.result,
          type: mediaType
        }]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow uploading same file again
    e.target.value = '';
  };

  const removeMedia = (index) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handlePostRating = () => {
    if (selectedStars === 0 || !newRatingComment.trim()) return;
    
    const newRating = {
      id: ratings.length + 1,
      user: 'You',
      rating: selectedStars,
      comment: newRatingComment
    };
    
    setRatings(prev => [...prev, newRating]);
    setNewRatingComment('');
    setSelectedStars(0);
  };

  const getColorForRating = (rating) => {
    // Red to Gold gradient
    if (rating >= 4.5) return '#FFD700'; // Gold
    if (rating >= 3.5) return '#FFB800'; // Yellow-orange
    if (rating >= 2.5) return '#FF9500'; // Orange
    if (rating >= 1.5) return '#FF6B00'; // Dark orange
    if (rating >= 0.5) return '#FF4444'; // Red-orange
    return 'rgba(255,255,255,0.3)'; // Gray for very low or no rating
  };

  // Calculate estimated download time
  const getEstimatedDownloadTime = (sizeStr) => {
    const sizeInGB = parseFloat(sizeStr);
    if (!sizeInGB) return 'Unknown';
    
    // Use detected download speed, fallback to average
    const mbPerSecond = downloadSpeed > 0 ? downloadSpeed : 2000; // Default to 2 MB/s
    const minutes = (sizeInGB * 1024) / (mbPerSecond * 60);
    
    if (minutes < 1) {
      return '< 1 min';
    } else if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (mins === 0) return `${hours} hr`;
      return `${hours} hr ${mins} min`;
    }
  };

  // Format download speed for display
  const formatDownloadSpeed = () => {
    if (downloadSpeed >= 1000) {
      return `${(downloadSpeed / 1000).toFixed(1)} MB/s`;
    } else {
      return `${Math.round(downloadSpeed)} KB/s`;
    }
  };

  // Format current speed
  const formatCurrentSpeed = (speed) => {
    return `${speed.toFixed(1)} MB/s`;
  };

  // New graph generation with proper scrolling
  const generateGraph = () => {
    const GRAPH_WIDTH = 300;
    const GRAPH_HEIGHT = 44;
    const MARGIN = 4;
    const MAX_POINTS = 50; // Max points to keep in history
    const VISIBLE_POINTS = 50; // Points visible on screen
    
    if (speedHistory.length < 2) {
      return null;
    }
    
    // Use recent data for scaling (last VISIBLE_POINTS for better responsiveness)
    const recentData = speedHistory.slice(-VISIBLE_POINTS);
    const maxSpeed = Math.max(...recentData, 0.1);
    const minSpeed = 0;
    const range = maxSpeed - minSpeed || 1;
    
    // Calculate spacing between points
    const spacing = GRAPH_WIDTH / (VISIBLE_POINTS - 1);
    
    // Get data to display
    let displayData;
    if (speedHistory.length <= VISIBLE_POINTS) {
      displayData = speedHistory;
    } else {
      // Scrolling: show last VISIBLE_POINTS
      displayData = speedHistory.slice(-VISIBLE_POINTS);
    }
    
    // Build path for graph line
    let path = '';
    const points = [];
    displayData.forEach((speed, index) => {
      const x = index * spacing;
      const normalizedSpeed = (speed - minSpeed) / range;
      const y = GRAPH_HEIGHT - MARGIN - (normalizedSpeed * (GRAPH_HEIGHT - MARGIN * 2));
      points.push({ x, y });
      
      if (index === 0) {
        path += `M ${x},${y}`;
      } else {
        path += ` L ${x},${y}`;
      }
    });
    
    // Build area path for gradient fill (under the graph line)
    const bottomY = GRAPH_HEIGHT - MARGIN;
    let areaPath = '';
    if (points.length > 0) {
      // Start from first point
      areaPath += `M ${points[0].x},${points[0].y} `;
      // Add all line segments
      for (let i = 1; i < points.length; i++) {
        areaPath += `L ${points[i].x},${points[i].y} `;
      }
      // Close the path by going to bottom right, bottom left, then back to start
      areaPath += `L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`;
    }
    
    const strokeColor = isUpdating ? 'var(--update-yellow)' : 'rgba(255, 255, 255, 0.9)';
    const fillColor = isUpdating ? 'var(--update-yellow)' : '#93c5fd'; // Download blue
    const axisColor = 'rgba(255, 255, 255, 0.2)';
    const gradientId = `graph-gradient-${isUpdating ? 'update' : 'download'}`;
    
    return (
      <svg 
        className="progress-graph-svg" 
        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.6" />
            <stop offset="20%" stopColor={fillColor} stopOpacity="0.25" />
            <stop offset="40%" stopColor={fillColor} stopOpacity="0.1" />
            <stop offset="70%" stopColor={fillColor} stopOpacity="0.02" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* X-axis */}
        <line
          x1="0"
          y1={GRAPH_HEIGHT - MARGIN}
          x2={GRAPH_WIDTH}
          y2={GRAPH_HEIGHT - MARGIN}
          stroke={axisColor}
          strokeWidth="1"
        />
        {/* Y-axis */}
        <line
          x1="0"
          y1={MARGIN}
          x2="0"
          y2={GRAPH_HEIGHT - MARGIN}
          stroke={axisColor}
          strokeWidth="1"
        />
        {/* Gradient fill area under graph */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            opacity="1"
          />
        )}
        {/* Graph line */}
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Calculate average rating from all reviews
  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal place
  }, [ratings]);

  // Update game rating with calculated average
  const gameWithRating = {
    ...game,
    rating: averageRating > 0 ? averageRating : game.rating
  };

  return (
    <div className="game-page">
      <div className="game-content" ref={contentRef}>
        <div className="game-banner" style={{ height: `${game.bannerHeight || bannerHeight || 60}vh`, position: 'relative', overflow: 'hidden' }}>
          {/* Use an img with transform like studio for precise match */}
          <img
            src={getImageUrl(game.banner)}
            alt="Banner"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${game.bannerOffset?.x || 0}px, ${game.bannerOffset?.y || 0}px) scale(${game.bannerZoom || 1})`,
              transformOrigin: 'top left',
              width: 'auto',
              height: '100%',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
          <div className="game-banner-overlay">
            <div className="game-banner-content">
              <h1 className="game-title">{game.name}</h1>

              <div className="game-stats-banner">
                <div className="stat-item" onClick={() => setShowRatingMenu(true)} style={{ cursor: 'pointer' }}>
                  <Star size={18} fill={getColorForRating(gameWithRating.rating)} color={getColorForRating(gameWithRating.rating)} />
                  <span>{gameWithRating.rating}</span>
                </div>
                <div className="stat-item">
                  <Users size={18} />
                  <span>{game.currentPlaying} playing now</span>
                </div>
                <div className={`stat-item ${game.trending.startsWith('+') ? 'trending-positive' : game.trending.startsWith('-') ? 'trending-negative' : ''}`}>
                  {game.trending.startsWith('-') ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                  <span>{game.trending}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="game-content-section">
          {/* Action Bar */}
          <div className="game-action-bar">
          <div className="game-action-left">
            <div className="action-morpher" data-state={isDownloaded && !isUpdating ? 'play' : (isDownloading || isUpdating) ? 'progress' : 'download'}>
            {isDownloaded && !isUpdating ? (
              <>
                  <div className="play-settings-container" ref={settingsButtonRef}>
                    <button className="game-play-btn" onClick={handlePlay} data-exit={isPlaying}>
                      {isPlaying ? <X size={24} /> : <Play size={24} />}
                      <span>{isPlaying ? 'Exit' : 'Play'}</span>
                </button>
                    <button 
                      className={`game-settings-btn ${showSettingsMenu ? 'active' : ''}`}
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      disabled={isPlaying}
                    >
                      <Settings size={22} />
                    </button>
                    {showSettingsMenu && (
                      <div className="game-settings-menu" ref={settingsMenuRef}>
                        <button className={`settings-menu-item ${isPlaying ? 'disabled' : ''}`} onClick={() => !isPlaying && handleSettingsMenuAction('browse')}>
                          <FolderOpen size={16} />
                          <span>Browse Local Files</span>
                        </button>
                        <button className={`settings-menu-item ${isPlaying ? 'disabled' : ''}`} onClick={() => !isPlaying && handleSettingsMenuAction('hide')}>
                          <EyeOff size={16} />
                          <span>Hide this Game</span>
                        </button>
                        <button className={`settings-menu-item ${isPlaying ? 'disabled' : ''}`} onClick={() => !isPlaying && handleSettingsMenuAction('uninstall')}>
                          <Trash2 size={16} />
                          <span>Uninstall</span>
                        </button>
                        <button className={`settings-menu-item ${isPlaying ? 'disabled' : ''}`} onClick={() => !isPlaying && handleSettingsMenuAction('properties')}>
                          <Info size={16} />
                          <span>Properties</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="game-info-item" style={{ marginLeft: '24px' }}>
                  <div className="game-info-label">Playtime</div>
                  <div className="game-info-value">
                    <Clock size={16} />
                    <span>{game.playtime}</span>
                  </div>
                </div>
                <div className="game-info-item">
                  <div className="game-info-label">Last played</div>
                  <div className="game-info-value">{game.lastPlayed}</div>
                </div>
              </>
              ) : (isDownloading || isUpdating) ? (
                  <div className={`game-progress-container ${isUpdating ? 'updating' : ''}`}>
                    {/* Progress Header */}
                    <div className="progress-header-container">
                      <div className="progress-header-left">
                        <span className="progress-percentage">{Math.round(downloadProgress)}%</span>
                      </div>
                      <div className="progress-controls">
                        <button 
                          className="progress-control-btn"
                          onClick={handlePauseDownload}
                          title={isPaused ? "Resume" : "Pause"}
                        >
                          {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                        </button>
                        <button 
                          className="progress-control-btn progress-cancel-btn"
                          onClick={handleCancelDownload}
                          title="Cancel"
                        >
                          <X size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="progress-bar-wrapper">
                      <div 
                        className={`progress-bar-fill ${isUpdating ? 'update' : 'download'}`}
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    
                    {/* Speed Graph with Speed Text */}
                    <div className="progress-graph-wrapper">
                      {speedHistory.length >= 2 && (
                        <div className="progress-graph-container">
                          {generateGraph()}
                        </div>
                      )}
                      <span className="progress-speed-text-inline">
                        {isUpdating 
                          ? 'Updating...' 
                          : (currentSpeed > 0 ? formatCurrentSpeed(currentSpeed) : formatDownloadSpeed())
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="game-download-btn" onClick={handleDownload}>
                      <Download size={20} />
                      <span>Download</span>
                    </button>
                  <span className="download-size">
                    {game.size} • ~{getEstimatedDownloadTime(game.size)} <span className="download-speed">({formatDownloadSpeed()})</span>
                  </span>
              </>
            )}
            </div>
          </div>
          <div className="game-action-right">
            <button className="nav-aux-btn" onClick={handleCommunityClick}>
              <MessageSquare size={18} />
              <span>Community</span>
            </button>
            <button className="nav-aux-btn" onClick={handleMarketClick}>
              <ShoppingCart size={18} />
              <span>Market</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="game-content-tabs">
          <button 
            className={`content-tab ${contentSection === 'description' ? 'active' : ''}`}
            onClick={() => handleSectionChange('description')}
          >
            Description
          </button>
          <button 
            className={`content-tab ${contentSection === 'patchnotes' ? 'active' : ''}`}
            onClick={() => handleSectionChange('patchnotes')}
          >
            Patch Notes
          </button>
        </div>

        <div className="game-info-section">
          {contentSection === 'description' ? (
            <>
              <h2 className="section-title">About</h2>
              <p className="game-description">{game.description}</p>
              
              <div className="game-info-cards">
            <div className="info-card">
              <div className="info-card-label">Developer</div>
              <div className="info-card-value">{game.developer}</div>
            </div>
            <div className="info-card">
              <div className="info-card-label">Released</div>
              <div className="info-card-value">{game.releaseDate}</div>
            </div>
            <div className="info-card">
              <div className="info-card-label">Size</div>
              <div className="info-card-value">{game.size}</div>
            </div>
          </div>

              {/* Media from Studio (only screenshots/videos/gifs) */}
              {game.screenshots && game.screenshots.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h3 className="section-subtitle">Media</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                    {game.screenshots.map((shot, idx) => (
                      <img key={idx} src={getImageUrl(shot)} alt={`Screenshot ${idx + 1}`} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px' }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="patch-notes-section">
              {patchNotes.map((patch, index) => (
                <div 
                  key={index} 
                  className={`patch-note-item ${expandedPatches[index] ? 'expanded' : ''}`}
                  onClick={() => handlePatchClick(index)}
                >
                  <div className="patch-media-placeholder">
                    <div className="placeholder-icon">🎮</div>
                  </div>
                  <div className="patch-content">
                    <div className="patch-header">
                      <div className="patch-title-section">
                        <h3 className="patch-version-large">{patch.version}</h3>
                        <h2 className="patch-title">{patch.title}</h2>
                      </div>
                      <div className="patch-date-small">
                        <Calendar size={12} />
                        <span>{patch.date}</span>
                      </div>
                    </div>
                    
                    <p className="patch-description">{patch.description}</p>
                    
                    {expandedPatches[index] && (
                      <div className="patch-changes-expanded">
                        <h4 className="patch-changes-title">Changes</h4>
                        <div className="patch-changes">
                          {patch.changes.map((change, changeIndex) => (
                            <div key={changeIndex} className="patch-change">
                              <Check size={14} />
                              <span className={`change-type ${change.type}`}>
                                {change.type === 'added' ? '+' : change.type === 'improved' ? '~' : change.type === 'fixed' ? '×' : '•'}
                              </span>
                              <span>{change.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="patch-actions">
                      <button 
                        className={`patch-action-btn ${patchVotes[index].userVote === 'up' ? 'active upvote' : ''}`}
                        onClick={(e) => handlePatchVote(index, 'up', e)}
                      >
                        <ChevronUp size={16} />
                        <span>{patchVotes[index].upvotes}</span>
                      </button>
                      <button 
                        className={`patch-action-btn ${patchVotes[index].userVote === 'down' ? 'active downvote' : ''}`}
                        onClick={(e) => handlePatchVote(index, 'down', e)}
                      >
                        <ChevronDown size={16} />
                        <span>{patchVotes[index].downvotes}</span>
                      </button>
                      <button 
                        className="patch-action-btn"
                        onClick={(e) => handleCommentButtonClick(index, e)}
                      >
                        <MessageSquare size={16} />
                        <span>{patchCommentsData[index].length}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="game-comments-section" ref={commentsRef}>
          <h3 className="section-title">Comments</h3>
          <div className="comments-container">
            <div className="new-comment-box">
              <div className="comment-input-area">
                {selectedMedia.length > 0 && (
                  <div className="selected-media-preview-container">
                    {selectedMedia.map((media, index) => (
                      <div key={index} className="selected-media-preview">
                        <div className="media-content-wrapper">
                          {media.type === 'image' ? (
                            <img src={media.src} alt="Preview" />
                          ) : media.type === 'video' ? (
                            <CustomVideoPlayer 
                              src={media.src}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : null}
                          <button className="remove-image-btn" onClick={() => removeMedia(index)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  placeholder="Share your thoughts about this game..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handlePostComment();
                    }
                  }}
                  rows={3}
                />
                <div className="comment-actions">
                  <label className="attach-btn" htmlFor="media-upload">
                    <ImageIcon size={18} />
                    <input
                      type="file"
                      id="media-upload"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
                      onChange={handleImageUpload}
                      multiple
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button 
                    className="post-comment-btn" 
                    disabled={!newComment.trim() && selectedMedia.length === 0}
                    onClick={handlePostComment}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
            <div className="comments-list">
              {comments.slice().reverse().map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-avatar" onClick={() => navigateToProfile(comment.author)}>{comment.avatar}</div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author" onClick={() => navigateToProfile(comment.author)}>{comment.author}</span>
                      <span className="comment-time">{comment.time}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                    {comment.media && comment.media.map((media, index) => {
                      const mediaId = `comment-${comment.id}-${index}`;
                      const isVisible = visibleMedia.has(mediaId);
                      
                      return (
                        <div 
                          key={index} 
                          className="comment-media"
                          ref={(el) => {
                            if (el) mediaRefs.current[mediaId] = el;
                          }}
                          data-media-id={mediaId}
                        >
                          {media.type === 'image' ? (
                            <img 
                              src={isVisible ? media.src : undefined}
                              alt="Comment" 
                              onClick={() => openLightbox(media.src)} 
                              style={{ cursor: 'pointer' }}
                              loading="lazy"
                            />
                          ) : media.type === 'video' ? (
                            <CustomVideoPlayer 
                              src={isVisible ? media.src : undefined}
                              onContextMenu={(e) => e.preventDefault()}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="image-lightbox" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox}>×</button>
            <img src={lightboxImage} alt="Lightbox" />
          </div>
        </div>
      )}

      {/* Rating Menu */}
      {showRatingMenu && (
        <div className="game-overlay" onClick={() => setShowRatingMenu(false)}>
          <div className="game-menu-modal" onClick={(e) => e.stopPropagation()}>
            <div className="game-menu-header">
              <h3>Ratings & Reviews</h3>
              <button className="menu-close-btn" onClick={() => setShowRatingMenu(false)}>×</button>
            </div>
            
            <div className="ratings-list">
              {ratings.slice().reverse().map((rating) => (
                <div key={rating.id} className="rating-item">
                  <div className="rating-header">
                    <div className="rating-user">{rating.user}</div>
                    <div className="rating-stars">
                      {[...Array(5)].map((_, i) => {
                        // Red to Gold gradient
                        const getColorForRating = (rating) => {
                          if (rating === 5) return '#FFD700'; // Gold
                          if (rating === 4) return '#FFB800'; // Yellow-orange
                          if (rating === 3) return '#FF9500'; // Orange
                          if (rating === 2) return '#FF6B00'; // Dark orange
                          if (rating === 1) return '#FF4444'; // Red-orange
                          return 'rgba(255,255,255,0.3)';
                        };
                        
                        const isEmpty = i >= rating.rating;
                        const starColor = isEmpty ? 'rgba(255,255,255,0.3)' : getColorForRating(rating.rating);
                        
                        return (
                        <Star key={i} size={16} style={{ 
                            fill: isEmpty ? 'transparent' : starColor,
                            color: starColor
                        }} />
                        );
                      })}
                      <span className="rating-value">{rating.rating}.0</span>
                    </div>
                  </div>
                  {rating.comment && (
                    <div className="rating-comment">{rating.comment}</div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add Review Form */}
            <div className="add-rating-form">
              <div className="rating-form-title">ADD YOUR REVIEW</div>
              <div className="star-selector">
                {[...Array(5)].map((_, i) => {
                  // Color based on total rating selected - Red to Gold gradient
                  const getColorForRating = (rating) => {
                    if (rating === 5) return '#FFD700'; // Gold
                    if (rating === 4) return '#FFB800'; // Yellow-orange
                    if (rating === 3) return '#FF9500'; // Orange
                    if (rating === 2) return '#FF6B00'; // Dark orange
                    if (rating === 1) return '#FF4444'; // Red-orange
                    return 'rgba(255,255,255,0.3)'; // Gray for unselected
                  };
                  
                  const isEmpty = i >= selectedStars;
                  const starColor = isEmpty ? 'rgba(255,255,255,0.3)' : getColorForRating(selectedStars);
                  
                  return (
                    <Star 
                            key={i}
                      size={24} 
                      onClick={() => setSelectedStars(i + 1)}
                      style={{ 
                        fill: isEmpty ? 'transparent' : starColor,
                        color: starColor,
                        cursor: 'pointer'
                      }} 
                    />
                  );
                })}
              </div>
              <textarea
                className="rating-comment-input"
                placeholder="Share your experience..."
                value={newRatingComment}
                onChange={(e) => setNewRatingComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && selectedStars > 0 && newRatingComment.trim()) {
                    e.preventDefault();
                    handlePostRating();
                  }
                }}
                rows={3}
              />
              <div className="post-rating-btn-wrapper">
                <button 
                  className="post-rating-btn" 
                  onClick={handlePostRating}
                  disabled={selectedStars === 0 || !newRatingComment.trim()}
                >
                  Post Review
                </button>
              </div>
            </div>
                      </div>
                    </div>
                  )}
      
      {/* Switch Game Confirmation Modal */}
      {showSwitchGameModal && (
        <div className="properties-modal-overlay" onClick={handleCancelSwitchGame}>
          <div className="switch-game-modal" onClick={(e) => e.stopPropagation()}>
            <div className="switch-game-modal-header">
              <h2>Switch Game?</h2>
              <button className="switch-game-modal-close" onClick={handleCancelSwitchGame}>
                <X size={20} />
              </button>
            </div>
            <div className="switch-game-modal-content">
              <p>
                {currentlyPlayingGameId && gamesData[currentlyPlayingGameId] ? (
                  <>Another game (<strong>{gamesData[currentlyPlayingGameId].name}</strong>) is currently running.<br /><br />Do you want to close it and start <strong>{game.name}</strong> instead?</>
                ) : (
                  <>Another game is currently running.<br /><br />Do you want to close it and start this game instead?</>
                )}
              </p>
            </div>
            <div className="switch-game-modal-actions">
              <button 
                className="switch-game-modal-btn switch-game-modal-btn-cancel" 
                onClick={handleCancelSwitchGame}
              >
                Cancel
              </button>
              <button 
                className="switch-game-modal-btn switch-game-modal-btn-confirm" 
                onClick={handleConfirmSwitchGame}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Modal */}
      {showPropertiesModal && (
        <div className="properties-modal-overlay" onClick={() => setShowPropertiesModal(false)}>
          <div className="properties-modal" onClick={(e) => e.stopPropagation()}>
            <div className="properties-modal-header">
              <h2>Game Properties</h2>
              <button className="properties-modal-close" onClick={() => setShowPropertiesModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="properties-modal-content">
              <div className="properties-sidebar">
                <div className="sidebar-header">
                  <Info size={16} />
                  <span>Settings</span>
                </div>
                <button 
                  className={`properties-nav-item ${propertiesSection === 'general' ? 'active' : ''}`}
                  onClick={() => setPropertiesSection('general')}
                >
                  <Info size={16} />
                  <span>General</span>
                </button>
                <button 
                  className={`properties-nav-item ${propertiesSection === 'install' ? 'active' : ''}`}
                  onClick={() => setPropertiesSection('install')}
                >
                  <DownloadIcon size={16} />
                  <span>Install</span>
                </button>
                <button 
                  className={`properties-nav-item ${propertiesSection === 'local-files' ? 'active' : ''}`}
                  onClick={() => setPropertiesSection('local-files')}
                >
                  <FolderOpen size={16} />
                  <span>Local Files</span>
                </button>
                <button 
                  className={`properties-nav-item ${propertiesSection === 'updates' ? 'active' : ''}`}
                  onClick={() => setPropertiesSection('updates')}
                >
                  <RefreshCw size={16} />
                  <span>Updates</span>
                </button>
                <button 
                  className={`properties-nav-item ${propertiesSection === 'launch' ? 'active' : ''}`}
                  onClick={() => setPropertiesSection('launch')}
                >
                  <Activity size={16} />
                  <span>Launch Options</span>
                </button>
                <button 
                  className={`properties-nav-item ${propertiesSection === 'cloud-saves' ? 'active' : ''}`}
                  onClick={() => setPropertiesSection('cloud-saves')}
                >
                  <Save size={16} />
                  <span>Cloud Saves</span>
                </button>
              </div>
              
              <div className="properties-content">
                {propertiesSection === 'general' && (
                  <div className="properties-section">
                    <h3>General Information</h3>
                    <div className="property-card">
                      <div className="properties-grid">
                        <div className="property-item">
                          <span className="property-label">Name</span>
                          <span className="property-value">{game.name}</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Developer</span>
                          <span className="property-value">{game.developer}</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Publisher</span>
                          <span className="property-value">{game.publisher || game.developer}</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Release Date</span>
                          <span className="property-value">{game.releaseDate}</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Install Size</span>
                          <span className="property-value">{game.size}</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Playtime</span>
                          <span className="property-value">{game.playtime}</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Genre</span>
                          <span className="property-value">Action, Adventure, RPG</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Platform</span>
                          <span className="property-value">Windows</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Language</span>
                          <span className="property-value">English, German, French</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Version</span>
                          <span className="property-value">1.2.5 (Build 8421)</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Store Page</span>
                          <span className="property-value link">View on Kinma Store</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Last Modified</span>
                          <span className="property-value">2 days ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="property-card">
                      <h4>Tags</h4>
                      <div className="tags-container">
                        <span className="tag">Action</span>
                        <span className="tag">Adventure</span>
                        <span className="tag">RPG</span>
                        <span className="tag">Fantasy</span>
                        <span className="tag">Open World</span>
                        <span className="tag">Single Player</span>
                        <span className="tag">Story Rich</span>
                        <span className="tag">Exploration</span>
                      </div>
                    </div>
                    <div className="property-card">
                      <h4>System Requirements</h4>
                      <div className="requirements-grid">
                        <div>
                          <span className="property-label">Minimum</span>
                          <ul>
                            <li>OS: Windows 10 (64-bit)</li>
                            <li>CPU: Intel i5-8400 / Ryzen 5 2600</li>
                            <li>RAM: 8 GB</li>
                            <li>GPU: GTX 1060 6GB / RX 580</li>
                            <li>DirectX: Version 11</li>
                            <li>Storage: 50 GB available space</li>
                            <li>Network: Broadband Internet connection</li>
                          </ul>
                        </div>
                        <div>
                          <span className="property-label">Recommended</span>
                          <ul>
                            <li>OS: Windows 11 (64-bit)</li>
                            <li>CPU: Intel i7-10700K / Ryzen 7 3700X</li>
                            <li>RAM: 16 GB</li>
                            <li>GPU: RTX 3070 / RX 6800 XT</li>
                            <li>DirectX: Version 12</li>
                            <li>Storage: 50 GB SSD</li>
                            <li>Network: Broadband Internet connection</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {propertiesSection === 'updates' && (
                  <div className="properties-section">
                    <h3>Update Settings</h3>
                    <div className="property-card">
                      <div className="toggle-item">
                        <div>
                          <span className="toggle-label">Enable Automatic Updates</span>
                          <span className="toggle-description">Automatically download and install updates when available</span>
                  </div>
                        <label className="toggle-switch">
                          <input type="checkbox" defaultChecked />
                          <span className="toggle-slider"></span>
                        </label>
                </div>
              </div>
                    <div className="property-card">
                      <div className="form-item">
                        <label>Update Branch</label>
                        <select defaultValue="default">
                          <option value="default">Default</option>
                          <option value="beta">Beta</option>
                          <option value="experimental">Experimental</option>
                        </select>
                        <span className="form-hint">Current: Default Branch</span>
                      </div>
                      <div className="form-item">
                        <label>Update Schedule</label>
                        <select defaultValue="always">
                          <option value="always">Always update</option>
                          <option value="playing">Only when not playing</option>
                          <option value="manual">Manual update only</option>
                        </select>
                        <span className="form-hint">Choose when updates are installed</span>
                      </div>
                    </div>
                    <div className="property-card">
                      <div className="info-box">
                        <RefreshCw size={18} />
                        <div>
                          <span>Last updated: 2 days ago</span>
                          <span className="text-muted">Version 1.2.5 (Build 8421)</span>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button className="properties-btn btn-primary">
                          <RefreshCw size={16} />
                          Check for Updates
                        </button>
                        <button className="properties-btn btn-secondary">
                          View Update History
                        </button>
                      </div>
                    </div>
                    <div className="property-card">
                      <h4>Update History</h4>
                      <div className="update-history">
                        <div className="history-item">
                          <div className="history-version">v1.2.5</div>
                          <div className="history-date">2 days ago</div>
                          <div className="history-notes">Bug fixes and performance improvements</div>
                        </div>
                        <div className="history-item">
                          <div className="history-version">v1.2.4</div>
                          <div className="history-date">1 week ago</div>
                          <div className="history-notes">New content and stability improvements</div>
                        </div>
                        <div className="history-item">
                          <div className="history-version">v1.2.3</div>
                          <div className="history-date">2 weeks ago</div>
                          <div className="history-notes">Security patches and minor fixes</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {propertiesSection === 'local-files' && (
                  <div className="properties-section">
                    <h3>Local Files</h3>
                    <div className="property-card">
                      <span className="property-label">Install Location</span>
                      <div className="property-location">
                        <HardDrive size={18} />
                        <span className="location-path">C:\Games\{game.name}</span>
                        <button className="properties-btn btn-secondary">Browse</button>
                      </div>
                    </div>
                    <div className="property-card">
                      <h4>Disk Space</h4>
                      <div className="disk-space">
                        <div className="disk-bar-container">
                          <div className="disk-bar-fill" style={{ width: '27%' }}></div>
                        </div>
                        <div className="disk-info">
                          <span><strong>Used:</strong> 12.5 GB</span>
                          <span><strong>Available:</strong> 450 GB</span>
                          <span><strong>Total:</strong> 512 GB</span>
                        </div>
                      </div>
                    </div>
                    <div className="property-card">
                      <h4>File Information</h4>
                      <div className="properties-grid">
                        <div className="property-item">
                          <span className="property-label">Executable</span>
                          <span className="property-value">GameName.exe</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Installed Files</span>
                          <span className="property-value">8,542 files</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Folders</span>
                          <span className="property-value">1,234 folders</span>
                        </div>
                        <div className="property-item">
                          <span className="property-label">Last Verified</span>
                          <span className="property-value">3 days ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="property-card">
                      <div className="action-buttons">
                        <button className="properties-btn btn-primary">
                          <HardDrive size={16} />
                          Verify Game Files
                        </button>
                        <button className="properties-btn btn-secondary">
                          <FolderOpen size={16} />
                          Open Folder
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {propertiesSection === 'install' && (
                  <div className="properties-section">
                    <h3>Install Settings</h3>
                    <div className="property-card">
                      <div className="form-item">
                        <label>Install Path</label>
                        <input type="text" defaultValue={`C:\\Games\\${game.name}`} />
                      </div>
                      <div className="form-item">
                        <label>Language</label>
                        <select defaultValue="english">
                          <option value="english">English</option>
                          <option value="german">German</option>
                          <option value="french">French</option>
                          <option value="spanish">Spanish</option>
                          <option value="italian">Italian</option>
                          <option value="japanese">Japanese</option>
                        </select>
                      </div>
                    </div>
                    <div className="property-card">
                      <h4>DLC & Add-ons</h4>
                      <div className="dlc-list">
                        <div className="dlc-item">
                          <input type="checkbox" defaultChecked />
                          <span>Season Pass</span>
                          <span className="dlc-size">+8.2 GB</span>
                        </div>
                        <div className="dlc-item">
                          <input type="checkbox" defaultChecked />
                          <span>Expansion Pack</span>
                          <span className="dlc-size">+12.5 GB</span>
                        </div>
                        <div className="dlc-item">
                          <input type="checkbox" />
                          <span>Cosmetic Pack</span>
                          <span className="dlc-size">+500 MB</span>
                        </div>
                      </div>
                    </div>
                    <div className="property-card">
                      <div className="action-buttons">
                        <button className="properties-btn btn-primary">Apply Changes</button>
                        <button className="properties-btn btn-secondary">Reset to Default</button>
                      </div>
                    </div>
                  </div>
                )}
                
                {propertiesSection === 'launch' && (
                  <div className="properties-section">
                    <h3>Launch Options</h3>
                    <div className="property-card">
                      <div className="form-item">
                        <label>Additional Launch Arguments</label>
                        <textarea 
                          placeholder="Example: -windowed -fullscreen -novid" 
                          rows={4}
                        />
                        <span className="form-hint">Add command line arguments for the game executable</span>
                  </div>
                  </div>
                    <div className="property-card">
                      <div className="toggle-item">
                        <div>
                          <span className="toggle-label">Launch as Administrator</span>
                          <span className="toggle-description">Run the game with elevated privileges</span>
                </div>
                        <label className="toggle-switch">
                          <input type="checkbox" />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="property-card">
                      <div className="toggle-item">
                        <div>
                          <span className="toggle-label">Force Compatibility Mode</span>
                          <span className="toggle-description">Run in compatibility mode for older games</span>
                        </div>
                        <label className="toggle-switch">
                          <input type="checkbox" />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {propertiesSection === 'cloud-saves' && (
                  <div className="properties-section">
                    <h3>Cloud Saves</h3>
                    <div className="property-card">
                      <div className="toggle-item">
                        <div>
                          <span className="toggle-label">Enable Cloud Synchronization</span>
                          <span className="toggle-description">Sync save files to the cloud</span>
                      </div>
                        <label className="toggle-switch">
                          <input type="checkbox" defaultChecked />
                          <span className="toggle-slider"></span>
                        </label>
                </div>
              </div>
                    <div className="property-card">
                      <div className="save-status">
                        <Save size={18} />
                        <div>
                          <span><strong>Cloud Sync Status:</strong> Enabled</span>
                          <span className="text-success">Last synced: 5 minutes ago</span>
                        </div>
                      </div>
                      <div className="action-buttons">
                        <button className="properties-btn btn-primary">
                          <Save size={16} />
                          Sync Now
                        </button>
                        <button className="properties-btn btn-secondary">
                          View Cloud Saves
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patch Comments Popup */}
      {selectedPatchComments !== null && (
        <div className="patch-comments-popup-overlay" onClick={() => setSelectedPatchComments(null)}>
          <div className="patch-comments-popup" onClick={(e) => e.stopPropagation()}>
            <div className="patch-comments-popup-header">
              <h3>Patch Notes - {patchNotes[selectedPatchComments].title}</h3>
              <button className="patch-comments-popup-close" onClick={() => setSelectedPatchComments(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="patch-comments-popup-content">
              {/* Left Side - Update Info */}
              <div className="patch-comments-popup-left">
                <div className="patch-comments-popup-image">
                  <div className="patch-comments-popup-image-placeholder">🎮</div>
                  <div className="patch-comments-popup-title-overlay">
                    <h4>{patchNotes[selectedPatchComments].title}</h4>
                    <p>Version {patchNotes[selectedPatchComments].version}</p>
                  </div>
                </div>
                <div className="patch-comments-popup-changes">
                  <div className="patch-comments-popup-changes-header">
                    <h4>Changes</h4>
                  </div>
                  {!showCommentSection && (
                    <button 
                      className="patch-comments-popup-toggle-btn"
                      onClick={() => setShowCommentSection(!showCommentSection)}
                    >
                      <MessageSquare size={16} />
                      <span>{patchCommentsData[selectedPatchComments].length}</span>
                    </button>
                  )}
                  {patchNotes[selectedPatchComments].changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="patch-changes-category">
                      <h5 className="patch-changes-category-title">{change.category}</h5>
                      <div className="patch-changes-list">
                        {change.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="patch-change">
                            <Check size={14} />
                            <span className={`change-type ${item.type}`}>
                              {item.type === 'added' ? '+' : item.type === 'improved' ? '~' : item.type === 'fixed' ? '×' : '•'}
                            </span>
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Right Side - Comments */}
              {showCommentSection && (
                <div className="patch-comments-popup-right">
                  <div className="patch-comments-popup-right-header">
                    <h4>Comments</h4>
                    <div className="patch-comments-popup-header-actions">
                      <div className="patch-comments-popup-sort-container">
                        <button 
                          className="patch-comments-popup-sort-btn"
                          onClick={() => setShowCommentSortMenu(!showCommentSortMenu)}
                          title="Sort comments"
                        >
                          <ArrowDownUp size={14} />
                          <span className="sort-label">
                            {commentSort === 'newest' && 'Newest'}
                            {commentSort === 'oldest' && 'Oldest'}
                            {commentSort === 'most-upvoted' && 'Most Upvoted'}
                            {commentSort === 'most-downvoted' && 'Most Downvoted'}
                          </span>
                        </button>
                        {showCommentSortMenu && (
                          <div className="patch-comments-popup-sort-menu">
                            <button onClick={() => { setCommentSort('newest'); setShowCommentSortMenu(false); }}>Newest First</button>
                            <button onClick={() => { setCommentSort('oldest'); setShowCommentSortMenu(false); }}>Oldest First</button>
                            <button onClick={() => { setCommentSort('most-upvoted'); setShowCommentSortMenu(false); }}>Most Upvoted</button>
                            <button onClick={() => { setCommentSort('most-downvoted'); setShowCommentSortMenu(false); }}>Most Downvoted</button>
                          </div>
                        )}
                      </div>
                      <button 
                        className="patch-comments-popup-close-comments-btn"
                        onClick={() => setShowCommentSection(false)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="patch-comments-popup-list">
                    {[...patchCommentsData[selectedPatchComments]].sort((a, b) => {
                      if (commentSort === 'newest') {
                        return b.id - a.id;
                      } else if (commentSort === 'oldest') {
                        return a.id - b.id;
                      } else if (commentSort === 'most-upvoted') {
                        return b.upvotes - a.upvotes;
                      } else if (commentSort === 'most-downvoted') {
                        return b.downvotes - a.downvotes;
                      }
                      return 0;
                    }).map(comment => (
                      <div key={comment.id} className="patch-comment-popup-item">
                        <div className="patch-comment-popup-main">
                          <div className="patch-comment-popup-avatar">
                            {comment.avatar}
                          </div>
                          <div className="patch-comment-popup-content">
                            <div className="patch-comment-popup-header">
                              <span className="patch-comment-popup-user">{comment.user}</span>
                              <span className="patch-comment-popup-time">{comment.time}</span>
                            </div>
                            <p className="patch-comment-popup-text">{comment.text}</p>
                            {comment.media && comment.media.length > 0 && (
                              <div className="patch-comment-popup-media">
                                {comment.media.map((media, mediaIndex) => (
                                  <div key={mediaIndex} className="patch-comment-media-item">
                                    <PatchCommentMedia media={media} />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="patch-comment-popup-actions">
                              <button
                                className={`patch-comment-action-btn ${comment.userVote === 'up' ? 'active upvote' : ''}`}
                                onClick={(e) => handleCommentVote(selectedPatchComments, comment.id, 'up', e)}
                              >
                                <ChevronUp size={14} />
                                <span>{comment.upvotes}</span>
                              </button>
                              <button
                                className={`patch-comment-action-btn ${comment.userVote === 'down' ? 'active downvote' : ''}`}
                                onClick={(e) => handleCommentVote(selectedPatchComments, comment.id, 'down', e)}
                              >
                                <ChevronDown size={14} />
                                <span>{comment.downvotes}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedMedia.length > 0 && (
                    <div className="patch-comments-popup-selected-media">
                      {selectedMedia.map((media, index) => (
                        <div key={index} className="patch-comment-preview-media">
                          {media.type === 'image' ? (
                            <img src={media.src} alt="Preview" />
                          ) : (
                            <video src={media.src} controls />
                          )}
                          <button onClick={() => removeMedia(index)} className="remove-media-btn">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="patch-comments-popup-input-container">
                    <input
                      type="file"
                      id="patch-comment-media-upload"
                      accept="image/*,video/*"
                      onChange={handleImageUpload}
                      multiple
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="patch-comment-media-upload" className="patch-comments-popup-attach-btn">
                      <ImageIcon size={18} />
                    </label>
                    <input
                      type="text"
                      className="patch-comments-popup-input"
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <button 
                      className="patch-comments-popup-send-btn"
                      onClick={handlePostPatchComment}
                      disabled={!newComment.trim() && selectedMedia.length === 0}
                    >
                      <MessageSquare size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Game;
