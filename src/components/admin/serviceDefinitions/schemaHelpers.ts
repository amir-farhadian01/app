import type { ServiceFieldDef, ServiceFieldType, ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import { isServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import { validateBuilderSchema, type BuilderValidation } from '../../../../lib/serviceQuestionnaireBuilderValidate.js';

export function newFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function newSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function deepCloneForm(schema: ServiceQuestionnaireV1): ServiceQuestionnaireV1 {
  return JSON.parse(JSON.stringify(schema)) as ServiceQuestionnaireV1;
}

export function slugifyLabel(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'field';
}

export function emptyForm(): ServiceQuestionnaireV1 {
  const sid = newSectionId();
  return {
    version: 1,
    title: 'New service questionnaire',
    description: '',
    sections: [{ id: sid, title: 'General', order: 0 }],
    fields: [],
  };
}

export function defaultFieldForType(type: ServiceFieldType, sectionId: string, order: number): ServiceFieldDef {
  const base: ServiceFieldDef = {
    id: newFieldId(),
    label: 'New field',
    type,
    required: false,
    order,
    section: sectionId,
  };
  if (type === 'select' || type === 'multiselect') {
    base.options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ];
  }
  if (type === 'photo') {
    base.accept = ['image/*'];
    base.maxFiles = 3;
    base.maxFileSizeMb = 10;
  }
  if (type === 'boolean') {
    base.trueLabel = 'Yes';
    base.falseLabel = 'No';
  }
  if (type === 'measurement_weight') {
    base.weightUnit = 'kg';
  }
  if (type === 'measurement_dimensions') {
    base.dimensionUnit = 'cm';
  }
  return base;
}

/** Resets only type-specific keys when the editor changes `type`. Preserves id, label, helpText, required, section, showIf, order. */
export function fieldAfterTypeChange(field: ServiceFieldDef, newType: ServiceFieldType): ServiceFieldDef {
  const gen = defaultFieldForType(newType, field.section ?? 'sec', field.order);
  return {
    ...gen,
    id: field.id,
    label: field.label,
    helpText: field.helpText,
    required: field.required,
    section: field.section,
    showIf: field.showIf,
    order: field.order,
    type: newType,
  };
}

/**
 * Best-effort migration when `dynamicFieldsJson` is not a valid V1 (older shapes or manual edits).
 */
export function migrateQuestionnaireToV1(
  raw: unknown,
  titleFallback: string
): { schema: ServiceQuestionnaireV1; migrated: boolean } {
  if (isServiceQuestionnaireV1(raw)) {
    return { schema: deepCloneForm(raw), migrated: false };
  }
  const base = titleFallback.trim() || 'Migrated questionnaire';
  if (raw && typeof raw === 'object' && 'fields' in (raw as object)) {
    const o = raw as Record<string, unknown>;
    const s = emptyForm();
    s.title = typeof o.title === 'string' && o.title.trim() ? o.title : base;
    s.description = typeof o.description === 'string' ? o.description : s.description;
    s.aiAssistPrompt = typeof o.aiAssistPrompt === 'string' ? o.aiAssistPrompt : undefined;
    if (Array.isArray(o.sections) && o.sections.length) {
      s.sections = o.sections as ServiceQuestionnaireV1['sections'];
    }
    if (Array.isArray(o.fields)) {
      s.fields = o.fields.filter((f): f is ServiceFieldDef => f != null && typeof f === 'object') as ServiceFieldDef[];
    }
    if (isServiceQuestionnaireV1(s)) {
      return { schema: s, migrated: true };
    }
  }
  const e = emptyForm();
  e.title = base;
  return { schema: e, migrated: true };
}

export type { BuilderValidation };
export { validateBuilderSchema };

export function validateServiceSchema(
  nameTrimmed: string,
  categoryId: string | null,
  form: ServiceQuestionnaireV1
): string[] {
  return validateBuilderSchema(nameTrimmed, categoryId, form).errors;
}
