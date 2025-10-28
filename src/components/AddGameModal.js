import React, { useState } from 'react';
import { X, Upload, Gamepad2 } from 'lucide-react';
import './AddGameModal.css';

const AddGameModal = ({ onClose, onAddGame }) => {
  const [formData, setFormData] = useState({
    name: '',
    developer: '',
    executablePath: '',
    imageUrl: '',
    description: ''
  });
  const [isSelectingFile, setIsSelectingFile] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectExecutable = async () => {
    setIsSelectingFile(true);
    try {
      const filePath = await window.electronAPI.selectGameExecutable();
      if (filePath) {
        setFormData(prev => ({
          ...prev,
          executablePath: filePath
        }));
      }
    } catch (error) {
      console.error('Failed to select executable:', error);
    } finally {
      setIsSelectingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.executablePath) {
      alert('Please fill in the game name and select an executable file.');
      return;
    }
    onAddGame(formData);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal add-game-modal">
        <div className="modal-header">
          <h2>Add New Game</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-game-form">
          <div className="form-group">
            <label htmlFor="name">Game Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter game name"
              className="input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="developer">Developer</label>
            <input
              type="text"
              id="developer"
              name="developer"
              value={formData.developer}
              onChange={handleInputChange}
              placeholder="Enter developer name"
              className="input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="executablePath">Game Executable *</label>
            <div className="file-selector">
              <input
                type="text"
                id="executablePath"
                name="executablePath"
                value={formData.executablePath}
                onChange={handleInputChange}
                placeholder="Select game executable"
                className="input"
                readOnly
                required
              />
              <button
                type="button"
                onClick={handleSelectExecutable}
                disabled={isSelectingFile}
                className="btn btn-secondary"
              >
                <Upload size={16} />
                {isSelectingFile ? 'Selecting...' : 'Browse'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">Cover Image URL</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              placeholder="Enter image URL (optional)"
              className="input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter game description"
              className="input"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Gamepad2 size={16} />
              Add Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGameModal;
