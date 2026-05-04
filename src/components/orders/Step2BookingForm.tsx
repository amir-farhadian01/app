import { useWizardStore } from '../../lib/wizardStore';
import type { ScheduleChoice } from './Step2When';
import AutoBookingForm from './booking/AutoBookingForm';
import AppointmentBookingForm from './booking/AppointmentBookingForm';
import NegotiationBookingForm from './booking/NegotiationBookingForm';

export type Step2BookingFormProps = {
  syncSchedule: (flex: ScheduleChoice, iso: string | null) => void;
  syncAddress: (addr: string) => void;
};

export default function Step2BookingForm({ syncSchedule, syncAddress }: Step2BookingFormProps) {
  const bookingMode = useWizardStore((s) => s.bookingMode);
  const serviceCatalogName = useWizardStore((s) => s.serviceCatalogName);
  const prefillProviderName = useWizardStore((s) => s.prefillProviderName);

  if (!bookingMode) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        <p className="font-medium">No service selected</p>
        <p className="text-sm opacity-70 mt-1">Please go back and select a service from the catalog.</p>
      </div>
    );
  }

  switch (bookingMode) {
    case 'auto_appointment':
      return <AutoBookingForm catalogName={serviceCatalogName} syncSchedule={syncSchedule} />;
    case 'inherit_from_catalog':
      return (
        <AppointmentBookingForm
          catalogName={serviceCatalogName}
          providerName={prefillProviderName}
          syncSchedule={syncSchedule}
          syncAddress={syncAddress}
        />
      );
    case 'negotiation':
      return (
        <NegotiationBookingForm
          catalogName={serviceCatalogName}
          providerName={prefillProviderName}
          syncSchedule={syncSchedule}
        />
      );
    default:
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Unknown booking mode: {String(bookingMode)}
        </div>
      );
  }
}
