import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const userId = formData.get('userId') as string | null;
  const vesselId = formData.get('vesselId') as string | null;
  const uploadedBy = formData.get('uploadedBy') as string | null;

  if (!file || !userId || !vesselId) {
    return NextResponse.json({ error: 'Missing file, userId, or vesselId' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
  }

  const filePath = `${vesselId}/${userId}-${Date.now()}.pdf`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from('contracts')
    .upload(filePath, arrayBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Replace any existing contract for this user (one contract per person)
  await supabaseAdmin.from('contracts').delete().eq('user_id', userId);

  const { error: dbError } = await supabaseAdmin.from('contracts').insert({
    user_id: userId,
    vessel_id: vesselId,
    file_path: filePath,
    file_size_bytes: file.size,
    uploaded_by: uploadedBy,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, filePath });
}
