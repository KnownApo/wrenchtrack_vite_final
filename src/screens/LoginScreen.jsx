import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <input type="email" placeholder="Email" className="border p-2 w-full mb-2 rounded" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" className="border p-2 w-full mb-2 rounded" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 w-full rounded">Login</button>
      <p className="mt-4 text-sm text-center">Don't have an account? <a href="/register" className="text-blue-500">Register</a></p>
    </div>
  );
}
