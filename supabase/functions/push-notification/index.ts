import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type WebhookPayload = {
  type: 'INSERT';
  table: 'notifications';
  record: {
    id: string;
    recipient_id: string;
    kind: string;
    entity_type: string | null;
    entity_id: string | null;
  };
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WEBHOOK_SECRET = Deno.env.get('DATABASE_WEBHOOK_SECRET') ?? '';
const EXPO_ACCESS_TOKEN = Deno.env.get('EXPO_ACCESS_TOKEN');

function routeFor(record: WebhookPayload['record']) {
  if (record.entity_type === 'post' && record.entity_id) return `/post/${record.entity_id}`;
  if (record.entity_type === 'conversation' && record.entity_id) return `/chat/${record.entity_id}`;
  if (record.entity_type === 'activity' && record.entity_id) return `/activities/${record.entity_id}`;
  if (record.entity_type === 'alert') return '/lost-found';
  if (record.kind === 'connection') return '/connections';
  return '/notifications';
}

function copyFor(kind: string) {
  const copy: Record<string, { title: string; body: string }> = {
    like: { title: 'New activity on Wilver', body: 'Someone liked your post.' },
    comment: { title: 'New comment', body: 'Someone commented on your post.' },
    message: { title: 'New message', body: 'You have a new Wilver message.' },
    activity: { title: 'Activity update', body: 'There is an update to one of your activities.' },
    alert: { title: 'Lost & found update', body: 'There is a new update on your Wilver alert.' },
    connection: { title: 'New circle request', body: 'A pet parent would like to connect.' },
    moderation: { title: 'Wilver safety update', body: 'There is an update from the trust team.' },
  };
  return copy[kind] ?? { title: 'Wilver update', body: 'Open Wilver to see what changed.' };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET || request.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) return new Response('Unauthorized', { status: 401 });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return new Response('Server configuration missing', { status: 500 });

  const payload = await request.json() as WebhookPayload;
  if (payload.type !== 'INSERT' || payload.table !== 'notifications' || !payload.record?.recipient_id) return new Response('Ignored', { status: 202 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: tokens, error } = await admin.from('device_tokens').select('id,token').eq('profile_id', payload.record.recipient_id).eq('enabled', true);
  if (error) return new Response(error.message, { status: 500 });
  if (!tokens?.length) return Response.json({ delivered: 0 });

  const copy = copyFor(payload.record.kind);
  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    title: copy.title,
    body: copy.body,
    data: { route: routeFor(payload.record), notificationId: payload.record.id },
    channelId: 'community',
  }));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${EXPO_ACCESS_TOKEN}`;
  const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(messages) });
  const result = await response.json() as { data?: { status: string; details?: { error?: string } }[] };
  const staleIds = tokens.filter((_, index) => result.data?.[index]?.details?.error === 'DeviceNotRegistered').map(({ id }) => id);
  if (staleIds.length) await admin.from('device_tokens').update({ enabled: false, updated_at: new Date().toISOString() }).in('id', staleIds);
  return Response.json({ delivered: response.ok ? messages.length - staleIds.length : 0, providerStatus: response.status }, { status: response.ok ? 200 : 502 });
});
