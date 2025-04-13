import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { doc, setDoc } from 'firebase/firestore'; // Use setDoc to create or update the document
import { db } from '../firebase';

export default function SignatureScreen() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    const signatureURL = canvas.toDataURL('image/png');

    try {
      if (!user) {
        alert('User is not authenticated.');
        return;
      }

      const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'signature'); // Correct document reference
      await setDoc(userSettingsRef, { signatureURL }, { merge: true }); // Merge to avoid overwriting other fields
      alert('✅ Signature saved successfully.');
      navigate('/invoice'); // Navigate back to the Invoice Builder screen
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('❌ Failed to save signature.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back to Invoice Builder Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/invoice')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            ← Back to Invoice Builder
          </button>
        </div>

        <h1 className="text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-12">
          ✍️ Capture Signature
        </h1>
        <div className="bg-white shadow-lg rounded-3xl p-8">
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="border rounded-lg shadow-md w-full"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          ></canvas>
          <div className="flex justify-center gap-6 mt-6">
            <button
              onClick={handleSaveSignature}
              className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-600 transition"
            >
              Save Signature
            </button>
            <button
              onClick={() => navigate('/invoice')}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
