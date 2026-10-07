import crypto from 'crypto';
import {
  Dealership,
  ServiceType,
  ServiceBay,
  Technician,
  Appointment,
  TimeSlotAvailability,
  AvailabilityResponse,
  CreateAppointmentRequest,
  AppointmentDetailResponse
} from '../shared/types.js';
import { db } from './storage.js';

// Mutex lock map per dealership for transaction isolation
const dealershipLocks = new Map<string, Promise<void>>();

async function acquireDealershipLock(dealershipId: string): Promise<() => void> {
  while (dealershipLocks.has(dealershipId)) {
    await dealershipLocks.get(dealershipId);
  }
  let resolver: () => void;
  const promise = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  dealershipLocks.set(dealershipId, promise);
  return () => {
    dealershipLocks.delete(dealershipId);
    resolver();
  };
}

export class SchedulerEngine {
  /**
   * Evaluates slot-by-slot real-time availability for a given dealership, service type, and date.
   */
  public checkAvailability(
    dealershipId: string,
    serviceTypeId: string,
    dateStr: string
  ): AvailabilityResponse {
    const dealership = db.getDealership(dealershipId);
    if (!dealership) {
      throw new Error(`Dealership with ID '${dealershipId}' not found.`);
    }

    const serviceType = db.getServiceType(serviceTypeId);
    if (!serviceType) {
      throw new Error(`Service type with ID '${serviceTypeId}' not found.`);
    }

    const duration = serviceType.durationMinutes;
    const { open, close, slotDurationMinutes } = dealership.operatingHours;

    // Retrieve resources for this dealership
    const allBays = db.getServiceBays(dealershipId).filter(b => b.status === 'ACTIVE');
    const qualifiedBays = allBays.filter(b => b.capabilities.includes(serviceType.requiredBayCapability));

    const allTechs = db.getTechnicians(dealershipId);
    const qualifiedTechs = allTechs.filter(t => t.skills.includes(serviceType.requiredSkill));

    // Existing active appointments for this date & dealership
    const existingAppointments = db.getAppointments({
      dealershipId,
      status: 'CONFIRMED'
    }).concat(db.getAppointments({ dealershipId, status: 'IN_PROGRESS' }));

    const slots: TimeSlotAvailability[] = [];

    // Parse open and close times
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Loop through 30-min intervals starting from open
    for (let minute = openMinutes; minute + duration <= closeMinutes; minute += slotDurationMinutes) {
      const slotStartH = Math.floor(minute / 60);
      const slotStartM = minute % 60;
      const slotEndTotal = minute + duration;
      const slotEndH = Math.floor(slotEndTotal / 60);
      const slotEndM = slotEndTotal % 60;

      const formatTime = (h: number, m: number) => 
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      const startTimeStr = `${dateStr}T${formatTime(slotStartH, slotStartM)}:00.000Z`;
      const endTimeStr = `${dateStr}T${formatTime(slotEndH, slotEndM)}:00.000Z`;
      const timeLabel = `${formatTime(slotStartH, slotStartM)} - ${formatTime(slotEndH, slotEndM)}`;

      const slotStartMs = new Date(startTimeStr).getTime();
      const slotEndMs = new Date(endTimeStr).getTime();

      // Find free qualified bays
      const freeBays = qualifiedBays.filter(bay => {
        const hasOverlap = existingAppointments.some(apt => {
          if (apt.serviceBayId !== bay.id) return false;
          const aptStart = new Date(apt.startTime).getTime();
          const aptEnd = new Date(apt.endTime).getTime();
          return aptStart < slotEndMs && aptEnd > slotStartMs;
        });
        return !hasOverlap;
      });

      // Find free qualified technicians (considering shift times and appointment overlaps)
      const freeTechs = qualifiedTechs.filter(tech => {
        const [shiftStartH, shiftStartM] = tech.shiftStart.split(':').map(Number);
        const [shiftEndH, shiftEndM] = tech.shiftEnd.split(':').map(Number);
        const shiftStartMin = shiftStartH * 60 + shiftStartM;
        const shiftEndMin = shiftEndH * 60 + shiftEndM;

        // Must fit within technician shift
        if (minute < shiftStartMin || slotEndTotal > shiftEndMin) {
          return false;
        }

        const hasOverlap = existingAppointments.some(apt => {
          if (apt.technicianId !== tech.id) return false;
          const aptStart = new Date(apt.startTime).getTime();
          const aptEnd = new Date(apt.endTime).getTime();
          return aptStart < slotEndMs && aptEnd > slotStartMs;
        });
        return !hasOverlap;
      });

      const isAvailable = freeBays.length > 0 && freeTechs.length > 0;
      let rejectionReason: string | undefined;

      if (!isAvailable) {
        if (qualifiedBays.length === 0) {
          rejectionReason = `Dealership lacks bays equipped for ${serviceType.requiredBayCapability}`;
        } else if (qualifiedTechs.length === 0) {
          rejectionReason = `No technician certified in ${serviceType.requiredSkill}`;
        } else if (freeBays.length === 0 && freeTechs.length === 0) {
          rejectionReason = `All ${qualifiedBays.length} bays and ${qualifiedTechs.length} certified technicians are occupied`;
        } else if (freeBays.length === 0) {
          rejectionReason = `All ${qualifiedBays.length} suitable bay(s) are in use during this window`;
        } else if (freeTechs.length === 0) {
          rejectionReason = `All ${qualifiedTechs.length} qualified technician(s) are booked or off-shift`;
        }
      }

      slots.push({
        startTime: startTimeStr,
        endTime: endTimeStr,
        timeLabel,
        available: isAvailable,
        availableBaysCount: freeBays.length,
        availableTechsCount: freeTechs.length,
        candidateBayIds: freeBays.map(b => b.id),
        candidateTechIds: freeTechs.map(t => t.id),
        rejectionReason
      });
    }

    const availableSlotsCount = slots.filter(s => s.available).length;

    return {
      dealershipId,
      serviceTypeId,
      date: dateStr,
      durationMinutes: duration,
      slots,
      totalSlots: slots.length,
      availableSlotsCount
    };
  }

  /**
   * Resource-Constrained Booking with atomic verification and dual-resource assignment.
   */
  public async bookAppointment(
    req: CreateAppointmentRequest,
    traceId: string = `trc_${Date.now()}`
  ): Promise<AppointmentDetailResponse> {
    const releaseLock = await acquireDealershipLock(req.dealershipId);
    const startExecution = Date.now();

    try {
      const dealership = db.getDealership(req.dealershipId);
      if (!dealership) {
        throw { statusCode: 404, message: `Dealership '${req.dealershipId}' not found.` };
      }

      const serviceType = db.getServiceType(req.serviceTypeId);
      if (!serviceType) {
        throw { statusCode: 404, message: `Service type '${req.serviceTypeId}' not found.` };
      }

      // Validate vehicle fuel type compatibility
      if (
        serviceType.applicableFuelTypes.length > 0 &&
        !serviceType.applicableFuelTypes.includes(req.vehicle.fuelType)
      ) {
        throw {
          statusCode: 400,
          message: `Incompatible fuel type: Service '${serviceType.name}' is only valid for [${serviceType.applicableFuelTypes.join(', ')}], but vehicle fuel type is '${req.vehicle.fuelType}'.`
        };
      }

      const startDate = new Date(req.startTime);
      if (isNaN(startDate.getTime())) {
        throw { statusCode: 400, message: 'Invalid start time format. ISO 8601 required.' };
      }

      const durationMs = serviceType.durationMinutes * 60 * 1000;
      const endDate = new Date(startDate.getTime() + durationMs);
      const reqStartMs = startDate.getTime();
      const reqEndMs = endDate.getTime();

      // Check dealership operating window for that time
      const dateStr = startDate.toISOString().split('T')[0];
      const startH = startDate.getUTCHours();
      const startM = startDate.getUTCMinutes();
      const endH = endDate.getUTCHours();
      const endM = endDate.getUTCMinutes();

      const [openH, openM] = dealership.operatingHours.open.split(':').map(Number);
      const [closeH, closeM] = dealership.operatingHours.close.split(':').map(Number);
      const reqStartTotal = startH * 60 + startM;
      const reqEndTotal = endH * 60 + endM;
      const openTotal = openH * 60 + openM;
      const closeTotal = closeH * 60 + closeM;

      if (reqStartTotal < openTotal || reqEndTotal > closeTotal) {
        throw {
          statusCode: 400,
          message: `Requested appointment [${startH}:${startM} - ${endH}:${endM}] falls outside dealership operating hours (${dealership.operatingHours.open} - ${dealership.operatingHours.close}).`
        };
      }

      // Query active appointments that overlap with [reqStartMs, reqEndMs]
      const activeAppointments = db.getAppointments({
        dealershipId: req.dealershipId,
        status: 'CONFIRMED'
      }).concat(db.getAppointments({ dealershipId: req.dealershipId, status: 'IN_PROGRESS' }));

      const overlappingAppointments = activeAppointments.filter(apt => {
        const aptStart = new Date(apt.startTime).getTime();
        const aptEnd = new Date(apt.endTime).getTime();
        return aptStart < reqEndMs && aptEnd > reqStartMs;
      });

      // Filter available bays with matching capability
      const qualifiedBays = db.getServiceBays(req.dealershipId).filter(
        b => b.status === 'ACTIVE' && b.capabilities.includes(serviceType.requiredBayCapability)
      );

      const busyBayIds = new Set(overlappingAppointments.map(a => a.serviceBayId));
      const availableBays = qualifiedBays.filter(b => !busyBayIds.has(b.id));

      if (availableBays.length === 0) {
        db.recordRequest(Date.now() - startExecution, true);
        db.logAudit({
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          traceId,
          event: 'BOOKING_CONFLICT',
          dealershipId: req.dealershipId,
          details: `Service Bay constraint violation: No active bay with capability '${serviceType.requiredBayCapability}' available for slot ${startDate.toISOString()}. Active bays examined: ${qualifiedBays.length}.`,
          durationMs: Date.now() - startExecution
        });

        throw {
          statusCode: 409,
          error: 'RESOURCE_BAY_UNAVAILABLE',
          message: `Booking failed: All Service Bays certified for '${serviceType.requiredBayCapability}' are occupied during this duration.`,
          details: {
            requiredBayCapability: serviceType.requiredBayCapability,
            qualifiedBaysTotal: qualifiedBays.length,
            occupiedBayIds: Array.from(busyBayIds)
          }
        };
      }

      // Filter available certified technicians
      const qualifiedTechs = db.getTechnicians(req.dealershipId).filter(
        t => t.active && t.skills.includes(serviceType.requiredSkill)
      );

      const busyTechIds = new Set(overlappingAppointments.map(a => a.technicianId));
      const availableTechs = qualifiedTechs.filter(tech => {
        if (busyTechIds.has(tech.id)) return false;

        const [shH, shM] = tech.shiftStart.split(':').map(Number);
        const [ehH, ehM] = tech.shiftEnd.split(':').map(Number);
        const shiftStartMin = shH * 60 + shM;
        const shiftEndMin = ehH * 60 + ehM;

        return reqStartTotal >= shiftStartMin && reqEndTotal <= shiftEndMin;
      });

      if (availableTechs.length === 0) {
        db.recordRequest(Date.now() - startExecution, true);
        db.logAudit({
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          traceId,
          event: 'BOOKING_CONFLICT',
          dealershipId: req.dealershipId,
          details: `Technician constraint violation: No technician certified in '${serviceType.requiredSkill}' available for slot ${startDate.toISOString()}. Qualified tech pool: ${qualifiedTechs.length}.`,
          durationMs: Date.now() - startExecution
        });

        throw {
          statusCode: 409,
          error: 'RESOURCE_TECHNICIAN_UNAVAILABLE',
          message: `Booking failed: No technician certified with skill '${serviceType.requiredSkill}' is free during the requested service window.`,
          details: {
            requiredSkill: serviceType.requiredSkill,
            qualifiedTechsTotal: qualifiedTechs.length,
            occupiedTechIds: Array.from(busyTechIds)
          }
        };
      }

      // Smart Least-Slack heuristic: pick bay with least excess capabilities to preserve hyper-specialized bays
      availableBays.sort((a, b) => a.capabilities.length - b.capabilities.length);
      const chosenBay = availableBays[0];

      // Assign first available certified technician
      const chosenTech = availableTechs[0];

      // Create confirmed Appointment Record
      const appointmentId = `apt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const confirmationCode = `USS-${Math.floor(1000 + Math.random() * 9000)}-${dealership.code.split('-')[1] || 'SCH'}`;

      const appointment: Appointment = {
        id: appointmentId,
        confirmationCode,
        dealershipId: req.dealershipId,
        serviceTypeId: req.serviceTypeId,
        serviceBayId: chosenBay.id,
        technicianId: chosenTech.id,
        customer: {
          id: `cust_${Date.now()}`,
          name: req.customer.name,
          email: req.customer.email,
          phone: req.customer.phone
        },
        vehicle: {
          vin: req.vehicle.vin,
          make: req.vehicle.make,
          model: req.vehicle.model,
          year: req.vehicle.year,
          fuelType: req.vehicle.fuelType,
          licensePlate: req.vehicle.licensePlate
        },
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes: serviceType.durationMinutes,
        status: 'CONFIRMED',
        notes: req.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        traceId
      };

      db.addAppointment(appointment);

      const latencyMs = Date.now() - startExecution;
      db.recordRequest(latencyMs, false);
      db.logAudit({
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        traceId,
        event: 'BOOKING_SUCCESS',
        dealershipId: req.dealershipId,
        details: `Confirmed appointment ${confirmationCode} for ${req.customer.name} (${req.vehicle.year} ${req.vehicle.make} ${req.vehicle.model}). Assigned ${chosenBay.name} & Technician ${chosenTech.name}.`,
        durationMs: latencyMs
      });

      return {
        ...appointment,
        dealershipName: dealership.name,
        serviceName: serviceType.name,
        serviceBayName: chosenBay.name,
        technicianName: chosenTech.name
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * Hydrates an appointment record with related entity names for full client presentation.
   */
  public hydrateAppointment(apt: Appointment): AppointmentDetailResponse {
    const dealership = db.getDealership(apt.dealershipId);
    const serviceType = db.getServiceType(apt.serviceTypeId);
    const bay = db.getServiceBay(apt.serviceBayId);
    const tech = db.getTechnician(apt.technicianId);

    return {
      ...apt,
      dealershipName: dealership ? dealership.name : apt.dealershipId,
      serviceName: serviceType ? serviceType.name : apt.serviceTypeId,
      serviceBayName: bay ? bay.name : apt.serviceBayId,
      technicianName: tech ? tech.name : apt.technicianId
    };
  }
}

export const schedulerEngine = new SchedulerEngine();
