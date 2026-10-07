export type BayCapability = 
  | 'STANDARD_LIFT'
  | 'HEAVY_DUTY_LIFT'
  | 'EV_CERTIFIED'
  | 'ALIGNMENT_RACK'
  | 'QUICK_LUBE';

export type TechnicianSkill = 
  | 'LUBE_TIRE'
  | 'BRAKE_SUSPENSION'
  | 'EV_HIGH_VOLTAGE'
  | 'ENGINE_TRANSMISSION'
  | 'MASTER_TECH';

export type FuelType = 'EV' | 'ICE' | 'HYBRID' | 'DIESEL';

export type AppointmentStatus = 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Dealership {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  timezone: string;
  phone: string;
  operatingHours: {
    open: string; // '08:00'
    close: string; // '18:00'
    slotDurationMinutes: number; // 30
  };
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiredBayCapability: BayCapability;
  requiredSkill: TechnicianSkill;
  applicableFuelTypes: FuelType[];
  estimatedCost: number;
}

export interface ServiceBay {
  id: string;
  dealershipId: string;
  bayNumber: string;
  name: string;
  capabilities: BayCapability[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
}

export interface Technician {
  id: string;
  dealershipId: string;
  name: string;
  email: string;
  phone: string;
  skills: TechnicianSkill[];
  shiftStart: string; // '08:00'
  shiftEnd: string; // '17:00'
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Vehicle {
  vin: string;
  make: string;
  model: string;
  year: number;
  fuelType: FuelType;
  licensePlate: string;
}

export interface Appointment {
  id: string;
  confirmationCode: string;
  dealershipId: string;
  serviceTypeId: string;
  serviceBayId: string;
  technicianId: string;
  customer: Customer;
  vehicle: Vehicle;
  startTime: string; // ISO string YYYY-MM-DDTHH:mm:ss.sssZ
  endTime: string;   // ISO string YYYY-MM-DDTHH:mm:ss.sssZ
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  traceId?: string;
}

// Availability Check
export interface TimeSlotAvailability {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  timeLabel: string; // e.g. "09:00 - 10:00"
  available: boolean;
  availableBaysCount: number;
  availableTechsCount: number;
  candidateBayIds: string[];
  candidateTechIds: string[];
  rejectionReason?: string;
}

export interface AvailabilityResponse {
  dealershipId: string;
  serviceTypeId: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  slots: TimeSlotAvailability[];
  totalSlots: number;
  availableSlotsCount: number;
}

// Booking Request & Response
export interface CreateAppointmentRequest {
  dealershipId: string;
  serviceTypeId: string;
  startTime: string; // ISO string
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  vehicle: {
    vin: string;
    make: string;
    model: string;
    year: number;
    fuelType: FuelType;
    licensePlate: string;
  };
  notes?: string;
}

export interface AppointmentDetailResponse extends Appointment {
  dealershipName: string;
  serviceName: string;
  serviceBayName: string;
  technicianName: string;
}

export interface ObservabilityMetrics {
  totalRequests: number;
  successfulBookings: number;
  conflictsRejected: number;
  cancellations: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  bayUtilizationPercent: number;
  activeAppointmentsCount: number;
  recentAuditLogs: AuditLogEntry[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  traceId: string;
  event: 'AVAILABILITY_CHECK' | 'BOOKING_ATTEMPT' | 'BOOKING_SUCCESS' | 'BOOKING_CONFLICT' | 'APPOINTMENT_CANCELLED';
  dealershipId?: string;
  details: string;
  durationMs?: number;
}
