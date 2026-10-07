export const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Unified Service Scheduler API",
    version: "1.0.0",
    description: "Production RESTful API for resource-constrained automotive service appointments, real-time bay and certified technician allocation.",
    contact: {
      name: "Engineering Architecture Team",
      email: "scheduler-platform@example.com"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Unified Scheduler Service API"
    }
  ],
  paths: {
    "/health": {
      get: {
        summary: "System health check and uptime status",
        responses: {
          "200": {
            description: "System healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string" },
                    database: { type: "string", example: "healthy" },
                    uptimeSeconds: { type: "number" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/dealerships": {
      get: {
        summary: "List all active dealerships and operating hours",
        responses: {
          "200": {
            description: "List of dealerships",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Dealership" }
                }
              }
            }
          }
        }
      }
    },
    "/service-types": {
      get: {
        summary: "List catalog of service types with duration and constraint requirements",
        responses: {
          "200": {
            description: "Service catalog",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/ServiceType" }
                }
              }
            }
          }
        }
      }
    },
    "/availability": {
      get: {
        summary: "Query real-time availability slot matrix for date, dealership, and service type",
        parameters: [
          {
            name: "dealershipId",
            in: "query",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "serviceTypeId",
            in: "query",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "date",
            in: "query",
            required: true,
            description: "Date in YYYY-MM-DD format",
            schema: { type: "string", example: "2026-10-08" }
          }
        ],
        responses: {
          "200": {
            description: "Calculated slot availability with bay and technician counts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AvailabilityResponse" }
              }
            }
          },
          "400": { description: "Missing query parameters or invalid date" },
          "404": { description: "Dealership or ServiceType not found" }
        }
      }
    },
    "/appointments": {
      get: {
        summary: "List and filter confirmed appointments",
        parameters: [
          { name: "dealershipId", in: "query", required: false, schema: { type: "string" } },
          { name: "date", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Filtered list of appointments",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/AppointmentDetail" }
                }
              }
            }
          }
        }
      },
      post: {
        summary: "Atomic resource-constrained appointment booking",
        description: "Checks real-time availability of suitable ServiceBay and qualified Technician. Assigns resources and creates persistent Appointment.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAppointmentRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Appointment confirmed and persisted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppointmentDetail" }
              }
            }
          },
          "400": {
            description: "Invalid input or incompatible vehicle fuel type",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          },
          "409": {
            description: "Resource constraint conflict (Bay or Technician unavailable)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConflictResponse" }
              }
            }
          }
        }
      }
    },
    "/appointments/{id}": {
      get: {
        summary: "Get single appointment detail by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Appointment detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppointmentDetail" }
              }
            }
          },
          "404": { description: "Appointment not found" }
        }
      }
    },
    "/appointments/{id}/cancel": {
      patch: {
        summary: "Cancel appointment and release bay and technician resources",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": {
            description: "Appointment cancelled",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppointmentDetail" }
              }
            }
          },
          "404": { description: "Appointment not found" }
        }
      }
    },
    "/metrics": {
      get: {
        summary: "Observability telemetry metrics and recent audit log events",
        responses: {
          "200": {
            description: "System telemetry metrics",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ObservabilityMetrics" }
              }
            }
          }
        }
      }
    },
    "/test-harness/run-concurrency-test": {
      post: {
        summary: "Automated concurrency test harness",
        description: "Executes concurrent competing booking requests against a single remaining slot to demonstrate mutual exclusion and absence of race conditions.",
        responses: {
          "200": {
            description: "Concurrency test execution results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    totalRequests: { type: "number" },
                    successfulAllocations: { type: "number" },
                    conflictsRejected: { type: "number" },
                    expectedSuccesses: { type: "number" },
                    raceConditionDetected: { type: "boolean" },
                    details: { type: "array", items: { type: "object" } }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Dealership: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          operatingHours: {
            type: "object",
            properties: {
              open: { type: "string", example: "08:00" },
              close: { type: "string", example: "18:00" },
              slotDurationMinutes: { type: "number", example: 30 }
            }
          }
        }
      },
      ServiceType: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          durationMinutes: { type: "number" },
          requiredBayCapability: { type: "string" },
          requiredSkill: { type: "string" },
          applicableFuelTypes: { type: "array", items: { type: "string" } },
          estimatedCost: { type: "number" }
        }
      },
      AvailabilityResponse: {
        type: "object",
        properties: {
          dealershipId: { type: "string" },
          serviceTypeId: { type: "string" },
          date: { type: "string" },
          durationMinutes: { type: "number" },
          totalSlots: { type: "number" },
          availableSlotsCount: { type: "number" },
          slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                startTime: { type: "string" },
                endTime: { type: "string" },
                timeLabel: { type: "string" },
                available: { type: "boolean" },
                availableBaysCount: { type: "number" },
                availableTechsCount: { type: "number" },
                rejectionReason: { type: "string" }
              }
            }
          }
        }
      },
      CreateAppointmentRequest: {
        type: "object",
        required: ["dealershipId", "serviceTypeId", "startTime", "customer", "vehicle"],
        properties: {
          dealershipId: { type: "string", example: "dlr_metro_central" },
          serviceTypeId: { type: "string", example: "srv_ev_battery_diag" },
          startTime: { type: "string", example: "2026-10-08T13:00:00.000Z" },
          customer: {
            type: "object",
            required: ["name", "email", "phone"],
            properties: {
              name: { type: "string", example: "Sarah Connor" },
              email: { type: "string", example: "s.connor@example.com" },
              phone: { type: "string", example: "(206) 555-0199" }
            }
          },
          vehicle: {
            type: "object",
            required: ["vin", "make", "model", "year", "fuelType", "licensePlate"],
            properties: {
              vin: { type: "string", example: "5YJ3E1EB8NF129031" },
              make: { type: "string", example: "Tesla" },
              model: { type: "string", example: "Model 3" },
              year: { type: "number", example: 2023 },
              fuelType: { type: "string", enum: ["EV", "ICE", "HYBRID", "DIESEL"], example: "EV" },
              licensePlate: { type: "string", example: "WA-ELEC01" }
            }
          },
          notes: { type: "string", example: "Annual battery inspection" }
        }
      },
      AppointmentDetail: {
        type: "object",
        properties: {
          id: { type: "string" },
          confirmationCode: { type: "string" },
          dealershipId: { type: "string" },
          dealershipName: { type: "string" },
          serviceTypeId: { type: "string" },
          serviceName: { type: "string" },
          serviceBayId: { type: "string" },
          serviceBayName: { type: "string" },
          technicianId: { type: "string" },
          technicianName: { type: "string" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          durationMinutes: { type: "number" },
          status: { type: "string" },
          customer: { type: "object" },
          vehicle: { type: "object" }
        }
      },
      ConflictResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "RESOURCE_BAY_UNAVAILABLE" },
          message: { type: "string" },
          details: { type: "object" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" }
        }
      },
      ObservabilityMetrics: {
        type: "object",
        properties: {
          totalRequests: { type: "number" },
          successfulBookings: { type: "number" },
          conflictsRejected: { type: "number" },
          cancellations: { type: "number" },
          p95LatencyMs: { type: "number" },
          averageLatencyMs: { type: "number" },
          bayUtilizationPercent: { type: "number" }
        }
      }
    }
  }
};
