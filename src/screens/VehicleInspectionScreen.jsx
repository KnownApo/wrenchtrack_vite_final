import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import VehicleInspectionChecklist from '../components/VehicleInspectionChecklist';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-toastify';

export default function VehicleInspectionScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get vehicle info from location state if available
  const vehicleInfo = location.state?.vehicleInfo || {};

  const handleSaveInspection = async (inspectionData) => {
    try {
      // Save inspection to Firebase
      const inspectionRef = collection(db, 'users', user.uid, 'inspections');
      await addDoc(inspectionRef, {
        ...inspectionData,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success('Inspection saved successfully');
      
      // Navigate based on where we came from
      if (location.state?.returnTo) {
        navigate(location.state.returnTo);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
      toast.error('Failed to save inspection');
    }
  };

  const handleClose = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else {
      navigate('/');
    }
  };

  return (
    <VehicleInspectionChecklist
      vehicleInfo={vehicleInfo}
      onSave={handleSaveInspection}
      onClose={handleClose}
    />
  );
}
