import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  User,
  Home,
  RefreshCw,
  Pause,
  Download,
  CheckCircle,
  X,
  Play,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { subscribe as subscribeDownloadSpeed, setSpeed as setGlobalDownloadSpeed, setPaused as setGlobalPaused, clearSpeed as clearGlobalDownloadSpeed } from "../utils/DownloadSpeedStore";
import "./SideBar.css";

const SideBar = ({ currentGame, onGameSelect, navigate, isCollapsed }) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState({ recent: true });
  const [updatingGames, setUpdatingGames] = useState({}); // track updating states
  const [downloadingGames, setDownloadingGames] = useState({}); // track downloading states
  const [gameStatus, setGameStatus] = useState({}); // track status type: "download", "update", "verify", "install"
  const [pausedGames, setPausedGames] = useState({}); // track paused games
  const [hoveredUpdateIcon, setHoveredUpdateIcon] = useState(null); // track hover state
  const [hoveredDownloadId, setHoveredDownloadId] = useState(null); // track hovered download for side menu
  const [sidebarSpeeds, setSidebarSpeeds] = useState({}); // per-game speeds from global store
  const [sidebarProgress, setSidebarProgress] = useState({}); // per-game progress from global store
  const [completedGames, setCompletedGames] = useState({}); // track completed games (true = download, "update" = update)
  const [sideMenuPosition, setSideMenuPosition] = useState(null); // track side menu position
  const updateTimersRef = React.useRef({}); // track update timers for cancellation
  const downloadTimersRef = React.useRef({}); // track download timers for cancellation
  const footerRef = useRef(null);

  // Subscribe to global download speed updates for currently updating games
  useEffect(() => {
    const unsubscribers = Object.keys(updatingGames)
      .filter((gameId) => updatingGames[gameId])
      .map((gameId) =>
        subscribeDownloadSpeed(gameId, (data) => {
          setSidebarSpeeds((prev) => ({ ...prev, [gameId]: data.speed }));
          setSidebarProgress((prev) => ({ ...prev, [gameId]: data.progress }));
        })
      );
    return () => unsubscribers.forEach((u) => u && u());
  }, [updatingGames]);

  // Subscribe to all games for download/update tracking
  useEffect(() => {
    const allGameIds = Object.values(gamesByCategory).flat().map(g => g.id);
    const unsubscribers = allGameIds.map(gameId =>
      subscribeDownloadSpeed(gameId, (data) => {
        setSidebarSpeeds((prev) => ({ ...prev, [gameId]: data.speed }));
        setSidebarProgress((prev) => ({ ...prev, [gameId]: data.progress }));
        
        // Update pause state from global store
        if (data.isPaused !== undefined) {
          setPausedGames((prev) => ({ ...prev, [gameId]: data.isPaused }));
        }
        
        // Mark as downloading when speed > 0
        if (data.speed > 0 && !downloadingGames[gameId]) {
          setDownloadingGames((prev) => ({ ...prev, [gameId]: true }));
          setGameStatus((prev) => ({ ...prev, [gameId]: "download" }));
        }
        
        // Mark as downloading when progress > 0
        if (data.progress > 0 && !downloadingGames[gameId]) {
          setDownloadingGames((prev) => ({ ...prev, [gameId]: true }));
          setGameStatus((prev) => ({ ...prev, [gameId]: "download" }));
        }
        
        // If progress is 100, mark as completed
        if (data.progress >= 100 && downloadingGames[gameId] && data.speed === 0) {
          setCompletedGames((prev) => ({ ...prev, [gameId]: true })); // true = download completed
          setTimeout(() => {
            setDownloadingGames((prev) => ({ ...prev, [gameId]: false }));
            setTimeout(() => {
              setCompletedGames((prev) => {
                const newState = { ...prev };
                delete newState[gameId];
                return newState;
              });
            }, 1000);
          }, 100);
        }
        
        // If speed and progress are both 0 and was downloading, stop the download state after a delay
        if (data.speed === 0 && data.progress === 0 && downloadingGames[gameId]) {
          setTimeout(() => {
            setDownloadingGames((prev) => {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            });
            setPausedGames((prev) => {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            });
          }, 100);
        }
      })
    );
    return () => unsubscribers.forEach((u) => u && u());
  }, []);


  const gamesByCategory = {
    recent: [
      {
        id: "the-finals",
        name: "THE FINALS",
        isPlaying: true,
        icon: "T",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        rating: 4.7,
        playerCount: "1.2M",
        currentPlaying: "245K",
        trending: "+8%",
        description: "A free-to-play, team-based, first-person shooter that puts you in the middle of a virtual game show. Fight alongside your teammates in virtual arenas that you can alter, exploit, and even destroy.",
        tags: ["FPS", "Battle Royale", "Free to Play", "Multiplayer"],
        playtime: "127h 45m",
        lastPlayed: "now",
        size: "25.4 GB",
        developer: "Embark Studios",
        releaseDate: "Dec 2023"
      },
      {
        id: "cs2",
        name: "Counter-Strike 2",
        icon: "C",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        rating: 4.9,
        playerCount: "1.8M",
        currentPlaying: "892K",
        trending: "+12%",
        description: "The next evolution of the world's most popular competitive shooter. Counter-Strike 2 features upgraded visuals, new gameplay mechanics, and enhanced maps while maintaining the classic CS experience.",
        tags: ["FPS", "Competitive", "Tactical", "Multiplayer"],
        playtime: "234h 12m",
        lastPlayed: "1 hour ago",
        size: "32.1 GB",
        developer: "Valve",
        releaseDate: "Sep 2023"
      },
      {
        id: "skate",
        name: "skate.",
        icon: "S",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        rating: 4.5,
        playerCount: "340K",
        currentPlaying: "45K",
        trending: "+25%",
        description: "Experience the most authentic skateboarding simulation ever created. Built from the ground up by skaters for skaters, featuring realistic physics and endless customization options.",
        tags: ["Sports", "Simulation", "Realistic", "Single Player"],
        playtime: "89h 23m",
        lastPlayed: "3 days ago",
        size: "18.7 GB",
        developer: "Full Circle",
        releaseDate: "2024",
        isUpdateQueued: true
      },
      {
        id: "hellblade",
        name: "Hellblade: Senua's Sacrifice",
        icon: "H",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        rating: 4.8,
        playerCount: "2.1M",
        currentPlaying: "12K",
        trending: "+3%",
        description: "From the makers of Heavenly Sword, Enslaved: Odyssey to the West, and DmC: Devil May Cry, comes a warrior's brutal journey into myth and madness.",
        tags: ["Action", "Adventure", "Story Rich", "Atmospheric"],
        playtime: "8h 45m",
        lastPlayed: "1 week ago",
        size: "12.3 GB",
        developer: "Ninja Theory",
        releaseDate: "Aug 2017"
      },
      {
        id: "cyberpunk",
        name: "Cyberpunk 2077",
        icon: "C",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        rating: 4.3,
        playerCount: "890K",
        currentPlaying: "34K",
        trending: "-2%",
        description: "Cyberpunk 2077 is an open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.",
        tags: ["RPG", "Open World", "Sci-Fi", "Single Player"],
        playtime: "156h 32m",
        lastPlayed: "2 days ago",
        size: "70.2 GB",
        developer: "CD Projekt RED",
        releaseDate: "Dec 2020"
      },
      {
        id: "valorant",
        name: "VALORANT",
        icon: "V",
        banner: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=600&fit=crop",
        rating: 4.6,
        playerCount: "1.5M",
        currentPlaying: "456K",
        trending: "+15%",
        description: "A 5v5 character-based tactical shooter where precise gunplay meets unique agent abilities. Think Counter-Strike meets Overwatch.",
        tags: ["FPS", "Tactical", "Competitive", "Multiplayer"],
        playtime: "198h 17m",
        lastPlayed: "5 hours ago",
        size: "23.8 GB",
        developer: "Riot Games",
        releaseDate: "Jun 2020"
      }
    ],
  };

  const toggle = (section) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  const filteredGames = Object.fromEntries(
    Object.entries(gamesByCategory).map(([k, v]) => [
      k,
      v.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    ])
  );


  const handlePauseDownload = (gameId) => {
    const isCurrentlyPaused = pausedGames[gameId];
    const newPausedState = !isCurrentlyPaused;
    
    // Update local state
    setPausedGames((prev) => ({ ...prev, [gameId]: newPausedState }));
    
    // Update global state
    setGlobalPaused(gameId, newPausedState);
    
    // If pausing, set speed to 0 globally
    if (newPausedState) {
      setGlobalDownloadSpeed(gameId, 0, null);
    }
    // If resuming, let the download continue from where it paused
    // The global store will continue to update progress if the download is running
  };

  const handleCancelDownload = (gameId) => {
    // Clear all download states
    setDownloadingGames((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setPausedGames((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setGameStatus((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setSidebarSpeeds((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setSidebarProgress((prev) => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    
    // Clear download speed and progress from global store completely
    clearGlobalDownloadSpeed(gameId);
  };

  const handleGameClick = (id) => {
    onGameSelect?.(id);
    navigate?.(`/game/${id}`);
  };

  const handleUpdateClick = async (gameId) => {
    const currentlyUpdating = updatingGames[gameId];

    if (currentlyUpdating) {
      // Pause/Cancel update
      if (updateTimersRef.current[gameId]) {
        clearTimeout(updateTimersRef.current[gameId]);
        delete updateTimersRef.current[gameId];
      }
      setUpdatingGames((prev) => ({ ...prev, [gameId]: false }));
      return;
    }

    // Start update
    setUpdatingGames((prev) => ({ ...prev, [gameId]: true }));
    setGameStatus((prev) => ({ ...prev, [gameId]: "update" }));

    // Create a promise-based timer that can be cancelled
    const timerPromise = new Promise((resolve) => {
      updateTimersRef.current[gameId] = setTimeout(() => {
        resolve();
        delete updateTimersRef.current[gameId];
      }, 3000);
    });

    try {
      await timerPromise;
      // Show completed state for update (blue)
      setCompletedGames((prev) => ({ ...prev, [gameId]: "update" }));
      setUpdatingGames((prev) => ({ ...prev, [gameId]: false }));
      
      // Clear completed state after 1 second
      setTimeout(() => {
        setCompletedGames((prev) => {
          const newState = { ...prev };
          delete newState[gameId];
          return newState;
        });
      }, 1000);
    } catch (error) {
      // Update was cancelled, nothing to do
    }
  };

  const handleDownloadClick = async (gameId) => {
    const currentlyDownloading = downloadingGames[gameId];

    if (currentlyDownloading) {
      // Pause/Cancel download
      if (downloadTimersRef.current[gameId]) {
        clearTimeout(downloadTimersRef.current[gameId]);
        delete downloadTimersRef.current[gameId];
      }
      setDownloadingGames((prev) => ({ ...prev, [gameId]: false }));
      return;
    }

    // Start download
    setDownloadingGames((prev) => ({ ...prev, [gameId]: true }));

    // Create a promise-based timer that can be cancelled (longer for downloads)
    const timerPromise = new Promise((resolve) => {
      downloadTimersRef.current[gameId] = setTimeout(() => {
        resolve();
        delete downloadTimersRef.current[gameId];
      }, 5000);
    });

    try {
      await timerPromise;
      // Show completed state
      setCompletedGames((prev) => ({ ...prev, [gameId]: true }));
      setDownloadingGames((prev) => ({ ...prev, [gameId]: false }));
      
      // Clear completed state after 1 second
      setTimeout(() => {
        setCompletedGames((prev) => {
          const newState = { ...prev };
          delete newState[gameId];
          return newState;
        });
      }, 1000);
    } catch (error) {
      // Download was cancelled, nothing to do
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {!isCollapsed && (
        <div className="sidebar-top">
          <button
            className={`sidebar-btn ${location.pathname === "/library" ? "active" : ""
              }`}
            onClick={() => navigate("/library")}
          >
            <Home size={16} />
            <span>Library</span>
          </button>

          <div className="sidebar-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="sidebar-content">
          {Object.entries(filteredGames).map(([section, games]) =>
            games.length ? (
              <div key={section} className="sidebar-section">
                <button
                  className="section-header"
                  onClick={() => toggle(section)}
                >
                  <ChevronDown
                    size={16}
                    className={expanded[section] ? "rotated" : ""}
                  />
                  {section.toUpperCase()} ({games.length})
                </button>

                {expanded[section] && (
                  <div className="section-list">
                    {games.map((game) => {
                      const updating = updatingGames[game.id];
                      const downloading = downloadingGames[game.id];
                      const completed = completedGames[game.id];

                      return (
                        <div
                          key={game.id}
                          className={`game-item ${currentGame === game.id ? "active" : ""
                            } ${updating ? "updating" : ""} ${downloading ? "downloading" : ""} ${completed === true ? "completed-download" : ""} ${completed === "update" ? "completed-update" : ""}`}
                          onClick={() => handleGameClick(game.id)}
                        >
                          <div className="game-row">
                            <div className="game-clickable">
                              <div className="game-icon">
                                {game.icon}
                              </div>
                              <div className="game-name">{game.name}</div>
                            </div>

                            {game.isUpdateQueued && (
                              <button
                                className={`update-icon-btn ${updating && hoveredUpdateIcon !== game.id ? "spinning" : ""
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateClick(game.id);
                                }}
                                onMouseEnter={() => setHoveredUpdateIcon(game.id)}
                                onMouseLeave={() => setHoveredUpdateIcon(null)}
                                title={
                                  updating ? "Click to stop update" : "Click to start update"
                                }
                              >
                                {updating && (
                                  <span style={{ marginRight: 8, color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: 600 }}>
                                    {typeof sidebarSpeeds[game.id] === 'number' ? sidebarSpeeds[game.id].toFixed(1) : '0.0'} MB/s
                                  </span>
                                )}
                                {updating && hoveredUpdateIcon === game.id ? (
                                  <Pause key="pause" size={14} data-pause="true" />
                                ) : (
                                  <RefreshCw key="refresh" size={14} />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Download/Update Progress Bar */}
                          {(downloading || updating) && (
                            <div className="game-progress-bar" style={{
                              width: `${downloading ? sidebarProgress[game.id] || 0 : 100}%`
                            }} />
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null
          )}
        </div>
      )}
      
      {!isCollapsed && (
        <div className="sidebar-footer">
          {/* Active Downloads */}
          {(Object.keys(downloadingGames).some(id => downloadingGames[id]) || 
            Object.keys(updatingGames).some(id => updatingGames[id])) && (
            <div className="footer-downloads">
              {Object.entries(downloadingGames).filter(([id, isDownloading]) => isDownloading).map(([gameId]) => {
                const game = Object.values(gamesByCategory).flat().find(g => g.id === gameId);
                const progress = sidebarProgress[gameId] || 0;
                const status = gameStatus[gameId] || "download";
                const statusLabels = {
                  download: "Downloading",
                  update: "Updating",
                  verify: "Verifying",
                  install: "Installing"
                };
                
                const isPaused = pausedGames[gameId];
                const gameName = game?.name || gameId;
                const shouldShowMenu = hoveredDownloadId === gameId;
                
                return (
                  <div 
                    key={gameId} 
                    className={status === "update" ? "footer-update-item" : "footer-download-item"}
                    ref={footerRef}
                    onMouseEnter={(e) => {
                      setHoveredDownloadId(gameId);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const menuWidth = 280;
                      const menuHeight = 290; // approximate height
                      
                      // Calculate horizontal position
                      const rightSpace = window.innerWidth - rect.right;
                      let left = rect.right + 8;
                      
                      // Check if menu would overflow to the right
                      if (rightSpace < menuWidth && rect.left > menuWidth) {
                        left = rect.left - menuWidth - 8; // Show to the left
                      }
                      
                      // Calculate vertical position - center menu on item
                      let top = rect.top + (rect.height / 2) - (menuHeight / 2);
                      
                      // Adjust if menu would overflow at the bottom
                      if (top + menuHeight > window.innerHeight) {
                        top = window.innerHeight - menuHeight - 8;
                      }
                      
                      // Adjust if menu would overflow at the top
                      if (top < 8) {
                        top = 8;
                      }
                      
                      setSideMenuPosition({ left, top, gameId });
                    }}
                    onMouseLeave={() => {
                      setHoveredDownloadId(null);
                      setSideMenuPosition(null);
                    }}
                  >
                    <div className="footer-download-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        {status === "download" ? <Download size={14} fill="currentColor" /> : <RefreshCw size={14} fill="currentColor" />}
                        <span className="footer-download-name">{gameName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="footer-download-speed">
                          {isPaused ? "Paused" : (status === "download" ? `${typeof sidebarSpeeds[gameId] === 'number' ? sidebarSpeeds[gameId].toFixed(1) : '0.0'} MB/s` : `${statusLabels[status]}...`)}
                        </span>
                        <button 
                          className="footer-download-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePauseDownload(gameId);
                          }}
                          title={isPaused ? "Resume" : "Pause"}
                        >
                          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                        </button>
                        <button 
                          className="footer-download-btn footer-cancel-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelDownload(gameId);
                          }}
                          title="Cancel"
                        >
                          <X size={14} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                    <div className="footer-progress-bar">
                      <div className="footer-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="footer-info">
            <span className="footer-text">© 2024 Kinma</span>
            <span className="footer-version">v1.0.0</span>
          </div>
        </div>
      )}
      
      {/* Portal for Side Menu */}
      {sideMenuPosition && (() => {
        const hoveredGame = Object.values(gamesByCategory).flat().find(g => g.id === sideMenuPosition.gameId);
        const hoveredProgress = sidebarProgress[sideMenuPosition.gameId] || 0;
        const hoveredStatus = gameStatus[sideMenuPosition.gameId] || "download";
        const hoveredIsPaused = pausedGames[sideMenuPosition.gameId];
        const hoveredSpeed = sidebarSpeeds[sideMenuPosition.gameId];
        const hoveredGameName = hoveredGame?.name || sideMenuPosition.gameId;
        
        // Calculate downloaded size
        const calculateDownloadedSize = (totalSize, progress) => {
          const totalSizeMatch = totalSize?.match(/([\d.]+)\s*(GB|MB)/i);
          if (!totalSizeMatch) return null;
          
          const totalValue = parseFloat(totalSizeMatch[1]);
          const unit = totalSizeMatch[2].toUpperCase();
          const downloadedValue = (totalValue * progress / 100).toFixed(2);
          
          return `${downloadedValue} ${unit}`;
        };
        
        const statusLabels = {
          download: "Downloading",
          update: "Updating",
          verify: "Verifying",
          install: "Installing"
        };
        
        return createPortal(
          <div 
            className="footer-download-side-menu"
            style={{ 
              position: 'fixed',
              left: `${sideMenuPosition.left}px`,
              top: `${sideMenuPosition.top}px`,
              zIndex: 10000
            }}
          >
            <div className="side-menu-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {hoveredStatus === "download" ? <Download size={20} fill="currentColor" /> : <RefreshCw size={20} fill="currentColor" />}
                <span className="side-menu-title">{hoveredGameName}</span>
              </div>
            </div>
            <div className="side-menu-content">
              <div className="side-menu-item">
                <span className="side-menu-label">Status</span>
                <span className="side-menu-value">
                  {hoveredIsPaused ? "Paused" : statusLabels[hoveredStatus] || "Unknown"}
                </span>
              </div>
              <div className="side-menu-item">
                <span className="side-menu-label">Progress</span>
                <span className="side-menu-value">{hoveredProgress.toFixed(1)}%</span>
              </div>
              {hoveredStatus === "download" && (
                <div className="side-menu-item">
                  <span className="side-menu-label">Speed</span>
                  <span className="side-menu-value">
                    {hoveredIsPaused ? "Paused" : `${typeof hoveredSpeed === 'number' ? hoveredSpeed.toFixed(1) : '0.0'} MB/s`}
                  </span>
                </div>
              )}
              {hoveredGame?.size && (
                <div className="side-menu-item">
                  <span className="side-menu-label">Size</span>
                  <span className="side-menu-value">
                    {calculateDownloadedSize(hoveredGame.size, hoveredProgress) ? 
                      `${calculateDownloadedSize(hoveredGame.size, hoveredProgress)} / ${hoveredGame.size}` : 
                      hoveredGame.size}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </aside>
  );
};

export default SideBar;
