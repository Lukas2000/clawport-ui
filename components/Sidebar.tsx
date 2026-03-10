'use client';

import { useCallback } from 'react';
import { NavLinks } from '@/components/NavLinks';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MobileSidebar } from '@/components/MobileSidebar';
import { GlobalSearch, SearchTrigger } from '@/components/GlobalSearch';
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher';
import { useSettings } from '@/app/settings-provider';

/**
 * Sidebar -- client wrapper that coordinates desktop sidebar, mobile sidebar,
 * and the Cmd+K search palette. Rendered inside layout.tsx.
 */
export function Sidebar() {
  const { settings } = useSettings();
  const openSearch = useCallback(() => {
    // We trigger the search modal by simulating Cmd+K.
    // Instead, we expose a controlled open state via a custom event.
    // The GlobalSearch component listens for this.
    window.dispatchEvent(new CustomEvent('clawport:open-search'));
  }, []);

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className="hidden md:flex md:flex-col overflow-hidden"
        style={{
          width: '220px',
          flexShrink: 0,
          background: 'linear-gradient(180deg, var(--sidebar-bg), color-mix(in srgb, var(--sidebar-bg) 95%, var(--bg)))',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRight: '1px solid color-mix(in srgb, var(--separator) 60%, transparent)',
          boxShadow: '1px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* App icon + title */}
        <div className="px-4 pt-5 pb-3" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            {settings.portalIcon ? (
              <img
                src={settings.portalIcon}
                alt=""
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  boxShadow: 'var(--shadow-card)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <img
                src="/clawport-logo.png"
                alt=""
                style={{
                  width: '72px',
                  height: '72px',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 600,
                  letterSpacing: '-0.3px',
                  color: 'var(--text-primary)',
                }}
              >
                {(!settings.portalName || settings.portalName === 'ClawPort')
                  ? <>Claw<span style={{ color: 'var(--accent)' }}>Port</span></>
                  : settings.portalName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.01em',
                }}
              >
                {settings.portalSubtitle ?? 'Command Centre'}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 pb-1" style={{ flexShrink: 0 }}>
          <WorkspaceSwitcher />
        </div>

        {/* Search trigger */}
        <div className="px-3 pb-2" style={{ flexShrink: 0 }}>
          <SearchTrigger onClick={openSearch} />
        </div>

        <NavLinks />
        <ThemeToggle />
      </aside>

      {/* Mobile sidebar */}
      <MobileSidebar onOpenSearch={openSearch} />

      {/* Global search modal (Cmd+K) */}
      <GlobalSearch />
    </>
  );
}
