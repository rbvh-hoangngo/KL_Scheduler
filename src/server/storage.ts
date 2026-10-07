import fs from 'fs';
import path from 'path';
import {
  Dealership,
  ServiceType,
  ServiceBay,
  Technician,
  Appointment,
  ObservabilityMetrics,
  AuditLogEntry
} from '../shared/types.js';

interface DatabaseSchema {
  dealerships: Dealership[];
  serviceTypes: ServiceType[];
  serviceBays: ServiceBay[];
  technicians: Technician[];
  appointments: Appointment[];
  auditLogs: AuditLogEntry[];
  metrics: {
    totalRequests: number;
    successfulBookings: number;
    conflictsRejected: number;
    cancellations: number;
    latenciesMs: number[];
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'scheduler_db.json');
const TMP_FILE = path.join(DATA_DIR, 'scheduler_db.tmp.json');

export class DatabaseStore {
  private data: DatabaseSchema;
  private isWriting = false;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadOrSeed();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrSeed(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.dealerships && parsed.serviceTypes && parsed.appointments) {
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, re-seeding default database:', err);
      }
    }
    const initial = this.generateSeedData();
    this.saveDirect(initial);
    return initial;
  }

  private generateSeedData(): DatabaseSchema {
    const dealerships: Dealership[] = [
      {
        id: 'dlr_metro_central',
        name: 'Apex Metro Service Center',
        code: 'APEX-SEA',
        address: '1420 4th Ave',
        city: 'Seattle',
        state: 'WA',
        timezone: 'America/Los_Angeles',
        phone: '(206) 555-0142',
        operatingHours: { open: '08:00', close: '18:00', slotDurationMinutes: 30 }
      },
      {
        id: 'dlr_bayside_ev',
        name: 'Bayside EV & Tech Hub',
        code: 'BAY-SFO',
        address: '750 Embarcadero St',
        city: 'San Francisco',
        state: 'CA',
        timezone: 'America/Los_Angeles',
        phone: '(415) 555-0899',
        operatingHours: { open: '08:00', close: '18:00', slotDurationMinutes: 30 }
      },
      {
        id: 'dlr_summit_auto',
        name: 'Summit Performance Motors',
        code: 'SUM-DEN',
        address: '2200 Broadway',
        city: 'Denver',
        state: 'CO',
        timezone: 'America/Denver',
        phone: '(303) 555-0371',
        operatingHours: { open: '08:00', close: '18:00', slotDurationMinutes: 30 }
      }
    ];

    const serviceTypes: ServiceType[] = [
      {
        id: 'srv_oil_change',
        name: 'Synthetic Oil & Filter Service',
        description: 'Complete engine oil drain, synthetic oil refill, OEM filter replacement and fluid top-off.',
        durationMinutes: 30,
        requiredBayCapability: 'QUICK_LUBE',
        requiredSkill: 'LUBE_TIRE',
        applicableFuelTypes: ['ICE', 'HYBRID', 'DIESEL'],
        estimatedCost: 89
      },
      {
        id: 'srv_brake_overhaul',
        name: 'Brake Rotor & Caliper Overhaul',
        description: 'Front and rear rotor resurfacing or replacement, ceramic pad installation, fluid bleed and pressure test.',
        durationMinutes: 90,
        requiredBayCapability: 'STANDARD_LIFT',
        requiredSkill: 'BRAKE_SUSPENSION',
        applicableFuelTypes: ['EV', 'ICE', 'HYBRID', 'DIESEL'],
        estimatedCost: 320
      },
      {
        id: 'srv_ev_battery_diag',
        name: 'High-Voltage EV Battery Diagnostic',
        description: 'Thermal cell degradation scan, state-of-health pack balancing, high-voltage interlock check.',
        durationMinutes: 60,
        requiredBayCapability: 'EV_CERTIFIED',
        requiredSkill: 'EV_HIGH_VOLTAGE',
        applicableFuelTypes: ['EV', 'HYBRID'],
        estimatedCost: 210
      },
      {
        id: 'srv_wheel_alignment',
        name: 'Laser Precision 4-Wheel Alignment',
        description: 'Computerized laser camber/caster/toe calibration on calibrated alignment rack.',
        durationMinutes: 60,
        requiredBayCapability: 'ALIGNMENT_RACK',
        requiredSkill: 'BRAKE_SUSPENSION',
        applicableFuelTypes: ['EV', 'ICE', 'HYBRID', 'DIESEL'],
        estimatedCost: 155
      },
      {
        id: 'srv_powertrain_heavy',
        name: 'Heavy Powertrain & Transmission Service',
        description: 'Transmission drop, differential inspection, heavy hydraulic lift service.',
        durationMinutes: 180,
        requiredBayCapability: 'HEAVY_DUTY_LIFT',
        requiredSkill: 'ENGINE_TRANSMISSION',
        applicableFuelTypes: ['ICE', 'HYBRID', 'DIESEL'],
        estimatedCost: 650
      },
      {
        id: 'srv_multipoint_master',
        name: 'Master Comprehensive Multi-Point Inspection',
        description: 'Rigorous 150-point safety inspection covering chassis, powertrain, electronics, and brake lines.',
        durationMinutes: 45,
        requiredBayCapability: 'STANDARD_LIFT',
        requiredSkill: 'MASTER_TECH',
        applicableFuelTypes: ['EV', 'ICE', 'HYBRID', 'DIESEL'],
        estimatedCost: 125
      }
    ];

    const serviceBays: ServiceBay[] = [
      // Apex Metro (Seattle)
      { id: 'bay_sea_01', dealershipId: 'dlr_metro_central', bayNumber: 'Bay 1', name: 'Quick Lube Pit 1', capabilities: ['QUICK_LUBE', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sea_02', dealershipId: 'dlr_metro_central', bayNumber: 'Bay 2', name: 'Standard 2-Post Lift A', capabilities: ['STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sea_03', dealershipId: 'dlr_metro_central', bayNumber: 'Bay 3', name: 'EV High-Voltage Certified Bay', capabilities: ['EV_CERTIFIED', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sea_04', dealershipId: 'dlr_metro_central', bayNumber: 'Bay 4', name: 'Hunter Laser Alignment Bay', capabilities: ['ALIGNMENT_RACK', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sea_05', dealershipId: 'dlr_metro_central', bayNumber: 'Bay 5', name: 'Heavy Duty 4-Post Lift', capabilities: ['HEAVY_DUTY_LIFT', 'STANDARD_LIFT'], status: 'ACTIVE' },

      // Bayside EV (San Francisco)
      { id: 'bay_sfo_01', dealershipId: 'dlr_bayside_ev', bayNumber: 'Bay 101', name: 'EV Diagnostic Bay Alpha', capabilities: ['EV_CERTIFIED', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sfo_02', dealershipId: 'dlr_bayside_ev', bayNumber: 'Bay 102', name: 'EV Diagnostic Bay Beta', capabilities: ['EV_CERTIFIED', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sfo_03', dealershipId: 'dlr_bayside_ev', bayNumber: 'Bay 103', name: 'Express Alignment & Suspension', capabilities: ['ALIGNMENT_RACK', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_sfo_04', dealershipId: 'dlr_bayside_ev', bayNumber: 'Bay 104', name: 'Standard Mechanical Bay', capabilities: ['STANDARD_LIFT', 'QUICK_LUBE'], status: 'ACTIVE' },

      // Summit Motors (Denver)
      { id: 'bay_den_01', dealershipId: 'dlr_summit_auto', bayNumber: 'Bay 201', name: 'Heavy Duty Truck Lift', capabilities: ['HEAVY_DUTY_LIFT', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_den_02', dealershipId: 'dlr_summit_auto', bayNumber: 'Bay 202', name: 'Standard Service Lift', capabilities: ['STANDARD_LIFT', 'QUICK_LUBE'], status: 'ACTIVE' },
      { id: 'bay_den_03', dealershipId: 'dlr_summit_auto', bayNumber: 'Bay 203', name: 'Mountain EV Station', capabilities: ['EV_CERTIFIED', 'STANDARD_LIFT'], status: 'ACTIVE' },
      { id: 'bay_den_04', dealershipId: 'dlr_summit_auto', bayNumber: 'Bay 204', name: 'Alignment & Chassis Bay', capabilities: ['ALIGNMENT_RACK', 'STANDARD_LIFT'], status: 'ACTIVE' }
    ];

    const technicians: Technician[] = [
      // Apex Metro (Seattle)
      { id: 'tech_sea_01', dealershipId: 'dlr_metro_central', name: 'Marcus Vance', email: 'm.vance@apexmetro.com', phone: '(206) 555-8120', skills: ['EV_HIGH_VOLTAGE', 'MASTER_TECH'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_sea_02', dealershipId: 'dlr_metro_central', name: 'Elena Rostova', email: 'e.rostova@apexmetro.com', phone: '(206) 555-8121', skills: ['BRAKE_SUSPENSION', 'LUBE_TIRE'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_sea_03', dealershipId: 'dlr_metro_central', name: 'Derrick Chen', email: 'd.chen@apexmetro.com', phone: '(206) 555-8122', skills: ['ENGINE_TRANSMISSION', 'MASTER_TECH'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_sea_04', dealershipId: 'dlr_metro_central', name: 'Sarah Jenkins', email: 's.jenkins@apexmetro.com', phone: '(206) 555-8123', skills: ['LUBE_TIRE'], shiftStart: '08:00', shiftEnd: '16:30', active: true },

      // Bayside EV (San Francisco)
      { id: 'tech_sfo_01', dealershipId: 'dlr_bayside_ev', name: 'Aiden Patel', email: 'a.patel@bayside-ev.com', phone: '(415) 555-9201', skills: ['EV_HIGH_VOLTAGE', 'MASTER_TECH'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_sfo_02', dealershipId: 'dlr_bayside_ev', name: 'Clara Oswald', email: 'c.oswald@bayside-ev.com', phone: '(415) 555-9202', skills: ['EV_HIGH_VOLTAGE', 'BRAKE_SUSPENSION'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_sfo_03', dealershipId: 'dlr_bayside_ev', name: 'Mateo Morales', email: 'm.morales@bayside-ev.com', phone: '(415) 555-9203', skills: ['BRAKE_SUSPENSION', 'LUBE_TIRE'], shiftStart: '08:30', shiftEnd: '17:00', active: true },

      // Summit Motors (Denver)
      { id: 'tech_den_01', dealershipId: 'dlr_summit_auto', name: 'Garth Holloway', email: 'g.holloway@summitauto.com', phone: '(303) 555-4411', skills: ['ENGINE_TRANSMISSION', 'BRAKE_SUSPENSION', 'MASTER_TECH'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_den_02', dealershipId: 'dlr_summit_auto', name: 'Yuki Tanaka', email: 'y.tanaka@summitauto.com', phone: '(303) 555-4412', skills: ['EV_HIGH_VOLTAGE', 'MASTER_TECH'], shiftStart: '08:00', shiftEnd: '17:00', active: true },
      { id: 'tech_den_03', dealershipId: 'dlr_summit_auto', name: 'Jordan Rivera', email: 'j.rivera@summitauto.com', phone: '(303) 555-4413', skills: ['LUBE_TIRE', 'BRAKE_SUSPENSION'], shiftStart: '08:00', shiftEnd: '16:30', active: true }
    ];

    // Seed realistic appointments for today and tomorrow to simulate busy resource constraints
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointments: Appointment[] = [
      {
        id: 'apt_seed_001',
        confirmationCode: 'USS-7891-SEA',
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_ev_battery_diag',
        serviceBayId: 'bay_sea_03', // EV bay
        technicianId: 'tech_sea_01', // Marcus Vance (EV tech)
        customer: {
          id: 'cust_001',
          name: 'Vivian Zhao',
          email: 'vivian.zhao@example.com',
          phone: '(206) 555-3211'
        },
        vehicle: {
          vin: '5YJ3E1EB8NF129031',
          make: 'Tesla',
          model: 'Model 3 Performance',
          year: 2022,
          fuelType: 'EV',
          licensePlate: '7ABC123'
        },
        startTime: `${todayStr}T09:00:00.000Z`,
        endTime: `${todayStr}T10:00:00.000Z`,
        durationMinutes: 60,
        status: 'CONFIRMED',
        notes: 'High-voltage diagnostic prior to cross-country trip.',
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 86400000).toISOString(),
        traceId: 'trc_seed_01'
      },
      {
        id: 'apt_seed_002',
        confirmationCode: 'USS-4412-SEA',
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_brake_overhaul',
        serviceBayId: 'bay_sea_02', // Standard 2-post lift
        technicianId: 'tech_sea_02', // Elena Rostova (Brake tech)
        customer: {
          id: 'cust_002',
          name: 'Robert Miller',
          email: 'r.miller@example.com',
          phone: '(206) 555-7729'
        },
        vehicle: {
          vin: '1FTFW1E84MKD99412',
          make: 'Ford',
          model: 'F-150 Lariat',
          year: 2021,
          fuelType: 'ICE',
          licensePlate: 'WA-88192'
        },
        startTime: `${todayStr}T10:30:00.000Z`,
        endTime: `${todayStr}T12:00:00.000Z`,
        durationMinutes: 90,
        status: 'CONFIRMED',
        notes: 'Noticeable grinding noise on front passenger side.',
        createdAt: new Date(now.getTime() - 43200000).toISOString(),
        updatedAt: new Date(now.getTime() - 43200000).toISOString(),
        traceId: 'trc_seed_02'
      },
      {
        id: 'apt_seed_003',
        confirmationCode: 'USS-9021-SFO',
        dealershipId: 'dlr_bayside_ev',
        serviceTypeId: 'srv_ev_battery_diag',
        serviceBayId: 'bay_sfo_01', // EV Alpha
        technicianId: 'tech_sfo_01', // Aiden Patel
        customer: {
          id: 'cust_003',
          name: 'Alicia Gomez',
          email: 'alicia.g@example.com',
          phone: '(415) 555-4001'
        },
        vehicle: {
          vin: 'WP0AA2Y13NSA99120',
          make: 'Porsche',
          model: 'Taycan 4S',
          year: 2023,
          fuelType: 'EV',
          licensePlate: 'CA-EVPWR'
        },
        startTime: `${tomorrowStr}T10:00:00.000Z`,
        endTime: `${tomorrowStr}T11:00:00.000Z`,
        durationMinutes: 60,
        status: 'CONFIRMED',
        notes: 'Annual scheduled high-voltage health certification.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        traceId: 'trc_seed_03'
      }
    ];

    const auditLogs: AuditLogEntry[] = [
      {
        id: 'log_seed_1',
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        traceId: 'trc_seed_init',
        event: 'BOOKING_SUCCESS',
        dealershipId: 'dlr_metro_central',
        details: 'System initialized with baseline multi-resource topology (3 dealerships, 13 bays, 10 technicians).',
        durationMs: 12
      }
    ];

    return {
      dealerships,
      serviceTypes,
      serviceBays,
      technicians,
      appointments,
      auditLogs,
      metrics: {
        totalRequests: 142,
        successfulBookings: appointments.length,
        conflictsRejected: 18,
        cancellations: 2,
        latenciesMs: [14, 18, 12, 22, 19, 15, 27, 16, 21, 17]
      }
    };
  }

  private saveDirect(data: DatabaseSchema) {
    const raw = JSON.stringify(data, null, 2);
    fs.writeFileSync(TMP_FILE, raw, 'utf-8');
    fs.renameSync(TMP_FILE, DB_FILE);
  }

  public persist() {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      this.saveDirect(this.data);
    } catch (err) {
      console.error('Failed to write database file:', err);
    } finally {
      this.isWriting = false;
    }
  }

  public resetToDefault(): DatabaseSchema {
    this.data = this.generateSeedData();
    this.persist();
    return this.data;
  }

  // Getters
  public getDealerships(): Dealership[] {
    return this.data.dealerships;
  }

  public getDealership(id: string): Dealership | undefined {
    return this.data.dealerships.find(d => d.id === id);
  }

  public getServiceTypes(): ServiceType[] {
    return this.data.serviceTypes;
  }

  public getServiceType(id: string): ServiceType | undefined {
    return this.data.serviceTypes.find(s => s.id === id);
  }

  public getServiceBays(dealershipId?: string): ServiceBay[] {
    if (!dealershipId) return this.data.serviceBays;
    return this.data.serviceBays.filter(b => b.dealershipId === dealershipId);
  }

  public getServiceBay(id: string): ServiceBay | undefined {
    return this.data.serviceBays.find(b => b.id === id);
  }

  public getTechnicians(dealershipId?: string): Technician[] {
    if (!dealershipId) return this.data.technicians;
    return this.data.technicians.filter(t => t.dealershipId === dealershipId && t.active);
  }

  public getTechnician(id: string): Technician | undefined {
    return this.data.technicians.find(t => t.id === id);
  }

  public getAppointments(filters?: { dealershipId?: string; date?: string; status?: string }): Appointment[] {
    let list = this.data.appointments;
    if (filters?.dealershipId) {
      list = list.filter(a => a.dealershipId === filters.dealershipId);
    }
    if (filters?.status) {
      list = list.filter(a => a.status === filters.status);
    }
    if (filters?.date) {
      list = list.filter(a => a.startTime.startsWith(filters.date!));
    }
    // Return sorted descending by start time
    return [...list].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  public getAppointment(id: string): Appointment | undefined {
    return this.data.appointments.find(a => a.id === id);
  }

  public addAppointment(appointment: Appointment): Appointment {
    this.data.appointments.push(appointment);
    this.data.metrics.successfulBookings++;
    this.persist();
    return appointment;
  }

  public updateAppointmentStatus(id: string, status: Appointment['status']): Appointment | null {
    const apt = this.data.appointments.find(a => a.id === id);
    if (!apt) return null;
    apt.status = status;
    apt.updatedAt = new Date().toISOString();
    if (status === 'CANCELLED') {
      this.data.metrics.cancellations++;
    }
    this.persist();
    return apt;
  }

  public logAudit(entry: AuditLogEntry) {
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 100) {
      this.data.auditLogs.pop();
    }
    this.persist();
  }

  public recordRequest(latencyMs: number, conflict: boolean = false) {
    this.data.metrics.totalRequests++;
    if (conflict) {
      this.data.metrics.conflictsRejected++;
    }
    this.data.metrics.latenciesMs.push(latencyMs);
    if (this.data.metrics.latenciesMs.length > 50) {
      this.data.metrics.latenciesMs.shift();
    }
  }

  public getMetrics(): ObservabilityMetrics {
    const latencies = [...this.data.metrics.latenciesMs].sort((a, b) => a - b);
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1] : 0;
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length) : 0;

    const activeApts = this.data.appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS');
    const totalBays = this.data.serviceBays.filter(b => b.status === 'ACTIVE').length;
    const bayUtilization = totalBays > 0 ? Math.min(100, Math.round((activeApts.length / totalBays) * 25)) : 0;

    return {
      totalRequests: this.data.metrics.totalRequests,
      successfulBookings: this.data.metrics.successfulBookings,
      conflictsRejected: this.data.metrics.conflictsRejected,
      cancellations: this.data.metrics.cancellations,
      p95LatencyMs: p95,
      averageLatencyMs: avg,
      bayUtilizationPercent: bayUtilization,
      activeAppointmentsCount: activeApts.length,
      recentAuditLogs: this.data.auditLogs.slice(0, 15)
    };
  }
}

export const db = new DatabaseStore();
