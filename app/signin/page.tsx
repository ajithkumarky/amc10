import { Panel } from '@/components/ui/panel';

export const metadata = { title: 'Sign in — AMC // 10' };

export default function SignInPage() {
  return (
    <Panel kicker="ACCESS_GATE">
      <h1 className="font-display text-3xl tracking-widest text-cyber-ink">
        SIGN IN
      </h1>
      <p className="mt-2 text-sm text-cyber-mute">
        This site is private. Sign in with the Google account that&apos;s on the allowlist.
      </p>
      <div className="mt-6">
        <a
          href="/api/auth/google/login"
          className="inline-flex items-center gap-3 rounded-[3px] bg-cyber-chip px-4 py-2 text-[12px] font-bold uppercase tracking-widest text-white"
        >
          Sign in with Google
        </a>
      </div>
    </Panel>
  );
}
