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

      const { data: vesselRows } = await supabase
        .from('vessels')
        .select('id, name')
        .eq('management_company_id', roleRow.company_id);

      if (!vesselRows) {
        setVessels([]);
        setLoading(false);
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
      setLoading(false);
    };

    load();
  }, [router]);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '18px', fontWeight: 500 }}>Vessels</div>
          <div style={{ fontSize: '13px', color: '#666' }}>{vessels.length} vessels in your fleet</div>
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
      </div>
    </div>
  );
}
