import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Nautical Ops</div>
      <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '16px' }}>Fleet HQ</h1>

      <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#333', marginBottom: '20px' }}>
        Fleet HQ is for management companies and captains overseeing more than one vessel.
        Instead of managing each vessel&apos;s Nautical Ops subscription separately, Fleet HQ gives you
        one account with a single view across your entire fleet — crew, maintenance, contracts,
        and alerts, all in one place.
      </p>

      <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '16px', marginBottom: '28px' }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>How it&apos;s different from a standard subscription</div>
        <ul style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
          <li>A standard Nautical Ops subscription covers one vessel, billed through the App Store.</li>
          <li>Fleet HQ covers multiple vessels under a single company account, billed directly.</li>
          <li>Add or remove vessels as your fleet changes, with pricing that scales per vessel.</li>
          <li>Invite other managers or captains to your fleet — no extra per-seat cost.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <Link
          href="/signup"
          style={{
            padding: '10px 20px', borderRadius: '8px', background: '#1e3a5f',
            color: '#fff', fontWeight: 500, textDecoration: 'none', fontSize: '14px',
          }}
        >
          Create an account
        </Link>
        <Link
          href="/login"
          style={{
            padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc',
            color: '#000', fontWeight: 500, textDecoration: 'none', fontSize: '14px',
          }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
