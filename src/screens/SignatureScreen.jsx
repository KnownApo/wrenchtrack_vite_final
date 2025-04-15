import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';

export default function SignatureScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      toast.error('Please select a signature image');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const signatureRef = doc(db, 'users', user.uid, 'settings', 'signature');
        await setDoc(signatureRef, {
          signatureURL: base64Data,
          fileName: selectedFile.name,
          updatedAt: new Date()
        }, { merge: true });

        toast.success('Signature saved successfully');
        navigate('/invoice');
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/invoice')}
          className="mb-6 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
        >
          ← Back to Invoice
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Upload Signature Image</h1>
          
          <div className="space-y-6">
            {preview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <img src={preview} alt="Signature preview" className="max-h-64 mx-auto" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="text-gray-500">No image selected</div>
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              
              <button
                onClick={handleSave}
                disabled={!selectedFile || loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Signature'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-600">
          <p>Upload a clear image of your signature (Max 2MB)</p>
          <p>Supported formats: JPG, PNG, GIF</p>
        </div>
      </div>
    </div>
  );
}
