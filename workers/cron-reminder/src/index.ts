interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  PARENT_EMAIL: string;
  SITE_URL: string;
}

interface DueUser {
  id: string;
  email: string;
  name: string | null;
  last_activity_at: number;
}

const INACTIVITY_SECONDS = 2 * 86400;

async function sendReminder(env: Env, user: DueUser): Promise<boolean> {
  const firstName = user.name?.split(' ')[0] ?? 'there';
  const subject = `Time to practice — AMC // 10`;
  const html = `<p>Hey ${firstName}, you haven't practiced AMC10 in 2 days.</p>
                <p><a href="${env.SITE_URL}/practice">Jump back in →</a></p>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AMC10 <noreply@amc10.kidiyoor.com>',
      to: [user.email, env.PARENT_EMAIL],
      subject,
      html,
    }),
  });
  return resp.ok;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - INACTIVITY_SECONDS;
    const rs = await env.DB
      .prepare(
        `SELECT id, email, name, last_activity_at
         FROM users
         WHERE last_activity_at < ?
         AND (last_reminder_sent_at IS NULL OR last_reminder_sent_at < last_activity_at)`,
      )
      .bind(cutoff)
      .all<DueUser>();

    const users: DueUser[] = rs.results ?? [];
    for (const u of users) {
      const ok = await sendReminder(env, u);
      if (ok) {
        await env.DB
          .prepare('UPDATE users SET last_reminder_sent_at = ? WHERE id = ?')
          .bind(now, u.id)
          .run();
      }
    }
  },
};
