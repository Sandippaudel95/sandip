/* ==========================================================================
   Content types

   All site copy lives in src/content as typed data rather than in markup,
   so adding a paper or a service is a one-line change to an array.
   ========================================================================== */

export type PublicationStatus =
  | "published"
  | "under-review"
  | "revising"
  | "in-progress";

export interface Publication {
  /** Full citation, authors through page range. */
  citation: string;
  status: PublicationStatus;
  /** Year of publication; omitted for unpublished work. */
  year?: number;
  /** Journal or outlet, rendered in the serif accent. */
  outlet?: string;
  doi?: string;
  /** Shown instead of a DOI for work not yet published. */
  statusLabel?: string;
  /** Scope or method caveats we want stated plainly alongside the title. */
  note?: string;
}

export interface Conference {
  date: string;
  paper: string;
  venue: string;
  /** Present only where an award was given. */
  award?: string;
}

export interface Training {
  date: string;
  title: string;
  detail: string;
}

export interface EducationEntry {
  period: string;
  degree: string;
  institution: string;
  detail?: string;
}

export interface ResearchInterest {
  title: string;
  description: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface ServicePackage {
  /** Stable key, also used as the anchor id. */
  id: string;
  name: string;
  summary: string;
  /** Who the package is designed for. */
  audience: string;
  /** Concrete deliverables. */
  includes: string[];
  /** Typical engagement shape, e.g. "2-4 weeks". */
  format: string;
  /**
   * Headline fee. A fixed hourly rate for general sessions; specialised
   * work is scoped and quoted, so it reads "By negotiation".
   */
  price: string;
  /** Optional qualifier shown under the price. */
  priceNote?: string;
  /** Marks the package highlighted on the pricing grid. */
  featured?: boolean;
}

export interface ProfileLink {
  label: string;
  href: string;
}
