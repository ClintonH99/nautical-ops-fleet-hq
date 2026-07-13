'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

interface CrewRow {
  id: string;
  name: string;
  position: string;
  vesselName: string;
  vesselId: string;
}

interface VesselOption {
  id: string;
  name: string;
}

export default function CrewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
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
        setCrew([]);
        setLoading(false);
        return;
      }

      const vesselIds = vesselList.map((v) => v.id);
      const { data: crewRows } = await supabase
        .from('users')
        .select('id, name, position, vessel_id')
        .in('vessel_id', vesselIds);

      const vesselNameMap = new Map(vesselList.map((v) => [v.id, v.name]));

      const crewWithVessel = (crewRows ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position ?? '',
        vesselId: c.vessel_id,
        vesselName: vesselNameMap.get(c.vessel_id) ?? 'Unknown',
      }));

      setCrew(crewWithVessel);
      setLoading(false);
    };

    load();
  }, [router]);

  const filteredCrew = filterVesselId === 'all'
    ? crew
    : crew.filter((c) => c.vesselId === filterVesselId);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>Crew</div>
            <div style={{ fontSize: '13px', color: '#666' }}>{crew.length} crew across {vessels.length} vessels</div>
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
          {filteredCrew.length === 0 && (
            <div style={{ fontSize: '13px', color: '#666' }}>No crew found.</div>
          )}
          {filteredCrew.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', border: '1px solid #e0e0e0', borderRadius: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{c.position} · {c.vesselName}</div>
              </div>
              <span style={{ fontSize: '12px', color: '#999' }}>—</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
