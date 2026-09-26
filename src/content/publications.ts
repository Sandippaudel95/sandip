import type { Publication } from "./types";

/* Peer-reviewed journal articles, newest first. */
export const publications: Publication[] = [
  {
    // Previously tagged 2025 on the old site while cited as (2026); the DOI
    // and the citation both say 2026, so 2026 is correct.
    year: 2026,
    status: "published",
    citation:
      "Paudel, S. (2026). Non-linear properties of Nepalese capital market: A multifractal detrended fluctuation analysis approach.",
    outlet: "Social Sciences & Humanities Open, 14.",
    quartile: "Q1",
    // The old link carried a trailing period, which 404s at doi.org.
    doi: "https://doi.org/10.1016/j.ssaho.2026.103174",
  },
  {
    year: 2025,
    status: "published",
    citation:
      "Paudel, S., and Bhandari, O. P. (2025). Lived experiences of corruption in public service delivery: a phenomenological study in Butwal, Nepal.",
    outlet: "Journal of Interdisciplinary Studies, 14(1), 111-132.",
    doi: "https://doi.org/10.3126/jis.v14i1.88420",
  },
  {
    year: 2025,
    status: "published",
    citation:
      "Poudel, P., and Paudel, S. (2025). Quantitative trading strategy, backtesting, and performance analysis using Python: a data-driven analysis.",
    outlet: "Quest Journal of Management and Social Sciences, 7(2), 219-238.",
    doi: "https://doi.org/10.3126/qjmss.v7i2.87782",
  },
  {
    year: 2025,
    status: "published",
    citation:
      "Panday, S., and Paudel, S. (2025). Role of energy consumption on economic growth: evidence from Nepal.",
    outlet: "The Lumbini Journal of Business and Economics, 13(2), 167-181.",
    doi: "https://doi.org/10.3126/ljbe.v13i2.82930",
  },
  {
    year: 2025,
    status: "published",
    citation:
      "Paudel, S. (2025). From knowledge to action: students' personal financial management in Rupandehi District of Nepal.",
    outlet: "KMC Journal, 7(2), 310-330.",
    doi: "https://doi.org/10.3126/kmcj.v7i2.83454",
  },
  {
    year: 2024,
    status: "published",
    citation:
      "Paudel, S. (2024). Predicting NEPSE index: an ARIMA-based model.",
    outlet: "The Lumbini Journal of Business and Economics, 12(1), 16-29.",
    doi: "https://doi.org/10.3126/ljbe.v12i1.70318",
  },
  {
    year: 2021,
    status: "published",
    citation:
      "Tandan, L., and Paudel, S. (2021). The relationship among the inflation, broad money, and economic growth: evidence from Nepal.",
    outlet: "The Lumbini Journal of Business and Economics, 9(1-2), 68-73.",
    doi: "https://doi.org/10.3126/ljbe.v9i1-2.45989",
  },
];

/* Working papers and manuscripts under review. */
export const workingPapers: Publication[] = [
  {
    status: "under-review",
    statusLabel: "Under review",
    citation:
      "Paudel, S., and Sapkota, P. (2026). Evolution of market efficiency in Nepal: sectoral insights through skewed multifractal detrended fluctuation analysis.",
    outlet: "Submitted to Cogent Economics and Finance.",
  },
  {
    status: "revising",
    statusLabel: "Revising after presentation",
    citation:
      "Paudel, S., Agrahari, R., and Sapkota, P. (2026). Socio-cultural drivers of women's empowerment in rural Nepal: the mediating roles of family support and mobility.",
  },
  {
    status: "revising",
    statusLabel: "Revising after presentation",
    citation:
      "Paudel, S., and Paudel, S. (2026). The impact of teaching method on long-term knowledge retention: a quasi-experimental study of financial concept retention among management students.",
  },
  {
    status: "in-progress",
    statusLabel: "In progress",
    citation:
      "Paudel, S., Sapkota, P., Gautam, A., Jnawali, G., and Bhandari, O. P. (2026). Effects of meal planning, portion control, food preservation, and leftover management on household food waste prevention: the moderating role of food types.",
  },
  {
    status: "in-progress",
    statusLabel: "In progress",
    citation:
      "Paudel, S., Neupane, P., and Sapkota, P. (2026). Long-memory and asymmetric volatility in a frontier equity market: GARCH-family evidence from NEPSE and sector indices.",
  },
  {
    status: "in-progress",
    statusLabel: "Presented; manuscript in preparation",
    citation:
      "Paudel, S. (2026). Towards Industry 5.0: a bibliometric analysis of research linking green finance, digital transformation, and ESG.",
    // Stated deliberately: this is a mapping of the literature, not a set of
    // empirical claims about Industry 5.0 outcomes.
    note: "Bibliometric mapping of indexed publications; findings describe publication trends, co-authorship, and keyword co-occurrence in the existing literature rather than empirical claims about Industry 5.0 outcomes.",
  },
];

/* Commissioned, non-academic research. */
export const consultancyReports: Publication[] = [
  {
    status: "published",
    year: 2025,
    citation:
      "Sapkota, P., Paudel, S., and Pun, D. B. (2025). Effectiveness analysis of Butwal Industrial Trade Fair, 2081.",
    outlet:
      "Commissioned report for the Butwal Chamber of Commerce and Industry, Rupandehi.",
  },
];
