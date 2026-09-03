import { createClient } from 'npm:@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

const userBuckets = ['avatars', 'pet-photos', 'post-media', 'alert-media', 'message-media', 'verification-documents'];

async function listOwnedFiles(admin: AdminClient, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 6) throw new Error('Unexpected storage path depth');
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw error;
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) paths.push(path);
      else paths.push(...await listOwnedFiles(admin, bucket, path, depth + 1));
    }
    if (!data || data.length < 100) break;
  }
  return paths;
}

async function deleteOwnedStorage(admin: AdminClient, userId: string) {
  for (const bucket of userBuckets) {
    const paths = await listOwnedFiles(admin, bucket, userId);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) throw error;
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const authorization = request.headers.get('Authorization');
  if (!authorization) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !publishableKey || !secretKey) return new Response('Server configuration error', { status: 500, headers: corsHeaders });

  const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const adminClient = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await deleteOwnedStorage(adminClient, user.id);
  } catch {
    return new Response('Account media cleanup failed; account was not deleted', { status: 500, headers: corsHeaders });
  }
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response('Account deletion failed', { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify({ deleted: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
