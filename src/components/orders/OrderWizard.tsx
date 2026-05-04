import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { WizardShell } from './WizardShell';
import { Step1ServicePicker } from './Step1ServicePicker';
import type { ScheduleChoice } from './Step2When';
import Step2BookingForm from './Step2BookingForm';
import { Step3Where } from './Step3Where';
import Step3Review from './Step3Review';
import { Step4Details } from './Step4Details';
import { PhotoUploader } from './PhotoUploader';
import { Step6Description } from './Step6Description';
import { Step7Review } from './Step7Review';
import { formatScheduleLabel } from '../../lib/wizardScheduleLabel';
import { type ServiceQuestionnaireV1, isServiceQuestionnaireV1 } from '@/lib/serviceDefinitionTypes';
import { validateServiceAnswers } from '@/lib/serviceQuestionnaireValidate';
import { minimalFallbackQuestionnaire } from '@/lib/wizardFallbackQuestionnaire';
import { photosJsonToUploadRows } from '@/lib/orderPhotosForValidate';
import {
  postOrderDraft,
  putOrderDraft,
  submitOrderDraft,
  getServiceCatalogSchema,
  normalizePhotos,
  searchCategoriesAndCatalogs,
  type CatalogSelectionMeta,
  type OrderEntryPoint,
  type OrderRecord,
  type OrderPhotoRow,
  type SubmitOrderResult,
} from '../../services/orders';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';
import { resolveHomeCategoryPathIds, type CategoryTreeNode } from '../../lib/homeOrderDeepLink';
import { resolveMediaUrl } from '../../lib/resolveMediaUrl';
import { useWizardStore } from '../../lib/wizardStore';
import { effectiveWizardBookingMode } from '../../lib/bookingModeWizard';
import { buildWizardBookingSummary } from '../../lib/wizardBookingSummary';

const LS_DRAFT = 'neighborly_f5_order_draft';

/** Wizard-owned gallery rows (Step 2 uploader); POST /api/upload via `PhotoUploader`. */
const WIZARD_GALLERY_FIELD_ID = '_wizardGallery';
const REFERENCE_PHOTOS_MARKER = '--- Reference photos ---';

function appendReferencePhotoUrlsToDescription(text: string, gallery: OrderPhotoRow[]): string {
  const base = text.trim();
  const urls = gallery.map((p) => resolveMediaUrl(p.url)).filter(Boolean);
  if (urls.length === 0) return base;
  if (base.includes(REFERENCE_PHOTOS_MARKER)) return base;
  const lines = urls.map((u, i) => `${i + 1}. ${u}`);
  return `${base}\n\n${REFERENCE_PHOTOS_MARKER}\n${lines.join('\n')}`;
}

function mergeAnswersForNewCatalogFields(
  nextSchema: ServiceQuestionnaireV1,
  setAnswers: Dispatch<SetStateAction<Record<string, unknown>>>,
) {
  setAnswers((prev) => {
    const nextIds = new Set(nextSchema.fields.map((f) => f.id));
    const out = { ...prev };
    for (const k of Object.keys(out)) {
      if (!nextIds.has(k) && k.startsWith('fallback_')) {
        delete out[k];
      }
    }
    return out;
  });
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return { ...(v as Record<string, unknown>) };
  return {};
}

function firstSubmitInlineMessage(errors: Record<string, string>, fallback: string): string {
  if (errors._form) return errors._form;
  if (errors.description) return errors.description;
  if (errors.address) return errors.address;
  const first = Object.values(errors).find((v) => typeof v === 'string' && v.trim().length > 0);
  return (typeof first === 'string' && first.trim()) || fallback;
}

export default function OrderWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<'wizard' | 'submitting'>('wizard');
  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [serviceCatalogId, setServiceCatalogId] = useState<string | null>(null);
  const [entryPoint, setEntryPoint] = useState<OrderEntryPoint>('direct');

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<OrderPhotoRow[]>([]);
  const [description, setDescription] = useState('');
  const [descriptionAiAssisted, setDescriptionAiAssisted] = useState(false);
  const [scheduleFlexibility, setScheduleFlexibility] = useState<ScheduleChoice>('asap');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [autoMatchExhausted, setAutoMatchExhausted] = useState(false);

  const [schema, setSchema] = useState<ServiceQuestionnaireV1 | null>(null);
  const [serviceName, setServiceName] = useState('Service');
  const [breadcrumbNames, setBreadcrumbNames] = useState<string[]>([]);
  const [savedProfileAddress, setSavedProfileAddress] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaFetchWarning, setSchemaFetchWarning] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitInlineError, setSubmitInlineError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [bootPathIds, setBootPathIds] = useState<string[] | null>(null);
  const [suggestedPathIds, setSuggestedPathIds] = useState<string[] | null>(null);
  const [prefillProviderLabel, setPrefillProviderLabel] = useState<string | null>(null);
  const [otherTicketOpen, setOtherTicketOpen] = useState(false);
  const [otherTicketText, setOtherTicketText] = useState('');
  const [otherTicketBusy, setOtherTicketBusy] = useState(false);
  const [otherTicketMsg, setOtherTicketMsg] = useState<string | null>(null);

  const applyFromOrder = useCallback((o: OrderRecord) => {
    setOrderId(o.id);
    setServiceCatalogId(o.serviceCatalogId);
    setEntryPoint(o.entryPoint);
    setAnswers(asRecord(o.answers));
    setPhotos(normalizePhotos(o.photos));
    setDescription(o.description);
    setDescriptionAiAssisted(o.descriptionAiAssisted);
    const flex = o.scheduleFlexibility as ScheduleChoice;
    setScheduleFlexibility(
      flex === 'asap' || flex === 'this_week' || flex === 'specific' ? flex : 'asap',
    );
    setScheduledAt(o.scheduledAt);
    setAddress(o.address);
    setLocationLat(o.locationLat);
    setLocationLng(o.locationLng);
    setAutoMatchExhausted(Boolean(o.autoMatchExhausted));
  }, []);

  const catFromUrl = searchParams.get('serviceCatalogId');
  const fromUrl = searchParams.get('from');
  const suggestionUrl = searchParams.get('suggestion');
  const homeCategory = searchParams.get('homeCategory');
  const isNewOffer = searchParams.get('newOffer') === '1';
  const prefillProviderId = searchParams.get('prefillProviderId');

  const storeHomeCategory = useWizardStore((s) => s.homeCategory);
  const storeServiceCatalogId = useWizardStore((s) => s.serviceCatalogId);
  const storePrefillProviderId = useWizardStore((s) => s.prefillProviderId);
  const storePrefillProviderName = useWizardStore((s) => s.prefillProviderName);
  const storeBookingMode = useWizardStore((s) => s.bookingMode);
  const storeServiceAddress = useWizardStore((s) => s.serviceAddress);

  const authReturnTo = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search]);

  const goAuthWithReturn = useCallback(() => {
    const q = encodeURIComponent(authReturnTo);
    navigate(`/auth?returnTo=${q}`, { state: { returnTo: authReturnTo } });
  }, [navigate, authReturnTo]);

  const mergeWizardParams = useCallback((updates: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === '') p.delete(k);
        else p.set(k, v);
      }
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (!prefillProviderId?.trim() || !user?.id) {
      setPrefillProviderLabel(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const u = await api.get<{ displayName?: string | null }>(
          `/api/users/${encodeURIComponent(prefillProviderId.trim())}`,
        );
        if (cancelled) return;
        setPrefillProviderLabel(typeof u?.displayName === 'string' ? u.displayName : null);
      } catch {
        if (!cancelled) setPrefillProviderLabel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [prefillProviderId, user?.id]);

  useEffect(() => {
    if (prefillProviderLabel?.trim()) {
      useWizardStore.getState().setBookingForm({ prefillProviderName: prefillProviderLabel.trim() });
    }
  }, [prefillProviderLabel]);

  useEffect(() => {
    if (!homeCategory?.trim()) {
      setBootPathIds(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await searchCategoriesAndCatalogs(homeCategory.trim(), 12);
        if (cancelled) return;
        const hit = r.categories.find((c) => Array.isArray(c.pathIds) && c.pathIds.length > 0);
        if (hit?.pathIds?.length) {
          setBootPathIds(hit.pathIds);
          return;
        }
      } catch {
        /* fall through to tree */
      }
      try {
        const res = await fetch('/api/categories/tree');
        const data = (await res.json()) as CategoryTreeNode[];
        if (cancelled) return;
        const ids = resolveHomeCategoryPathIds(Array.isArray(data) ? data : [], homeCategory);
        setBootPathIds(ids);
      } catch {
        if (!cancelled) setBootPathIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [homeCategory]);

  // ADR-0054: do not call authenticated APIs on mount for guests (avoids api.request 401 → hard /auth redirect).
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        if (me.address?.trim()) {
          setSavedProfileAddress(me.address);
          setAddress((a) => a || me.address!);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (!catFromUrl) return;
    let cancelled = false;
    setInitError(null);
    const ep: OrderEntryPoint =
      fromUrl === 'explorer' ? 'explorer' : fromUrl === 'ai' ? 'ai_suggestion' : 'direct';
    void (async () => {
      try {
        const prefill: Record<string, unknown> = {};
        if (suggestionUrl) {
          try {
            prefill.description = decodeURIComponent(suggestionUrl);
          } catch {
            prefill.description = suggestionUrl;
          }
        }
        const draft = await postOrderDraft({
          serviceCatalogId: catFromUrl,
          entryPoint: ep,
          prefill: Object.keys(prefill).length ? prefill : undefined,
        });
        if (cancelled) return;
        applyFromOrder(draft);
        useWizardStore.getState().setServiceFromCatalog({
          serviceCatalogId: catFromUrl,
          bookingMode: effectiveWizardBookingMode(null),
        });
        setStep(2);
        try {
          localStorage.setItem(LS_DRAFT, JSON.stringify({ orderId: draft.id, serviceCatalogId: catFromUrl }));
        } catch {
          /* ignore */
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'Unauthorized' || code === 'UNAUTHORIZED') {
          setServiceCatalogId(catFromUrl);
          setOrderId(null);
          setEntryPoint(ep);
          mergeWizardParams({ serviceCatalogId: catFromUrl, from: fromUrl || 'direct' });
          if (suggestionUrl) {
            try {
              setDescription(decodeURIComponent(suggestionUrl));
            } catch {
              setDescription(suggestionUrl);
            }
          }
          useWizardStore.getState().setServiceFromCatalog({
            serviceCatalogId: catFromUrl,
            bookingMode: 'inherit_from_catalog',
          });
          setStep(2);
          return;
        }
        setInitError(msg || 'Could not start order');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catFromUrl, fromUrl, suggestionUrl, applyFromOrder, mergeWizardParams]);

  useEffect(() => {
    if (!serviceCatalogId) {
      setSchemaLoading(false);
      setSchemaFetchWarning(null);
      return;
    }
    let cancelled = false;
    setSchemaLoading(true);
    setSchemaFetchWarning(null);
    void (async () => {
      try {
        const r = await getServiceCatalogSchema(serviceCatalogId);
        if (cancelled) return;
        const parsed =
          r.schema != null && isServiceQuestionnaireV1(r.schema) ? r.schema : minimalFallbackQuestionnaire();
        setSchema(parsed);
        mergeAnswersForNewCatalogFields(parsed, setAnswers);
        setServiceName(r.serviceCatalog.name);
        setBreadcrumbNames(r.breadcrumbs.map((b) => b.name));
        useWizardStore.getState().setServiceFromCatalog({
          serviceCatalogId,
          serviceCatalogName: r.serviceCatalog.name,
          bookingMode: effectiveWizardBookingMode({
            name: r.serviceCatalog.name,
            slug: r.serviceCatalog.slug ?? null,
            lockedBookingMode: r.serviceCatalog.lockedBookingMode ?? null,
          }),
        });
        if (r.schema == null || !isServiceQuestionnaireV1(r.schema)) {
          setSchemaFetchWarning(
            'No custom questions for this service. Add your address and any notes, then continue.',
          );
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
        const fallback = minimalFallbackQuestionnaire();
        setSchema(fallback);
        mergeAnswersForNewCatalogFields(fallback, setAnswers);
        if (code === 'UNAUTHORIZED') {
          setServiceName('Selected service');
          setBreadcrumbNames([]);
          useWizardStore.getState().setServiceFromCatalog({
            serviceCatalogId: serviceCatalogId ?? undefined,
            serviceCatalogName: 'Selected service',
            bookingMode: 'inherit_from_catalog',
          });
          setSchemaFetchWarning(
            'No custom questions for this service. Add your address and any notes, then continue.',
          );
        } else {
          setSchemaFetchWarning(
            'Could not load service questionnaire. Use the fields below, confirm your address on the previous step, then continue.',
          );
        }
      } finally {
        if (!cancelled) setSchemaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceCatalogId]);

  useEffect(() => {
    if (!user?.id || !serviceCatalogId || orderId) return;
    let cancelled = false;
    void (async () => {
      try {
        const draft = await postOrderDraft({
          serviceCatalogId,
          entryPoint,
        });
        if (cancelled) return;
        applyFromOrder(draft);
        try {
          localStorage.setItem(LS_DRAFT, JSON.stringify({ orderId: draft.id, serviceCatalogId }));
        } catch {
          /* ignore */
        }
      } catch {
        /* still guest-capable until submit */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, serviceCatalogId, orderId, entryPoint, applyFromOrder]);

  useEffect(() => {
    if (!orderId) return;
    const t = setTimeout(() => {
      void (async () => {
        try {
          await putOrderDraft(orderId, {
            answers,
            photos,
            description,
            descriptionAiAssisted,
            scheduleFlexibility,
            scheduledAt,
            address,
            locationLat,
            locationLng,
          });
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 3000);
        } catch {
          /* silent */
        }
      })();
    }, 600);
    return () => clearTimeout(t);
  }, [
    orderId,
    answers,
    photos,
    description,
    descriptionAiAssisted,
    scheduleFlexibility,
    scheduledAt,
    address,
    locationLat,
    locationLng,
  ]);

  useEffect(() => {
    const ref = photos.filter((p) => p.fieldId === WIZARD_GALLERY_FIELD_ID);
    useWizardStore.getState().setBookingForm({ referencePhotos: ref });
  }, [photos]);

  useEffect(() => {
    useWizardStore.getState().setBookingForm({ orderDescription: description });
  }, [description]);

  const onSelectCatalog = async (catalogId: string, meta?: CatalogSelectionMeta) => {
    setInitError(null);
    useWizardStore.getState().setServiceFromCatalog({
      serviceCatalogId: catalogId,
      serviceCatalogName: meta?.name,
      bookingMode: effectiveWizardBookingMode(
        meta
          ? { name: meta.name, slug: meta.slug, lockedBookingMode: meta.lockedBookingMode }
          : { name: null, slug: null, lockedBookingMode: null },
      ),
      homeCategory: homeCategory?.trim() || undefined,
      prefillProviderId: prefillProviderId?.trim() || undefined,
      prefillProviderName: prefillProviderLabel ?? undefined,
    });
    try {
      const draft = await postOrderDraft({
        serviceCatalogId: catalogId,
        entryPoint: 'direct',
      });
      applyFromOrder(draft);
      if (user?.id) {
        try {
          const r = await getServiceCatalogSchema(catalogId);
          const parsed =
            r.schema != null && isServiceQuestionnaireV1(r.schema) ? r.schema : minimalFallbackQuestionnaire();
          setSchema(parsed);
          mergeAnswersForNewCatalogFields(parsed, setAnswers);
          setServiceName(r.serviceCatalog.name);
          setBreadcrumbNames(r.breadcrumbs.map((b) => b.name));
          useWizardStore.getState().setServiceFromCatalog({
            serviceCatalogId: catalogId,
            serviceCatalogName: r.serviceCatalog.name,
            bookingMode: effectiveWizardBookingMode({
              name: r.serviceCatalog.name,
              slug: r.serviceCatalog.slug ?? null,
              lockedBookingMode: r.serviceCatalog.lockedBookingMode ?? null,
            }),
            homeCategory: homeCategory?.trim() || undefined,
            prefillProviderId: prefillProviderId?.trim() || undefined,
            prefillProviderName: prefillProviderLabel ?? undefined,
          });
          if (r.schema == null || !isServiceQuestionnaireV1(r.schema)) {
            setSchemaFetchWarning(
              'No custom questions for this service. Add your address and any notes, then continue.',
            );
          } else {
            setSchemaFetchWarning(null);
          }
        } catch {
          const fallback = minimalFallbackQuestionnaire();
          setSchema(fallback);
          mergeAnswersForNewCatalogFields(fallback, setAnswers);
          setSchemaFetchWarning(
            'Could not load service questionnaire. Use the fields below, confirm your address on the previous step, then continue.',
          );
        }
      }
      setStep(2);
      try {
        localStorage.setItem(LS_DRAFT, JSON.stringify({ orderId: draft.id, serviceCatalogId: catalogId }));
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Unauthorized' || code === 'UNAUTHORIZED') {
        setServiceCatalogId(catalogId);
        setOrderId(null);
        setEntryPoint('direct');
        mergeWizardParams({ serviceCatalogId: catalogId, from: 'direct' });
        setStep(2);
        return;
      }
      setInitError(msg || 'Failed');
    }
  };

  const onPhotosForField = (fieldId: string, rows: OrderPhotoRow[]) => {
    setPhotos((prev) => {
      const rest = prev.filter((p) => p.fieldId !== fieldId);
      return [...rest, ...rows];
    });
  };

  const validateStep4 = (): boolean => {
    const eff = schema ?? minimalFallbackQuestionnaire();
    if (eff.fields.length === 0) {
      setErrors({});
      return true;
    }
    const files = photosJsonToUploadRows(photos, eff);
    if (files.ok === false) {
      setErrors({ _form: files.error });
      return false;
    }
    const v = validateServiceAnswers(eff, answers, files.rows);
    if (!v.valid) {
      setErrors(v.errors);
      return false;
    }
    setErrors({});
    return true;
  };

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return Boolean(orderId || serviceCatalogId);
      case 2: {
        const w = useWizardStore.getState();
        if (w.bookingMode === 'negotiation') {
          if ((w.notes?.trim().length ?? 0) < 10) return false;
        }
        if (w.bookingMode === 'inherit_from_catalog') {
          if ((w.serviceAddress?.trim().length ?? 0) < 5) return false;
        }
        if (scheduleFlexibility === 'specific') {
          if (!scheduledAt) return false;
          return new Date(scheduledAt).getTime() > Date.now() + 55 * 60 * 1000;
        }
        return true;
      }
      case 3:
        return address.trim().length > 0;
      case 4:
        return true;
      case 5:
        return !schemaLoading;
      case 6: {
        const t = description.trim();
        return t.length >= 10 && t.length <= 1000;
      }
      default:
        return true;
    }
  };

  const goNext = () => {
    if (step === 5 && !validateStep4()) return;
    if (step === 6) {
      const t = description.trim();
      if (t.length < 10) {
        setErrors({ description: 'Please write at least 10 characters.' });
        return;
      }
      if (t.length > 1000) {
        setErrors({ description: 'Please keep your description at or under 1000 characters.' });
        return;
      }
    }
    setErrors({});
    setSubmitInlineError(null);
    if (step < 7) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    navigate(-1);
  };

  const scheduleLabel = useMemo(
    () => formatScheduleLabel(scheduleFlexibility, scheduledAt),
    [scheduleFlexibility, scheduledAt],
  );

  const coachInput = useMemo(
    () => ({
      serviceTitle: serviceName,
      categoryBreadcrumb: breadcrumbNames,
      answers,
      userDescription: description,
      aiAssistPrompt: schema?.aiAssistPrompt,
    }),
    [serviceName, breadcrumbNames, answers, description, schema?.aiAssistPrompt],
  );

  const submitOtherTicket = async () => {
    const body = otherTicketText.trim();
    if (body.length < 10) {
      setOtherTicketMsg('Please write at least 10 characters.');
      return;
    }
    if (!user?.id) {
      goAuthWithReturn();
      return;
    }
    setOtherTicketBusy(true);
    setOtherTicketMsg(null);
    try {
      await api.post('/api/tickets', {
        subject: 'Request a new service type',
        type: 'general',
        message: body,
      });
      setOtherTicketMsg('Thanks — our team will review your request.');
      setOtherTicketOpen(false);
      setOtherTicketText('');
    } catch (e: unknown) {
      setOtherTicketMsg(e instanceof Error ? e.message : 'Could not send request');
    } finally {
      setOtherTicketBusy(false);
    }
  };

  const doSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitInlineError(null);
    if (!orderId) {
      setPhase('wizard');
      goAuthWithReturn();
      return;
    }
    setPhase('submitting');
    const summary = buildWizardBookingSummary().trim();
    const marker = '--- Booking preferences ---';
    const gallery = photos.filter((p) => p.fieldId === WIZARD_GALLERY_FIELD_ID);
    let nextDesc = description.trim();
    if (summary && !nextDesc.includes(marker)) {
      nextDesc = nextDesc ? `${nextDesc}\n\n${marker}\n${summary}` : `${marker}\n${summary}`;
    }
    nextDesc = appendReferencePhotoUrlsToDescription(nextDesc, gallery);
    if (nextDesc !== description.trim()) {
      try {
        await putOrderDraft(orderId, {
          description: nextDesc,
          descriptionAiAssisted,
          answers,
          photos,
          scheduleFlexibility,
          scheduledAt,
          address,
          locationLat,
          locationLng,
        });
        setDescription(nextDesc);
      } catch {
        /* continue to submit with prior description */
      }
    }
    const r = await submitOrderDraft(orderId, {});
    if (r.ok === false) {
      if (r.validationErrors?._auth === 'sign_in_required') {
        setPhase('wizard');
        goAuthWithReturn();
        return;
      }
    }
    if (r.ok) {
      applyFromOrder(r.order);
      try {
        localStorage.removeItem(LS_DRAFT);
      } catch {
        /* ignore */
      }
      setPhase('wizard');
      const id = r.order.id;
      navigate(`/orders/${id}/confirmation`, {
        replace: true,
        state: {
          matchOutcome: r.matchOutcome,
          matchedSummary: r.matchedSummary ?? null,
          autoMatchExhausted,
          headlineServiceName: serviceName,
          scheduleLabel,
          bookingSummary: buildWizardBookingSummary(),
        },
      });
    } else {
      const fail = r as Extract<SubmitOrderResult, { ok: false }>;
      setPhase('wizard');
      const ve = fail.validationErrors ?? {};
      const msg = fail.message ?? '';
      const merged = { ...ve };
      if (msg.toLowerCase().includes('description')) merged.description = merged.description || msg;
      if (msg.toLowerCase().includes('address')) merged.address = merged.address || msg;
      if (
        msg.toLowerCase().includes('questionnaire') ||
        msg.toLowerCase().includes('service type is unavailable')
      ) {
        merged._form =
          'No custom questions for this service. Confirm your address and description, then try again. If the problem continues, choose another service type or contact support.';
      }
      setErrors(merged);
      setStep(7);
      setSubmitInlineError(firstSubmitInlineMessage(merged, msg || 'Could not submit your order. Please try again.'));
    }
  };

  if (initError) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center space-y-4">
        <p className="text-red-600 font-bold">{initError}</p>
        <button
          type="button"
          className="min-h-[48px] px-6 rounded-2xl bg-neutral-900 text-white font-bold"
          onClick={() => navigate('/orders/new')}
        >
          Try again
        </button>
      </div>
    );
  }

  const showStepErrors = submitAttempted || step < 7;
  const nextDisabled = phase === 'submitting' || !canGoNext();

  return (
    <WizardShell
      title="Book a service"
      step={step}
      totalSteps={7}
      onBack={handleBack}
      savedIndicator={savedFlash}
      headerSlot={
        prefillProviderId ? (
          <p className="text-xs flex flex-wrap items-center gap-2 rounded-full border border-app-border bg-app-card px-3 py-2 text-neutral-600 dark:text-neutral-400">
            <span className="font-black uppercase tracking-widest text-[10px] text-neutral-400">Requested provider</span>
            <span className="font-semibold text-app-text">
              {prefillProviderLabel ?? `ID ${prefillProviderId.slice(0, 8)}…`}
            </span>
          </p>
        ) : null
      }
      footer={
        step === 1 || step === 4 || step === 7 ? null : (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={goNext}
            aria-label="Go to next wizard step"
            className={cn(
              'w-full min-h-[48px] rounded-2xl font-bold text-[15px]',
              'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900',
              'disabled:opacity-50 disabled:pointer-events-none',
            )}
          >
            Next
          </button>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          {otherTicketOpen ? (
            <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-3">
              <p className="text-sm font-bold text-app-text">Describe the service you need</p>
              <textarea
                value={otherTicketText}
                onChange={(e) => setOtherTicketText(e.target.value)}
                rows={4}
                placeholder="Tell us what should be added to the marketplace…"
                className="w-full rounded-xl border border-app-border bg-app-input p-3 text-[15px] text-app-text"
              />
              {otherTicketMsg ? <p className="text-sm text-amber-700 dark:text-amber-300">{otherTicketMsg}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={otherTicketBusy}
                  onClick={() => void submitOtherTicket()}
                  className="min-h-[44px] px-4 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-sm disabled:opacity-50"
                >
                  {otherTicketBusy ? 'Sending…' : 'Submit request'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtherTicketOpen(false);
                    setOtherTicketMsg(null);
                  }}
                  className="min-h-[44px] px-4 rounded-xl border border-app-border font-bold text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
          <Step1ServicePicker
            onSelectServiceCatalog={(id, meta) => void onSelectCatalog(id, meta)}
            initialPathIds={suggestedPathIds ?? bootPathIds ?? undefined}
            showOtherRow
            newOfferHint={isNewOffer}
            autoFocusCategorySearch={isNewOffer}
            onSuggestPath={(ids) => setSuggestedPathIds(ids)}
            onOtherRequest={() => {
              setOtherTicketOpen(true);
              setOtherTicketMsg(null);
            }}
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-8">
          <Step2BookingForm
            syncSchedule={(flex, iso) => {
              setScheduleFlexibility(flex);
              setScheduledAt(iso);
            }}
            syncAddress={(addr) => setAddress((a) => (a.trim() ? a : addr))}
          />
          <div className="space-y-2">
            <p className="text-xs font-bold text-app-text">Reference photos (optional)</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Up to five images, stored on your order and linked again in the description when you submit.
            </p>
            <PhotoUploader
              value={photos.filter((p) => p.fieldId === WIZARD_GALLERY_FIELD_ID)}
              onChange={(rows) => {
                setPhotos((prev) => {
                  const rest = prev.filter((p) => p.fieldId !== WIZARD_GALLERY_FIELD_ID);
                  return [...rest, ...rows.map((r) => ({ ...r, fieldId: WIZARD_GALLERY_FIELD_ID }))];
                });
              }}
              maxFiles={5}
              maxFileSizeMb={10}
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <Step3Where
          address={address}
          savedAddress={savedProfileAddress}
          onChange={(addr, lat, lng) => {
            setAddress(addr);
            setLocationLat(lat);
            setLocationLng(lng);
          }}
        />
      ) : null}

      {step === 4 ? (
        <Step3Review
          homeCategory={storeHomeCategory ?? (homeCategory?.trim() || undefined)}
          prefillCategoryPath={breadcrumbNames.length > 0 ? breadcrumbNames : undefined}
          serviceCatalogId={serviceCatalogId ?? storeServiceCatalogId ?? undefined}
          serviceCatalogName={serviceName}
          prefillProviderId={storePrefillProviderId ?? (prefillProviderId?.trim() || undefined)}
          prefillProviderName={storePrefillProviderName ?? undefined}
          bookingMode={storeBookingMode ?? undefined}
          description={description.trim() || undefined}
          serviceAddress={
            [storeServiceAddress, address].find((a) => typeof a === 'string' && a.trim().length > 0)?.trim() ||
            undefined
          }
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
        />
      ) : null}

      {step === 5 ? (
        <Step4Details
          schema={schema}
          answers={answers}
          photos={photos}
          onAnswer={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
          onPhotosForField={onPhotosForField}
          errors={errors}
          showErrors={showStepErrors || step === 5}
          isSchemaLoading={schemaLoading}
          schemaFetchWarning={schemaFetchWarning}
        />
      ) : null}

      {step === 6 ? (
        <Step6Description
          description={description}
          descriptionAiAssisted={descriptionAiAssisted}
          onDescription={setDescription}
          onAiAssisted={setDescriptionAiAssisted}
          coachInput={coachInput}
          errors={errors}
          showErrors={showStepErrors}
        />
      ) : null}

      {step === 7 ? (
        <Step7Review
          serviceName={serviceName}
          categoryTrail={breadcrumbNames}
          bookingMode={storeBookingMode ?? undefined}
          scheduleLabel={scheduleLabel}
          address={address}
          schema={schema}
          answers={answers}
          description={description}
          photos={photos}
          bookingPreferencesSummary={buildWizardBookingSummary()}
          onEdit={(s) => {
            setSubmitInlineError(null);
            setStep(s);
          }}
          onSubmit={() => void doSubmit()}
          isSubmitting={phase === 'submitting'}
          submitError={submitInlineError}
          onBackFromReview={handleBack}
        />
      ) : null}

      {step !== 7 && errors._form ? <p className="text-sm text-red-600">{errors._form}</p> : null}
    </WizardShell>
  );
}
