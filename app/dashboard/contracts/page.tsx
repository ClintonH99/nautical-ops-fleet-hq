'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import { compressPdf } from '@/lib/compressPdf';

interface CrewContractRow {
  userId: string;
  name: string;
  position: string;
  vesselName: string;
  vesselId: string;
  contractId: string | null;
  filePath: string | null;
  fileSizeBytes: number | null;
}

export default function ContractsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [rows, setRows] = useState<CrewContractRow[]>([]);
  const [uploadingUserId, setUploadingUserId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ userId: string; vesselId: string } | null>(null);

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

    const { data: vesselRows } = await supabase
      .from('vessels')
      .select('id, name')
      .eq('management_company_id', roleRow.company_id);

    const vesselList = vesselRows ?? [];
    if (vesselList.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const vesselIds = vesselList.map((v) => v.id);
    const vesselNameMap = new Map(vesselList.map((v) => [v.id, v.name]));

    const { data: crewRows } = await supabase
      .from('users')
      .select('id, name, position, vessel_id')
      .in('vessel_id', vesselIds);

    const { data: contractRows } = await supabase
      .from('contracts')
      .select('id, user_id, file_path, file_size_bytes')
      .in('vessel_id', vesselIds);

    const contractMap = new Map((contractRows ?? []).map((c) => [c.user_id, c]));

    const combined = (crewRows ?? []).map((c) => {
      const contract = contractMap.get(c.id);
      return {
        userId: c.id,
        name: c.name,
        position: c.position ?? '',
        vesselId: c.vessel_id,
        vesselName: vesselNameMap.get(c.vessel_id) ?? 'Unknown',
        contractId: contract?.id ?? null,
        filePath: contract?.file_path ?? null,
        fileSizeBytes: contract?.file_size_bytes ?? null,
      };
    });

    setRows(combined);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const triggerUpload = (userId: string, vesselId: string) => {
    pendingUpload.current = { userId, vesselId };
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload.current) return;

    const { userId, vesselId } = pendingUpload.current;
    setUploadingUserId(userId);
    setUploadError('');

    try {
      setUploadStatus('Compressing...');
      const compressed = await compressPdf(file);

      setUploadStatus('Getting upload URL...');
      const signRes = await fetch('/api/contracts/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, vesselId }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error ?? 'Failed to get upload URL');

      setUploadStatus('Uploading...');
      const { error: uploadErr } = await supabase.storage
        .from('contracts')
        .uploadToSignedUrl(signData.filePath, signData.token, compressed);
      if (uploadErr) throw new Error(uploadErr.message);

      setUploadStatus('Saving...');
      const recordRes = await fetch('/api/contracts/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          vesselId,
          filePath: signData.filePath,
          fileSizeBytes: compressed.size,
          uploadedBy: currentUserId,
        }),
      });
      const recordData = await recordRes.json();
      if (!recordRes.ok) throw new Error(recordData.error ?? 'Failed to save record');

      await loadData();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingUserId(null);
      setUploadStatus('');
      pendingUpload.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (filePath: string) => {
    const res = await fetch('/api/contracts/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  };

  const handleDelete = async (contractId: string, filePath: string) => {
    if (!confirm('Delete this contract?')) return;
    const res = await fetch('/api/contracts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, filePath }),
    });
    if (res.ok) await loadData();
  };

  const onFile = rows.filter((r) => r.contractId).length;
  const missing = rows.filter((r) => !r.contractId).length;

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
        <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />

        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '18px', fontWeight: 500 }}>Contracts</div>
          <div style={{ fontSize: '13px', color: '#666' }}>Employment contracts across your fleet</div>
        </div>

        {uploadError && (
          <div style={{ fontSize: '13px', color: '#c0392b', background: '#fdecea', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
            {uploadError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Contracts on file</div>
            <div style={{ fontSize: '24px', fontWeight: 500 }}>{onFile}</div>
          </div>
          <div style={{ background: '#fdecea', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ fontSize: '13px', color: '#c0392b', marginBottom: '4px' }}>Missing</div>
            <div style={{ fontSize: '24px', fontWeight: 500, color: '#c0392b' }}>{missing}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rows.length === 0 && <div style={{ fontSize: '13px', color: '#666' }}>No crew found.</div>}
          {rows.map((r) => (
            <div
              key={r.userId}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px' }}>{r.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{r.position} · {r.vesselName}</div>
              </div>

              {r.contractId && r.filePath ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {r.fileSizeBytes ? `${Math.round(r.fileSizeBytes / 1024)} KB` : ''}
                  </div>
                  <button onClick={() => handleDownload(r.filePath!)} style={{ fontSize: '12px', background: 'none', border: '1px solid #ccc', padding: '4px 10px', borderRadius: '6px' }}>
                    Download
                  </button>
                  <button onClick={() => handleDelete(r.contractId!, r.filePath!)} style={{ fontSize: '12px', background: 'none', border: '1px solid #c0392b', color: '#c0392b', padding: '4px 10px', borderRadius: '6px' }}>
                    Delete
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {uploadingUserId === r.userId ? uploadStatus : 'No contract on file'}
                  </span>
                  <button
                    onClick={() => triggerUpload(r.userId, r.vesselId)}
                    disabled={uploadingUserId === r.userId}
                    style={{ fontSize: '12px', background: '#1e3a5f', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px' }}
                  >
                    {uploadingUserId === r.userId ? '...' : 'Upload'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
