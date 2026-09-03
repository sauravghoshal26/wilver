export type Species = 'dog' | 'cat';

export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed: string;
  age: string;
  temperament: string[];
  imageUrl: string;
  verified: boolean;
  sex?: 'Female' | 'Male' | 'Unknown';
  size?: 'Small' | 'Medium' | 'Large';
  energyLevel?: number;
  vaccinated?: boolean;
  neuteredOrSpayed?: boolean;
};

export type ParentProfile = {
  id: string;
  name: string;
  handle: string;
  neighborhood: string;
  bio: string;
  avatarUrl: string;
  verified: boolean;
  distanceKm: number;
  pets: Pet[];
  connected?: boolean;
  isAdmin?: boolean;
  isAdult?: boolean;
  onboarded?: boolean;
  discoverable?: boolean;
  allowMessages?: PrivacyPreferences['allowMessages'];
  nearbyAlerts?: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  author: ParentProfile;
  body: string;
  createdAt: string;
};

export type FeedPost = {
  id: string;
  author: ParentProfile;
  pet?: Pet;
  body: string;
  imageUrl?: string;
  neighborhood: string;
  createdAt: string;
  likes: number;
  comments: number;
  liked?: boolean;
  tag?: 'Playdate' | 'Tip' | 'Community' | 'Lost pet';
};

export type Activity = {
  id: string;
  title: string;
  type: 'Walk' | 'Playdate' | 'Event';
  dateLabel: string;
  locationLabel: string;
  distanceKm: number;
  attendees: number;
  capacity: number;
  host: ParentProfile;
  accent: string;
  description: string;
  hostedByCurrentUser?: boolean;
  exactLocationHint?: string;
  compatiblePets?: string;
  attendanceStatus?: AttendanceStatus;
};

export type AttendanceStatus = 'pending' | 'approved' | 'declined';

export type ConnectionRequest = {
  id: string;
  profile: ParentProfile;
  direction: 'incoming' | 'outgoing';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type ActivityRequest = {
  id: string;
  activityId: string;
  parent: ParentProfile;
  pet: Pet;
  status: AttendanceStatus;
  createdAt: string;
};

export type Conversation = {
  id: string;
  parent: ParentProfile;
  preview: string;
  time: string;
  unread: number;
  connected: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  status: 'sent' | 'read';
};

export type LostFoundAlert = {
  id: string;
  kind: 'lost' | 'found';
  title: string;
  description: string;
  neighborhood: string;
  lastSeen: string;
  distanceKm: number;
  imageUrl: string;
  creator: ParentProfile;
  urgent: boolean;
  resolved: boolean;
  createdByCurrentUser?: boolean;
};

export type AlertSighting = {
  id: string;
  alertId: string;
  reporterId: string;
  description: string;
  neighborhood: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  kind: 'like' | 'comment' | 'message' | 'activity' | 'alert' | 'moderation' | 'connection';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  route?: string;
  actor?: ParentProfile;
};

export type Report = {
  id: string;
  targetType: 'profile' | 'pet' | 'post' | 'comment' | 'message' | 'activity' | 'alert' | 'breeding_profile';
  targetId: string;
  targetLabel: string;
  reason: string;
  details?: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
};

export type PrivacyPreferences = {
  discoverable: boolean;
  approximateLocation: boolean;
  allowMessages: 'connections' | 'everyone' | 'nobody';
  nearbyAlerts: boolean;
};

export type BreedingApplication = {
  status: 'not_started' | 'pending' | 'verified' | 'rejected';
  adultConfirmed: boolean;
  acknowledged: boolean;
  documentsReady: boolean;
};

export type ProductionSnapshot = {
  currentUser: ParentProfile | null;
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
  connectedUserIds: string[];
  connectionRequests: ConnectionRequest[];
  nearbyParents: ParentProfile[];
  privacyPreferences: PrivacyPreferences;
  featureFlags: { breeding: boolean };
  breedingApplication: BreedingApplication;
};

export type OnboardingDraft = {
  petId: string;
  displayName: string;
  handle: string;
  interests: string[];
  adultConfirmed: boolean;
  neighborhood: string;
  city: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
  petName: string;
  species: Species;
};
