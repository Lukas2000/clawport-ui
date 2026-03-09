'use client';

import dynamic from 'next/dynamic';

const OnboardingWizard = dynamic(
  () => import('@/components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })),
  { ssr: false }
);
const LiveStreamWidget = dynamic(
  () => import('@/components/LiveStreamWidget').then(m => ({ default: m.LiveStreamWidget })),
  { ssr: false }
);

export function LazyWidgets() {
  return (
    <>
      <OnboardingWizard />
      <LiveStreamWidget />
    </>
  );
}
