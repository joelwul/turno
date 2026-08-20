export type Role = 'OWNER' | 'ADMIN' | 'STAFF';
export type AppointmentStatus = 'pending' | 'confirmed' | 'served' | 'canceled' | 'no_show';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';

export interface Organization {
  id: string; name: string; slug: string; logo_url: string | null;
  phone: string | null; whatsapp: string | null; email: string | null;
  address: string | null; city: string | null; country: string | null;
  timezone: string; currency: string;
  subscription_status: SubscriptionStatus; trial_ends_at: string; created_at: string;
}
export interface Membership { role: Role; organization: Organization; }
export interface BusinessSettings {
  organization_id: string;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  slot_minutes: number; booking_enabled: boolean; booking_advance_days: number;
  booking_min_notice_minutes: number; winback_days: number;
}
export interface StaffMember {
  id: string; organization_id: string; user_id: string | null; name: string;
  photo_url: string | null; phone: string | null; email: string | null;
  specialties: string | null; is_active: boolean;
}
export interface WorkingHours { id: string; staff_id: string; weekday: number; start_time: string; end_time: string; }
export interface StaffWithRelations extends StaffMember {
  working_hours: WorkingHours[]; staff_services: { service_id: string }[];
}
export interface Service {
  id: string; organization_id: string; name: string; description: string | null;
  duration_minutes: number; price: number; is_active: boolean;
}
export interface Client {
  id: string; organization_id: string; first_name: string; last_name: string;
  phone: string | null; whatsapp: string | null; email: string | null;
  birthdate: string | null; notes: string | null; origin: 'salon' | 'online';
  preferred_staff_id: string | null; last_visit_at: string | null;
  visits_count: number; total_spent: number; created_at: string;
}
export interface Appointment {
  id: string; organization_id: string; client_id: string; staff_id: string; service_id: string;
  starts_at: string; duration_minutes: number; price: number; status: AppointmentStatus;
  source: 'internal' | 'online'; notes: string | null; cancel_reason: string | null; created_at: string;
}
export interface AppointmentFull extends Appointment {
  client: Pick<Client, 'id' | 'first_name' | 'last_name' | 'phone'>;
  service: Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price'>;
  staff: Pick<StaffMember, 'id' | 'name'>;
}
export interface PublicBusiness {
  id: string; name: string; slug: string; logo_url: string | null;
  address: string | null; city: string | null; currency: string;
  services: Pick<Service, 'id' | 'name' | 'description' | 'duration_minutes' | 'price'>[];
  staff: Pick<StaffMember, 'id' | 'name' | 'photo_url' | 'specialties'>[];
  staff_services: { staff_id: string; service_id: string }[];
  booking: { slot_minutes: number; advance_days: number; min_notice_minutes: number; enabled: boolean };
  photos?: { id: string; url: string; url_after: string | null; category: string | null; tags: string[]; staff: string | null; service: string | null }[];
  phone?: string | null; whatsapp?: string | null;
}
export interface AppointmentInput {
  client_id: string; staff_id: string; service_id: string; starts_at: string;
  duration_minutes: number; price: number; status: AppointmentStatus;
  source: 'internal' | 'online'; notes: string | null;
}