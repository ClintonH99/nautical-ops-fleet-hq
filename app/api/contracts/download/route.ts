import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { filePath } = await req.json();

  if (!filePath) {
    return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from('contracts')
    .createSignedUrl(filePath, 60); // link valid for 60 seconds

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create link' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
