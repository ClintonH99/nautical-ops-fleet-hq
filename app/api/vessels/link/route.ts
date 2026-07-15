import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function priceForVesselCount(count: number): number {
  if (count <= 3) return 120;
  if (count <= 10) return 100;
  if (count <= 20) return 85;
  return 70;
}

export async function POST(req: NextRequest) {
  const { companyId, inviteCode } = await req.json();

  if (!companyId || !inviteCode) {
    return NextResponse.json({ error: 'Missing companyId or inviteCode' }, { status: 400 });
  }

  const { data: vessel, error: vesselError } = await supabaseAdmin
    .from('vessels')
    .select('id, name, management_company_id')
    .eq('invite_code', inviteCode)
    .single();

  if (vesselError || !vessel) {
    return NextResponse.json({ error: 'No vessel found with that invite code' }, { status: 404 });
  }

  if (vessel.management_company_id) {
    return NextResponse.json(
      { error: 'This vessel is already linked to a fleet company' },
      { status: 409 }
    );
  }

  const { data: existingVessels } = await supabaseAdmin
    .from('vessels')
    .select('id')
    .eq('management_company_id', companyId);

  const currentCount = existingVessels?.length ?? 0;
  const newCount = currentCount + 1;
  const newMonthlyRate = priceForVesselCount(newCount);
  const newMonthlyTotal = newMonthlyRate * newCount;

  const { error: updateError } = await supabaseAdmin
    .from('vessels')
    .update({ management_company_id: companyId })
    .eq('id', vessel.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: ownerRole } = await supabaseAdmin
    .from('user_company_roles')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('role', 'subscription_holder')
    .single();

  if (ownerRole) {
    await supabaseAdmin.from('user_vessel_memberships').upsert({
      user_id: ownerRole.user_id,
      vessel_id: vessel.id,
      role: 'HOD',
    });
  }

  return NextResponse.json({
    vessel: { id: vessel.id, name: vessel.name },
    newVesselCount: newCount,
    newMonthlyTotal,
  });
}
