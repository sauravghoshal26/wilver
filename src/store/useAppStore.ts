import { create } from 'zustand';

import { productionRepository } from '@/src/data/productionRepository';
import { invalidateProductionData } from '@/src/lib/queryClient';
import { createUuid } from '@/src/lib/id';
import { SanitizedImage } from '@/src/lib/media';
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
} from '@/src/types/models';

type NewActivity = Pick<Activity, 'title' | 'type' | 'description' | 'locationLabel' | 'capacity' | 'compatiblePets' | 'exactLocationHint'> & { startsAt: string };
type NewAlert = Pick<LostFoundAlert, 'kind' | 'title' | 'description' | 'neighborhood' | 'lastSeen' | 'urgent'>;
type PetDraft = Pick<Pet, 'name' | 'species' | 'breed' | 'age' | 'temperament' | 'sex' | 'size' | 'vaccinated' | 'neuteredOrSpayed'>;

type AppState = {
  authInitialized: boolean;
  authenticated: boolean;
  sessionUserId: string | null;
  onboarded: boolean;
  currentUser: ParentProfile | null;
  dataLoading: boolean;
  dataError: string | null;
  posts: FeedPost[];
  pets: Pet[];
  comments: Comment[];
  activities: Activity[];
  activityRequests: ActivityRequest[];
  joinedActivities: string[];
  conversations: Conversation[];
  messages: ChatMessage[];
  lostFoundAlerts: LostFoundAlert[];
  alertSightings: AlertSighting[];
  notifications: AppNotification[];
  reports: Report[];
  blockedProfiles: ParentProfile[];
  blockedUserIds: string[];
  connectedUserIds: string[];
  connectionRequests: ConnectionRequest[];
  nearbyParents: ParentProfile[];
  privacyPreferences: PrivacyPreferences;
  breedingApplication: BreedingApplication;
  featureFlags: { breeding: boolean };
  setSession: (userId: string | null) => void;
  setAuthInitialized: (initialized: boolean) => void;
  setDataLoading: (loading: boolean) => void;
  setDataError: (message: string | null) => void;
  applyProductionSnapshot: (snapshot: ProductionSnapshot) => void;
  clearServerState: () => void;
  finishOnboarding: (draft: OnboardingDraft, image?: SanitizedImage | null) => Promise<string | null>;
  updateLocation: (input: { latitude: number; longitude: number; neighborhood: string; city: string; countryCode: string }) => Promise<void>;
  clearLocation: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addPost: (body: string, image?: SanitizedImage | null) => Promise<string>;
  deletePost: (postId: string) => Promise<void>;
  addComment: (postId: string, body: string) => Promise<void>;
  savePet: (pet: PetDraft, id?: string, image?: SanitizedImage | null) => Promise<string>;
  deletePet: (petId: string) => Promise<void>;
  addActivity: (activity: NewActivity) => Promise<string>;
  cancelActivity: (activityId: string) => Promise<void>;
  toggleJoinActivity: (activityId: string) => Promise<void>;
  respondToActivityRequest: (requestId: string, status: 'approved' | 'declined') => Promise<void>;
  addLostFoundAlert: (alert: NewAlert, image?: SanitizedImage | null) => Promise<string>;
  updateAvatar: (image: SanitizedImage) => Promise<void>;
  updateProfile: (input: { name: string; handle: string; bio: string; neighborhood: string }) => Promise<void>;
  resolveLostFoundAlert: (alertId: string) => Promise<void>;
  reportAlertSighting: (alertId: string, description: string) => Promise<void>;
  sendMessage: (conversationId: string, body: string, image?: SanitizedImage | null) => Promise<void>;
  startConversation: (profileId: string) => Promise<string>;
  markConversationRead: (conversationId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  reportContent: (targetType: Report['targetType'], targetId: string, targetLabel: string, reason: string) => Promise<void>;
  moderateReport: (reportId: string, status: 'resolved' | 'dismissed') => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  toggleConnection: (userId: string) => Promise<void>;
  respondToConnection: (requesterId: string, decision: 'accepted' | 'declined') => Promise<void>;
  setPrivacyPreference: <K extends keyof PrivacyPreferences>(key: K, value: PrivacyPreferences[K]) => Promise<void>;
  updateBreedingApplication: (values: Partial<BreedingApplication>) => void;
  submitBreedingApplication: () => Promise<void>;
  toggleBreedingFeature: () => Promise<void>;
};

const initialPreferences: PrivacyPreferences = {
  discoverable: true,
  approximateLocation: true,
  allowMessages: 'connections',
  nearbyAlerts: true,
};

const initialBreedingApplication: BreedingApplication = {
  status: 'not_started',
  adultConfirmed: false,
  acknowledged: false,
  documentsReady: false,
};

const serverState = {
  currentUser: null as ParentProfile | null,
  onboarded: false,
  posts: [] as FeedPost[],
  pets: [] as Pet[],
  comments: [] as Comment[],
  activities: [] as Activity[],
  activityRequests: [] as ActivityRequest[],
  joinedActivities: [] as string[],
  conversations: [] as Conversation[],
  messages: [] as ChatMessage[],
  lostFoundAlerts: [] as LostFoundAlert[],
  alertSightings: [] as AlertSighting[],
  notifications: [] as AppNotification[],
  reports: [] as Report[],
  blockedProfiles: [] as ParentProfile[],
  blockedUserIds: [] as string[],
  connectedUserIds: [] as string[],
  connectionRequests: [] as ConnectionRequest[],
  nearbyParents: [] as ParentProfile[],
  privacyPreferences: initialPreferences,
  breedingApplication: initialBreedingApplication,
  featureFlags: { breeding: false },
};

async function refresh() {
  await invalidateProductionData();
}

export const useAppStore = create<AppState>()((set, get) => ({
  authInitialized: false,
  authenticated: false,
  sessionUserId: null,
  dataLoading: false,
  dataError: null,
  ...serverState,
  setSession: (userId) => set({
    sessionUserId: userId,
    authenticated: Boolean(userId),
    authInitialized: true,
    ...(!userId ? serverState : {}),
  }),
  setAuthInitialized: (authInitialized) => set({ authInitialized }),
  setDataLoading: (dataLoading) => set({ dataLoading }),
  setDataError: (dataError) => set({ dataError }),
  applyProductionSnapshot: (snapshot) => set({
    ...snapshot,
    onboarded: Boolean(snapshot.currentUser?.onboarded),
    blockedProfiles: snapshot.blockedProfiles,
    blockedUserIds: snapshot.blockedProfiles.map((profile) => profile.id),
    dataLoading: false,
    dataError: null,
  }),
  clearServerState: () => set(serverState),
  finishOnboarding: async (draft, image) => {
    const photoWarning = await productionRepository.completeOnboarding(draft, image);
    set({ onboarded: true });
    await refresh();
    return photoWarning;
  },
  updateLocation: async (input) => {
    await productionRepository.updateMyLocation(input);
    await refresh();
  },
  clearLocation: async () => {
    await productionRepository.clearMyLocation();
    await refresh();
  },
  toggleLike: async (postId) => {
    const original = get().posts.find((post) => post.id === postId);
    if (!original) return;
    set((state) => ({ posts: state.posts.map((post) => post.id === postId ? { ...post, liked: !post.liked, likes: Math.max(0, post.likes + (post.liked ? -1 : 1)) } : post) }));
    try {
      await productionRepository.togglePostLike(postId, Boolean(original.liked));
      await refresh();
    } catch (error) {
      set((state) => ({ posts: state.posts.map((post) => post.id === postId ? original : post) }));
      throw error;
    }
  },
  addPost: async (body, image) => {
    const id = await productionRepository.createPost(body, get().pets[0]?.id, image);
    await refresh();
    return id;
  },
  deletePost: async (postId) => {
    await productionRepository.deletePost(postId);
    set((state) => ({ posts: state.posts.filter((post) => post.id !== postId), comments: state.comments.filter((comment) => comment.postId !== postId) }));
    await refresh();
  },
  addComment: async (postId, body) => {
    await productionRepository.addComment(postId, body);
    await refresh();
  },
  savePet: async (draft, id, image) => {
    const savedId = await productionRepository.savePet(draft, id, image);
    await refresh();
    return savedId;
  },
  deletePet: async (petId) => {
    await productionRepository.deletePet(petId);
    await refresh();
  },
  addActivity: async (input) => {
    const id = await productionRepository.createActivity(input);
    await refresh();
    return id;
  },
  cancelActivity: async (activityId) => {
    await productionRepository.cancelActivity(activityId);
    await refresh();
  },
  toggleJoinActivity: async (activityId) => {
    if (get().joinedActivities.includes(activityId)) await productionRepository.cancelActivityRequest(activityId);
    else await productionRepository.requestActivity(activityId, get().pets[0]?.id);
    await refresh();
  },
  respondToActivityRequest: async (requestId, status) => {
    await productionRepository.respondActivityRequest(requestId, status);
    await refresh();
  },
  addLostFoundAlert: async (input, image) => {
    const id = await productionRepository.createAlert({ ...input, petId: get().pets[0]?.id }, image);
    await refresh();
    return id;
  },
  updateAvatar: async (image) => {
    await productionRepository.updateAvatar(image);
    await refresh();
  },
  updateProfile: async (input) => {
    await productionRepository.updateCurrentProfile(input);
    await refresh();
  },
  resolveLostFoundAlert: async (alertId) => {
    await productionRepository.resolveAlert(alertId);
    set((state) => ({ lostFoundAlerts: state.lostFoundAlerts.map((alert) => alert.id === alertId ? { ...alert, resolved: true, urgent: false } : alert) }));
    await refresh();
  },
  reportAlertSighting: async (alertId, description) => {
    await productionRepository.reportAlertSighting(alertId, description);
    await refresh();
  },
  sendMessage: async (conversationId, body, image) => {
    const currentUser = get().currentUser;
    if (!currentUser) throw new Error('Your profile is unavailable.');
    const nonce = createUuid();
    const optimistic: ChatMessage = { id: nonce, conversationId, senderId: currentUser.id, body, imageUrl: image?.uri, createdAt: 'Now', status: 'sent' };
    set((state) => ({
      messages: [...state.messages, optimistic],
      conversations: state.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, preview: body || 'Photo', time: 'Now', unread: 0 } : conversation),
    }));
    try {
      await productionRepository.sendMessage(conversationId, body, nonce, image);
      await refresh();
    } catch (error) {
      set((state) => ({ messages: state.messages.filter((message) => message.id !== nonce) }));
      throw error;
    }
  },
  startConversation: async (profileId) => {
    const id = await productionRepository.ensureConversation(profileId);
    await refresh();
    return id;
  },
  markConversationRead: async (conversationId) => {
    set((state) => ({ conversations: state.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation) }));
    await productionRepository.markConversationRead(conversationId);
  },
  markNotificationRead: async (notificationId) => {
    set((state) => ({ notifications: state.notifications.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification) }));
    await productionRepository.markNotificationRead(notificationId);
  },
  markAllNotificationsRead: async () => {
    set((state) => ({ notifications: state.notifications.map((notification) => ({ ...notification, read: true })) }));
    await productionRepository.markNotificationRead();
  },
  reportContent: async (targetType, targetId, _targetLabel, reason) => {
    await productionRepository.submitReport(targetType, targetId, reason);
    await refresh();
  },
  moderateReport: async (reportId, status) => {
    await productionRepository.moderateReport(reportId, status);
    await refresh();
  },
  blockUser: async (userId) => {
    await productionRepository.blockProfile(userId);
    set((state) => ({
      blockedUserIds: [...state.blockedUserIds, userId],
      connectedUserIds: state.connectedUserIds.filter((id) => id !== userId),
      nearbyParents: state.nearbyParents.filter((profile) => profile.id !== userId),
      posts: state.posts.filter((post) => post.author.id !== userId),
      conversations: state.conversations.filter((conversation) => conversation.parent.id !== userId),
    }));
    await refresh();
  },
  unblockUser: async (userId) => {
    await productionRepository.unblockProfile(userId);
    set((state) => ({ blockedUserIds: state.blockedUserIds.filter((id) => id !== userId), blockedProfiles: state.blockedProfiles.filter((profile) => profile.id !== userId) }));
    await refresh();
  },
  toggleConnection: async (userId) => {
    const connected = get().connectedUserIds.includes(userId);
    const pending = get().connectionRequests.some((request) => request.profile.id === userId);
    await productionRepository.toggleConnection(userId, connected || pending);
    if (connected) set((state) => ({ connectedUserIds: state.connectedUserIds.filter((id) => id !== userId) }));
    await refresh();
  },
  respondToConnection: async (requesterId, decision) => {
    await productionRepository.respondConnection(requesterId, decision);
    await refresh();
  },
  setPrivacyPreference: async (key, value) => {
    const previous = get().privacyPreferences;
    set((state) => ({ privacyPreferences: { ...state.privacyPreferences, [key]: value } }));
    try {
      await productionRepository.updatePrivacy(key, value);
      await refresh();
    } catch (error) {
      set({ privacyPreferences: previous });
      throw error;
    }
  },
  updateBreedingApplication: (values) => set((state) => ({ breedingApplication: { ...state.breedingApplication, ...values } })),
  submitBreedingApplication: async () => {
    throw new Error('Document-backed breeding applications remain disabled until legal and animal-welfare review is complete.');
  },
  toggleBreedingFeature: async () => {
    const enabled = !get().featureFlags.breeding;
    await productionRepository.setBreedingFeature(enabled);
    set({ featureFlags: { breeding: enabled } });
    await refresh();
  },
}));
