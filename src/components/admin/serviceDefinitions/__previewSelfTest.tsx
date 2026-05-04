/**
 * Dev-only visual checklist: not wired into the app. To verify all preview widgets, temporarily
 * import `ServiceDefinitionsPreviewSelfTest` in a local route and render it.
 */
import { useState } from 'react';
import type { ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes';
import { emptyForm, defaultFieldForType, deepCloneForm } from './schemaHelpers';
import { PreviewAsCustomer } from './PreviewAsCustomer';

const ALL_TYPES: ServiceQuestionnaireV1['fields'][number]['type'][] = [
  'text',
  'textarea',
  'number',
  'select',
  'multiselect',
  'boolean',
  'date',
  'time',
  'datetime',
  'address',
  'photo',
  'measurement_dimensions',
  'measurement_weight',
  'measurement_color',
];

function buildAllFieldsSchema(): ServiceQuestionnaireV1 {
  const base = emptyForm();
  const sectionId = base.sections[0]?.id ?? 'sec_1';
  const fields: ServiceQuestionnaireV1['fields'] = [];
  ALL_TYPES.forEach((type, order) => {
    const f = defaultFieldForType(type, sectionId, order);
    f.id = `f_${type}`;
    f.label = `Sample ${type}`;
    if (type === 'text') {
      f.maxLength = 50;
    }
    fields.push(f);
  });
  return deepCloneForm({ ...base, title: 'All widget types (self-test)', fields });
}

export function ServiceDefinitionsPreviewSelfTest() {
  const [schema] = useState(() => buildAllFieldsSchema());
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  return (
    <div className="p-4">
      <p className="mb-2 text-xs text-neutral-500">__previewSelfTest — not used in production</p>
      <PreviewAsCustomer
        schema={schema}
        values={values}
        files={files}
        errors={{}}
        onChange={(id, v) => setValues((p) => ({ ...p, [id]: v }))}
        onFilesChange={(id, list) => setFiles((p) => ({ ...p, [id]: list }))}
      />
    </div>
  );
}
