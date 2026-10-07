import React, { useState, useEffect } from 'react';
import {
  Dealership,
  ServiceType,
  AvailabilityResponse,
  CreateAppointmentRequest,
  AppointmentDetailResponse,
  FuelType,
  TimeSlotAvailability
} from '../shared/types.js';
import {
  Calendar,
  Clock,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Car,
  User,
  ShieldCheck,
  Building,
  Zap,
  Check,
  ArrowRight
} from 'lucide-react';

interface BookingPortalProps {
  dealerships: Dealership[];
  serviceTypes: ServiceType[];
  onAppointmentCreated: (apt: AppointmentDetailResponse) => void;
}

const VEHICLE_PRESETS = [
  {
    label: 'Tesla Model 3 (EV)',
    vin: '5YJ3E1EB8NF129031',
    make: 'Tesla',
    model: 'Model 3 Performance',
    year: 2023,
    fuelType: 'EV' as FuelType,
    licensePlate: 'WA-7ELEC'
  },
  {
    label: 'Ford F-150 (ICE)',
    vin: '1FTFW1E84MKD99412',
    make: 'Ford',
    model: 'F-150 Lariat 5.0L',
    year: 2022,
    fuelType: 'ICE' as FuelType,
    licensePlate: 'WA-88192'
  },
  {
    label: 'Porsche Taycan 4S (EV)',
    vin: 'WP0AA2Y13NSA99120',
    make: 'Porsche',
    model: 'Taycan 4S Dual Motor',
    year: 2024,
    fuelType: 'EV' as FuelType,
    licensePlate: 'CA-EVPWR'
  },
  {
    label: 'Toyota RAV4 (Hybrid)',
    vin: '2T3C1RFV9MC055410',
    make: 'Toyota',
    model: 'RAV4 Prime PHEV',
    year: 2023,
    fuelType: 'HYBRID' as FuelType,
    licensePlate: 'CO-HYB99'
  }
];

export const BookingPortal: React.FC<BookingPortalProps> = ({
  dealerships,
  serviceTypes,
  onAppointmentCreated
}) => {
  // Selection state
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>(
    dealerships[0]?.id || ''
  );
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>(
    serviceTypes[0]?.id || ''
  );

  // Date state (defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Availability matrix state
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotAvailability | null>(null);

  // Customer & Vehicle State
  const [customerName, setCustomerName] = useState<string>('Jordan Vance');
  const [customerEmail, setCustomerEmail] = useState<string>('jordan.vance@example.com');
  const [customerPhone, setCustomerPhone] = useState<string>('(206) 555-8912');

  const [vin, setVin] = useState<string>(VEHICLE_PRESETS[0].vin);
  const [make, setMake] = useState<string>(VEHICLE_PRESETS[0].make);
  const [model, setModel] = useState<string>(VEHICLE_PRESETS[0].model);
  const [year, setYear] = useState<number>(VEHICLE_PRESETS[0].year);
  const [fuelType, setFuelType] = useState<FuelType>(VEHICLE_PRESETS[0].fuelType);
  const [licensePlate, setLicensePlate] = useState<string>(VEHICLE_PRESETS[0].licensePlate);
  const [notes, setNotes] = useState<string>('Customer requests complimentary multi-point safety review.');

  // Booking action state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [bookingConflictError, setBookingConflictError] = useState<any | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentDetailResponse | null>(null);

  // Fetch real-time availability whenever Dealership, Service Type, or Date changes
  useEffect(() => {
    if (!selectedDealershipId || !selectedServiceTypeId || !selectedDate) return;

    let active = true;
    setLoadingAvailability(true);
    setAvailabilityError(null);
    setSelectedSlot(null);

    fetch(
      `/api/availability?dealershipId=${selectedDealershipId}&serviceTypeId=${selectedServiceTypeId}&date=${selectedDate}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to fetch availability.');
        }
        return res.json();
      })
      .then((data: AvailabilityResponse) => {
        if (active) {
          setAvailability(data);
          // Auto-select first available slot if present
          const firstFree = data.slots.find((s) => s.available);
          if (firstFree) setSelectedSlot(firstFree);
        }
      })
      .catch((err) => {
        if (active) setAvailabilityError(err.message);
      })
      .finally(() => {
        if (active) setLoadingAvailability(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDealershipId, selectedServiceTypeId, selectedDate]);

  const activeService = serviceTypes.find((s) => s.id === selectedServiceTypeId);
  const activeDealership = dealerships.find((d) => d.id === selectedDealershipId);

  // Apply Vehicle preset
  const handleApplyPreset = (preset: typeof VEHICLE_PRESETS[0]) => {
    setVin(preset.vin);
    setMake(preset.make);
    setModel(preset.model);
    setYear(preset.year);
    setFuelType(preset.fuelType);
    setLicensePlate(preset.licensePlate);
  };

  // Perform resource-constrained booking
  const handleBook = async () => {
    if (!selectedSlot || !selectedDealershipId || !selectedServiceTypeId) return;

    setSubmitting(true);
    setBookingConflictError(null);
    setConfirmedAppointment(null);

    const payload: CreateAppointmentRequest = {
      dealershipId: selectedDealershipId,
      serviceTypeId: selectedServiceTypeId,
      startTime: selectedSlot.startTime,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone
      },
      vehicle: {
        vin,
        make,
        model,
        year: Number(year),
        fuelType,
        licensePlate
      },
      notes
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingConflictError(data);
      } else {
        setConfirmedAppointment(data);
        onAppointmentCreated(data);
        // Refresh availability
        const refresh = await fetch(
          `/api/availability?dealershipId=${selectedDealershipId}&serviceTypeId=${selectedServiceTypeId}&date=${selectedDate}`
        );
        if (refresh.ok) {
          const freshData = await refresh.json();
          setAvailability(freshData);
        }
      }
    } catch (err: any) {
      setBookingConflictError({ message: err.message || 'Network error executing booking.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Resource-Constrained Appointment Booking
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Deterministic allocation engine evaluating real-time physical Service Bay capabilities,
              technician certifications, and vehicle powertrain requirements.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Live Resource Locking Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Facility & Service Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                1. Dealership & Service Type
              </span>
              <Building className="w-4 h-4 text-slate-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Dealership Facility
              </label>
              <select
                value={selectedDealershipId}
                onChange={(e) => setSelectedDealershipId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {dealerships.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.city}, {d.state})
                  </option>
                ))}
              </select>
              {activeDealership && (
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                  <span>Hours: {activeDealership.operatingHours.open} - {activeDealership.operatingHours.close}</span>
                  <span>·</span>
                  <span>TZ: {activeDealership.timezone}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Service Catalog Procedure
              </label>
              <select
                value={selectedServiceTypeId}
                onChange={(e) => setSelectedServiceTypeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {serviceTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} mins · ${s.estimatedCost})
                  </option>
                ))}
              </select>
            </div>

            {/* Service Requirement Diagnostic Card */}
            {activeService && (
              <div className="p-3 bg-slate-950 rounded-md border border-slate-800/80 text-xs space-y-2">
                <div className="text-slate-300 font-medium">{activeService.description}</div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-slate-400">
                  <div>
                    <span className="text-slate-500 block">Required Bay:</span>
                    <span className="text-indigo-300 font-mono font-medium">{activeService.requiredBayCapability}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Certified Skill:</span>
                    <span className="text-indigo-300 font-mono font-medium">{activeService.requiredSkill}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duration:</span>
                    <span className="text-slate-200 font-mono">{activeService.durationMinutes} minutes</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fuel Types:</span>
                    <span className="text-slate-200">{activeService.applicableFuelTypes.join(', ')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Vehicle & Customer Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                2. Vehicle & Customer Spec
              </span>
              <Car className="w-4 h-4 text-slate-500" />
            </div>

            {/* Presets */}
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">Quick-Load Test Vehicle:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {VEHICLE_PRESETS.map((preset) => (
                  <button
                    key={preset.vin}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-2 py-1.5 text-left text-xs rounded border transition-colors ${
                      vin === preset.vin
                        ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="block truncate font-medium">{preset.label}</span>
                    <span className="block text-[10px] text-slate-500">{preset.licensePlate}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Make</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fuel Architecture</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="EV">EV (Battery Electric)</option>
                  <option value="ICE">ICE (Internal Combustion)</option>
                  <option value="HYBRID">HYBRID (Plug-in / Gas-Electric)</option>
                  <option value="DIESEL">DIESEL</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Plate</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Vehicle Identification Number (VIN)</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Availability & Slot Booking (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <span>3. Real-Time Resource Availability Check</span>
                {loadingAvailability && (
                  <span className="text-xs text-indigo-400 font-normal">Checking constraints...</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Error or Summary */}
            {availabilityError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{availabilityError}</span>
              </div>
            )}

            {availability && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <div>
                    <span className="text-white font-medium">{availability.availableSlotsCount}</span> of{' '}
                    <span>{availability.totalSlots}</span> service windows free on {availability.date}
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-emerald-500/80 inline-block"></span>
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-slate-800 inline-block"></span>
                      Constrained / Blocked
                    </span>
                  </div>
                </div>

                {/* Slot Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {availability.slots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => slot.available && setSelectedSlot(slot)}
                        disabled={!slot.available}
                        title={
                          slot.available
                            ? `Free: ${slot.availableBaysCount} Bay(s) & ${slot.availableTechsCount} Tech(s) available`
                            : slot.rejectionReason
                        }
                        className={`p-2.5 rounded text-left transition-all relative border ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : slot.available
                            ? 'border-slate-800 bg-slate-950/90 text-slate-200 hover:border-slate-700 hover:bg-slate-950'
                            : 'border-slate-900 bg-slate-950/40 text-slate-600 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold">{slot.timeLabel.split(' - ')[0]}</span>
                          {slot.available ? (
                            <span className="text-[10px] text-emerald-400 font-mono font-medium">
                              {slot.availableBaysCount}B · {slot.availableTechsCount}T
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Blocked</span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          {slot.available ? (
                            <span>{slot.timeLabel}</span>
                          ) : (
                            <span className="text-amber-500/80">{slot.rejectionReason}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Slot Diagnostic Preview */}
            {selectedSlot && (
              <div className="p-3 bg-slate-950 rounded-md border border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-white">
                      Selected Service Window: {selectedSlot.timeLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-300">
                    {activeService?.durationMinutes} min runtime
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Eligible Bay Candidates:</span>
                    <span className="text-slate-200 font-mono">{selectedSlot.candidateBayIds.length} Bay(s) Free</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Certified Tech Pool:</span>
                    <span className="text-slate-200 font-mono">{selectedSlot.candidateTechIds.length} Tech(s) Free</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Conflict Banner */}
            {bookingConflictError && (
              <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-md space-y-2">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Constraint Conflict Error ({bookingConflictError.error || '409 Conflict'})</span>
                </div>
                <div className="text-xs text-rose-200">{bookingConflictError.message}</div>
                {bookingConflictError.details && (
                  <pre className="text-[11px] font-mono bg-rose-950 p-2 rounded text-rose-300 overflow-x-auto">
                    {JSON.stringify(bookingConflictError.details, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Submit Booking Action */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {selectedSlot ? (
                  <span>Ready to allocate dual physical resources atomically</span>
                ) : (
                  <span>Please select an available green slot above</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleBook}
                disabled={!selectedSlot || submitting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-sm transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Allocating Resources...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Persist Appointment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success Confirmed Record Card */}
          {confirmedAppointment && (
            <div className="bg-emerald-950/30 border border-emerald-800/80 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">
                    Appointment Record Created & Persisted
                  </span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 bg-emerald-900/60 border border-emerald-700 text-emerald-200 rounded">
                  {confirmedAppointment.confirmationCode}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Service Bay</span>
                  <span className="font-semibold text-white">{confirmedAppointment.serviceBayName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Technician</span>
                  <span className="font-semibold text-white">{confirmedAppointment.technicianName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Facility Location</span>
                  <span className="text-slate-200">{confirmedAppointment.dealershipName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Service Procedure</span>
                  <span className="text-slate-200">{confirmedAppointment.serviceName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer & Contact</span>
                  <span className="text-slate-200">
                    {confirmedAppointment.customer.name} · {confirmedAppointment.customer.phone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Vehicle Assigned</span>
                  <span className="text-slate-200">
                    {confirmedAppointment.vehicle.year} {confirmedAppointment.vehicle.make} {confirmedAppointment.vehicle.model} ({confirmedAppointment.vehicle.licensePlate})
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/70 border border-emerald-900/50 rounded flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Start: {new Date(confirmedAppointment.startTime).toUTCString()}</span>
                <span>Trace: {confirmedAppointment.traceId}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
