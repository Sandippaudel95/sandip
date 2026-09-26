import type { ServicePackage } from "./types";

/* ==========================================================================
   Consulting packages

   PLACEHOLDER CONTENT. The three packages below are built around the areas
   Sandip named (data analysis, CRM workflows, business strategy) and are
   written to be edited rather than kept as-is. Changing this array changes
   the /consulting page and the teaser on the landing page; no markup edits
   are needed. Add or remove packages freely.
   ========================================================================== */

export const services: ServicePackage[] = [
  {
    id: "data-analysis",
    name: "Data Analysis and Econometrics",
    summary:
      "Turning a dataset you already hold into findings you can defend to a board, a regulator or a referee.",
    audience:
      "Firms, NGOs and public bodies sitting on operational or survey data, and research teams needing methodological support.",
    includes: [
      "Scoping session to define the question and the evidence that answers it",
      "Data cleaning, validation and documentation of the working dataset",
      "Modelling: panel and time-series methods, forecasting, significance testing",
      "Written report with interpretation, caveats and limitations stated plainly",
      "Reproducible scripts in R or Python, handed over with the report",
    ],
    format: "Typically 2-6 weeks, depending on data condition",
    featured: true,
  },
  {
    id: "crm-workflows",
    name: "CRM and Operational Workflows",
    summary:
      "Designing the customer and data workflows that let a growing organisation stop working from spreadsheets.",
    audience:
      "SMEs and institutions scaling past manual record-keeping, or replacing a CRM that nobody uses.",
    includes: [
      "Audit of current workflows, data capture points and where records break down",
      "Process mapping and a target-state design your team can actually follow",
      "Platform selection advice, vendor-neutral and matched to your budget",
      "Data migration planning, including deduplication and field mapping",
      "Staff walkthrough and written operating documentation",
    ],
    format: "Typically 3-8 weeks, phased around your operations",
  },
  {
    id: "business-strategy",
    name: "Business and Economic Strategy",
    summary:
      "Independent economic analysis behind a decision that is expensive to get wrong.",
    audience:
      "Leadership teams weighing an investment, a market entry, a pricing change or a funding case.",
    includes: [
      "Market and sector analysis grounded in published and primary data",
      "Financial modelling: scenarios, sensitivities and break-even analysis",
      "Feasibility assessment and commissioned research reports",
      "Board-ready presentation of findings and trade-offs",
      "Follow-up session once the decision is on the table",
    ],
    format: "Typically 4-8 weeks, or ongoing retainer",
  },
];
