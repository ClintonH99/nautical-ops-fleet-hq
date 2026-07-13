'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [vesselCount, setVesselCount] = useState(0);
  const [crewCount, setCrewCount] = useState(0);

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

      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', roleRow.company_id)
        .single();

      setCompanyName(company?.name ?? 'Your fleet');

      const { data: vessels } = await supabase
        .from('vessels')
        .select('id')
        .eq('management_company_id', roleRow.company_id);

      setVesselCount(vessels?.length ?? 0);

      if (vessels && vessels.length > 0) {
        const vesselIds = vessels.map((v) => v.id);
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .in('vessel_id', vesselIds);
        setCrewCount(count ?? 0);
      }

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
          <div style={{ fontSize: '18px', fontWeight: 500 }}>Overview</div>
          <div style={{ fontSize: '13px', color: '#666' }}>{companyName}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Vessels</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>{vesselCount}</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Crew onboard</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>{crewCount}</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Maintenance due</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>—</div>
          </div>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Alerts</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>—</div>
          </div>
        </div>
      </div>
    </div>
  );
}
