import type { BusinessKycFieldDef, BusinessKycFieldType, BusinessKycFormV1 } from '../../../../../lib/kycTypes';

export function deepCloneForm(schema: BusinessKycFormV1): BusinessKycFormV1 {
  return JSON.parse(JSON.stringify(schema)) as BusinessKycFormV1;
}

export function slugifyLabel(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'field';
}

export function emptyForm(): BusinessKycFormV1 {
  const sid = `sec_${Date.now()}`;
  return {
    version: 1,
    title: 'New business KYC form',
    description: '',
    sections: [{ id: sid, title: 'General', order: 0 }],
    fields: [],
  };
}

export function defaultFieldForType(type: BusinessKycFieldType, sectionId: string, order: number): BusinessKycFieldDef {
  const base: BusinessKycFieldDef = {
    id: `field_${Date.now()}`,
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
  if (type === 'file') {
    base.accept = ['application/pdf', 'image/*'];
    base.maxFiles = 1;
    base.maxFileSizeMb = 10;
  }
  return base;
}

export function validateSchemaStructure(form: BusinessKycFormV1): string[] {
  const errs: string[] = [];
  if (!form.title?.trim()) errs.push('Form title is required');
  if (!form.sections.length) errs.push('At least one section is required');
  if (!form.fields.length) errs.push('At least one field is required');
  const ids = form.fields.map((f) => f.id);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) errs.push('Field ids must be unique');
  for (const f of form.fields) {
    if (f.regex && ['text', 'textarea', 'email', 'phone', 'url'].includes(f.type)) {
      try {
        new RegExp(f.regex);
      } catch {
        errs.push(`Invalid regex on field “${f.id}”`);
      }
    }
    if (f.showIf) {
      if (!idSet.has(f.showIf.fieldId) && f.showIf.fieldId !== '') {
        errs.push(`showIf on “${f.id}” references unknown field “${f.showIf.fieldId}”`);
      }
    }
    if (f.inquiry) {
      for (const p of f.inquiry.payloadFields) {
        if (!idSet.has(p)) errs.push(`Inquiry on “${f.id}” references unknown payload field “${p}”`);
      }
    }
    if (f.section && !form.sections.some((s) => s.id === f.section)) {
      errs.push(`Field “${f.id}” references unknown section`);
    }
  }
  return errs;
}

/** Shallow field diff for publish summary */
export function diffFields(
  prev: BusinessKycFormV1 | null,
  next: BusinessKycFormV1,
): { added: string[]; removed: string[]; changed: string[] } {
  if (!prev) {
    return { added: next.fields.map((f) => f.id), removed: [], changed: [] };
  }
  const pm = new Map(prev.fields.map((f) => [f.id, f] as const));
  const nm = new Map(next.fields.map((f) => [f.id, f] as const));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const id of nm.keys()) {
    if (!pm.has(id)) added.push(id);
  }
  for (const id of pm.keys()) {
    if (!nm.has(id)) removed.push(id);
  }
  for (const id of nm.keys()) {
    const a = pm.get(id);
    const b = nm.get(id);
    if (a && b && JSON.stringify(a) !== JSON.stringify(b)) changed.push(id);
  }
  return { added, removed, changed };
}
