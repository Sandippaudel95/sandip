import type { ServicePackage } from "./types";

/* ==========================================================================
   Research consultation, consultancy and training

   SCOPE (confirmed by Sandip): this is academic research work, not business
   or enterprise consulting. He advises students and faculty, takes on
   commissioned research, and delivers research training to faculties.

   PRICING (confirmed by Sandip):
     - General consultation: Rs. 5,000 per hour.
     - Everything else is scoped and quoted by negotiation.

   Editing this array changes /consulting and the landing page teaser; no
   markup changes are needed.
   ========================================================================== */

export const HOURLY_RATE_NPR = "Rs. 5,000";

export const services: ServicePackage[] = [
  {
    id: "general-consultation",
    name: "General Consultation",
    summary:
      "An hour of focused, one-to-one advice on the research problem you are stuck on.",
    audience:
      "Bachelor, Master, MPhil and PhD students, and faculty colleagues wanting a second opinion before committing to an approach.",
    includes: [
      "One-to-one session, online or in person",
      "Advice on research design, method choice or analysis strategy",
      "Feedback on the draft, data or output you bring",
      "A clear view of what to do next",
    ],
    format: "Booked by the hour",
    price: `${HOURLY_RATE_NPR} per hour`,
    featured: true,
  },
  {
    id: "thesis-review",
    name: "Thesis Review",
    summary:
      "A full read of your thesis with written feedback on argument, method and analysis before you submit.",
    audience:
      "Master, MPhil and PhD candidates approaching submission, or responding to examiner comments.",
    includes: [
      "Structured written feedback across the full manuscript",
      "Review of methodology and whether the analysis supports the claims",
      "Comments on structure, argument and clarity",
      "Follow-up session to work through the feedback",
    ],
    format: "Scoped to length and stage",
    price: "By negotiation",
    priceNote: "Quoted after seeing the manuscript",
  },
  {
    id: "paper-review",
    name: "Paper Review",
    summary:
      "Pre-submission review of a journal article, or help responding to reviewers after a revise-and-resubmit.",
    audience:
      "Researchers and faculty preparing a manuscript for submission, or revising after peer review.",
    includes: [
      "Critical read against the target journal's expectations",
      "Review of methods, results and interpretation",
      "Help drafting a response-to-reviewers letter",
      "Advice on journal fit where useful",
    ],
    format: "Scoped to manuscript and journal",
    price: "By negotiation",
    priceNote: "Quoted after seeing the manuscript",
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    summary:
      "Getting from collected data to results you can defend in a viva or to a referee.",
    audience:
      "Research students and faculty who have data in hand and need the analysis done properly, or checked.",
    includes: [
      "Data cleaning, coding and validation",
      "Choosing methods that actually suit the data and the question",
      "Estimation and diagnostics in R or Python, or the package your department uses",
      "Interpretation of output, with assumptions and limitations stated",
      "Help writing up the results and methods sections",
    ],
    format: "Scoped to the dataset and methods",
    price: "By negotiation",
  },
  {
    id: "research-consultancy",
    name: "Research Consultancy",
    summary:
      "Commissioned studies for campuses, institutions and associations that need independent evidence.",
    audience:
      "Colleges, institutions, chambers and organisations commissioning a study or an evaluation.",
    includes: [
      "Study design, sampling strategy and instrument development",
      "Fieldwork planning and oversight",
      "Analysis and interpretation",
      "A written report for your board, funder or membership",
    ],
    format: "Scoped per study",
    price: "By negotiation",
    priceNote: "Recent example: Butwal Industrial Trade Fair effectiveness study",
  },
  {
    id: "research-training",
    name: "Research Training and Workshops",
    summary:
      "Hands-on sessions for faculty and graduate students on research methods, data analysis and publishing.",
    audience:
      "Campuses and departments running faculty development programmes, often UGC supported.",
    includes: [
      "Quantitative methods and research design",
      "Data analysis workshops, worked on participants' own data",
      "AI tools in research and publication, and research ethics",
      "Sessions sized to a half day, a full day or a multi-day cohort",
    ],
    format: "Scoped to cohort size and duration",
    price: "By negotiation",
  },
];
