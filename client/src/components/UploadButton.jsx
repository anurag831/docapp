import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { docs } from '../api';

export default function UploadButton({ onUploadSuccess }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const navigate = useNavigate();

  const handleButtonClick = () => {
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension client-side
    const validExtensions = ['.txt', '.md'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      alert('Only .txt and .md files are supported.');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setUploadError('');
      const res = await docs.upload(formData);
      if (onUploadSuccess) {
        onUploadSuccess(res.data);
      } else {
        navigate(`/editor/${res.data.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to upload file';
      setUploadError(msg);
      alert(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="upload-button-wrapper" style={{ display: 'inline-block' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.md"
        style={{ display: 'none' }}
        id="file-upload-input"
      />
      <button
        type="button"
        id="btn-upload"
        className="btn btn-outline"
        onClick={handleButtonClick}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : '📁 Upload (.txt, .md)'}
      </button>
      {uploadError && <span className="upload-error-text">{uploadError}</span>}
    </div>
  );
}
