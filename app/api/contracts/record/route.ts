import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, vesselId, filePath, fileSizeBytes, uploadedBy } = await req.json();

  if (!userId || !vesselId || !filePath) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await supabaseAdmin.from('contracts').delete().eq('user_id', userId);

  const { error } = await supabaseAdmin.from('contracts').insert({
    user_id: userId,
    vessel_id: vesselId,
    file_path: filePath,
    file_size_bytes: fileSizeBytes,
    uploaded_by: uploadedBy,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
