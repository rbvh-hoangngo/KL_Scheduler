import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header.js';
import { BookingPortal } from './components/BookingPortal.js';
import { ResourceBoard } from './components/ResourceBoard.js';
import { AppointmentsLedger } from './components/AppointmentsLedger.js';
import { SystemDesignView } from './components/SystemDesignView.js';
import { ApiSandbox } from './components/ApiSandbox.js';
import { TestHarnessView } from './components/TestHarnessView.js';
import { Dealership, ServiceType, AppointmentDetailResponse } from './shared/types.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('booking');
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchInitialData = async () => {
    try {
      const [dlrRes, srvRes] = await Promise.all([
        fetch('/api/dealerships'),
        fetch('/api/service-types')
      ]);

      if (dlrRes.ok) setDealerships(await dlrRes.json());
      if (srvRes.ok) setServiceTypes(await srvRes.json());
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      if (res.ok) {
        await fetchInitialData();
        setNotification('Database successfully reset to initial seed state.');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleAppointmentCreated = (apt: AppointmentDetailResponse) => {
    setNotification(`Appointment ${apt.confirmationCode} created successfully!`);
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs font-mono">Initializing Unified Service Scheduler...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-300">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onResetDatabase={handleResetDatabase}
        isResetting={isResetting}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div className="bg-indigo-950/80 border-b border-indigo-800 text-indigo-200 text-xs py-2 px-4 text-center font-medium animate-in fade-in duration-200">
          {notification}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'booking' && (
          <BookingPortal
            dealerships={dealerships}
            serviceTypes={serviceTypes}
            onAppointmentCreated={handleAppointmentCreated}
          />
        )}

        {activeTab === 'resources' && <ResourceBoard dealerships={dealerships} />}

        {activeTab === 'ledger' && <AppointmentsLedger dealerships={dealerships} />}

        {activeTab === 'system-design' && <SystemDesignView />}

        {activeTab === 'api-sandbox' && <ApiSandbox />}

        {activeTab === 'harness' && <TestHarnessView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>The Unified Service Scheduler</span>
            <span aria-hidden="true">·</span>
            <span>Ownership Domain</span>
            <span aria-hidden="true">·</span>
            <span>Production Blueprint v1.0</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>RESTful Engine</span>
            <span aria-hidden="true">·</span>
            <span>Distributed Mutex Concurrency</span>
            <span aria-hidden="true">·</span>
            <span>ACID File WAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
