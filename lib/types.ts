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
  club_id: string | null;
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
  | "create_event";

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

export type ClubInput = Pick<
  Club,
  | "description"
  | "organizer_name"
  | "organizer_bio"
  | "instagram"
  | "chat_link"
  | "meeting_point"
  | "schedule_text"
>;

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
  listClubs(city: string): Promise<Club[]>;
  getClubBySlug(slug: string): Promise<Club | null>;
  getClubById(id: string): Promise<Club | null>;
  updateClub(id: string, input: ClubInput): Promise<void>;

  listEvents(opts: { city?: string; clubId?: string; from?: string; to?: string; includeCancelled?: boolean }): Promise<ClubEvent[]>;
  getEvent(id: string): Promise<ClubEvent | null>;
  createEvent(clubId: string, input: EventInput): Promise<ClubEvent>;
  updateEvent(id: string, input: EventInput): Promise<void>;
  setEventStatus(id: string, status: ClubEvent["status"]): Promise<void>;

  upsertMemberByPhone(name: string, phone: string): Promise<Member>;
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
  log(entry: Omit<LogEntry, "created_at">): Promise<void>;
  snapshot(): Promise<Snapshot>;
}
