import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { contractId, filePath } = await req.json();

  if (!contractId || !filePath) {
    return NextResponse.json({ error: 'Missing contractId or filePath' }, { status: 400 });
  }

  const { error: storageError } = await supabaseAdmin.storage
    .from('contracts')
    .remove([filePath]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: dbError } = await supabaseAdmin.from('contracts').delete().eq('id', contractId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
