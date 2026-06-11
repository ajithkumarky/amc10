import { Suspense } from 'react';
import { PracticeSessionLoader } from '@/components/practice/session-loader';

export const metadata = { title: 'Test Run — AMC // 10' };

export default function TestRunPage() {
  return (
    <Suspense fallback={<div className="font-mono text-[11px] text-cyber-mute">LOADING...</div>}>
      <PracticeSessionLoader mode="test" />
    </Suspense>
  );
}
