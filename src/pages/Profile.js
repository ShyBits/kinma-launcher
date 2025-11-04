import React, { useState, useEffect, useRef } from 'react';
import { User, Edit2, X, Plus, Layout, BarChart3, Image, List, Code, Save, Terminal, Bug, FileText, AlertCircle } from 'lucide-react';
import { getUserData, saveUserData } from '../utils/UserDataManager';
import CodeEditor from '../components/CodeEditor';
import './Profile.css';

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
  const [activeTab, setActiveTab] = useState('html');
  const [debugConsole, setDebugConsole] = useState([]);
  const [output, setOutput] = useState([]);
  const [terminal, setTerminal] = useState([]);
  const [problems, setProblems] = useState([]);

  const previewRef = useRef(null);
  const editorRef = useRef(null);
  const isResizingRef = useRef(false);

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

  const handleResizeStart = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    
    const startY = e.clientY;
    const startHeight = previewHeight;
    const containerHeight = e.currentTarget.closest('.profile-edit-content').offsetHeight;
    
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      
      const deltaY = e.clientY - startY;
      const maxHeight = containerHeight * 0.9;
      const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY));
      setPreviewHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const userName = authUser?.name || authUser?.username || authUser?.email?.split('@')[0] || 'Player';

  const handleAddPrebuilt = (type) => {
    const prebuiltItems = {
      header: {
        html: '<div class="profile-header">\n  <div class="header-content">\n    <h1>Profile Header</h1>\n    <p class="header-subtitle">Welcome to my profile</p>\n  </div>\n</div>\n',
        css: '.profile-header {\n  background: #ffffff;\n  padding: 40px;\n  border-radius: 8px;\n  margin-bottom: 20px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n\n.profile-header .header-content {\n  text-align: center;\n}\n\n.profile-header h1 {\n  color: #000000;\n  margin: 0 0 10px 0;\n  font-size: 32px;\n  font-weight: 600;\n}\n\n.profile-header .header-subtitle {\n  color: #666666;\n  margin: 0;\n  font-size: 16px;\n  font-weight: 400;\n}\n',
        cssSelector: '.profile-header',
        js: ''
      },
      stats: {
        html: '<div class="profile-stats">\n  <div class="stat-item">\n    <span class="stat-label">Stat Label</span>\n    <span class="stat-value">0</span>\n  </div>\n  <div class="stat-item">\n    <span class="stat-label">Another Stat</span>\n    <span class="stat-value">0</span>\n  </div>\n</div>\n',
        css: '.profile-stats {\n  background: #ffffff;\n  padding: 30px;\n  border-radius: 8px;\n  margin-bottom: 20px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n\n.profile-stats .stat-item {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 15px;\n  border-bottom: 1px solid #e0e0e0;\n  transition: background-color 0.2s ease;\n}\n\n.profile-stats .stat-item:hover {\n  background-color: #f5f5f5;\n}\n\n.profile-stats .stat-item:last-child {\n  border-bottom: none;\n}\n\n.profile-stats .stat-label {\n  color: #666666;\n  font-size: 14px;\n  font-weight: 400;\n}\n\n.profile-stats .stat-value {\n  color: #000000;\n  font-size: 18px;\n  font-weight: 600;\n}\n',
        cssSelector: '.profile-stats',
        js: ''
      },
      gallery: {
        html: '<div class="profile-gallery">\n  <h2 class="gallery-title">Gallery</h2>\n  <div class="gallery-grid">\n    <div class="gallery-item">\n      <div class="gallery-item-placeholder">Image Placeholder</div>\n    </div>\n    <div class="gallery-item">\n      <div class="gallery-item-placeholder">Image Placeholder</div>\n    </div>\n    <div class="gallery-item">\n      <div class="gallery-item-placeholder">Image Placeholder</div>\n    </div>\n  </div>\n</div>\n',
        css: '.profile-gallery {\n  background: #ffffff;\n  padding: 30px;\n  border-radius: 8px;\n  margin-bottom: 20px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n\n.profile-gallery .gallery-title {\n  color: #000000;\n  margin: 0 0 20px 0;\n  font-size: 24px;\n  font-weight: 600;\n}\n\n.profile-gallery .gallery-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));\n  gap: 15px;\n}\n\n.profile-gallery .gallery-item {\n  aspect-ratio: 1;\n  border-radius: 4px;\n  overflow: hidden;\n  transition: transform 0.2s ease;\n}\n\n.profile-gallery .gallery-item:hover {\n  transform: scale(1.05);\n}\n\n.profile-gallery .gallery-item-placeholder {\n  width: 100%;\n  height: 100%;\n  background: #f0f0f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #999999;\n  font-size: 14px;\n}\n',
        cssSelector: '.profile-gallery',
        js: ''
      },
      bio: {
        html: '<div class="profile-bio">\n  <h2 class="bio-title">About Me</h2>\n  <div class="bio-content">\n    <p>Your bio here. Write a brief description about yourself, your interests, and what makes you unique.</p>\n    <p>You can add multiple paragraphs to make your bio more detailed and engaging.</p>\n  </div>\n</div>\n',
        css: '.profile-bio {\n  background: #ffffff;\n  padding: 30px;\n  border-radius: 8px;\n  margin-bottom: 20px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n\n.profile-bio .bio-title {\n  color: #000000;\n  margin: 0 0 15px 0;\n  font-size: 24px;\n  font-weight: 600;\n}\n\n.profile-bio .bio-content {\n  color: #333333;\n}\n\n.profile-bio .bio-content p {\n  margin: 0 0 15px 0;\n  line-height: 1.6;\n  font-size: 16px;\n}\n\n.profile-bio .bio-content p:last-child {\n  margin-bottom: 0;\n}\n',
        cssSelector: '.profile-bio',
        js: ''
      },
      timeline: {
        html: '<div class="profile-timeline">\n  <h2 class="timeline-title">Timeline</h2>\n  <div class="timeline-content">\n    <div class="timeline-item">\n      <div class="timeline-date">2024</div>\n      <div class="timeline-text">Timeline Item Description</div>\n    </div>\n    <div class="timeline-item">\n      <div class="timeline-date">2023</div>\n      <div class="timeline-text">Another Timeline Item</div>\n    </div>\n  </div>\n</div>\n',
        css: '.profile-timeline {\n  background: #ffffff;\n  padding: 30px;\n  border-radius: 8px;\n  margin-bottom: 20px;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n\n.profile-timeline .timeline-title {\n  color: #000000;\n  margin: 0 0 20px 0;\n  font-size: 24px;\n  font-weight: 600;\n}\n\n.profile-timeline .timeline-content {\n  position: relative;\n}\n\n.profile-timeline .timeline-item {\n  display: flex;\n  gap: 20px;\n  padding: 15px;\n  padding-left: 20px;\n  border-left: 3px solid #4a9eff;\n  margin-bottom: 20px;\n  transition: background-color 0.2s ease;\n}\n\n.profile-timeline .timeline-item:hover {\n  background-color: #f5f5f5;\n}\n\n.profile-timeline .timeline-item:last-child {\n  margin-bottom: 0;\n}\n\n.profile-timeline .timeline-date {\n  color: #4a9eff;\n  font-weight: 600;\n  font-size: 14px;\n  min-width: 60px;\n  flex-shrink: 0;\n}\n\n.profile-timeline .timeline-text {\n  color: #333333;\n  font-size: 16px;\n  line-height: 1.5;\n}\n',
        cssSelector: '.profile-timeline',
        js: ''
      }
    };

    const item = prebuiltItems[type];
    if (!item) return;

    // Always add HTML (duplicates are fine)
    const newHTML = profileHTML ? profileHTML + '\n' + item.html : item.html;
    
    // Check if CSS already exists - if the main selector is found, don't add it again
    const cssExists = profileCSS && item.cssSelector && profileCSS.includes(item.cssSelector);
    const newCSS = cssExists ? profileCSS : (profileCSS ? profileCSS + '\n' + item.css : item.css);
    
    // Handle JS
    const newJS = item.js ? (profileJS ? profileJS + '\n' + item.js : item.js) : profileJS;

    setProfileHTML(newHTML);
    setProfileCSS(newCSS);
    setProfileJS(newJS);
  };

  const handleSave = () => {
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setShowCustomCode(false);
    setProfileHTML(getUserData('profileHTML', ''));
    setProfileCSS(getUserData('profileCSS', ''));
    setProfileJS(getUserData('profileJS', ''));
  };

  // Render view mode
  if (!isEditMode) {
    return (
      <div className="profile">
        <div className="profile-container">
          <div className="profile-view-mode">
            <div className="profile-placeholder">
              <User size={64} />
              <h2>{userName}</h2>
              <p>Your custom profile page will appear here</p>
              <button className="edit-profile-btn" onClick={() => setIsEditMode(true)}>
                <Edit2 size={16} />
                Edit Profile
              </button>
            </div>
            {(profileHTML || profileCSS || profileJS) && (
              <div 
                className="profile-content-preview"
                dangerouslySetInnerHTML={{ 
                  __html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>${profileCSS}</style>
                    </head>
                    <body>
                      ${profileHTML}
                      <script>${profileJS}</script>
                    </body>
                    </html>
                  `
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render edit mode
  return (
    <div className="profile profile-edit-mode">
      <div className="profile-edit-container">
        {/* Main Content Area */}
        <div className={`profile-edit-content ${isEditMode ? 'sidebar-open' : ''}`}>
          <div className="profile-edit-header">
            <h2>Edit Profile</h2>
            <div className="profile-edit-actions">
              <button className="save-profile-btn" onClick={handleSave}>
                <Save size={16} />
                Save
              </button>
              <button className="cancel-profile-btn" onClick={handleCancel}>
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>

          {!showCustomCode ? (
            <div className="profile-edit-placeholder">
              <p>Click "Custom Code" in the sidebar to start building your profile</p>
            </div>
          ) : (
            <>
              {/* Preview Area */}
              <div 
                className="profile-preview-wrapper" 
                ref={previewRef}
                style={{ height: `${previewHeight}px` }}
              >
                <h3>Preview</h3>
                <div 
                  className="profile-preview-content"
                  dangerouslySetInnerHTML={{ 
                    __html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <style>${profileCSS}</style>
                      </head>
                      <body>
                        ${profileHTML}
                        <script>${profileJS}</script>
                      </body>
                      </html>
                    `
                  }}
                />
              </div>

              {/* Resize Handle */}
              <div 
                className="profile-resize-handle"
                onMouseDown={handleResizeStart}
              />

              {/* Code Editor with Tabs */}
              <div 
                className="profile-editor-wrapper" 
                ref={editorRef}
              >
                <div className="code-section-tabs">
                  <button
                    className={`code-tab ${activeTab === 'html' ? 'active' : ''}`}
                    onClick={() => setActiveTab('html')}
                  >
                    <Code size={14} />
                    HTML
                  </button>
                  <button
                    className={`code-tab ${activeTab === 'css' ? 'active' : ''}`}
                    onClick={() => setActiveTab('css')}
                  >
                    <Code size={14} />
                    CSS
                  </button>
                  <button
                    className={`code-tab ${activeTab === 'js' ? 'active' : ''}`}
                    onClick={() => setActiveTab('js')}
                  >
                    <Code size={14} />
                    JavaScript
                  </button>
                  
                  <div className="code-tab-separator" />
                  
                  <button
                    className={`code-tab ${activeTab === 'debug' ? 'active' : ''}`}
                    onClick={() => setActiveTab('debug')}
                  >
                    <Bug size={14} />
                    Debug Console
                  </button>
                  <button
                    className={`code-tab ${activeTab === 'output' ? 'active' : ''}`}
                    onClick={() => setActiveTab('output')}
                  >
                    <FileText size={14} />
                    Output
                  </button>
                  <button
                    className={`code-tab ${activeTab === 'terminal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('terminal')}
                  >
                    <Terminal size={14} />
                    Terminal
                  </button>
                </div>

                <div className="code-section-content">
                  {activeTab === 'html' && (
                    <CodeEditor
                      value={profileHTML}
                      onChange={(e) => setProfileHTML(e.target.value)}
                      language="html"
                      placeholder="Enter your HTML code here..."
                    />
                  )}

                  {activeTab === 'css' && (
                    <CodeEditor
                      value={profileCSS}
                      onChange={(e) => setProfileCSS(e.target.value)}
                      language="css"
                      placeholder="Enter your CSS code here..."
                    />
                  )}

                  {activeTab === 'js' && (
                    <CodeEditor
                      value={profileJS}
                      onChange={(e) => setProfileJS(e.target.value)}
                      language="javascript"
                      placeholder="Enter your JavaScript code here..."
                    />
                  )}

                  {activeTab === 'debug' && (
                    <div className="debug-console-panel">
                      <div className="panel-header">
                        <span>Debug Console</span>
                        <button 
                          className="clear-panel-btn"
                          onClick={() => setDebugConsole([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="panel-content">
                        {debugConsole.length === 0 ? (
                          <div className="panel-empty">No debug messages</div>
                        ) : (
                          debugConsole.map((msg, index) => (
                            <div key={index} className={`console-message ${msg.type}`}>
                              <span className="console-time">{msg.time}</span>
                              <span className="console-text">{msg.text}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'output' && (
                    <div className="output-panel">
                      <div className="panel-header">
                        <span>Output</span>
                        <button 
                          className="clear-panel-btn"
                          onClick={() => setOutput([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="panel-content">
                        {output.length === 0 ? (
                          <div className="panel-empty">No output</div>
                        ) : (
                          output.map((msg, index) => (
                            <div key={index} className="output-message">
                              {msg}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'terminal' && (
                    <div className="terminal-panel">
                      <div className="panel-header">
                        <span>Terminal</span>
                        <button 
                          className="clear-panel-btn"
                          onClick={() => setTerminal([])}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="panel-content terminal-content">
                        {terminal.length === 0 ? (
                          <div className="panel-empty">Terminal ready</div>
                        ) : (
                          terminal.map((line, index) => (
                            <div key={index} className="terminal-line">
                              {line}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className={`profile-edit-sidebar ${isEditMode ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Add Items</h3>
            <button className="close-sidebar-btn" onClick={() => setIsEditMode(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="sidebar-content">
            <div className="prebuilt-items">
              <h4>Pre-built Items</h4>
              
              <button className="prebuilt-item-btn" onClick={() => handleAddPrebuilt('header')}>
                <Layout size={20} />
                <span>Header</span>
              </button>

              <button className="prebuilt-item-btn" onClick={() => handleAddPrebuilt('stats')}>
                <BarChart3 size={20} />
                <span>Stats</span>
              </button>

              <button className="prebuilt-item-btn" onClick={() => handleAddPrebuilt('gallery')}>
                <Image size={20} />
                <span>Gallery</span>
              </button>

              <button className="prebuilt-item-btn" onClick={() => handleAddPrebuilt('bio')}>
                <List size={20} />
                <span>Bio</span>
              </button>

              <button className="prebuilt-item-btn" onClick={() => handleAddPrebuilt('timeline')}>
                <BarChart3 size={20} />
                <span>Timeline</span>
              </button>
            </div>

            <div className="sidebar-divider" />

            <div className="custom-code-section">
              <button 
                className="custom-code-btn" 
                onClick={() => {
                  setShowCustomCode(true);
                  if (!profileHTML && !profileCSS && !profileJS) {
                    const customHTML = '<div class="custom-profile">\n  <h1>Custom Profile Page</h1>\n</div>\n';
                    const customCSS = 'body {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 0;\n}\n\n.custom-profile {\n  padding: 20px;\n}\n';
                    const customJS = 'console.log("Custom profile loaded");\n';
                    setProfileHTML(customHTML);
                    setProfileCSS(customCSS);
                    setProfileJS(customJS);
                  }
                }}
              >
                <Code size={20} />
                <span>Custom Code</span>
                <small>Full profile page builder</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
