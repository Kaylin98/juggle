import { BriefObjectives, CreativeGuidelines, DeliverableType, JobCategory } from '../../core/models';

/** The brief's wording (section 3.1), shared by the form, the job page and the drawer. */

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  Campaign: 'Campaign',
  ProductLaunch: 'Product launch',
  Promotion: 'Promotion',
  RetailAndInStore: 'Retail and in-store',
  DigitalAndSocial: 'Digital and social',
  Event: 'Event',
  Corporate: 'Corporate',
  Other: 'Other',
};

export const DELIVERABLE_LABELS: Record<DeliverableType, string> = {
  SocialMedia: 'Social media',
  WebsiteBanner: 'Website banners',
  Email: 'Email',
  DigitalAdvertising: 'Digital advertising',
  Print: 'Print',
  InStore: 'In-store',
  ProductArtwork: 'Product artwork',
  KeyVisual: 'Key visual',
  Presentation: 'Presentation',
  Packaging: 'Packaging',
  Other: 'Other',
};

export interface BriefField<T> {
  key: keyof T;
  label: string;
  /** The longest the API takes. */
  max: number;
}

/** B. Brief objectives, in the template's order. */
export const OBJECTIVE_FIELDS: BriefField<BriefObjectives>[] = [
  { key: 'purpose', label: 'Purpose of the artwork', max: 2000 },
  { key: 'objective', label: 'Campaign or communication objective', max: 1000 },
  { key: 'targetAudience', label: 'Target audience', max: 1000 },
  { key: 'keyMessage', label: 'Key message', max: 1000 },
  { key: 'channels', label: 'Platforms or channels', max: 1000 },
  { key: 'expectedOutcome', label: 'Expected outcome', max: 1000 },
];

/** D. Creative guidelines, in the template's order. */
export const GUIDELINE_FIELDS: BriefField<CreativeGuidelines>[] = [
  { key: 'creativeDirection', label: 'Creative direction', max: 1000 },
  { key: 'brandRequirements', label: 'Brand identity and CI requirements', max: 1000 },
  { key: 'coloursAndTypography', label: 'Colours and typography', max: 1000 },
  { key: 'designReferences', label: 'Design references', max: 1000 },
  { key: 'mandatoryMessaging', label: 'Mandatory messaging', max: 1000 },
  { key: 'requiredLogos', label: 'Required logos', max: 1000 },
  { key: 'productImagery', label: 'Product imagery', max: 1000 },
  { key: 'legalDisclaimers', label: 'Legal disclaimers', max: 1000 },
  { key: 'creativeInstructions', label: 'Other creative instructions', max: 1000 },
];
