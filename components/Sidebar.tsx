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
          width: '200px',
          flexShrink: 0,
          background: 'var(--sidebar-bg)',
          backdropFilter: 'var(--sidebar-backdrop)',
          WebkitBackdropFilter: 'var(--sidebar-backdrop)',
          borderRight: '1px solid var(--separator)',
        }}
      >
        {/* App icon + title */}
        <div className="px-3 pt-3 pb-2" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-2.5">
            {settings.portalIcon ? (
              <img
                src={settings.portalIcon}
                alt=""
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <img
                src="/clawport-logo.svg"
                alt=""
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '-0.2px',
                  color: 'var(--text-primary)',
                }}
              >
                {(!settings.portalName || settings.portalName === 'ClawPort')
                  ? <>Claw<span style={{ color: 'var(--accent)' }}>Port</span></>
                  : settings.portalName}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
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
