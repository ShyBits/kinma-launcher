import React, { useState, useRef } from 'react';
import { Image, Edit, Trash2, Upload, X } from 'lucide-react';
import './ImageUpload.css';

const ImageUpload = ({
  label,
  optional = false,
  field,
  value,
  onChange,
  onDelete,
  recommendedSize,
  previewClass = '',
  accept = 'image/*'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onChange(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      e.target.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          onChange(blob);
          break;
        }
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`image-upload-section ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <label className="image-upload-label">
        {label}
        {optional && <span className="optional-label"> (Optional)</span>}
      </label>

      {value ? (
        <div className="image-upload-preview" style={{ position: 'relative' }}>
          <label 
            htmlFor={`file-input-${field}`}
            style={{ cursor: 'pointer', display: 'block' }}
          >
            <img 
              src={typeof value === 'string' ? value : URL.createObjectURL(value)} 
              alt="Preview" 
              className={`image-upload-preview-img ${previewClass}`}
            />
          </label>
          <button
            className="image-upload-delete-btn"
            onClick={onDelete}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FF4757',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              transition: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#ff3838';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#FF4757';
              e.target.style.transform = 'scale(1)';
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label 
          htmlFor={`file-input-${field}`}
          className={`image-upload-dropzone ${isDragging ? 'dragging' : ''}`}
        >
          <Image size={32} />
          <span>
            {isDragging ? 'Drop image here' : `Upload${recommendedSize ? ` ${recommendedSize}` : ''}`}
          </span>
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        id={`file-input-${field}`}
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default ImageUpload;

