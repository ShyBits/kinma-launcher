import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';
import './Item3DView.css';

const Item3DView = ({
  imageUrl,
  image,
  name = '3D Model',
  isMaximized = false,
  onMaximizeToggle,
  showMaximizeButton = true,
  showZoomControls = true,
  maxZoom: propMaxZoom,
  className = '',
  onReset
}) => {
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const containerRef = useRef(null);
  const maxZoom = propMaxZoom || (isMaximized ? 4 : 2);

  // Normalize rotation to -180 to 180 range for shortest path in CSS transitions
  // This prevents unnecessary 360° flips during transitions
  const normalizeRotation = (rotation) => {
    rotation = rotation % 360;
    if (rotation > 180) {
      rotation = rotation - 360;
    } else if (rotation < -180) {
      rotation = rotation + 360;
    }
    return rotation;
  };

  // Mouse rotation and wheel zoom handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rotating = false;
    let lastX = 0;
    let lastY = 0;

    const isOverControls = (target) => {
      return target.closest('.item-3d-controls') || 
             target.closest('.item-3d-btn');
    };

    let panning = false;
    const maxPanX = 400; // Maximum pan distance in pixels (horizontal/width)
    const maxPanYUp = 120; // Maximum pan distance upward (negative Y)
    const maxPanYDown = 100; // Maximum pan distance downward (positive Y)

    const handleDoubleClick = (e) => {
      // Only allow reset when double-clicking on the model wrapper or container, not controls
      if (isOverControls(e.target)) {
        return;
      }
      // Only allow if clicking directly on the model wrapper or container
      if (e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder')) {
        // Reset everything with smooth transition
        setIsResetting(true);
        setRotationX(0);
        setRotationY(0);
        setRotationZ(0);
        setZoom(1);
        setPanX(0);
        setPanY(0);
        if (onReset) onReset();
        // Reset the flag after animation completes
        setTimeout(() => setIsResetting(false), 600);
      }
    };

    const handleMouseDown = (e) => {
      // Only allow rotation/panning when clicking on the model wrapper or container, not controls
      if (isOverControls(e.target)) {
        return;
      }
      // Only allow if clicking directly on the model wrapper or container
      if (e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder')) {
        if (e.button === 0) { // Left mouse button
          lastX = e.clientX;
          lastY = e.clientY;
          
          if (e.shiftKey) {
            // Shift + Left Click = Panning
            panning = true;
            setIsPanning(true);
          } else {
            // Normal Left Click = Rotation
            rotating = true;
            setIsRotating(true);
          }
        }
      }
    };

    const handleMouseMove = (e) => {
      if (rotating) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        // Rotate around Y-axis (horizontal mouse movement) - don't wrap during interaction
        setRotationY(prev => prev + deltaX * 0.5);
        
        // Rotate around X-axis (vertical mouse movement) - don't wrap during interaction
        setRotationX(prev => prev - deltaY * 0.5);
        
        lastX = e.clientX;
        lastY = e.clientY;
      } else if (panning) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        
        // Pan the model (translate)
        setPanX(prev => {
          const newPan = prev + deltaX;
          return Math.max(-maxPanX, Math.min(maxPanX, newPan));
        });
        
        setPanY(prev => {
          const newPan = prev + deltaY;
          return Math.max(-maxPanYUp, Math.min(maxPanYDown, newPan));
        });
        
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };

    const handleMouseUp = () => {
      rotating = false;
      panning = false;
      setIsRotating(false);
      setIsPanning(false);
    };

    const handleWheel = (e) => {
      // Only allow zoom when hovering over the model wrapper, not controls
      if (isOverControls(e.target)) {
        return;
      }
      // Only allow if hovering over the model wrapper or container
      if (e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder')) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.5, Math.min(maxZoom, prev + delta)));
      }
    };

    // Check if mouse is over controls for cursor styling
    const handleMouseMoveCheck = (e) => {
      if (isOverControls(e.target)) {
        container.style.cursor = 'default';
      } else if (e.target.closest('.item-3d-model-wrapper') || e.target === container || e.target.closest('.item-3d-image') || e.target.closest('.item-3d-placeholder')) {
        if (e.shiftKey) {
          container.style.cursor = 'move';
        } else {
          container.style.cursor = 'grab';
        }
      } else {
        container.style.cursor = 'default';
      }
    };

    container.addEventListener('dblclick', handleDoubleClick);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMoveCheck);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('dblclick', handleDoubleClick);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMoveCheck);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.style.cursor = '';
    };
  }, [maxZoom, onReset]);

  // Reset when isMaximized changes
  useEffect(() => {
    if (isMaximized) {
      setIsResetting(true);
      setRotationX(0);
      setRotationY(0);
      setRotationZ(0);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setTimeout(() => setIsResetting(false), 600);
    }
  }, [isMaximized]);

  return (
    <div className={`item-3d-view ${className}`}>
      <div className="item-3d-container" ref={containerRef}>
        <div className="item-3d-model-wrapper" style={{
          transform: `translate(${panX}px, ${panY}px) rotateX(${normalizeRotation(rotationX)}deg) rotateY(${normalizeRotation(rotationY)}deg) rotateZ(${normalizeRotation(rotationZ)}deg) scale(${zoom})`,
          transformStyle: 'preserve-3d',
          transition: (isRotating || isPanning) ? 'none' : (isResetting ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s ease')
        }}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={name}
              className="item-3d-image"
            />
          ) : (
            <div className="item-3d-placeholder">
              <div className="item-3d-icon">{image || '📦'}</div>
              <p>3D Model View</p>
              <span className="item-3d-note">3D model preview will be available here</span>
            </div>
          )}
        </div>
        {showZoomControls && (
          <div className="item-3d-controls item-3d-controls-zoom" onClick={(e) => e.stopPropagation()}>
            <button 
              className="item-3d-btn" 
              title="Zoom In"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(prev => Math.min(prev + 0.1, maxZoom));
              }}
            >
              <Plus size={14} />
            </button>
            <button 
              className="item-3d-btn" 
              title="Zoom Out"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(prev => Math.max(prev - 0.1, 0.5));
              }}
            >
              <Minus size={14} />
            </button>
          </div>
        )}
        {showMaximizeButton && onMaximizeToggle && (
          <button 
            className="item-3d-maximize-btn"
            title={isMaximized ? "Minimize View" : "Maximize View"}
            onClick={(e) => {
              e.stopPropagation();
              onMaximizeToggle();
            }}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default Item3DView;

