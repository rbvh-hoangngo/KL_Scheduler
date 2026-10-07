import express, { Request, Response, Router } from 'express';
import { db } from './storage.js';
import { schedulerEngine } from './schedulerEngine.js';
import { SYSTEM_DESIGN_MARKDOWN } from './systemDesignDoc.js';
import { OPENAPI_SPEC } from './openApiSpec.js';
import { testSuite } from './testSuite.js';
import { CreateAppointmentRequest } from '../shared/types.js';

export const apiRouter = Router();

// Middleware to inject correlation trace ID and timing
apiRouter.use((req, res, next) => {
  const traceId = (req.headers['x-trace-id'] as string) || `trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader('X-Trace-Id', traceId);
  (req as any).traceId = traceId;
  (req as any).startTime = Date.now();
  next();
});

// Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Unified Service Scheduler',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'persistent-file-wal',
    traceId: (req as any).traceId
  });
});

// System Design Document export
apiRouter.get('/system-design', (_req: Request, res: Response) => {
  res.json({
    title: 'The Unified Service Scheduler — System Design Document',
    markdown: SYSTEM_DESIGN_MARKDOWN,
    version: '1.0.0'
  });
});

// OpenAPI 3.0 specification contract
apiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(OPENAPI_SPEC);
});

// Dealerships
apiRouter.get('/dealerships', (_req: Request, res: Response) => {
  const dealerships = db.getDealerships();
  res.json(dealerships);
});

// Service types
apiRouter.get('/service-types', (_req: Request, res: Response) => {
  const services = db.getServiceTypes();
  res.json(services);
});

// Service Bays
apiRouter.get('/bays', (req: Request, res: Response) => {
  const dealershipId = req.query.dealershipId as string | undefined;
  const bays = db.getServiceBays(dealershipId);
  res.json(bays);
});

// Technicians
apiRouter.get('/technicians', (req: Request, res: Response) => {
  const dealershipId = req.query.dealershipId as string | undefined;
  const techs = db.getTechnicians(dealershipId);
  res.json(techs);
});

// Real-Time Availability Check
apiRouter.get('/availability', (req: Request, res: Response) => {
  const { dealershipId, serviceTypeId, date } = req.query as {
    dealershipId?: string;
    serviceTypeId?: string;
    date?: string;
  };

  if (!dealershipId || !serviceTypeId || !date) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Missing required query parameters: dealershipId, serviceTypeId, date (YYYY-MM-DD).'
    });
    return;
  }

  try {
    const result = schedulerEngine.checkAvailability(dealershipId, serviceTypeId, date);
    db.logAudit({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      traceId: (req as any).traceId,
      event: 'AVAILABILITY_CHECK',
      dealershipId,
      details: `Checked availability for service '${serviceTypeId}' on date ${date}. Found ${result.availableSlotsCount} of ${result.totalSlots} slots free.`,
      durationMs: Date.now() - (req as any).startTime
    });
    res.json(result);
  } catch (err: any) {
    res.status(404).json({
      error: 'RESOURCE_NOT_FOUND',
      message: err.message || 'Error checking availability.'
    });
  }
});

// Appointments listing
apiRouter.get('/appointments', (req: Request, res: Response) => {
  const { dealershipId, date, status } = req.query as {
    dealershipId?: string;
    date?: string;
    status?: string;
  };

  const appointments = db.getAppointments({ dealershipId, date, status });
  const hydrated = appointments.map(apt => schedulerEngine.hydrateAppointment(apt));
  res.json(hydrated);
});

// Single appointment
apiRouter.get('/appointments/:id', (req: Request, res: Response) => {
  const apt = db.getAppointment(req.params.id);
  if (!apt) {
    res.status(404).json({ error: 'NOT_FOUND', message: `Appointment ${req.params.id} not found.` });
    return;
  }
  res.json(schedulerEngine.hydrateAppointment(apt));
});

// Resource-Constrained Booking
apiRouter.post('/appointments', async (req: Request, res: Response) => {
  const payload = req.body as CreateAppointmentRequest;
  const traceId = (req as any).traceId;

  if (!payload || !payload.dealershipId || !payload.serviceTypeId || !payload.startTime || !payload.customer || !payload.vehicle) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'Request payload must include dealershipId, serviceTypeId, startTime, customer, and vehicle.'
    });
    return;
  }

  try {
    const appointment = await schedulerEngine.bookAppointment(payload, traceId);
    res.status(201).json(appointment);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: err.error || 'SCHEDULING_ERROR',
      message: err.message || 'An error occurred during booking.',
      details: err.details,
      traceId
    });
  }
});

// Cancel appointment
apiRouter.patch('/appointments/:id/cancel', (req: Request, res: Response) => {
  const updated = db.updateAppointmentStatus(req.params.id, 'CANCELLED');
  if (!updated) {
    res.status(404).json({ error: 'NOT_FOUND', message: `Appointment ${req.params.id} not found.` });
    return;
  }

  db.logAudit({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    traceId: (req as any).traceId,
    event: 'APPOINTMENT_CANCELLED',
    dealershipId: updated.dealershipId,
    details: `Appointment ${updated.confirmationCode} cancelled. Released bay ${updated.serviceBayId} and technician ${updated.technicianId}.`,
    durationMs: Date.now() - (req as any).startTime
  });

  res.json(schedulerEngine.hydrateAppointment(updated));
});

// Telemetry & Metrics
apiRouter.get('/metrics', (_req: Request, res: Response) => {
  const metrics = db.getMetrics();
  res.json(metrics);
});

// Concurrency Test Harness
apiRouter.post('/test-harness/run-concurrency-test', async (req: Request, res: Response) => {
  const traceId = (req as any).traceId;
  const startMs = Date.now();

  // Create an adversarial test:
  // Pick an isolated future date slot and dispatch 5 concurrent bookings targeting the exact same time slot
  // for High-Voltage EV battery diagnosis at Bayside EV (where only limited bays & techs exist).
  const dealershipId = 'dlr_bayside_ev';
  const serviceTypeId = 'srv_ev_battery_diag';
  
  // Future test date
  const testDate = '2026-10-15';
  const testSlotTime = `${testDate}T14:00:00.000Z`;

  const competitorClients = [
    { name: 'Alice Walker', vin: '5YJ3E1EB8NF100001', plate: 'TEST-EV-1' },
    { name: 'Bob Sterling', vin: '5YJ3E1EB8NF100002', plate: 'TEST-EV-2' },
    { name: 'Carol Danvers', vin: '5YJ3E1EB8NF100003', plate: 'TEST-EV-3' },
    { name: 'David Banner', vin: '5YJ3E1EB8NF100004', plate: 'TEST-EV-4' },
    { name: 'Eve Polastri', vin: '5YJ3E1EB8NF100005', plate: 'TEST-EV-5' }
  ];

  // Dispatch all 5 in parallel via Promise.allSettled
  const results = await Promise.allSettled(
    competitorClients.map(async (client, index) => {
      const clientTrace = `${traceId}_req_${index + 1}`;
      const payload: CreateAppointmentRequest = {
        dealershipId,
        serviceTypeId,
        startTime: testSlotTime,
        customer: {
          name: client.name,
          email: `${client.name.toLowerCase().replace(' ', '.')}@concurrency-test.local`,
          phone: `(555) 010-${String(index + 1).padStart(4, '0')}`
        },
        vehicle: {
          vin: client.vin,
          make: 'Tesla',
          model: 'Model Y',
          year: 2024,
          fuelType: 'EV',
          licensePlate: client.plate
        },
        notes: `Simulated concurrent race test #REQ-${index + 1}`
      };

      return await schedulerEngine.bookAppointment(payload, clientTrace);
    })
  );

  const successes: any[] = [];
  const conflicts: any[] = [];

  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      successes.push({
        client: competitorClients[idx].name,
        confirmationCode: res.value.confirmationCode,
        assignedBay: res.value.serviceBayName,
        assignedTechnician: res.value.technicianName
      });
    } else {
      conflicts.push({
        client: competitorClients[idx].name,
        error: res.reason.error || 'CONFLICT',
        message: res.reason.message,
        statusCode: res.reason.statusCode
      });
    }
  });

  // Check if any double booking occurred (i.e. two successful bookings sharing the same bay or tech)
  const assignedBays = successes.map(s => s.assignedBay);
  const assignedTechs = successes.map(s => s.assignedTechnician);
  const duplicateBay = assignedBays.length !== new Set(assignedBays).size;
  const duplicateTech = assignedTechs.length !== new Set(assignedTechs).size;
  const raceConditionDetected = duplicateBay || duplicateTech;

  res.json({
    testName: 'Simulated High-Concurrency Atomic Resource Allocation Test',
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    totalDispatched: competitorClients.length,
    successfulAllocations: successes.length,
    conflictsRejected: conflicts.length,
    raceConditionDetected,
    invariantMaintained: !raceConditionDetected,
    successes,
    conflicts,
    verdict: !raceConditionDetected
      ? 'PASSED: Transactional lock guaranteed resource exclusivity without overbooking.'
      : 'FAILED: Race condition allowed duplicate resource allocation.'
  });
});

// Database reset
apiRouter.post('/seed/reset', (_req: Request, res: Response) => {
  db.resetToDefault();
  res.json({ status: 'ok', message: 'Database reset to baseline state.' });
});

// Full automated test suite execution endpoint
apiRouter.post('/test-suite/run', async (_req: Request, res: Response) => {
  try {
    const report = await testSuite.runAllTests();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'TEST_SUITE_EXECUTION_FAILED', message: err.message });
  }
});
