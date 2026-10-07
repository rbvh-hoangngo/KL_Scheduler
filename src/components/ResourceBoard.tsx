import React, { useState, useEffect } from 'react';
import { Dealership, ServiceBay, Technician, AppointmentDetailResponse } from '../shared/types.js';
import { Layers, Calendar, Clock, CheckCircle2, Shield, Wrench, UserCheck } from 'lucide-react';

interface ResourceBoardProps {
  dealerships: Dealership[];
}

export const ResourceBoard: React.FC<ResourceBoardProps> = ({ dealerships }) => {
  const [selectedDealershipId, setSelectedDealershipId] = useState<string>(
    dealerships[0]?.id || ''
  );
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [bays, setBays] = useState<ServiceBay[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDetailResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Time columns from 08:00 to 18:00
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  const fetchBoardData = async () => {
    if (!selectedDealershipId) return;
    setLoading(true);
    try {
      const [baysRes, techsRes, aptsRes] = await Promise.all([
        fetch(`/api/bays?dealershipId=${selectedDealershipId}`),
        fetch(`/api/technicians?dealershipId=${selectedDealershipId}`),
        fetch(`/api/appointments?dealershipId=${selectedDealershipId}&date=${selectedDate}`)
      ]);

      if (baysRes.ok) setBays(await baysRes.json());
      if (techsRes.ok) setTechnicians(await techsRes.json());
      if (aptsRes.ok) setAppointments(await aptsRes.json());
    } catch (err) {
      console.error('Error fetching resource board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [selectedDealershipId, selectedDate]);

  const activeDealership = dealerships.find((d) => d.id === selectedDealershipId);

  // Calculates horizontal positioning for Gantt blocks
  // Timeline spans from 08:00 (0%) to 18:00 (100%) = 10 hours = 600 minutes
  const computePosition = (startIso: string, durationMin: number) => {
    const d = new Date(startIso);
    const startHour = d.getUTCHours();
    const startMinute = d.getUTCMinutes();
    const startOffsetMinutes = (startHour - 8) * 60 + startMinute;

    const leftPercent = Math.max(0, Math.min(100, (startOffsetMinutes / 600) * 100));
    const widthPercent = Math.max(2, Math.min(100 - leftPercent, (durationMin / 600) * 100));

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Dealership Resource Grid & Timeline</h2>
            <p className="text-xs text-slate-400">
              Real-time Gantt occupancy for physical Service Bays and certified Technicians.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDealershipId}
            onChange={(e) => setSelectedDealershipId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            {dealerships.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.city})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Active Service Bays</span>
          <span className="text-lg font-bold font-mono text-white mt-0.5 block">{bays.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Certified Technicians</span>
          <span className="text-lg font-bold font-mono text-white mt-0.5 block">{technicians.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Booked Appointments Today</span>
          <span className="text-lg font-bold font-mono text-indigo-400 mt-0.5 block">
            {appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS').length}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded p-3">
          <span className="text-[11px] text-slate-400 block">Facility Operating Hours</span>
          <span className="text-xs font-mono text-emerald-400 mt-1 block">
            {activeDealership?.operatingHours.open} - {activeDealership?.operatingHours.close} (Local)
          </span>
        </div>
      </div>

      {/* Section 1: Service Bays Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Physical Service Bays (Hardware & Tooling Constraints)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">08:00 - 18:00</span>
        </div>

        {/* Timeline Header Hour Ticks */}
        <div className="relative pt-2 pl-48 pr-4">
          <div className="grid grid-cols-10 text-[10px] font-mono text-slate-500 border-b border-slate-800 pb-1">
            {hours.slice(0, 10).map((h) => (
              <div key={h} className="text-left">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Bays List */}
        <div className="space-y-3">
          {bays.map((bay) => {
            const bayApts = appointments.filter(
              (a) => a.serviceBayId === bay.id && (a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS')
            );

            return (
              <div key={bay.id} className="flex items-center group">
                {/* Bay Info Column (fixed width) */}
                <div className="w-48 shrink-0 pr-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate">{bay.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{bay.bayNumber}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {bay.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[9px] font-mono px-1 py-0.2 bg-slate-800 text-indigo-300 rounded"
                      >
                        {cap.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline Track */}
                <div className="flex-1 h-10 bg-slate-950 rounded border border-slate-800/80 relative overflow-hidden">
                  {/* Hour grid lines */}
                  <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                    {hours.slice(0, 10).map((h) => (
                      <div key={h} className="border-r border-slate-900/60 h-full"></div>
                    ))}
                  </div>

                  {/* Render Scheduled Appointments */}
                  {bayApts.map((apt) => {
                    const pos = computePosition(apt.startTime, apt.durationMinutes);
                    return (
                      <div
                        key={apt.id}
                        style={{ left: pos.left, width: pos.width }}
                        title={`${apt.confirmationCode} · ${apt.serviceName} · Customer: ${apt.customer.name}`}
                        className="absolute top-1 bottom-1 bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/50 rounded px-2 flex flex-col justify-center text-[10px] text-white shadow-sm overflow-hidden cursor-pointer transition-all"
                      >
                        <span className="font-semibold truncate">{apt.serviceName}</span>
                        <span className="text-[9px] text-indigo-200 truncate font-mono">
                          {apt.customer.name} · {apt.vehicle.make}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Technicians Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Certified Technicians (Skill & Shift Constraints)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Shift & Task Allocation</span>
        </div>

        {/* Timeline Header Hour Ticks */}
        <div className="relative pt-2 pl-48 pr-4">
          <div className="grid grid-cols-10 text-[10px] font-mono text-slate-500 border-b border-slate-800 pb-1">
            {hours.slice(0, 10).map((h) => (
              <div key={h} className="text-left">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>

        {/* Tech List */}
        <div className="space-y-3">
          {technicians.map((tech) => {
            const techApts = appointments.filter(
              (a) => a.technicianId === tech.id && (a.status === 'CONFIRMED' || a.status === 'IN_PROGRESS')
            );

            return (
              <div key={tech.id} className="flex items-center group">
                {/* Tech Info Column */}
                <div className="w-48 shrink-0 pr-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate">{tech.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{tech.shiftStart}-{tech.shiftEnd}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tech.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[9px] font-mono px-1 py-0.2 bg-slate-800 text-emerald-300 rounded"
                      >
                        {skill.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline Track */}
                <div className="flex-1 h-10 bg-slate-950 rounded border border-slate-800/80 relative overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                    {hours.slice(0, 10).map((h) => (
                      <div key={h} className="border-r border-slate-900/60 h-full"></div>
                    ))}
                  </div>

                  {techApts.map((apt) => {
                    const pos = computePosition(apt.startTime, apt.durationMinutes);
                    return (
                      <div
                        key={apt.id}
                        style={{ left: pos.left, width: pos.width }}
                        title={`${apt.confirmationCode} · ${apt.serviceName} · Bay: ${apt.serviceBayName}`}
                        className="absolute top-1 bottom-1 bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-400/50 rounded px-2 flex flex-col justify-center text-[10px] text-white shadow-sm overflow-hidden cursor-pointer transition-all"
                      >
                        <span className="font-semibold truncate">{apt.serviceName}</span>
                        <span className="text-[9px] text-emerald-200 truncate font-mono">
                          {apt.serviceBayName} · {apt.customer.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
