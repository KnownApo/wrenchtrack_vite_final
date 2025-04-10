import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Could not create account. Please try again.');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <input type="email" placeholder="Email" className="border p-2 w-full mb-2 rounded" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" className="border p-2 w-full mb-2 rounded" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <button onClick={handleRegister} className="bg-green-600 text-white px-4 py-2 w-full rounded">Register</button>
      <p className="mt-4 text-sm text-center">Already have an account? <a href="/login" className="text-blue-500">Login</a></p>
    </div>
  );
}
