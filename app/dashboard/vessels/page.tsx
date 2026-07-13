'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

interface VesselRow {
  id: string;
  name: string;
  crewCount: number;
}

export default function VesselsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [vessels, setVessels] = useState<VesselRow[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<{
    vesselId: string;
    vesselName: string;
    hasAppleSub: boolean;
    newMonthlyTotal: number;
  } | null>(null);
  const [modalError, setModalError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadVessels = async (cid: string) => {
    const { data: vesselRows } = await supabase
      .from('vessels')
      .select('id, name')
      .eq('management_company_id', cid);

    if (!vesselRows) {
      setVessels([]);
      return;
    }

    const vesselsWithCrew = await Promise.all(
      vesselRows.map(async (v) => {
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('vessel_id', v.id);
        return { id: v.id, name: v.name, crewCount: count ?? 0 };
      })
    );

    setVessels(vesselsWithCrew);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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
      await loadVessels(roleRow.company_id);
      setLoading(false);
    };

    load();
  }, [router]);

  const handleCheckCode = async () => {
    setModalError('');
    setPreview(null);
    if (!inviteCode.trim() || !companyId) return;
    setChecking(true);

    // Look up vessel by invite code (client-side, read-only, RLS allows this)
    const { data: vessel, error: vesselError } = await supabase
      .from('vessels')
      .select('id, name, management_company_id')
      .eq('invite_code', inviteCode.trim())
      .single();

    if (vesselError || !vessel) {
      setModalError('No vessel found with that invite code.');
      setChecking(false);
      return;
    }

    if (vessel.management_company_id) {
      setModalError('This vessel is already linked to a fleet company.');
      setChecking(false);
      return;
    }

    const { data: sub } = await supabase
      .from('vessel_subscriptions')
      .select('status, revenuecat_subscriber_id')
      .eq('vessel_id', vessel.id)
      .eq('status', 'active')
      .maybeSingle();

    const { data: existingVessels } = await supabase
      .from('vessels')
      .select('id')
      .eq('management_company_id', companyId);

    const newCount = (existingVessels?.length ?? 0) + 1;
    const rate = newCount <= 3 ? 120 : newCount <= 10 ? 100 : newCount <= 20 ? 85 : 70;

    setPreview({
      vesselId: vessel.id,
      vesselName: vessel.name,
      hasAppleSub: !!(sub && sub.revenuecat_subscriber_id),
      newMonthlyTotal: rate * newCount,
    });
    setChecking(false);
  };

  const handleConfirm = async () => {
    if (!companyId || !preview) return;
    setConfirming(true);

    const res = await fetch('/api/vessels/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, inviteCode: inviteCode.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setModalError(data.error ?? 'Failed to add vessel.');
      setConfirming(false);
      return;
    }

    await loadVessels(companyId);
    setShowModal(false);
    setInviteCode('');
    setPreview(null);
    setConfirming(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>Vessels</div>
            <div style={{ fontSize: '13px', color: '#666' }}>{vessels.length} vessels in your fleet</div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 16px', borderRadius: '8px', background: '#1e3a5f', color: '#fff', border: 'none' }}
          >
            + Add vessel
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {vessels.length === 0 && (
            <div style={{ fontSize: '13px', color: '#666' }}>No vessels linked yet.</div>
          )}
          {vessels.map((v) => (
            <Link
              key={v.id}
              href={`/dashboard/vessels/${v.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#000',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{v.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{v.crewCount} crew onboard</div>
              </div>
              <span style={{ color: '#999' }}>›</span>
            </Link>
          ))}
        </div>

        {showModal && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.4)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', zIndex: 50,
            }}
          >
            <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '380px' }}>
              <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>Add a vessel</div>

              <input
                type="text"
                placeholder="Vessel invite code"
                value={inviteCode}
                onChange={(e) => { setInviteCode(e.target.value); setPreview(null); setModalError(''); }}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px' }}
              />

              {modalError && (
                <div style={{ fontSize: '13px', color: '#c0392b', marginBottom: '10px' }}>{modalError}</div>
              )}

              {!preview && (
                <button
                  onClick={handleCheckCode}
                  disabled={checking || !inviteCode.trim()}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#eee', border: 'none', marginBottom: '8px' }}
                >
                  {checking ? 'Checking...' : 'Look up vessel'}
                </button>
              )}

              {preview && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>{preview.vesselName}</div>

                  {preview.hasAppleSub && (
                    <div style={{ fontSize: '12px', color: '#b8860b', background: '#fff8e1', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                      ⚠️ This vessel has an active Apple subscription. To avoid being charged twice,
                      cancel it via the App Store after adding it here.
                    </div>
                  )}

                  <div style={{ fontSize: '13px', color: '#444', marginBottom: '10px' }}>
                    Adding this vessel brings your plan to <strong>${preview.newMonthlyTotal}/mo</strong> total.
                  </div>

                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e3a5f', color: '#fff', border: 'none' }}
                  >
                    {confirming ? 'Adding...' : 'Confirm and add vessel'}
                  </button>
                </div>
              )}

              <button
                onClick={() => { setShowModal(false); setInviteCode(''); setPreview(null); setModalError(''); }}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'transparent', border: '1px solid #ccc' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
