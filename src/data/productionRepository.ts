import { publicEnvironment } from '@/src/config/environment';
import { customerDataError } from '@/src/lib/customerErrors';
import { createUuid } from '@/src/lib/id';
import { imageArrayBuffer, SanitizedImage } from '@/src/lib/media';
import { ageTextToMonths } from '@/src/lib/petAge';
import { supabase } from '@/src/lib/supabase';
import {
  Activity,
  ActivityRequest,
  AlertSighting,
  AppNotification,
  BreedingApplication,
  ChatMessage,
  Comment,
  ConnectionRequest,
  Conversation,
  FeedPost,
  LostFoundAlert,
  OnboardingDraft,
  ParentProfile,
  Pet,
  PrivacyPreferences,
  ProductionSnapshot,
  Report,
  Species,
} from '@/src/types/models';

type DbProfile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_path: string | null;
  bio: string | null;
  neighborhood: string | null;
  verification_status: string;
  is_adult?: boolean;
  onboarded_at?: string | null;
  allow_messages?: PrivacyPreferences['allowMessages'];
  is_discoverable?: boolean;
  nearby_alerts_enabled?: boolean;
};

type DbPet = {
  id: string;
  owner_id: string;
  name: string;
  species: Species;
  breed: string | null;
  sex: 'female' | 'male' | 'unknown';
  birth_date: string | null;
  approximate_age_months: number | null;
  size: string | null;
  temperament: string[] | null;
  energy_level: number | null;
  vaccination_status: string;
  vaccinations_current_self_reported?: boolean | null;
  is_neutered_or_spayed: boolean | null;
  verification_status: string;
  pet_photos?: { storage_path: string; position: number }[] | null;
};

type DbPost = {
  id: string;
  author_id: string;
  pet_id: string | null;
  body: string;
  neighborhood_label: string | null;
  created_at: string;
  author: DbProfile;
  pet: DbPet | null;
  post_media: { storage_path: string; position: number }[] | null;
  post_likes: { profile_id: string }[] | null;
  comments: { id: string }[] | null;
};

type DbComment = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  author: DbProfile;
};

const profileColumns = 'id,display_name,handle,avatar_path,bio,neighborhood,verification_status,is_adult,onboarded_at,allow_messages,is_discoverable,nearby_alerts_enabled';
const petColumns = 'id,owner_id,name,species,breed,sex,birth_date,approximate_age_months,size,temperament,energy_level,vaccination_status,vaccinations_current_self_reported,is_neutered_or_spayed,verification_status,pet_photos(storage_path,position)';

function client() {
  if (!supabase) throw new Error('Wilver is temporarily unavailable. Please try again shortly.');
  return supabase;
}

function fail(error: { message: string } | null, fallback: string) {
  if (!error) return;
  const customerMessage = customerDataError(error, fallback);
  if (publicEnvironment.environment !== 'production') {
    console.error(`[Wilver data] ${fallback}: ${error.message}`);
    throw new Error(`${customerMessage}\n\nDevelopment detail: ${error.message}`);
  }
  throw new Error(customerMessage);
}

type ImageBucket = 'avatars' | 'pet-photos' | 'post-media' | 'alert-media' | 'message-media';

async function uploadImage(bucket: ImageBucket, entityId: string, image: SanitizedImage) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const path = `${user.user.id}/${entityId}/${createUuid()}.jpg`;
  const bytes = await imageArrayBuffer(image);
  const { error } = await client().storage.from(bucket).upload(path, bytes, {
    cacheControl: '31536000',
    contentType: 'image/jpeg',
    upsert: false,
  });
  fail(error, 'Unable to upload image');
  return path;
}

async function removeImage(bucket: ImageBucket, path?: string | null) {
  if (!path) return;
  await client().storage.from(bucket).remove([path]);
}

function publicImage(bucket: 'avatars' | 'pet-photos', path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return client().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function privateImage(bucket: 'post-media' | 'alert-media' | 'message-media', path?: string | null) {
  if (!path) return '';
  const { data, error } = await client().storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) return '';
  return data.signedUrl;
}

function ageLabel(months: number | null, birthDate: string | null) {
  let totalMonths = months;
  if (totalMonths == null && birthDate) {
    const born = new Date(birthDate);
    const now = new Date();
    totalMonths = Math.max(0, (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth());
  }
  if (totalMonths == null) return 'Age not added';
  if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
  const years = Math.floor(totalMonths / 12);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toPet(row: DbPet): Pet {
  const photo = [...(row.pet_photos ?? [])].sort((a, b) => a.position - b.position)[0]?.storage_path;
  const size = row.size ? `${row.size[0]?.toUpperCase()}${row.size.slice(1)}` as Pet['size'] : undefined;
  const sex = `${row.sex[0]?.toUpperCase()}${row.sex.slice(1)}` as Pet['sex'];
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed || 'Breed not added',
    age: ageLabel(row.approximate_age_months, row.birth_date),
    temperament: row.temperament ?? [],
    imageUrl: publicImage('pet-photos', photo),
    verified: row.verification_status === 'verified',
    sex,
    size,
    energyLevel: row.energy_level ?? undefined,
    vaccinated: row.vaccinations_current_self_reported ?? row.vaccination_status === 'verified',
    neuteredOrSpayed: row.is_neutered_or_spayed ?? undefined,
  };
}

function toProfile(row: DbProfile, pets: Pet[] = [], distanceKm = 0, connected = false): ParentProfile {
  return {
    id: row.id,
    name: row.display_name,
    handle: row.handle.startsWith('@') ? row.handle : `@${row.handle}`,
    neighborhood: row.neighborhood || 'Area not shared',
    bio: row.bio || '',
    avatarUrl: publicImage('avatars', row.avatar_path),
    verified: row.verification_status === 'verified',
    distanceKm,
    pets,
    connected,
    isAdult: row.is_adult,
    onboarded: Boolean(row.onboarded_at),
    discoverable: row.is_discoverable,
    allowMessages: row.allow_messages,
    nearbyAlerts: row.nearby_alerts_enabled,
  };
}

function emptySnapshot(currentUser: ParentProfile | null): ProductionSnapshot {
  return {
    currentUser,
    posts: [],
    pets: currentUser?.pets ?? [],
    comments: [],
    activities: [],
    activityRequests: [],
    joinedActivities: [],
    conversations: [],
    messages: [],
    lostFoundAlerts: [],
    alertSightings: [],
    notifications: [],
    reports: [],
    blockedProfiles: [],
    connectedUserIds: [],
    connectionRequests: [],
    nearbyParents: [],
    privacyPreferences: {
      discoverable: currentUser?.onboarded ?? true,
      approximateLocation: true,
      allowMessages: 'connections',
      nearbyAlerts: true,
    },
    featureFlags: { breeding: false },
    breedingApplication: {
      status: 'not_started', adultConfirmed: false, acknowledged: false, documentsReady: false,
    },
  };
}

async function fetchPets(ownerIds?: string[]) {
  let query = client().from('pets').select(petColumns).eq('is_visible', true).order('created_at');
  if (ownerIds) {
    if (ownerIds.length === 0) return [];
    query = query.in('owner_id', ownerIds);
  }
  const { data, error } = await query;
  fail(error, 'Unable to load pets');
  return ((data ?? []) as unknown as DbPet[]).map(toPet);
}

async function fetchCurrentProfile(userId: string) {
  const [{ data, error }, petsResult, adminResult] = await Promise.all([
    client().from('profiles').select(profileColumns).eq('id', userId).maybeSingle(),
    fetchPets([userId]),
    client().rpc('is_admin'),
  ]);
  fail(error, 'Unable to load profile');
  if (!data) return null;
  const profile = toProfile(data as unknown as DbProfile, petsResult);
  profile.isAdmin = adminResult.data === true && !adminResult.error;
  return profile;
}

async function fetchFeed(userId: string) {
  const { data, error } = await client()
    .from('posts')
    .select(`id,author_id,pet_id,body,neighborhood_label,created_at,author:profiles!posts_author_id_fkey(${profileColumns}),pet:pets!posts_pet_id_fkey(${petColumns}),post_media(storage_path,position),post_likes(profile_id),comments(id)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  fail(error, 'Unable to load the feed');
  const rows = (data ?? []) as unknown as DbPost[];
  return Promise.all(rows.map(async (row): Promise<FeedPost> => {
    const mediaPath = [...(row.post_media ?? [])].sort((a, b) => a.position - b.position)[0]?.storage_path;
    return {
      id: row.id,
      author: toProfile(row.author),
      pet: row.pet ? toPet(row.pet) : undefined,
      body: row.body,
      imageUrl: await privateImage('post-media', mediaPath) || undefined,
      neighborhood: row.neighborhood_label || row.author.neighborhood || 'Local circle',
      createdAt: relativeTime(row.created_at),
      likes: row.post_likes?.length ?? 0,
      comments: row.comments?.length ?? 0,
      liked: row.post_likes?.some((like) => like.profile_id === userId) ?? false,
      tag: 'Community',
    };
  }));
}

async function fetchComments() {
  const { data, error } = await client()
    .from('comments')
    .select(`id,post_id,body,created_at,author:profiles!comments_author_id_fkey(${profileColumns})`)
    .eq('status', 'active')
    .order('created_at')
    .limit(500);
  fail(error, 'Unable to load comments');
  return ((data ?? []) as unknown as DbComment[]).map((row): Comment => ({
    id: row.id,
    postId: row.post_id,
    author: toProfile(row.author),
    body: row.body,
    createdAt: relativeTime(row.created_at),
  }));
}

async function fetchDiscoveryWithPets() {
  const { data, error } = await client().rpc('nearby_profiles_for_me', { radius_meters: 20_000, result_limit: 50 });
  if (error) {
    if (/location|private_locations/i.test(error.message)) return [];
    throw new Error(customerDataError(error, 'Unable to load nearby pet parents'));
  }
  const rows = (data ?? []) as unknown as (DbProfile & { distance_meters: number; connected: boolean })[];
  if (!rows.length) return [];
  const { data: petRows, error: petError } = await client().from('pets').select(petColumns).in('owner_id', rows.map((row) => row.id)).eq('is_visible', true);
  fail(petError, 'Unable to load nearby pets');
  const dbPets = (petRows ?? []) as unknown as DbPet[];
  return rows.map((row) => toProfile(row, dbPets.filter((pet) => pet.owner_id === row.id).map(toPet), Math.round(row.distance_meters / 100) / 10, row.connected));
}

async function fetchActivities(userId: string) {
  type DbActivity = {
    id: string; host_id: string; type: 'walk' | 'playdate' | 'event'; title: string; description: string | null;
    starts_at: string; capacity: number; neighborhood_label: string; host: DbProfile;
    activity_attendance: { profile_id: string; pet_id: string | null; status: 'pending' | 'approved' | 'declined'; created_at: string; profile: DbProfile; pet: DbPet | null }[] | null;
    activity_private_locations: { location_instructions: string | null }[] | null;
  };
  const { data, error } = await client().from('activities').select(
    `id,host_id,type,title,description,starts_at,capacity,neighborhood_label,host:profiles!activities_host_id_fkey(${profileColumns}),activity_attendance(profile_id,pet_id,status,created_at,profile:profiles!activity_attendance_profile_id_fkey(${profileColumns}),pet:pets!activity_attendance_pet_id_fkey(${petColumns})),activity_private_locations(location_instructions)`,
  ).eq('status', 'active').gte('starts_at', new Date().toISOString()).order('starts_at').limit(100);
  fail(error, 'Unable to load activities');
  const rows = (data ?? []) as unknown as DbActivity[];
  const activities: Activity[] = [];
  const requests: ActivityRequest[] = [];
  const joined: string[] = [];
  for (const row of rows) {
    const attendance = row.activity_attendance ?? [];
    const ownAttendance = attendance.find((item) => item.profile_id === userId);
    if (ownAttendance?.status === 'approved' || ownAttendance?.status === 'pending') joined.push(row.id);
    for (const request of attendance) {
      if (row.host_id === userId && request.pet) {
        requests.push({
          id: `${row.id}:${request.profile_id}`,
          activityId: row.id,
          parent: toProfile(request.profile, [toPet(request.pet)]),
          pet: toPet(request.pet),
          status: request.status,
          createdAt: relativeTime(request.created_at),
        });
      }
    }
    activities.push({
      id: row.id,
      title: row.title,
      type: row.type === 'walk' ? 'Walk' : row.type === 'playdate' ? 'Playdate' : 'Event',
      dateLabel: new Date(row.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      locationLabel: row.neighborhood_label,
      distanceKm: 0,
      attendees: 1 + attendance.filter((item) => item.status === 'approved').length,
      capacity: row.capacity,
      host: toProfile(row.host),
      accent: row.type === 'walk' ? '#DDF1E8' : row.type === 'playdate' ? '#FFE4DC' : '#FFF1C7',
      description: row.description || '',
      hostedByCurrentUser: row.host_id === userId,
      exactLocationHint: row.activity_private_locations?.[0]?.location_instructions || 'Shared after host approval',
      attendanceStatus: ownAttendance?.status,
    });
  }
  return { activities, requests, joined };
}

async function fetchConversations(userId: string) {
  type DbMember = { conversation_id: string; profile_id: string; last_read_at: string | null; profile: DbProfile };
  type DbMessage = { id: string; conversation_id: string; sender_id: string; body: string | null; media_path: string | null; created_at: string };
  const { data: ownRows, error: ownError } = await client().from('conversation_members').select('conversation_id,last_read_at').eq('profile_id', userId);
  fail(ownError, 'Unable to load conversations');
  const own = (ownRows ?? []) as unknown as { conversation_id: string; last_read_at: string | null }[];
  if (!own.length) return { conversations: [] as Conversation[], messages: [] as ChatMessage[] };
  const ids = own.map((item) => item.conversation_id);
  const [{ data: memberRows, error: memberError }, { data: messageRows, error: messageError }, { data: connectionRows }] = await Promise.all([
    client().from('conversation_members').select(`conversation_id,profile_id,last_read_at,profile:profiles!conversation_members_profile_id_fkey(${profileColumns})`).in('conversation_id', ids),
    client().from('messages').select('id,conversation_id,sender_id,body,media_path,created_at').in('conversation_id', ids).eq('status', 'active').order('created_at'),
    client().from('connections').select('requester_id,addressee_id,status').eq('status', 'accepted'),
  ]);
  fail(memberError, 'Unable to load conversation members');
  fail(messageError, 'Unable to load messages');
  const members = (memberRows ?? []) as unknown as DbMember[];
  const dbMessages = (messageRows ?? []) as unknown as DbMessage[];
  const otherIds = members.filter((member) => member.profile_id !== userId).map((member) => member.profile_id);
  const pets = await fetchPets(otherIds);
  const petRows = await client().from('pets').select('id,owner_id').in('owner_id', otherIds);
  const petOwners = new Map(((petRows.data ?? []) as unknown as { id: string; owner_id: string }[]).map((row) => [row.id, row.owner_id]));
  const connections = (connectionRows ?? []) as unknown as { requester_id: string; addressee_id: string }[];
  const uiMessages: ChatMessage[] = await Promise.all(dbMessages.map(async (message) => ({
    id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, body: message.body ?? '',
    imageUrl: await privateImage('message-media', message.media_path) || undefined,
    createdAt: relativeTime(message.created_at), status: 'sent' as const,
  })));
  const conversations = own.flatMap((membership): Conversation[] => {
    const other = members.find((member) => member.conversation_id === membership.conversation_id && member.profile_id !== userId);
    if (!other) return [];
    const conversationMessages = dbMessages.filter((message) => message.conversation_id === membership.conversation_id);
    const latest = conversationMessages.at(-1);
    const unread = conversationMessages.filter((message) => message.sender_id !== userId && (!membership.last_read_at || message.created_at > membership.last_read_at)).length;
    const connected = connections.some((connection) => (connection.requester_id === userId && connection.addressee_id === other.profile_id) || (connection.requester_id === other.profile_id && connection.addressee_id === userId));
    const otherPets = pets.filter((pet) => petOwners.get(pet.id) === other.profile_id);
    return [{ id: membership.conversation_id, parent: toProfile(other.profile, otherPets, 0, connected), preview: latest?.body || (latest?.media_path ? 'Photo' : 'Start a safe conversation'), time: latest ? relativeTime(latest.created_at) : '', unread, connected }];
  });
  return { conversations, messages: uiMessages };
}

async function fetchAlerts(userId: string) {
  type DbAlert = { id: string; creator_id: string; kind: 'lost' | 'found'; title: string; description: string; photo_path: string | null; last_seen_at: string | null; neighborhood_label: string; is_urgent: boolean; resolved_at: string | null; created_at: string; creator: DbProfile };
  const { data, error } = await client().from('lost_found_alerts').select(`id,creator_id,kind,title,description,photo_path,last_seen_at,neighborhood_label,is_urgent,resolved_at,created_at,creator:profiles!lost_found_alerts_creator_id_fkey(${profileColumns})`).eq('status', 'active').order('created_at', { ascending: false }).limit(100);
  fail(error, 'Unable to load lost and found alerts');
  return Promise.all(((data ?? []) as unknown as DbAlert[]).map(async (row): Promise<LostFoundAlert> => ({
    id: row.id, kind: row.kind, title: row.title, description: row.description, neighborhood: row.neighborhood_label,
    lastSeen: row.last_seen_at ? relativeTime(row.last_seen_at) : relativeTime(row.created_at), distanceKm: 0,
    imageUrl: await privateImage('alert-media', row.photo_path), creator: toProfile(row.creator), urgent: row.is_urgent,
    resolved: Boolean(row.resolved_at), createdByCurrentUser: row.creator_id === userId,
  })));
}

async function fetchAlertSightings() {
  const { data, error } = await client().from('alert_sightings').select('id,alert_id,reporter_id,description,neighborhood_label,created_at').order('created_at', { ascending: false }).limit(200);
  fail(error, 'Unable to load alert sightings');
  return ((data ?? []) as unknown as { id: string; alert_id: string; reporter_id: string; description: string; neighborhood_label: string | null; created_at: string }[]).map((row): AlertSighting => ({
    id: row.id,
    alertId: row.alert_id,
    reporterId: row.reporter_id,
    description: row.description,
    neighborhood: row.neighborhood_label || 'Approximate area withheld',
    createdAt: relativeTime(row.created_at),
  }));
}

async function fetchNotifications() {
  type DbNotification = { id: string; kind: string; entity_type: string | null; entity_id: string | null; payload: Record<string, string> | null; read_at: string | null; created_at: string; actor: DbProfile | null };
  const { data, error } = await client().from('notifications').select(`id,kind,entity_type,entity_id,payload,read_at,created_at,actor:profiles!notifications_actor_id_fkey(${profileColumns})`).order('created_at', { ascending: false }).limit(100);
  fail(error, 'Unable to load notifications');
  return ((data ?? []) as unknown as DbNotification[]).map((row): AppNotification => {
    const kind = ['like', 'comment', 'message', 'activity', 'alert', 'moderation', 'connection'].includes(row.kind) ? row.kind as AppNotification['kind'] : 'activity';
    const actorName = row.actor?.display_name || 'Wilver';
    const route = row.entity_type === 'post' ? `/post/${row.entity_id}` : row.entity_type === 'conversation' ? `/chat/${row.entity_id}` : row.entity_type === 'alert' ? '/lost-found' : row.kind === 'connection' ? '/connections' : undefined;
    const titles: Record<AppNotification['kind'], string> = { like: 'Someone liked your post', comment: 'New comment', message: 'New message', activity: 'Activity update', alert: 'Lost-pet update', moderation: 'Safety update', connection: 'New connection request' };
    const connectionDecision = row.payload?.decision;
    const title = kind === 'connection' && connectionDecision ? `Connection ${connectionDecision}` : titles[kind];
    return { id: row.id, kind, title, body: row.payload?.preview || `${actorName} interacted with you.`, createdAt: relativeTime(row.created_at), read: Boolean(row.read_at), route, actor: row.actor ? toProfile(row.actor) : undefined };
  });
}

async function fetchSafety(currentUser: ParentProfile) {
  const [{ data: blockRows, error: blockError }, { data: connectionRows, error: connectionError }] = await Promise.all([
    client().from('blocks').select('blocked_id,blocked:profiles!blocks_blocked_id_fkey(' + profileColumns + ')').eq('blocker_id', currentUser.id),
    client().from('connections').select(`requester_id,addressee_id,status,created_at,requester:profiles!connections_requester_id_fkey(${profileColumns}),addressee:profiles!connections_addressee_id_fkey(${profileColumns})`).order('created_at', { ascending: false }),
  ]);
  fail(blockError, 'Unable to load blocks');
  fail(connectionError, 'Unable to load connections');
  const blockedProfiles = ((blockRows ?? []) as unknown as { blocked_id: string; blocked: DbProfile }[]).map((row) => toProfile(row.blocked));
  type DbConnection = { requester_id: string; addressee_id: string; status: ConnectionRequest['status']; created_at: string; requester: DbProfile; addressee: DbProfile };
  const connections = (connectionRows ?? []) as unknown as DbConnection[];
  const connectedUserIds = connections.filter((row) => row.status === 'accepted').map((row) => row.requester_id === currentUser.id ? row.addressee_id : row.requester_id);
  const connectionRequests = connections.filter((row) => row.status === 'pending').map((row): ConnectionRequest => ({
    id: `${row.requester_id}:${row.addressee_id}`,
    profile: toProfile(row.requester_id === currentUser.id ? row.addressee : row.requester),
    direction: row.requester_id === currentUser.id ? 'outgoing' : 'incoming',
    status: row.status,
    createdAt: relativeTime(row.created_at),
  }));
  const preferences: PrivacyPreferences = {
    discoverable: currentUser.discoverable ?? true,
    approximateLocation: true,
    allowMessages: currentUser.allowMessages ?? 'connections',
    nearbyAlerts: currentUser.nearbyAlerts ?? true,
  };
  return { blockedProfiles, connectedUserIds, connectionRequests, preferences };
}

async function fetchFlagsAndBreeding(userId: string) {
  const [{ data: flags }, { data: breeding }] = await Promise.all([
    client().from('feature_flags').select('key,enabled').eq('key', 'breeding').maybeSingle(),
    client().from('breeding_profiles').select('status,responsible_breeding_acknowledged_at').eq('owner_id', userId).maybeSingle(),
  ]);
  const status = breeding?.status === 'pending' || breeding?.status === 'verified' || breeding?.status === 'rejected' ? breeding.status : 'not_started';
  return {
    featureFlags: { breeding: flags?.enabled === true },
    breedingApplication: { status, adultConfirmed: false, acknowledged: Boolean(breeding?.responsible_breeding_acknowledged_at), documentsReady: false } as BreedingApplication,
  };
}

async function fetchReports(isAdmin: boolean) {
  if (!isAdmin) return [];
  const { data, error } = await client().from('reports').select('id,target_type,target_id,reason,details,status,created_at').order('created_at', { ascending: false }).limit(100);
  fail(error, 'Unable to load reports');
  return ((data ?? []) as unknown as { id: string; target_type: Report['targetType']; target_id: string; reason: string; details: string | null; status: Report['status']; created_at: string }[]).map((row): Report => ({
    id: row.id, targetType: row.target_type, targetId: row.target_id, targetLabel: row.target_id, reason: row.reason, details: row.details ?? undefined, status: row.status, createdAt: relativeTime(row.created_at),
  }));
}

export async function bootstrapProductionSnapshot(userId: string): Promise<ProductionSnapshot> {
  const currentUser = await fetchCurrentProfile(userId);
  const snapshot = emptySnapshot(currentUser);
  if (!currentUser?.onboarded) return snapshot;
  const [posts, comments, discovery, activityData, conversationData, alerts, alertSightings, notifications, safety, flags, reports] = await Promise.all([
    fetchFeed(userId), fetchComments(), fetchDiscoveryWithPets(), fetchActivities(userId), fetchConversations(userId),
    fetchAlerts(userId), fetchAlertSightings(), fetchNotifications(), fetchSafety(currentUser), fetchFlagsAndBreeding(userId), fetchReports(Boolean(currentUser.isAdmin)),
  ]);
  return {
    ...snapshot,
    posts,
    comments,
    nearbyParents: discovery,
    activities: activityData.activities,
    activityRequests: activityData.requests,
    joinedActivities: activityData.joined,
    conversations: conversationData.conversations,
    messages: conversationData.messages,
    lostFoundAlerts: alerts,
    alertSightings,
    notifications,
    reports,
    blockedProfiles: safety.blockedProfiles,
    connectedUserIds: safety.connectedUserIds,
    connectionRequests: safety.connectionRequests,
    privacyPreferences: safety.preferences,
    ...flags,
  };
}

export async function completeOnboarding(draft: OnboardingDraft, image?: SanitizedImage | null) {
  const { error } = await client().rpc('complete_onboarding', {
    pet_id: draft.petId,
    display_name: draft.displayName,
    requested_handle: draft.handle,
    selected_interests: draft.interests,
    adult_confirmed: draft.adultConfirmed,
    accepted_terms_version: publicEnvironment.termsVersion,
    accepted_privacy_version: publicEnvironment.privacyVersion,
    neighborhood_label: draft.neighborhood,
    city_label: draft.city,
    profile_country_code: draft.countryCode,
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
    pet_name: draft.petName,
    pet_species: draft.species,
  });
  fail(error, 'Unable to complete onboarding');
  if (!image) return null;
  try {
    await attachPetPhoto(draft.petId, draft.petName, image);
    return null;
  } catch (photoError) {
    return photoError instanceof Error ? photoError.message : 'The pet photo could not be uploaded.';
  }
}

export async function updateMyLocation(input: { latitude: number; longitude: number; neighborhood: string; city: string; countryCode: string }) {
  const { error } = await client().rpc('set_my_location', {
    latitude: input.latitude,
    longitude: input.longitude,
    neighborhood_label: input.neighborhood,
    city_label: input.city,
    profile_country_code: input.countryCode,
  });
  fail(error, 'Unable to update location');
}

export async function clearMyLocation() {
  const { error } = await client().rpc('clear_my_location');
  fail(error, 'Unable to remove saved GPS location');
}

export async function createPost(body: string, petId?: string, image?: SanitizedImage | null) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { data, error } = await client().from('posts').insert({ author_id: user.user.id, pet_id: petId ?? null, body: body.trim() }).select('id').single();
  fail(error, 'Unable to publish post');
  if (!data) throw new Error('Post was not returned after publishing.');
  if (image) {
    let path: string | null = null;
    try {
      path = await uploadImage('post-media', data.id, image);
      const { error: mediaError } = await client().from('post_media').insert({ post_id: data.id, storage_path: path, media_type: 'image', position: 0 });
      fail(mediaError, 'Unable to attach image to post');
    } catch (uploadError) {
      await removeImage('post-media', path);
      await client().from('posts').delete().eq('id', data.id);
      throw uploadError;
    }
  }
  return data.id as string;
}

export async function togglePostLike(postId: string, liked: boolean) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const operation = liked
    ? client().from('post_likes').delete().eq('post_id', postId).eq('profile_id', user.user.id)
    : client().from('post_likes').insert({ post_id: postId, profile_id: user.user.id });
  const { error } = await operation;
  fail(error, 'Unable to update like');
}

export async function deletePost(postId: string) {
  const { data: media, error: mediaError } = await client().from('post_media').select('storage_path').eq('post_id', postId);
  fail(mediaError, 'Unable to inspect post media');
  const { error } = await client().from('posts').delete().eq('id', postId);
  fail(error, 'Unable to delete post');
  await Promise.all((media ?? []).map((item) => removeImage('post-media', item.storage_path)));
}

export async function addComment(postId: string, body: string) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { error } = await client().from('comments').insert({ post_id: postId, author_id: user.user.id, body: body.trim() });
  fail(error, 'Unable to add comment');
}

export async function savePet(draft: Pick<Pet, 'name' | 'species' | 'breed' | 'age' | 'temperament' | 'sex' | 'size' | 'vaccinated' | 'neuteredOrSpayed'>, id?: string, image?: SanitizedImage | null) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const ageMonths = ageTextToMonths(draft.age);
  const payload = {
    owner_id: user.user.id, name: draft.name.trim(), species: draft.species, breed: draft.breed.trim() || null,
    approximate_age_months: ageMonths,
    temperament: draft.temperament, sex: draft.sex?.toLowerCase() ?? 'unknown', size: draft.size?.toLowerCase() ?? null,
    vaccinations_current_self_reported: draft.vaccinated ?? null, is_neutered_or_spayed: draft.neuteredOrSpayed ?? null,
  };
  const operation = id
    ? client().from('pets').update(payload).eq('id', id).select('id').single()
    : client().from('pets').insert(payload).select('id').single();
  const { data, error } = await operation;
  fail(error, 'Unable to save pet');
  if (!data) throw new Error('Pet profile was not returned after saving.');
  if (image) await attachPetPhoto(data.id, draft.name, image);
  return data.id as string;
}

async function attachPetPhoto(petId: string, petName: string, image: SanitizedImage) {
  const { data: oldRows, error: oldError } = await client().from('pet_photos').select('id,storage_path').eq('pet_id', petId).eq('position', 0);
  fail(oldError, 'Unable to inspect the existing pet photo');
  let path: string | null = null;
  try {
    path = await uploadImage('pet-photos', petId, image);
    const { data: newPhoto, error: mediaError } = await client().from('pet_photos').insert({ pet_id: petId, storage_path: path, alt_text: `${petName}'s profile photo`, position: 0 }).select('id').single();
    fail(mediaError, 'Unable to attach the pet photo');
    const oldIds = (oldRows ?? []).filter((row) => row.id !== newPhoto?.id).map((row) => row.id);
    if (oldIds.length) {
      const { error: deleteError } = await client().from('pet_photos').delete().in('id', oldIds);
      fail(deleteError, 'Unable to retire the existing pet photo');
    }
    await Promise.all((oldRows ?? []).map((row) => removeImage('pet-photos', row.storage_path)));
  } catch (uploadError) {
    await removeImage('pet-photos', path);
    throw uploadError;
  }
}

export async function deletePet(petId: string) {
  const { data: photos, error: photoError } = await client().from('pet_photos').select('storage_path').eq('pet_id', petId);
  fail(photoError, 'Unable to inspect pet photos');
  for (const photo of photos ?? []) await removeImage('pet-photos', photo.storage_path);
  const { error } = await client().from('pets').delete().eq('id', petId);
  fail(error, 'Unable to delete pet');
}

export async function createActivity(input: { title: string; type: Activity['type']; description: string; startsAt: string; locationLabel: string; capacity: number; exactLocationHint?: string }) {
  const { data, error } = await client().rpc('create_activity_for_me', {
    activity_kind: input.type.toLowerCase(), activity_title: input.title, activity_description: input.description,
    activity_starts_at: input.startsAt, activity_capacity: input.capacity, neighborhood_label: input.locationLabel,
    meeting_instructions: input.exactLocationHint?.trim() || null,
  });
  fail(error, 'Unable to publish activity');
  return data as string;
}

export async function requestActivity(activityId: string, petId?: string) {
  const { error } = await client().rpc('request_activity_attendance', { target_activity: activityId, selected_pet: petId ?? null });
  fail(error, 'Unable to request attendance');
}

export async function cancelActivityRequest(activityId: string) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { error } = await client().from('activity_attendance').delete().eq('activity_id', activityId).eq('profile_id', user.user.id);
  fail(error, 'Unable to cancel attendance');
}

export async function respondActivityRequest(requestId: string, status: 'approved' | 'declined') {
  const [activityId, profileId] = requestId.split(':');
  if (!activityId || !profileId) throw new Error('Invalid attendance request');
  const { error } = await client().rpc('respond_to_activity_attendance', { target_activity: activityId, attendee_profile: profileId, decision: status });
  fail(error, 'Unable to update attendance');
}

export async function createAlert(input: { kind: 'lost' | 'found'; title: string; description: string; neighborhood: string; lastSeen: string; urgent: boolean; petId?: string }, image?: SanitizedImage | null) {
  const lastSeen = new Date(input.lastSeen);
  const { data, error } = await client().rpc('create_lost_found_alert_for_me', {
    alert_kind: input.kind, alert_title: input.title, alert_description: input.description, neighborhood_label: input.neighborhood,
    last_seen_at: Number.isNaN(lastSeen.getTime()) ? new Date().toISOString() : lastSeen.toISOString(), urgent: input.urgent, selected_pet: input.petId ?? null,
  });
  fail(error, 'Unable to publish alert');
  if (!data) throw new Error('Alert was not returned after publishing.');
  if (image) {
    let path: string | null = null;
    try {
      path = await uploadImage('alert-media', data as string, image);
      const { error: updateError } = await client().rpc('attach_my_alert_photo', { target_alert: data as string, storage_path: path });
      fail(updateError, 'Unable to attach image to alert');
    } catch (uploadError) {
      await removeImage('alert-media', path);
      await client().rpc('delete_my_alert', { target_alert: data as string });
      throw uploadError;
    }
  }
  return data as string;
}

export async function updateAvatar(image: SanitizedImage) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { data: profile, error: profileError } = await client().from('profiles').select('avatar_path').eq('id', user.user.id).single();
  fail(profileError, 'Unable to load your profile photo');
  const path = await uploadImage('avatars', 'profile', image);
  const { error } = await client().from('profiles').update({ avatar_path: path }).eq('id', user.user.id);
  if (error) {
    await removeImage('avatars', path);
    fail(error, 'Unable to update profile photo');
  }
  await removeImage('avatars', profile?.avatar_path);
}

export async function updateCurrentProfile(input: { name: string; handle: string; bio: string; neighborhood: string }) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const handle = input.handle.trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9_.]{3,30}$/.test(handle)) throw new Error('Use 3–30 lowercase letters, numbers, underscores, or dots for your handle.');
  const { error } = await client().from('profiles').update({
    display_name: input.name.trim(),
    handle,
    bio: input.bio.trim() || null,
    neighborhood: input.neighborhood.trim() || null,
  }).eq('id', user.user.id);
  fail(error, 'Unable to update profile');
}

export async function resolveAlert(alertId: string) {
  const { error } = await client().rpc('resolve_my_alert', { target_alert: alertId });
  fail(error, 'Unable to resolve alert');
}

export async function cancelActivity(activityId: string) {
  const { error } = await client().rpc('cancel_my_activity', { target_activity: activityId });
  fail(error, 'Unable to cancel activity');
}

export async function reportAlertSighting(alertId: string, description: string) {
  const { error } = await client().rpc('report_alert_sighting', { target_alert: alertId, sighting_description: description.trim() });
  fail(error, 'Unable to report sighting');
}

export async function sendMessage(conversationId: string, body: string, clientNonce: string, image?: SanitizedImage | null) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  let path: string | null = null;
  try {
    if (image) path = await uploadImage('message-media', conversationId, image);
    const cleanBody = body.trim();
    const { error } = await client().from('messages').insert({ conversation_id: conversationId, sender_id: user.user.id, body: cleanBody || null, media_path: path, client_nonce: clientNonce });
    fail(error, 'Unable to send message');
  } catch (sendError) {
    await removeImage('message-media', path);
    throw sendError;
  }
}

export async function ensureConversation(profileId: string) {
  const { data, error } = await client().rpc('ensure_direct_conversation', { target_profile: profileId });
  fail(error, 'Unable to start conversation');
  return data as string;
}

export async function markConversationRead(conversationId: string) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) return;
  const { error } = await client().from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('profile_id', user.user.id);
  fail(error, 'Unable to mark conversation read');
}

export async function markNotificationRead(notificationId?: string) {
  let query = client().from('notifications').update({ read_at: new Date().toISOString() });
  if (notificationId) query = query.eq('id', notificationId);
  else query = query.is('read_at', null);
  const { error } = await query;
  fail(error, 'Unable to update notifications');
}

export async function submitReport(targetType: Report['targetType'], targetId: string, reason: string) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { error } = await client().from('reports').insert({ reporter_id: user.user.id, target_type: targetType, target_id: targetId, reason });
  fail(error, 'Unable to submit report');
}

export async function blockProfile(profileId: string) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { error } = await client().from('blocks').insert({ blocker_id: user.user.id, blocked_id: profileId });
  fail(error, 'Unable to block profile');
}

export async function unblockProfile(profileId: string) {
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { error } = await client().from('blocks').delete().eq('blocker_id', user.user.id).eq('blocked_id', profileId);
  fail(error, 'Unable to unblock profile');
}

export async function toggleConnection(profileId: string, connected: boolean) {
  if (connected) {
    const { data: user } = await client().auth.getUser();
    if (!user.user) throw new Error('Your session expired. Please sign in again.');
    const { error } = await client().from('connections').delete().or(`and(requester_id.eq.${user.user.id},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${user.user.id})`);
    fail(error, 'Unable to remove connection');
  } else {
    const { error } = await client().rpc('request_connection', { target_profile: profileId });
    fail(error, 'Unable to request connection');
  }
}

export async function respondConnection(requesterProfileId: string, decision: 'accepted' | 'declined') {
  const { error } = await client().rpc('respond_to_connection', { requester_profile: requesterProfileId, decision });
  fail(error, 'Unable to respond to connection request');
}

export async function updatePrivacy(key: keyof PrivacyPreferences, value: PrivacyPreferences[keyof PrivacyPreferences]) {
  const column = key === 'discoverable' ? 'is_discoverable' : key === 'allowMessages' ? 'allow_messages' : key === 'nearbyAlerts' ? 'nearby_alerts_enabled' : null;
  if (!column) return;
  const { data: user } = await client().auth.getUser();
  if (!user.user) throw new Error('Your session expired. Please sign in again.');
  const { error } = await client().from('profiles').update({ [column]: value }).eq('id', user.user.id);
  fail(error, 'Unable to update privacy preference');
}

export async function moderateReport(reportId: string, status: 'resolved' | 'dismissed') {
  const { error } = await client().rpc('moderate_report', { target_report_id: reportId, decision: status, action_reason: `Reviewed and ${status} from Wilver Trust Console` });
  fail(error, 'Unable to moderate report');
}

export async function setBreedingFeature(enabled: boolean) {
  const { error } = await client().from('feature_flags').update({ enabled, updated_at: new Date().toISOString() }).eq('key', 'breeding');
  fail(error, 'Unable to update feature flag');
}

export async function subscribeToProductionChanges(userId: string, onChange: () => void) {
  const channel = client().channel(`wilver:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_attendance' }, onChange)
    .subscribe();
  return () => { void client().removeChannel(channel); };
}

export const productionRepository = {
  bootstrapProductionSnapshot,
  completeOnboarding,
  updateMyLocation,
  clearMyLocation,
  createPost,
  togglePostLike,
  deletePost,
  addComment,
  savePet,
  deletePet,
  createActivity,
  cancelActivity,
  requestActivity,
  cancelActivityRequest,
  respondActivityRequest,
  createAlert,
  updateAvatar,
  updateCurrentProfile,
  resolveAlert,
  reportAlertSighting,
  sendMessage,
  ensureConversation,
  markConversationRead,
  markNotificationRead,
  submitReport,
  blockProfile,
  unblockProfile,
  toggleConnection,
  respondConnection,
  updatePrivacy,
  moderateReport,
  setBreedingFeature,
  subscribeToProductionChanges,
};
