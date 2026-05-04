import type { ServiceQuestionnaireV1 } from '../../../../lib/serviceDefinitionTypes.js';

/**
 * Canonical ServiceQuestionnaireV1 for the Residential Interior Painting catalog.
 * Authored for the admin Form Builder workflow (ADR-0011 / ADR-0013); seeded via
 * `lib/paintingResidentialQuestionnaire` re-export so `GET /api/service-catalog/:id/schema` matches.
 *
 * Note: `radio` is not a ServiceFieldType; single-choice lists use `select` (ADR-0012).
 */
export const PAINTING_SERVICE_QUESTIONNAIRE: ServiceQuestionnaireV1 = {
  version: 1,
  title: 'Painting job details',
  description: 'Help providers estimate materials, labor, and scope.',
  sections: [{ id: 'scope', title: 'Scope & surfaces', order: 0 }],
  fields: [
    {
      id: 'room_count',
      label: 'How many rooms?',
      type: 'number',
      required: true,
      order: 1,
      section: 'scope',
      min: 1,
      max: 20,
      integerOnly: true,
    },
    {
      id: 'area_sqft',
      label: 'Approximate area (sq ft)?',
      type: 'number',
      required: true,
      order: 2,
      section: 'scope',
      min: 1,
      integerOnly: true,
    },
    {
      id: 'paint_supplied',
      label: 'Who supplies the paint?',
      type: 'select',
      required: true,
      order: 3,
      section: 'scope',
      options: [
        { value: 'customer', label: 'Customer' },
        { value: 'provider', label: 'Provider' },
        { value: 'either', label: 'Either' },
      ],
    },
    {
      id: 'paint_color_count',
      label: 'How many colors?',
      type: 'number',
      required: false,
      order: 4,
      section: 'scope',
      min: 1,
      max: 5,
      integerOnly: true,
    },
    {
      id: 'surface_condition',
      label: 'Wall condition',
      type: 'select',
      required: true,
      order: 5,
      section: 'scope',
      options: [
        { value: 'new', label: 'New' },
        { value: 'repaint_same', label: 'Repaint (same)' },
        { value: 'repaint_change', label: 'Repaint (change)' },
        { value: 'repair_needed', label: 'Repair needed' },
      ],
    },
    {
      id: 'photos',
      label: 'Upload photos of the area',
      type: 'photo',
      required: false,
      order: 6,
      section: 'scope',
      maxFiles: 5,
      maxFileSizeMb: 10,
      accept: ['image/jpeg', 'image/png', 'image/webp'],
    },
  ],
};
