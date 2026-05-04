import { create } from 'zustand';
import type { WizardBookingMode } from './bookingModeWizard';
import type { OrderPhotoRow } from '../services/orders';

export type DatePreference = 'today' | 'tomorrow' | 'this_weekend';
export type TimeWindow = 'morning' | 'afternoon' | 'evening';
export type Urgency = 'immediate' | 'this_week' | 'no_rush';

type WizardData = {
  homeCategory?: string;
  serviceCatalogId?: string;
  serviceCatalogName?: string;
  prefillProviderId?: string;
  prefillProviderName?: string;
  bookingMode?: WizardBookingMode;
  serviceAddress?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  datePreference?: DatePreference;
  timeWindow?: TimeWindow;
  urgency?: Urgency;
  budgetMin?: number;
  budgetMax?: number;
  notes?: string;
  accessNotes?: string;
  guestSessionKey?: string;
  /** Optional gallery uploads (Step 2); mirrors `photos` rows with `fieldId === '_wizardGallery'`. */
  referencePhotos?: OrderPhotoRow[];
  /** Free-text project description (wizard Step 6); mirrored from OrderWizard local state. */
  orderDescription?: string;
  /** Leaf category id (from schema breadcrumbs) for submit payload. */
  leafCategoryId?: string;
  selectedPackageId?: string;
  selectedPackageName?: string;
  selectedPackagePrice?: number;
  selectedPackageDuration?: number | null;
  /** Resolved package booking mode for Step 4 scheduling branch. */
  selectedPackageBookingMode?: string;
  wizardTimePreference?: string;
  wizardScheduledDate?: string | null;
  wizardTimeSlot?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostal?: string;
  selectedProviderId?: string | null;
};

const emptyBookingFields: Partial<WizardData> = {
  serviceAddress: undefined,
  appointmentDate: undefined,
  appointmentTime: undefined,
  datePreference: undefined,
  timeWindow: undefined,
  urgency: undefined,
  budgetMin: undefined,
  budgetMax: undefined,
  notes: undefined,
  accessNotes: undefined,
  guestSessionKey: undefined,
  referencePhotos: undefined,
  orderDescription: undefined,
  leafCategoryId: undefined,
  selectedPackageId: undefined,
  selectedPackageName: undefined,
  selectedPackagePrice: undefined,
  selectedPackageDuration: undefined,
  selectedPackageBookingMode: undefined,
  wizardTimePreference: undefined,
  wizardScheduledDate: undefined,
  wizardTimeSlot: undefined,
  addressStreet: undefined,
  addressCity: undefined,
  addressPostal: undefined,
  selectedProviderId: undefined,
};

export type WizardStore = WizardData & {
  setServiceFromCatalog: (catalog: Partial<WizardData>) => void;
  setBookingForm: (form: Partial<WizardData>) => void;
  reset: () => void;
};

export const useWizardStore = create<WizardStore>((set) => ({
  setServiceFromCatalog: (catalog) =>
    set((state) => {
      const idChanged =
        catalog.serviceCatalogId != null && catalog.serviceCatalogId !== state.serviceCatalogId;
      return {
        ...state,
        ...(idChanged ? emptyBookingFields : {}),
        ...catalog,
      };
    }),
  setBookingForm: (form) => set((state) => ({ ...state, ...form })),
  reset: () =>
    set({
      homeCategory: undefined,
      serviceCatalogId: undefined,
      serviceCatalogName: undefined,
      prefillProviderId: undefined,
      prefillProviderName: undefined,
      bookingMode: undefined,
      ...emptyBookingFields,
    }),
}));
