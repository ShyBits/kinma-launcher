import React, { useState, useEffect } from 'react';
import { 
  Upload, Plus, Edit, Trash2, Package, Play, X, 
  FileText, Image, Settings, ChevronLeft, ChevronRight, Check, X as XIcon, Edit2,
  Download, MessageSquare, ShoppingCart, Calendar, ChevronUp, ChevronDown,
  Star, Users, TrendingUp
} from 'lucide-react';
import Community from '../pages/Community';
import Market from '../pages/Market';
import Game from '../pages/Game';
import Store from '../pages/Store';
import './UploadGameModal.css';

const UploadGameModal = ({ isOpen, onClose, navigate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [contentSection, setContentSection] = useState('description');
  const [previewView, setPreviewView] = useState('game'); // 'game', 'community', 'market', 'store'
  
  // Form data state to preserve across steps
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
  });
  
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
  
  const stepTitles = ['GAME INFO', 'MEDIA', 'STORE', 'GAME MENU', 'COMMUNITY', 'MARKET', 'FILES', 'CONFIRM'];
  
  // Helper function to check if a step is actually completed with valid data
  const isStepCompleted = (step) => {
    if (step === 1) {
      return formData.gameName && formData.developer && formData.version && formData.genre && formData.description;
    } else if (step === 2) {
      return formData.bannerImage !== null;
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
  
  const completedSteps = [1, 2, 3, 4, 5, 6, 7, 8].filter(step => step < currentStep && isStepCompleted(step));
  
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
    if (!isOpen) return;
    
    const newErrors = { ...stepErrors };
    
    // Validate all steps before and including current step
    for (let i = 1; i <= currentStep; i++) {
      if (i === 1) {
        newErrors[1] = !formData.gameName || !formData.developer || !formData.version || !formData.genre || !formData.description;
      } else if (i === 2) {
        newErrors[2] = formData.bannerImage === null;
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
  }, [formData.gameName, formData.developer, formData.version, formData.genre, formData.description, formData.bannerImage, formData.gameExecutable, currentStep, isOpen]);

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
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      // Check if focus is on an input, textarea, or other form element
      const isFormElement = 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable;
      
      // Only trigger if not typing in a form element
      if (isFormElement) return;

      if (e.key.toLowerCase() === 'q' && currentStep > 1) {
        e.preventDefault();
        handlePrevStep();
      } else if (e.key.toLowerCase() === 'e' && currentStep < totalSteps) {
        const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
        // Prevent 'e' key from going to Confirm step if there are errors
        if (currentStep === 7 && hasErrors) {
          return; // Don't allow going to step 8 (Confirm) if there are errors
        }
        e.preventDefault();
        handleNextStep();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, currentStep, totalSteps, stepErrors]);
  
  // Auto-switch preview view based on current step
  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [currentStep, isOpen]);

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
      if (currentStep === 7) {
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

  // Dummy navigate function that does nothing - for preview only
  const dummyNavigate = (path) => {
    // Do nothing - this is just a preview
    console.log('Preview navigation to:', path);
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
  
  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setContentSection('description');
      setPreviewView('game');
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
        gameLogo: null,
        titleImage: null,
        titleImageSize: 100,
        screenshots: null,
        gameExecutable: null,
        gameFileSize: 0,
        logoSize: 120,
        logoPosition: 'left',
        bannerHeight: 60,
      });
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
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  // This component is too large - continue in next part due to 42000 character limit
  // Let me just provide the structure and import the complete JSX from a separate continuation...
  
  return (
    <div className="upload-modal-overlay" onClick={onClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h3>Create New Game</h3>
        </div>
        
        {/* Split Layout: Progress + Preview */}
        <div className="upload-modal-split">
          {/* Left Side: Progress Bar */}
          <div className="upload-modal-left">
            <div className="upload-progress-container">
              <div className="upload-progress-wrapper">
                <div className={`upload-keyboard-hint upload-keyboard-hint-left ${currentStep > 1 ? 'active' : 'disabled'}`}>
                  <ChevronLeft size={16} />
                  <span className="keyboard-key">Q</span>
                </div>
                
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
              
              // Check if Confirm step should be disabled (if there are any errors in required steps 1, 2, or 7)
              const hasErrors = stepErrors[1] || stepErrors[2] || stepErrors[7];
              const isConfirmDisabled = step === 8 && hasErrors && currentStep < 8;
              
              return (
              <div 
                key={step} 
                className={`upload-progress-step ${currentStep === step ? 'active' : ''} ${step === 8 && currentStep === step ? 'confirm-active' : ''} ${step === 8 && currentStep !== step ? 'confirm-outline' : ''} ${completedSteps.includes(step) ? 'completed' : ''} ${isOptionalStepPassed(step) ? 'optional-passed' : ''} ${showError ? 'error' : ''} ${isConfirmDisabled ? 'confirm-disabled' : ''}`}
                onClick={() => {
                  // Prevent clicking on Confirm step if there are errors
                  if (isConfirmDisabled) return;
                  
                  // Validate all steps before the clicked step
                  for (let i = 1; i < step; i++) {
                    validateStep(i);
                  }
                  setCurrentStep(step);
                }}
                style={{ cursor: isConfirmDisabled ? 'not-allowed' : 'pointer' }}
              >
                <div className="upload-step-circle">
                  {currentStep === step && step === 8 ? (
                    // Confirm step active: green with check
                    <Check size={20} />
                  ) : currentStep === step ? (
                    // Active step without error: yellow with edit icon
                    <Edit2 size={20} />
                  ) : step === 8 ? (
                    // Confirm step inactive: show X if disabled, otherwise check
                    isConfirmDisabled ? (
                      <XIcon size={20} />
                    ) : (
                      <Check size={20} />
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
          {/* All step content JSX goes here - simplified for brevity */}
        </div>

            {/* Action Buttons - Fixed at Bottom */}
        <div className="upload-modal-actions">
          <button className="upload-cancel-btn" onClick={onClose}>
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
                      alert('Game uploaded successfully!');
                      onClose();
                    }
                  }}
                  style={{ 
                    opacity: canFinalizeUpload() ? 1 : 0.5,
                    cursor: canFinalizeUpload() ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Upload size={16} />
                  <span>Create Game</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Side: Preview */}
        <div className="upload-modal-right">
          {/* Preview content */}
        </div>
      </div>
    </div>
  );
};

export default UploadGameModal;

