import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, vesselId } = await req.json();

  if (!userId || !vesselId) {
    return NextResponse.json({ error: 'Missing userId or vesselId' }, { status: 400 });
  }

  const filePath = `${vesselId}/${userId}-${Date.now()}.pdf`;

  const { data, error } = await supabaseAdmin.storage
    .from('contracts')
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, filePath });
}
