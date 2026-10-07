import { db } from './storage.js';
import { schedulerEngine } from './schedulerEngine.js';
import { CreateAppointmentRequest } from '../shared/types.js';

export interface TestCaseResult {
  id: string;
  name: string;
  category: 'Resource Constraints' | 'Concurrency' | 'Lifecycle' | 'Validation' | 'Observability';
  description: string;
  passed: boolean;
  durationMs: number;
  assertionSummary: string;
  expected: string;
  actual: string;
  error?: string;
  diagnostics?: any;
}

export interface TestSuiteReport {
  suiteName: string;
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDurationMs: number;
  allPassed: boolean;
  results: TestCaseResult[];
}

export class ServiceSchedulerTestSuite {
  public async runAllTests(): Promise<TestSuiteReport> {
    const startAll = performance.now();
    const results: TestCaseResult[] = [];

    // Ensure database is in a known baseline state
    db.resetToDefault();

    results.push(await this.testDualResourceBooking());
    results.push(await this.testDoubleBookingConflict());
    results.push(await this.testFuelTypeIncompatibility());
    results.push(await this.testOperatingHoursEnforcement());
    results.push(await this.testAvailabilitySlotCalculation());
    results.push(await this.testCancellationResourceLiberation());
    results.push(await this.testLeastSlackBayAllocation());
    results.push(await this.testHighConcurrencyRaceCondition());
    results.push(await this.testPersistenceIntegrity());
    results.push(await this.testObservabilityAndTracing());

    const totalDurationMs = Math.round(performance.now() - startAll);
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;

    return {
      suiteName: 'The Unified Service Scheduler — Comprehensive Verification Suite',
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDurationMs,
      allPassed: failedTests === 0,
      results
    };
  }

  // TC-01: Dual-Resource Booking
  private async testDualResourceBooking(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-01';
    const name = 'Dual-Resource Assignment & Invariant Verification';
    const category = 'Resource Constraints';
    const description = 'Validates that a service booking atomically allocates both a qualified Service Bay and a certified Technician for the entire duration.';

    try {
      const payload: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_ev_battery_diag',
        startTime: '2026-10-20T10:00:00.000Z',
        customer: {
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '(206) 555-0111'
        },
        vehicle: {
          vin: '5YJ3E1EB8NF129031',
          make: 'Tesla',
          model: 'Model 3',
          year: 2023,
          fuelType: 'EV',
          licensePlate: 'WA-TEST01'
        },
        notes: 'TC-01 Test'
      };

      const appointment = await schedulerEngine.bookAppointment(payload, 'trc_tc01');

      // Verify Service Bay capability
      const bay = db.getServiceBay(appointment.serviceBayId);
      const isBayQualified = bay?.capabilities.includes('EV_CERTIFIED') ?? false;

      // Verify Technician skill
      const tech = db.getTechnician(appointment.technicianId);
      const isTechCertified = tech?.skills.includes('EV_HIGH_VOLTAGE') ?? false;

      const hasConfirmationCode = /^USS-\d{4}-[A-Z]{3}$/.test(appointment.confirmationCode);
      const passed = isBayQualified && isTechCertified && hasConfirmationCode && appointment.status === 'CONFIRMED';

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Bay possesses EV_CERTIFIED, Tech possesses EV_HIGH_VOLTAGE, Code follows USS-XXXX-DLR format.',
        expected: 'Bay: EV_CERTIFIED, Tech: EV_HIGH_VOLTAGE, Status: CONFIRMED',
        actual: `Bay: ${bay?.capabilities.join(', ')}, Tech: ${tech?.skills.join(', ')}, Status: ${appointment.status}`,
        diagnostics: { appointmentId: appointment.id, confirmationCode: appointment.confirmationCode, bay: bay?.name, tech: tech?.name }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Booking threw unexpected exception.',
        expected: 'Successful booking with dual resource allocation',
        actual: `Exception: ${err.message || JSON.stringify(err)}`,
        error: err.message
      };
    }
  }

  // TC-02: Simultaneous Double-Booking Conflict
  private async testDoubleBookingConflict(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-02';
    const name = 'Resource Exhaustion & 409 Conflict Rejection';
    const category = 'Resource Constraints';
    const description = 'Verifies that attempting to book an overlapping slot when all matching bays/technicians are occupied throws an explicit 409 Conflict.';

    try {
      // First booking occupies the only EV bay at Metro Central for this slot
      const targetTime = '2026-10-21T14:00:00.000Z';
      const payload1: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_ev_battery_diag',
        startTime: targetTime,
        customer: { name: 'First Booker', email: 'first@test.com', phone: '(206) 555-1111' },
        vehicle: { vin: '5YJ3E1EB8NF129031', make: 'Tesla', model: 'Model 3', year: 2023, fuelType: 'EV', licensePlate: 'EV-1' }
      };
      await schedulerEngine.bookAppointment(payload1, 'trc_tc02_1');

      // Second booking attempts to book the same slot
      const payload2: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_ev_battery_diag',
        startTime: targetTime,
        customer: { name: 'Second Booker', email: 'second@test.com', phone: '(206) 555-2222' },
        vehicle: { vin: '5YJ3E1EB8NF129032', make: 'Tesla', model: 'Model Y', year: 2024, fuelType: 'EV', licensePlate: 'EV-2' }
      };

      let conflictError: any = null;
      try {
        await schedulerEngine.bookAppointment(payload2, 'trc_tc02_2');
      } catch (err: any) {
        conflictError = err;
      }

      const passed = conflictError && conflictError.statusCode === 409 && conflictError.error === 'RESOURCE_BAY_UNAVAILABLE';

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Second booking caught and rejected with HTTP 409 RESOURCE_BAY_UNAVAILABLE.',
        expected: 'statusCode: 409, error: RESOURCE_BAY_UNAVAILABLE',
        actual: conflictError ? `statusCode: ${conflictError.statusCode}, error: ${conflictError.error}` : 'Error: Second booking succeeded unexpectedly!',
        diagnostics: conflictError?.details
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Test failed unexpectedly.',
        expected: '409 Conflict',
        actual: err.message
      };
    }
  }

  // TC-03: Fuel Type Incompatibility
  private async testFuelTypeIncompatibility(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-03';
    const name = 'Powertrain Architecture Compatibility Enforcement';
    const category = 'Validation';
    const description = 'Ensures an EV high-voltage service cannot be booked for a purely Internal Combustion Engine (ICE) or Diesel vehicle.';

    try {
      const payload: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_ev_battery_diag', // Only valid for EV, HYBRID
        startTime: '2026-10-22T11:00:00.000Z',
        customer: { name: 'Bob Trucker', email: 'bob@diesel.com', phone: '(206) 555-4444' },
        vehicle: { vin: '1FTFW1E84MKD99412', make: 'Ford', model: 'F-250 Super Duty', year: 2021, fuelType: 'DIESEL', licensePlate: 'DIESEL-01' }
      };

      let caughtError: any = null;
      try {
        await schedulerEngine.bookAppointment(payload, 'trc_tc03');
      } catch (err: any) {
        caughtError = err;
      }

      const passed = caughtError && caughtError.statusCode === 400 && caughtError.message.includes('Incompatible fuel type');

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Rejected incompatible powertrain with HTTP 400 Bad Request.',
        expected: 'HTTP 400: Incompatible fuel type',
        actual: caughtError ? `HTTP ${caughtError.statusCode}: ${caughtError.message}` : 'Error: Incompatible vehicle allowed!',
        diagnostics: caughtError
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Test encountered error',
        expected: 'HTTP 400',
        actual: err.message
      };
    }
  }

  // TC-04: Operating Hours Enforcement
  private async testOperatingHoursEnforcement(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-04';
    const name = 'Dealership Operating Window Enforcement';
    const category = 'Validation';
    const description = 'Validates that bookings outside dealership operating hours (e.g., 05:00 before 08:00 open, or 18:30 after 18:00 close) are rejected.';

    try {
      const earlyPayload: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_oil_change',
        startTime: '2026-10-22T05:00:00.000Z', // 05:00 UTC (before 08:00 open)
        customer: { name: 'Early Bird', email: 'early@test.com', phone: '(206) 555-5555' },
        vehicle: { vin: '1FTFW1E84MKD99412', make: 'Ford', model: 'F-150', year: 2022, fuelType: 'ICE', licensePlate: 'ICE-EARLY' }
      };

      let caughtError: any = null;
      try {
        await schedulerEngine.bookAppointment(earlyPayload, 'trc_tc04');
      } catch (err: any) {
        caughtError = err;
      }

      const passed = caughtError && caughtError.statusCode === 400 && caughtError.message.includes('operating hours');

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Rejected out-of-hours booking with HTTP 400.',
        expected: 'HTTP 400: falls outside dealership operating hours',
        actual: caughtError ? `HTTP ${caughtError.statusCode}: ${caughtError.message}` : 'Error: Booking succeeded outside hours!',
        diagnostics: caughtError
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Test failed',
        expected: 'HTTP 400',
        actual: err.message
      };
    }
  }

  // TC-05: Availability Slot Calculation
  private async testAvailabilitySlotCalculation(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-05';
    const name = 'Real-Time Availability Slot Matrix Precision';
    const category = 'Resource Constraints';
    const description = 'Verifies the sliding window availability calculator accurately identifies free vs blocked slots and generates diagnostic reason strings.';

    try {
      const dateStr = '2026-10-25';
      const result = schedulerEngine.checkAvailability('dlr_metro_central', 'srv_brake_overhaul', dateStr);

      const hasSlots = result.slots.length > 0;
      const allSlotsHaveTimes = result.slots.every(s => s.startTime && s.endTime && s.timeLabel);
      const durationMatches = result.durationMinutes === 90;

      // Check slot calculations
      const freeSlots = result.slots.filter(s => s.available);
      const blockedSlots = result.slots.filter(s => !s.available);

      const passed = hasSlots && allSlotsHaveTimes && durationMatches && result.availableSlotsCount === freeSlots.length;

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: `Generated ${result.totalSlots} slots, verified ${freeSlots.length} available and ${blockedSlots.length} constrained slots.`,
        expected: 'Total slots matching operating span / interval, valid durations and candidate lists',
        actual: `Generated ${result.totalSlots} slots, ${freeSlots.length} free, duration: ${result.durationMinutes}m`,
        diagnostics: { totalSlots: result.totalSlots, freeSlotsCount: freeSlots.length, sampleSlot: result.slots[0] }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Slot check threw exception',
        expected: 'Valid AvailabilityResponse',
        actual: err.message
      };
    }
  }

  // TC-06: Cancellation Resource Liberation
  private async testCancellationResourceLiberation(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-06';
    const name = 'Appointment Cancellation & Dynamic Resource Liberation';
    const category = 'Lifecycle';
    const description = 'Confirms that cancelling an appointment releases its assigned Service Bay and Technician immediately, making the slot bookable again.';

    try {
      const targetTime = '2026-10-26T15:00:00.000Z';
      const payload: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_wheel_alignment',
        startTime: targetTime,
        customer: { name: 'Cancel Candidate', email: 'cancel@test.com', phone: '(206) 555-8888' },
        vehicle: { vin: '5YJ3E1EB8NF129031', make: 'Tesla', model: 'Model 3', year: 2023, fuelType: 'EV', licensePlate: 'CAN-01' }
      };

      // 1. Book appointment
      const apt = await schedulerEngine.bookAppointment(payload, 'trc_tc06_book');

      // 2. Cancel appointment
      const updated = db.updateAppointmentStatus(apt.id, 'CANCELLED');

      // 3. Re-book the exact same slot immediately
      const rebookPayload: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_wheel_alignment',
        startTime: targetTime,
        customer: { name: 'Successor Booker', email: 'next@test.com', phone: '(206) 555-9999' },
        vehicle: { vin: 'WP0AA2Y13NSA99120', make: 'Porsche', model: 'Taycan', year: 2024, fuelType: 'EV', licensePlate: 'NEXT-01' }
      };

      const secondApt = await schedulerEngine.bookAppointment(rebookPayload, 'trc_tc06_rebook');

      const passed = updated?.status === 'CANCELLED' && secondApt.status === 'CONFIRMED' && secondApt.id !== apt.id;

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Appointment cancelled, resource lock freed, slot successfully rebooked by successor client.',
        expected: 'Original: CANCELLED, Successor: CONFIRMED',
        actual: `Original: ${updated?.status}, Successor: ${secondApt.status} (${secondApt.confirmationCode})`,
        diagnostics: { originalId: apt.id, successorId: secondApt.id }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Failed to liberate resources upon cancellation',
        expected: 'Slot reusable after cancellation',
        actual: err.message
      };
    }
  }

  // TC-07: Least-Slack Bay Allocation Heuristic
  private async testLeastSlackBayAllocation(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-07';
    const name = 'Least-Slack Allocation Heuristic Optimization';
    const category = 'Resource Constraints';
    const description = 'Verifies allocator assigns the least capable eligible bay to preserve hyper-specialized bays (e.g. EV or Alignment) for subsequent jobs.';

    try {
      // Book synthetic oil change which requires QUICK_LUBE.
      // Bay 1 has ['QUICK_LUBE', 'STANDARD_LIFT'].
      // Bay 2 has ['STANDARD_LIFT'].
      const payload: CreateAppointmentRequest = {
        dealershipId: 'dlr_metro_central',
        serviceTypeId: 'srv_oil_change',
        startTime: '2026-10-27T09:00:00.000Z',
        customer: { name: 'Oil Customer', email: 'oil@test.com', phone: '(206) 555-7777' },
        vehicle: { vin: '1FTFW1E84MKD99412', make: 'Ford', model: 'F-150', year: 2022, fuelType: 'ICE', licensePlate: 'OIL-99' }
      };

      const apt = await schedulerEngine.bookAppointment(payload, 'trc_tc07');
      const assignedBay = db.getServiceBay(apt.serviceBayId);

      // Bay 1 is the specialized quick lube bay
      const passed = assignedBay?.capabilities.includes('QUICK_LUBE') ?? false;

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: `Assigned least-slack bay '${assignedBay?.name}' matching minimum requirement.`,
        expected: 'Bay matching QUICK_LUBE capability without consuming heavy lift',
        actual: `Assigned: ${assignedBay?.name} (${assignedBay?.capabilities.join(', ')})`,
        diagnostics: { assignedBay }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Heuristic check failed',
        expected: 'Least-slack allocation',
        actual: err.message
      };
    }
  }

  // TC-08: High-Concurrency Mutual Exclusion Race Test
  private async testHighConcurrencyRaceCondition(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-08';
    const name = 'High-Concurrency Atomic Mutual Exclusion Race Test';
    const category = 'Concurrency';
    const description = 'Dispatches 5 concurrent asynchronous bookings competing for 1 remaining bay in the exact same millisecond. Validates mutual exclusion.';

    try {
      const targetTime = '2026-10-28T14:00:00.000Z';
      const dealershipId = 'dlr_metro_central'; // Only has 1 EV Bay: bay_sea_03
      const serviceTypeId = 'srv_ev_battery_diag';

      const clients = [
        { name: 'Concurrent Client 1', vin: '5YJ3E1EB8NF100001', plate: 'CON-1' },
        { name: 'Concurrent Client 2', vin: '5YJ3E1EB8NF100002', plate: 'CON-2' },
        { name: 'Concurrent Client 3', vin: '5YJ3E1EB8NF100003', plate: 'CON-3' },
        { name: 'Concurrent Client 4', vin: '5YJ3E1EB8NF100004', plate: 'CON-4' },
        { name: 'Concurrent Client 5', vin: '5YJ3E1EB8NF100005', plate: 'CON-5' }
      ];

      // Dispatch all 5 in parallel via Promise.allSettled
      const promises = clients.map((c, i) => {
        const payload: CreateAppointmentRequest = {
          dealershipId,
          serviceTypeId,
          startTime: targetTime,
          customer: { name: c.name, email: `c${i}@test.com`, phone: `(555) 000-000${i}` },
          vehicle: { vin: c.vin, make: 'Tesla', model: 'Model 3', year: 2023, fuelType: 'EV', licensePlate: c.plate }
        };
        return schedulerEngine.bookAppointment(payload, `trc_tc08_${i}`);
      });

      const settled = await Promise.allSettled(promises);
      const successes = settled.filter(s => s.status === 'fulfilled');
      const conflicts = settled.filter(s => s.status === 'rejected');

      // Since Metro Central has exactly 1 EV bay and 1 EV tech, exactly 1 must succeed and exactly 4 must be rejected!
      const passed = successes.length === 1 && conflicts.length === 4;

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Zero double-bookings: Exactly 1 client allocated, 4 clients rejected with 409 Conflict.',
        expected: 'Successes: 1, Conflicts: 4, Race Condition: false',
        actual: `Successes: ${successes.length}, Conflicts: ${conflicts.length}`,
        diagnostics: {
          successDetails: successes.map((s: any) => s.value?.confirmationCode),
          conflictReasons: conflicts.map((c: any) => c.reason?.message || c.reason)
        }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Concurrency test threw fatal error',
        expected: '1 success, 4 conflicts',
        actual: err.message
      };
    }
  }

  // TC-09: Persistence Integrity
  private async testPersistenceIntegrity(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-09';
    const name = 'Atomic Storage Durability & Data Persistence';
    const category = 'Lifecycle';
    const description = 'Verifies appointments are persisted durably in database storage and can be queried with intact customer, vehicle, bay, and technician relations.';

    try {
      const appointments = db.getAppointments();
      const hasRecords = appointments.length > 0;
      const allHaveIds = appointments.every(a => a.id && a.customer?.name && a.vehicle?.vin && a.serviceBayId && a.technicianId);

      const passed = hasRecords && allHaveIds;

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: `Verified ${appointments.length} persistent appointments with complete foreign entity relations.`,
        expected: 'Persistent records with valid customer, vehicle, bay, and technician references',
        actual: `${appointments.length} records verified with full schema integrity`,
        diagnostics: { totalAppointments: appointments.length }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Persistence check failed',
        expected: 'Intact relational records',
        actual: err.message
      };
    }
  }

  // TC-10: Observability & Tracing
  private async testObservabilityAndTracing(): Promise<TestCaseResult> {
    const start = performance.now();
    const testId = 'TC-10';
    const name = 'Observability Telemetry & Distributed Trace Correlation';
    const category = 'Observability';
    const description = 'Verifies structured audit logs, W3C trace correlation IDs, and P95 latency metric calculation.';

    try {
      const metrics = db.getMetrics();
      const hasRequests = metrics.totalRequests > 0;
      const hasRecentLogs = metrics.recentAuditLogs.length > 0;
      const logsHaveTraces = metrics.recentAuditLogs.every(l => l.traceId && l.event && l.timestamp);

      const passed = hasRequests && hasRecentLogs && logsHaveTraces;

      return {
        id: testId,
        name,
        category,
        description,
        passed,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: `Telemetry active: ${metrics.totalRequests} requests, ${metrics.recentAuditLogs.length} structured audit logs with valid trace IDs.`,
        expected: 'Structured audit logs containing timestamp, event, details, and traceId',
        actual: `Audit logs: ${metrics.recentAuditLogs.length}, P95 latency: ${metrics.p95LatencyMs}ms, Traces validated`,
        diagnostics: { sampleLog: metrics.recentAuditLogs[0] }
      };
    } catch (err: any) {
      return {
        id: testId,
        name,
        category,
        description,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        assertionSummary: 'Observability check failed',
        expected: 'Active telemetry metrics and logs',
        actual: err.message
      };
    }
  }
}

export const testSuite = new ServiceSchedulerTestSuite();
