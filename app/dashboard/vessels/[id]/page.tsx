'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

interface CrewMember {
  id: string;
  name: string;
  position: string;
  role: string;
}

export default function VesselDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vesselName, setVesselName] = useState('');
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [authorized, setAuthorized] = useState(false);

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

      const { data: vessel } = await supabase
        .from('vessels')
        .select('id, name, management_company_id')
        .eq('id', id)
        .single();

      if (!vessel || vessel.management_company_id !== roleRow.company_id) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setVesselName(vessel.name);

      const { data: crewRows } = await supabase
        .from('users')
        .select('id, name, position, role')
        .eq('vessel_id', id);

      setCrew(crewRows ?? []);
      setLoading(false);
    };

    load();
  }, [id, router]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!authorized) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
          <div style={{ fontSize: '14px', color: '#c0392b' }}>
            You don&apos;t have access to this vessel, or it doesn&apos;t exist.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
        <Link href="/dashboard/vessels" style={{ fontSize: '12px', color: '#666' }}>‹ Vessels</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 1.25rem' }}>
          <div style={{ fontSize: '18px', fontWeight: 500 }}>{vesselName}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Crew onboard</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>{crew.length}</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Rest compliance</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>—</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Maintenance due</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>—</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Open tasks</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>—</div>
          </div>
        </div>

        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Crew</div>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
          {crew.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: '13px', color: '#666' }}>No crew on this vessel yet.</div>
          )}
          {crew.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: i < crew.length - 1 ? '1px solid #eee' : 'none',
              }}
            >
              <div style={{ fontSize: '13px' }}>
                {c.name} <span style={{ color: '#999' }}>{c.position}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#999' }}>—</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
