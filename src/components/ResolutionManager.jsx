// ResolutionForm.jsx
import { useState, useEffect } from 'react';
import { FaPlus, FaSpinner } from 'react-icons/fa';
import { API_URL } from '../config';
export default function ResolutionForm({ resolution = null, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  useEffect(() => {
    if (resolution) {
      setFormData({ title: resolution.title || '', description: resolution.description || '' });
    }
  }, [resolution]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = resolution ? `${API_URL}/api/resolutions/${resolution.id}` : '${API_URL}/api/admin/resolutions';
      const method = resolution ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create resolution');
      }

      const result = await response.json();
      setSuccessMessage(`Resolution \"${result.title}\" ${resolution ? 'updated' : 'created'} successfully!`);
      setFormData({ title: '', description: '' });
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="resolution-form">
      <h2>{resolution ? 'Edit Resolution' : 'Create New Resolution'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
            minLength="5"
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
            minLength="10"
            rows={5}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || !formData.title || !formData.description}
        >
          {isSubmitting ? (
            <>
              <FaSpinner className="spinner" /> Processing...
            </>
          ) : (
            <>
              <FaPlus /> Add Resolution
            </>
          )}
        </button>
      {onCancel && (
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
        )}
      </form>
    </div>
  );
}