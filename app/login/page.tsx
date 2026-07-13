'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError('Incorrect email or password.');
      setLoading(false);
      return;
    }

    // Confirm this account actually manages a company before granting Fleet HQ access
    const { data: roles, error: rolesError } = await supabase
      .from('user_company_roles')
      .select('company_id')
      .eq('user_id', authData.user.id)
      .limit(1);

    if (rolesError || !roles || roles.length === 0) {
      setError('This account is not linked to a Fleet HQ company.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        onSubmit={handleLogin}
        style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>Fleet HQ</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }}
        />
        {error && <div style={{ color: '#c0392b', fontSize: '13px' }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px',
            borderRadius: '8px',
            background: '#1e3a5f',
            color: '#fff',
            fontWeight: 500,
            border: 'none',
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
