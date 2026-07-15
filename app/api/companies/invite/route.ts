import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { companyId, email, invitedBy } = await req.json();

  if (!companyId || !email) {
    return NextResponse.json({ error: 'Missing companyId or email' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (existingUser) {
    const { error: linkError } = await supabaseAdmin.from('user_company_roles').upsert({
      user_id: existingUser.id,
      company_id: companyId,
      role: 'member',
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'linked_existing_account' });
  }

  const { error: inviteError } = await supabaseAdmin.from('pending_invites').insert({
    email: normalizedEmail,
    company_id: companyId,
    invited_by: invitedBy,
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'pending_invite_created' });
}
