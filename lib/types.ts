export type City = { slug: string; name: string; active: boolean };

export type Club = {
  id: string;
  slug: string;
  city: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  organizer_name: string;
  organizer_bio: string;
  instagram: string | null;
  chat_link: string | null;
  meeting_point: string;
  schedule_text: string;
  color: string;
  is_founding: boolean;
  hidden: boolean;
  created_at: string;
};

export type ClubEvent = {
  id: string;
  club_id: string;
  title: string;
  description: string;
  starts_at: string; // ISO timestamp
  duration_min: number;
  location_name: string;
  location_url: string | null;
  capacity: number | null;
  price_text: string | null;
  status: "scheduled" | "cancelled";
  created_at: string;
};

export type Member = {
  id: string;
  name: string;
  phone: string; // normalized +77XXXXXXXXX
  created_at: string;
};

export type MemberAuth = {
  member: Member;
  pin_hash: string | null;
  locked_until: string | null;
};

export type Membership = {
  club_id: string;
  member_id: string;
  source: string | null;
  created_at: string;
};

export type Rsvp = {
  event_id: string;
  member_id: string;
  status: "going" | "cancelled";
  attended: boolean | null;
  created_at: string;
};

export type Feedback = {
  event_id: string;
  member_id: string;
  rating: number; // 1..5
  comment: string | null;
  created_at: string;
};

export type Organizer = {
  email: string;
  name: string;
  club_id: string | null;
  is_admin: boolean;
};

export type OrganizerRow = Organizer & { created_at: string; club_name: string | null };

export type FeedbackRow = {
  event_id: string;
  event_title: string;
  starts_at: string;
  rating: number;
  comment: string | null;
  member_name: string;
  created_at: string;
};

export type NewClubInput = {
  name: string;
  category: string;
  emoji: string;
  color: string;
  description: string;
  schedule_text: string;
  meeting_point: string;
  chat_link: string | null;
  instagram: string | null;
  organizer_name: string;
  organizer_bio: string;
};

export type LogType =
  | "view_city"
  | "view_club"
  | "view_event"
  | "join_club"
  | "rsvp"
  | "cancel_rsvp"
  | "mark_attendance"
  | "feedback"
  | "click_chat"
  | "create_event"
  | "create_club";

export type LogEntry = {
  type: LogType;
  visitor_id: string | null;
  member_id: string | null;
  club_id: string | null;
  event_id: string | null;
  created_at: string;
};

export type EventInput = {
  title: string;
  description: string;
  starts_at: string;
  duration_min: number;
  location_name: string;
  location_url: string | null;
  capacity: number | null;
  price_text: string | null;
};

export type ClubInput = NewClubInput;

export type RsvpWithMember = Rsvp & { member: Member };
export type MemberWithJoin = Member & { joined_at: string; attended_count: number };

/** Everything needed to compute experiment metrics. Fine at pilot scale. */
export type Snapshot = {
  clubs: Club[];
  events: ClubEvent[];
  members: Member[];
  memberships: Membership[];
  rsvps: Rsvp[];
  feedback: Feedback[];
  logs: LogEntry[];
};

export interface Repo {
  /** Public list: hidden clubs are excluded. */
  listClubs(city: string): Promise<Club[]>;
  /** Creates a club and its organizer account in one step. Throws EmailTakenError if the email is used. */
  createClubWithOrganizer(city: string, club: NewClubInput, email: string, passwordHash: string): Promise<Club>;
  setClubHidden(id: string, hidden: boolean): Promise<void>;
  /** Account without a club (used for the main admin). Throws EmailTakenError if the email is used. */
  createOrganizer(email: string, name: string, passwordHash: string, isAdmin: boolean): Promise<void>;
  /** Existing organizer account without a club gets a new club. Returns null if the account already has one. */
  createClubForOrganizer(city: string, club: NewClubInput, email: string): Promise<Club | null>;
  /** Permanently deletes a club with its events, sign-ups and memberships. Its organizer keeps the account. */
  deleteClub(id: string): Promise<void>;
  deleteAllClubs(): Promise<number>;
  getClubBySlug(slug: string): Promise<Club | null>;
  getClubById(id: string): Promise<Club | null>;
  updateClub(id: string, input: ClubInput): Promise<void>;

  listEvents(opts: { city?: string; clubId?: string; from?: string; to?: string; includeCancelled?: boolean }): Promise<ClubEvent[]>;
  getEvent(id: string): Promise<ClubEvent | null>;
  createEvent(clubId: string, input: EventInput): Promise<ClubEvent>;
  updateEvent(id: string, input: EventInput): Promise<void>;
  setEventStatus(id: string, status: ClubEvent["status"]): Promise<void>;

  upsertMemberByPhone(name: string, phone: string): Promise<Member>;
  /** Member + sign-in data for a phone, or null. */
  getMemberAuth(phone: string): Promise<MemberAuth | null>;
  createMember(name: string, phone: string, pinHash: string): Promise<Member>;
  setMemberPin(id: string, pinHash: string): Promise<void>;
  /** Count a wrong PIN; locks sign-in for 15 minutes after 5 failures. */
  recordPinFailure(id: string): Promise<void>;
  clearPinFailures(id: string): Promise<void>;
  getMember(id: string): Promise<Member | null>;

  joinClub(clubId: string, memberId: string, source: string | null): Promise<void>;
  isMember(clubId: string, memberId: string): Promise<boolean>;
  countMembers(clubId: string): Promise<number>;
  listClubMembers(clubId: string): Promise<MemberWithJoin[]>;
  listMemberClubs(memberId: string): Promise<Club[]>;

  setRsvp(eventId: string, memberId: string, status: Rsvp["status"]): Promise<void>;
  getRsvp(eventId: string, memberId: string): Promise<Rsvp | null>;
  countGoing(eventIds: string[]): Promise<Record<string, number>>;
  listEventRsvps(eventId: string): Promise<RsvpWithMember[]>;
  listMemberRsvps(memberId: string): Promise<(Rsvp & { event: ClubEvent })[]>;
  markAttendance(eventId: string, memberId: string, attended: boolean): Promise<void>;

  addFeedback(eventId: string, memberId: string, rating: number, comment: string | null): Promise<void>;
  listMemberFeedbackEventIds(memberId: string): Promise<string[]>;

  getOrganizer(email: string): Promise<Organizer | null>;
  getPasswordHash(email: string): Promise<string | null>;
  setPasswordHash(email: string, hash: string): Promise<void>;
  setAdmin(email: string, isAdmin: boolean): Promise<void>;
  listOrganizers(): Promise<OrganizerRow[]>;

  /** Books a seat only if there is room (atomic). Returns false when the event is full. */
  bookSeat(eventId: string, memberId: string): Promise<boolean>;
  deleteEvent(id: string): Promise<void>;
  /** Leaves a club and cancels the member's upcoming sign-ups in it. */
  leaveClub(clubId: string, memberId: string): Promise<void>;
  markAllAttended(eventId: string): Promise<void>;
  listClubFeedback(clubId: string): Promise<FeedbackRow[]>;
  findMemberByPhone(phone: string): Promise<Member | null>;
  /** Deletes a member with their memberships, sign-ups and ratings. */
  deleteMember(id: string): Promise<void>;

  /** Counts a hit; true when the key exceeded `limit` hits within `windowSec`. */
  rateLimited(key: string, limit: number, windowSec: number): Promise<boolean>;
  log(entry: Omit<LogEntry, "created_at">): Promise<void>;
  snapshot(): Promise<Snapshot>;
}

export class EmailTakenError extends Error {
  constructor() {
    super("email_taken");
  }
}
