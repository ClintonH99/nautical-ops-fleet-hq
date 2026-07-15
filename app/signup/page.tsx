'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vesselCount, setVesselCount] = useState(3);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Failed to create account.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: normalizedEmail,
      name,
      position: 'Fleet Manager',
      department: 'BRIDGE',
    });

    if (profileError) {
      setError('Account created, but profile setup failed: ' + profileError.message);
      setLoading(false);
      return;
    }

    // Check for a pending Fleet HQ invite matching this email
    const { data: invite } = await supabase
      .from('pending_invites')
      .select('company_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (invite) {
      // Join the company they were invited to, instead of creating a new one
      const { error: linkError } = await supabase.from('user_company_roles').insert({
        user_id: authData.user.id,
        company_id: invite.company_id,
        role: 'member',
      });

      if (linkError) {
        setError('Account created, but joining the invited company failed: ' + linkError.message);
        setLoading(false);
        return;
      }

      await supabase.from('pending_invites').delete().eq('email', normalizedEmail);

      router.push('/dashboard');
      return;
    }

    // No invite found — create a brand new company as the subscription holder
    const companyRes = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        companyName,
        vesselLimit: vesselCount,
      }),
    });

    if (!companyRes.ok) {
      const data = await companyRes.json();
      setError('Account created, but company setup failed: ' + data.error);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        onSubmit={handleSignup}
        style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px' }}>Set up Fleet HQ</h1>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
          Create your account. If you were invited to an existing fleet, you&apos;ll join it automatically.
        </p>

        <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }} />

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '4px 0' }} />

        <p style={{ fontSize: '12px', color: '#999' }}>
          Only fill these in if you&apos;re starting a new fleet (skip if you were invited):
        </p>
        <input type="text" placeholder="Company / fleet name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }} />

        <div>
          <label style={{ fontSize: '13px', color: '#444', display: 'block', marginBottom: '4px' }}>How many vessels?</label>
          <input type="number" min={1} value={vesselCount} onChange={(e) => setVesselCount(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }} />
        </div>

        {error && <div style={{ color: '#c0392b', fontSize: '13px' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ padding: '10px', borderRadius: '8px', background: '#1e3a5f', color: '#fff', fontWeight: 500, border: 'none', marginTop: '4px' }}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
          Already have an account? <a href="/login" style={{ color: '#1e3a5f' }}>Sign in</a>
        </div>
      </form>
    </div>
  );
}
