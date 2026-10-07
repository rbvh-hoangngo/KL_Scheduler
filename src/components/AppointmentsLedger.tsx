import React, { useState, useEffect } from 'react';
import { AppointmentDetailResponse, Dealership } from '../shared/types.js';
import {
  Activity,
  Search,
  Filter,
  XCircle,
  Eye,
  Calendar,
  Clock,
  Car,
  User,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AppointmentsLedgerProps {
  dealerships: Dealership[];
}

export const AppointmentsLedger: React.FC<AppointmentsLedgerProps> = ({ dealerships }) => {
  const [appointments, setAppointments] = useState<AppointmentDetailResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dealershipFilter, setDealershipFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspection modal state
  const [inspectedApt, setInspectedApt] = useState<AppointmentDetailResponse | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = '/api/appointments';
      const params = new URLSearchParams();
      if (dealershipFilter !== 'ALL') params.append('dealershipId', dealershipFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        setAppointments(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dealershipFilter, statusFilter]);

  const handleCancelAppointment = async (id: string) => {
    if (!window.confirm('Cancel this appointment and immediately free its Service Bay and Technician?')) {
      return;
    }

    setCancellingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const updated: AppointmentDetailResponse = await res.json();
        setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
        if (inspectedApt?.id === id) {
          setInspectedApt(updated);
        }
      }
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      apt.confirmationCode.toLowerCase().includes(term) ||
      apt.customer.name.toLowerCase().includes(term) ||
      apt.vehicle.vin.toLowerCase().includes(term) ||
      apt.vehicle.make.toLowerCase().includes(term) ||
      apt.vehicle.model.toLowerCase().includes(term) ||
      apt.serviceName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Confirmed Appointments Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Persistent records linking customers, vehicles, assigned service bays, and certified technicians.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code, customer, VIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56"
              />
            </div>

            {/* Dealership filter */}
            <select
              value={dealershipFilter}
              onChange={(e) => setDealershipFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Dealerships</option>
              {dealerships.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments High-Density Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-medium">
                <th className="py-3 px-4">Confirmation</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Service & Duration</th>
                <th className="py-3 px-4">Assigned Bay</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">Time Window</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Loading appointments from persistent storage...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No appointments found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const startDate = new Date(apt.startTime);
                  const isCancelled = apt.status === 'CANCELLED';

                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-indigo-300">
                        {apt.confirmationCode}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white font-medium block">{apt.customer.name}</span>
                        <span className="text-[11px] text-slate-500">{apt.customer.phone}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-200 block">
                          {apt.vehicle.year} {apt.vehicle.make} {apt.vehicle.model}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {apt.vehicle.fuelType} · {apt.vehicle.licensePlate}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white block font-medium">{apt.serviceName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {apt.durationMinutes} mins
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {apt.serviceBayName}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {apt.technicianName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <div>{startDate.toISOString().split('T')[0]}</div>
                        <div className="text-slate-500">
                          {String(startDate.getUTCHours()).padStart(2, '0')}:
                          {String(startDate.getUTCMinutes()).padStart(2, '0')} UTC
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-mono font-medium ${
                            apt.status === 'CONFIRMED'
                              ? 'text-emerald-400'
                              : apt.status === 'IN_PROGRESS'
                              ? 'text-indigo-400'
                              : 'text-rose-400 line-through'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedApt(apt)}
                            title="Inspect full appointment record"
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleCancelAppointment(apt.id)}
                              disabled={cancellingId === apt.id}
                              title="Cancel appointment and free resources"
                              className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/40 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Detail Inspection Modal */}
      {inspectedApt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-semibold text-white">
                  Appointment Record: {inspectedApt.confirmationCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedApt(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] font-medium uppercase mb-1">
                  Customer Entity
                </span>
                <span className="text-white font-semibold block">{inspectedApt.customer.name}</span>
                <span className="text-slate-400 block">{inspectedApt.customer.email}</span>
                <span className="text-slate-400 block font-mono">{inspectedApt.customer.phone}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] font-medium uppercase mb-1">
                  Vehicle Entity
                </span>
                <span className="text-white font-semibold block">
                  {inspectedApt.vehicle.year} {inspectedApt.vehicle.make} {inspectedApt.vehicle.model}
                </span>
                <span className="text-slate-400 block font-mono">VIN: {inspectedApt.vehicle.vin}</span>
                <span className="text-slate-400 block font-mono">
                  Plate: {inspectedApt.vehicle.licensePlate} ({inspectedApt.vehicle.fuelType})
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] font-medium uppercase mb-1">
                  Assigned Hardware Bay
                </span>
                <span className="text-white font-semibold block">{inspectedApt.serviceBayName}</span>
                <span className="text-slate-400 block font-mono text-[10px]">ID: {inspectedApt.serviceBayId}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] font-medium uppercase mb-1">
                  Assigned Technician
                </span>
                <span className="text-white font-semibold block">{inspectedApt.technicianName}</span>
                <span className="text-slate-400 block font-mono text-[10px]">ID: {inspectedApt.technicianId}</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded border border-slate-800/80 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Facility:</span>
                <span className="text-white">{inspectedApt.dealershipName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Procedure:</span>
                <span className="text-white">{inspectedApt.serviceName} ({inspectedApt.durationMinutes} min)</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Start:</span>
                <span className="text-white">{inspectedApt.startTime}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>End:</span>
                <span className="text-white">{inspectedApt.endTime}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Trace ID:</span>
                <span className="text-indigo-300">{inspectedApt.traceId || 'N/A'}</span>
              </div>
              {inspectedApt.notes && (
                <div className="pt-2 border-t border-slate-800 text-slate-300">
                  <span className="text-slate-500 block text-[10px]">Notes:</span>
                  {inspectedApt.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {inspectedApt.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => handleCancelAppointment(inspectedApt.id)}
                  disabled={cancellingId === inspectedApt.id}
                  className="px-3 py-1.5 text-xs text-rose-300 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded transition-colors"
                >
                  Cancel Appointment
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectedApt(null)}
                className="px-3 py-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
