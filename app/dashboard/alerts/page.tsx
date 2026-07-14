'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

interface AlertItem {
  type: 'missing_contract';
  title: string;
  detail: string;
}

export default function AlertsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

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

      const { data: vesselRows } = await supabase
        .from('vessels')
        .select('id, name')
        .eq('management_company_id', roleRow.company_id);

      const vesselList = vesselRows ?? [];
      if (vesselList.length === 0) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      const vesselIds = vesselList.map((v) => v.id);
      const vesselNameMap = new Map(vesselList.map((v) => [v.id, v.name]));

      const { data: crewRows } = await supabase
        .from('users')
        .select('id, name, vessel_id')
        .in('vessel_id', vesselIds);

      const { data: contractRows } = await supabase
        .from('contracts')
        .select('user_id')
        .in('vessel_id', vesselIds);

      const hasContract = new Set((contractRows ?? []).map((c) => c.user_id));

      const missingContractAlerts: AlertItem[] = (crewRows ?? [])
        .filter((c) => !hasContract.has(c.id))
        .map((c) => ({
          type: 'missing_contract',
          title: `Missing contract — ${c.name}`,
          detail: vesselNameMap.get(c.vessel_id) ?? 'Unknown vessel',
        }));

      setAlerts(missingContractAlerts);
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
          <div style={{ fontSize: '18px', fontWeight: 500 }}>Alerts</div>
          <div style={{ fontSize: '13px', color: '#666' }}>{alerts.length} items need attention</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.length === 0 && (
            <div style={{ fontSize: '13px', color: '#666' }}>No alerts right now.</div>
          )}
          {alerts.map((a, i) => (
            <div
              key={i}
              style={{
                padding: '12px 14px', border: '1px solid #f5c6cb', borderRadius: '8px', background: '#fdecea',
              }}
            >
              <div style={{ fontSize: '13px', color: '#c0392b' }}>{a.title}</div>
              <div style={{ fontSize: '12px', color: '#c0392b', opacity: 0.8 }}>{a.detail}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', fontSize: '12px', color: '#999' }}>
          Maintenance and hours-of-rest alerts will appear here once those features are fully built.
        </div>
      </div>
    </div>
  );
}
