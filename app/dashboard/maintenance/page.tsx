'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

interface MaintenanceRow {
  id: string;
  equipment: string;
  whatServiceDone: string;
  serviceDoneBy: string;
  hoursAtNextService: string;
  vesselName: string;
  createdAt: string;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MaintenanceRow[]>([]);
  const [vessels, setVessels] = useState<{ id: string; name: string }[]>([]);
  const [filterVesselId, setFilterVesselId] = useState('all');

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
      setVessels(vesselList);

      if (vesselList.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const vesselIds = vesselList.map((v) => v.id);
      const vesselNameMap = new Map(vesselList.map((v) => [v.id, v.name]));

      const { data: logRows } = await supabase
        .from('maintenance_logs')
        .select('id, equipment, what_service_done, service_done_by, hours_at_next_service, vessel_id, created_at')
        .in('vessel_id', vesselIds)
        .order('created_at', { ascending: false });

      const combined = (logRows ?? []).map((r) => ({
        id: r.id,
        equipment: r.equipment ?? '',
        whatServiceDone: r.what_service_done ?? '',
        serviceDoneBy: r.service_done_by ?? '',
        hoursAtNextService: r.hours_at_next_service ?? '',
        vesselId: r.vessel_id,
        vesselName: vesselNameMap.get(r.vessel_id) ?? 'Unknown',
        createdAt: r.created_at,
      }));

      setRows(combined);
      setLoading(false);
    };

    load();
  }, [router]);

  const filteredRows = filterVesselId === 'all'
    ? rows
    : rows.filter((r: any) => r.vesselId === filterVesselId);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>Maintenance</div>
            <div style={{ fontSize: '13px', color: '#666' }}>{rows.length} logs across your fleet</div>
          </div>
          <select
            value={filterVesselId}
            onChange={(e) => setFilterVesselId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '8px' }}
          >
            <option value="all">All vessels</option>
            {vessels.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredRows.length === 0 && (
            <div style={{ fontSize: '13px', color: '#666' }}>No maintenance logs found.</div>
          )}
          {filteredRows.map((r: any) => (
            <div
              key={r.id}
              style={{ padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{r.equipment}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{r.vesselName}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#444', marginTop: '4px' }}>{r.whatServiceDone}</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                {r.serviceDoneBy && `By ${r.serviceDoneBy}`}
                {r.hoursAtNextService && ` · Next service at ${r.hoursAtNextService} hrs`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
