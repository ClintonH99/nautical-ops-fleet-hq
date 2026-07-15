'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vesselLimit, setVesselLimit] = useState(0);
  const [vessels, setVessels] = useState<{ id: string; name: string }[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [inviting, setInviting] = useState(false);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUserId(user.id);

    const { data: roleRow } = await supabase
      .from('user_company_roles')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!roleRow) {
      router.push('/login');
      return;
    }

    setCompanyId(roleRow.company_id);

    const { data: company } = await supabase
      .from('companies')
      .select('name, vessel_limit')
      .eq('id', roleRow.company_id)
      .single();

    setCompanyName(company?.name ?? '');
    setVesselLimit(company?.vessel_limit ?? 0);

    const { data: vesselRows } = await supabase
      .from('vessels')
      .select('id, name')
      .eq('management_company_id', roleRow.company_id);

    setVessels(vesselRows ?? []);

    const { data: roleRows } = await supabase
      .from('user_company_roles')
      .select('user_id, role')
      .eq('company_id', roleRow.company_id);

    if (roleRows && roleRows.length > 0) {
      const userIds = roleRows.map((r) => r.user_id);
      const { data: userRows } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      const userMap = new Map((userRows ?? []).map((u) => [u.id, u]));

      const teamList = roleRows.map((r) => ({
        userId: r.user_id,
        name: userMap.get(r.user_id)?.name ?? 'Unknown',
        email: userMap.get(r.user_id)?.email ?? '',
        role: r.role,
      }));

      setTeam(teamList);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteStatus('');

    const res = await fetch('/api/companies/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, email: inviteEmail.trim(), invitedBy: currentUserId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteStatus('Error: ' + data.error);
    } else if (data.status === 'linked_existing_account') {
      setInviteStatus('Added — they already had an account and now have access.');
      await loadData();
    } else {
      setInviteStatus("Added. They will get access automatically once they create a Nautical Ops account with this email.");
    }

    setInviteEmail('');
    setInviting(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1, maxWidth: '600px' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '18px', fontWeight: 500 }}>Settings</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Manage your fleet account</div>
        </div>

        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '14px', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 500 }}>{companyName}</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            {vessels.length} of {vesselLimit} vessels used
          </div>
        </div>

        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Vessels</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
          {vessels.length === 0 && <div style={{ fontSize: '13px', color: '#666' }}>No vessels yet.</div>}
          {vessels.map((v) => (
            <div key={v.id} style={{ padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '8px', fontSize: '13px' }}>
              {v.name}
            </div>
          ))}
        </div>

        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Team members</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
          {team.map((t) => (
            <div key={t.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px' }}>{t.name} <span style={{ color: '#999' }}>{t.email}</span></div>
              <span style={{ fontSize: '12px', color: '#666' }}>{t.role === 'subscription_holder' ? 'Subscription holder' : 'Member'}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            placeholder="Email to add"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px' }}
          />
          <button
            onClick={handleInvite}
            disabled={inviting}
            style={{ padding: '10px 16px', borderRadius: '8px', background: '#1e3a5f', color: '#fff', border: 'none' }}
          >
            {inviting ? 'Adding...' : 'Add'}
          </button>
        </div>
        {inviteStatus && (
          <div style={{ fontSize: '12px', color: inviteStatus.startsWith('Error') ? '#c0392b' : '#2d7a3e', marginTop: '8px' }}>
            {inviteStatus}
          </div>
        )}
      </div>
    </div>
  );
}
