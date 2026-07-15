import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS, used only in this server-side route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { userId, companyName, vesselLimit } = await req.json();

  if (!userId || !companyName) {
    return NextResponse.json({ error: 'Missing userId or companyName' }, { status: 400 });
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: companyName,
      owner_user_id: userId,
      vessel_limit: vesselLimit ?? 3,
      status: 'active',
    })
    .select()
    .single();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  const { error: roleError } = await supabaseAdmin.from('user_company_roles').insert({
    user_id: userId,
    company_id: company.id,
    role: 'subscription_holder',
  });

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 });
  }

  return NextResponse.json({ company });
}
