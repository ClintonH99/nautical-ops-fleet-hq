'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/vessels', label: 'Vessels' },
  { href: '/dashboard/crew', label: 'Crew' },
  { href: '/dashboard/contracts', label: 'Contracts' },
  { href: '/dashboard/maintenance', label: 'Maintenance' },
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        width: '180px',
        background: '#f5f5f5',
        padding: '1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minHeight: '100vh',
      }}
    >
      <div style={{ fontWeight: 500, fontSize: '15px', marginBottom: '1.25rem' }}>Fleet HQ</div>
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              fontSize: '13px',
              textDecoration: 'none',
              color: active ? '#1e3a5f' : '#555',
              background: active ? '#e8edf5' : 'transparent',
              fontWeight: active ? 500 : 400,
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
