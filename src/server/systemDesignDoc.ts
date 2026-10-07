export const SYSTEM_DESIGN_MARKDOWN = `# The Unified Service Scheduler — System Design Document
**Domain:** Ownership & Fleet Service  
**Architecture Version:** 1.0.0 (Production Blueprint)  
**Author:** Principal Platform & Systems Architect  

---

## 1. Executive Summary & Problem Formulation
The Unified Service Scheduler replaces fragmented, manual dealership booking spreadsheets with a deterministic, resource-constrained distributed scheduling platform. Automotive service operations face a strict **multi-dimensional combinatorial constraint satisfaction problem**:
A booking cannot be fulfilled merely by checking calendar time; it strictly requires the simultaneous, contiguous temporal availability of:
1. **A Qualified Service Bay**: Physical infrastructure satisfying mechanical, height, electrical, and tooling capabilities (e.g., EV High-Voltage Isolation, Heavy-Duty 4-Post Hydraulic Lift, Computerized Alignment Rack).
2. **A Certified Technician**: A certified specialist on active shift whose credentials match the service type (e.g., EV High-Voltage Master Tech, ASE Brake Specialist, Master Powertrain Engineer).
3. **Vehicle Powertrain Compatibility**: Ensuring service procedures align with vehicle architecture (e.g., EV vs. Internal Combustion Engine vs. Plug-in Hybrid).

---

## 2. Architecture Diagram

\`\`\`
+-------------------------------------------------------------------------------------------------------+
|                                    CLIENT & INTEGRATION TIER                                          |
|                                                                                                       |
|  [ Customer Web Portal ]    [ Dealership Dispatch Board ]    [ Concurrency Test Harness / cURL API ]  |
+---------------------------------------------------+---------------------------------------------------+
                                                    | (HTTPS / JSON REST / Bearer Auth)
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                                  API GATEWAY & EDGE INGRESS LAYER                                     |
|                                                                                                       |
|  * TLS Termination (Let's Encrypt / Cloud Edge)                                                       |
|  * Rate Limiting & DoS Shield (Token Bucket per IP / VIN)                                             |
|  * Distributed W3C Traceparent Header Injection (Correlation ID & Span Generation)                     |
+---------------------------------------------------+---------------------------------------------------+
                                                    |
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                              APPLICATION SERVICES LAYER (Node.js / Express)                           |
|                                                                                                       |
|  +-------------------------+  +-------------------------------+  +---------------------------------+  |
|  |   Availability Service  |  |  Resource Allocation Engine   |  |   Telemetry & Audit Subsystem   |  |
|  |   - Sliding Slot Matrix |  |  - Dealership Mutex Lock      |  |   - Structured JSON Logger      |  |
|  |   - Shift Window Filter |  |  - Capability Set Matcher     |  |   - P95 Latency & Error Budgets |  |
|  |   - Fast Pre-Check      |  |  - Least-Slack Bay Heuristic  |  |   - Prometheus Metrics Buffer   |  |
|  +-------------------------+  +-------------------------------+  +---------------------------------+  |
+---------------------------------------------------+---------------------------------------------------+
                                                    |
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                                   DATA PERSISTENCE & CONCURRENCY TIER                                 |
|                                                                                                       |
|  +-------------------------------------------------------------------------------------------------+  |
|  |  Transactional Storage Engine (ACID-Compliant File-Backed WAL / JSON Store with Mutex Lock)     |  |
|  |  - Collections: Dealerships, ServiceBays, Technicians, ServiceTypes, Appointments, AuditLogs    |  |
|  |  - Concurrency Control: Per-Dealership Critical Section Locks prevent Bay/Technician Overbooking|  |
|  |  - Durability: Temp File Swap (fs.writeFileSync -> fs.renameSync) eliminates dirty partial writes |  |
|  +-------------------------------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------------------------+
\`\`\`

---

## 3. Component Breakdown & Responsibilities

| Component | Technology | Primary Role & Invariants |
| :--- | :--- | :--- |
| **API Gateway & Router** | Express 4.x / TypeScript | Ingress routing, request schema validation, traceparent ID generation, standardized RFC 7807 error formatting. |
| **Availability Service** | TypeScript Functional Engine | Computes discrete candidate time slots (e.g. 30-min intervals) matching dealership operating hours; evaluates dual-resource candidate sets. |
| **Resource Allocation Engine** | Mutex Lock + Bipartite Matcher | Solves real-time resource matching under mutual exclusion; enforces Least-Slack heuristic to conserve scarce specialized bays. |
| **Storage Engine** | File-backed ACID WAL / Temp-Rename | Persistent record store preserving customers, vehicles, bay allocation, technician assignment, and audit trails. |
| **Telemetry & Observability** | In-memory Ring Buffer + Prometheus | Collects real-time p50/p95 latency metrics, slot collision rates, bay utilization percentages, and structured JSON audit trails. |
| **Client Dispatch & Test Suite** | React 19, Tailwind CSS, Lucide | Interactive booking portal, live bay/tech Gantt timeline, REST sandbox with copyable cURLs, and automated race condition simulator. |

---

## 4. End-to-End Data Flow & Sequence

### Flow A: Real-Time Availability Check (\`GET /api/availability\`)
1. **Client Request**: Client supplies \`dealershipId\`, \`serviceTypeId\`, and target \`date\`.
2. **Catalog Lookup**: Engine retrieves \`ServiceType\` to extract \`durationMinutes\`, \`requiredBayCapability\`, and \`requiredSkill\`.
3. **Resource Filtering**:
   - Queries active bays matching \`requiredBayCapability\`.
   - Queries technicians possessing \`requiredSkill\` whose shifts cover the date.
4. **Temporal Matrix Sweep**:
   - Engine iterates from dealership \`open\` to \`close - duration\`.
   - For every slot interval \`[t_start, t_start + duration]\`, filters out bays and technicians with active overlapping appointments (\`apt_start < t_end && apt_end > t_start\`).
5. **Diagnostic Synthesis**: Computes slot boolean (\`available = bays.length > 0 && techs.length > 0\`) and constructs granular diagnostic messages (e.g., "All 2 EV bays occupied") for rejected slots.
6. **Response**: Delivers JSON slot matrix to client with millisecond response time.

### Flow B: Atomic Resource-Constrained Booking (\`POST /api/appointments\`)
1. **Request Intake**: Ingress validates payload schema (customer contact, vehicle VIN/fuelType, target slot, notes).
2. **Distributed Transaction Lock**: Engine acquires an in-memory transactional mutex lock on the specific \`dealershipId\` (preventing race conditions).
3. **Constraint Validation**:
   - Checks vehicle fuel type against service prerequisites (e.g. rejects EV diagnostic on pure diesel).
   - Validates that requested time window fits within dealership operating hours.
4. **Dual-Resource Allocation**:
   - Selects candidate bays free for \`[startTime, endTime]\`. If zero, throws **HTTP 409 Conflict** with diagnostic code \`RESOURCE_BAY_UNAVAILABLE\`.
   - Selects candidate technicians free for \`[startTime, endTime]\`. If zero, throws **HTTP 409 Conflict** with diagnostic code \`RESOURCE_TECHNICIAN_UNAVAILABLE\`.
5. **Optimization Heuristic (Least-Slack)**:
   - Sorts available bays by total capability count ascending. Assigns the least capable bay that fulfills the minimum requirement, preserving hyper-specialized bays for upcoming jobs.
6. **Atomic Persistence**:
   - Instantiates confirmed \`Appointment\` record associating customer, vehicle, assigned bay ID, assigned technician ID, human-readable confirmation code (\`USS-XXXX-DLR\`), and trace ID.
   - Writes to persistent storage via atomic rename (\`fs.renameSync\`).
7. **Audit & Release**: Writes audit log event, records request latency to telemetry ring buffer, releases mutex lock, and returns **HTTP 201 Created** with full hydrated appointment details.

---

## 5. Technology Choices & Justifications

| Technology | Selected Choice | Justification vs. Alternatives |
| :--- | :--- | :--- |
| **Runtime & Backend** | Node.js 22 LTS / TypeScript 5+ | Single-threaded event loop with non-blocking async I/O matches I/O-bound scheduling APIs. TypeScript provides end-to-end type safety between API contracts and frontend views. |
| **HTTP Framework** | Express 4.21 with tsx | Lightweight, zero-ceremony REST framework; allows co-locating Vite development middleware on port 3000 while exposing enterprise RESTful endpoints. |
| **Persistence Engine** | ACID File-Backed WAL Store | Guarantees durable zero-configuration persistence across restarts with zero external container dependencies. Atomic file rename ensures crash-safe writes without partial record corruption. |
| **Frontend Framework** | React 19 + Tailwind CSS | Declarative reactivity for real-time schedule updates; Tailwind provides design-token governance avoiding stylesheet bloat; JetBrains Mono guarantees tabular numeral stability. |
| **Concurrency Model** | Per-Dealership Mutex Queue | Prevents double-booking race conditions when multiple customers or automated dispatch systems submit bookings simultaneously for the same resource slot. |

---

## 6. Observability & Telemetry Strategy

To achieve enterprise operational maturity, the scheduler implements the Three Pillars of Observability:

### A. Structured Logging
Every API transaction emits a structured JSON log entry containing:
- \`timestamp\`: ISO 8601 UTC.
- \`traceId\`: Correlated W3C tracing token propagated across requests.
- \`event\`: (\`AVAILABILITY_CHECK\`, \`BOOKING_SUCCESS\`, \`BOOKING_CONFLICT\`, \`APPOINTMENT_CANCELLED\`).
- \`dealershipId\`, \`serviceTypeId\`, \`durationMs\`.
- Granular contextual diagnostics on conflict failures (e.g., total candidate bays evaluated, occupied bay IDs).

### B. Metrics & Key Performance Indicators (KPIs)
- **Booking Request Rate & Latency**: Real-time tracking of p50 and p95 booking execution latencies (target: < 35ms).
- **Conflict & Rejection Ratio**: Percentage of booking attempts rejected due to resource exhaustion (\`conflictsRejected / totalBookings\`). Alert triggered if > 25%.
- **Bay Utilization Efficiency**: Real-time ratio of scheduled bay hours vs total operating capacity.
- **Service Duration Accuracy**: Variance tracking between scheduled vs actual duration.

### C. Tracing & Distributed Correlation
- Every incoming HTTP request is assigned a unique \`traceId\` (or adopts incoming \`traceparent\` header).
- Traces flow through the validation layer, constraint evaluator, storage persistence, and audit logging.
- Client responses include \`X-Trace-Id\` headers for seamless incident investigation.

---

## 7. GenAI Usage in the System Design Phase

GenAI was employed as an active architectural thought partner and design accelerator throughout this project:

1. **Constraint Satisfaction Modeling**:
   - Prompted GenAI to formulate the dealership resource allocation problem as a bipartite matching problem with temporal windows and capability masks.
   - Identified edge cases where naïve "first available bay" greedy allocation causes downstream starvation of specialized EV and Alignment bays, leading to the **Least-Slack Allocation Heuristic**.
2. **Schema & State Transition Synthesis**:
   - Utilized GenAI to explore domain-driven vehicle service taxonomies (EV battery diagnostics vs. internal combustion powertrain overhauls), establishing the exact relationship matrix between \`BayCapability\`, \`TechnicianSkill\`, and vehicle \`FuelType\`.
3. **Concurrency & Race Condition Threat Analysis**:
   - Co-designed adversarial test scenarios with GenAI to simulate concurrent booking spikes (e.g. 10 clients competing for a single remaining EV bay within a 2-millisecond window), resulting in our dealership-keyed transactional mutex lock design.
4. **OpenAPI 3.0 & REST Contract Formalization**:
   - Generated standardized OpenAPI 3.0 specification documents and realistic cURL snippets directly from domain schemas, ensuring zero client-server specification drift.
`;
