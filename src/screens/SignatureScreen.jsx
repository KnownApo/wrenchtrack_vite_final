import React, { useRef, useContext } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { JobLogContext } from '../context/JobLogContext';

export default function SignatureScreen() {
  const padRef = useRef();
  const { setSignature } = useContext(JobLogContext);

  const saveSignature = () => {
    if (!padRef.current.isEmpty()) {
      const dataUrl = padRef.current.toDataURL();
      setSignature(dataUrl);
      alert('Signature saved!');
    } else {
      alert('Please sign before saving.');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Signature Capture</h2>
      <SignatureCanvas
        ref={padRef}
        penColor="black"
        canvasProps={{ width: 500, height: 200, className: 'border rounded shadow' }}
      />
      <div className="mt-4 space-x-2">
        <button onClick={() => padRef.current.clear()} className="bg-red-500 text-white px-4 py-2 rounded">Clear</button>
        <button onClick={saveSignature} className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
      </div>
    </div>
  );
}
