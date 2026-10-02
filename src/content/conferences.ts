import type { Conference } from "./types";

/* ==========================================================================
   Conference presentations, newest first.

   Paper titles are set in sentence case to match the publication list;
   acronyms and proper nouns are preserved as given.

   `featured: true` surfaces an entry on /research. Keep it to two or three
   — currently both award winners and the most recent international paper.
   Everything here appears on /research/conferences.
   ========================================================================== */

export const conferences: Conference[] = [
  {
    year: 2026,
    date: "23 August 2026",
    conference: "Alumni Conclave 2026",
    venue:
      "Vinod Gupta School of Management, Indian Institute of Technology Kharagpur, India",
    track: "Economics, Strategy & Management (ESTM)",
    // Certificate records participation in the ESTM track and names no
    // paper, so none is claimed here.
  },
  {
    year: 2026,
    date: "23-24 March 2026",
    conference: "1st National Conference",
    venue: "Rapti Babai Campus, Dang, Nepal",
    paper:
      "Towards Industry 5.0: a bibliometric analysis of green finance, digital transformation, and ESG research",
  },
  {
    year: 2026,
    date: "20-21 February 2026",
    conference:
      "1st International Conference on the Future of Work: Innovations and Sustainability in Global Management Practices",
    venue: "Birgunj Public College, Birgunj, Nepal",
    paper:
      "Market efficiency under permanent short-sale bans: comparative evidence from Nepal, India, and Pakistan",
    featured: true,
  },
  {
    year: 2026,
    date: "20-21 February 2026",
    conference:
      "1st International Conference on the Future of Work: Innovations and Sustainability in Global Management Practices",
    venue: "Birgunj Public College, Birgunj, Nepal",
    paper:
      "Socio-cultural drivers of women's empowerment in rural Nepal: the mediating role of family support",
  },
  {
    year: 2026,
    date: "20-21 February 2026",
    conference:
      "1st International Conference on the Future of Work: Innovations and Sustainability in Global Management Practices",
    venue: "Birgunj Public College, Birgunj, Nepal",
    paper:
      "An experimental study of learning method in financial concept retention among BBA-FA students of Lumbini Banijya Campus",
  },
  {
    year: 2025,
    date: "6-7 September 2025",
    conference: "RUEC 1st International Research Conference 2025",
    venue: "Rajshahi University Education Club, Rajshahi, Bangladesh",
    paper:
      "Non-linear properties of Nepalese capital market: a multifractal detrended fluctuation (MFDFA) approach",
    award: "Best Oral Presenter",
    featured: true,
  },
  {
    year: 2025,
    date: "20-21 June 2025",
    conference:
      "1st National Conference on Bridging Knowledge & Practice: Management & Social Science for Sustainable Localization",
    venue: "Butwal Kalika Campus, Butwal, Rupandehi, Nepal",
    paper:
      "Role of energy consumption to enhance economic growth: evidence from Nepal",
  },
  {
    year: 2025,
    date: "30 May 2025",
    conference:
      "1st National Conference on Management, IT, Education & Social Science",
    venue: "Mahakavi Devkota Campus, Sunwal, Nawalparasi, Nepal",
    paper:
      "Quantitative trading strategies, back-testing and performance analysis of the NEPSE using Python: a data-driven market exploration",
  },
  {
    year: 2025,
    date: "10-11 May 2025",
    conference: "1st National Conference 2025",
    venue: "Marsyangdi Multiple Campus, Besishahar, Lamjung, Nepal",
    paper:
      "Multifractal properties in the Nepalese stock market through detrended fluctuation analysis (DFA): a comprehensive exploration",
  },
  {
    year: 2025,
    date: "27-28 February 2025",
    conference:
      "1st International Conference on Emerging Research Trends in Education, Humanities, Management and Science",
    venue: "Kailali Multiple Campus, Dhangadhi, Nepal",
    paper:
      "Navigating personal finance: how financial literacy, behavior, and attitude shape financial management among college students of Rupandehi District",
  },
  {
    year: 2024,
    date: "29-30 November 2024",
    conference:
      "4th International Conference on Global Innovations in Management and Social Science",
    venue: "Lumbini Banijya Campus, Butwal, Rupandehi, Nepal",
    paper: "Financial inclusion in Nepal: a case of Rampur, Palpa",
  },
  {
    year: 2024,
    date: "5-6 July 2024",
    conference:
      "International Conference on Sustainable Business and Management 2024",
    venue: "Gupteshwor Mahadev Multiple Campus, Pokhara, Kaski, Nepal",
    paper:
      "Predictive modeling of Nepal Stock Exchange index: an ARIMA approach",
    award: "Best Paper Presenter of Technical Session",
    featured: true,
  },
  {
    year: 2023,
    date: "14-15 December 2023",
    conference: "National Conference on Nepalese Higher Education",
    venue: "Balkumari College, Narayangarh, Chitwan, Nepal",
    paper:
      "People's experience towards corruption in public sectors' service delivery",
  },
  {
    year: 2020,
    date: "4 December 2020",
    conference:
      "One Day International Webinar on Recent Developments in Business Management & Social Sciences",
    venue: "Lumbini Banijya Campus, Butwal, Rupandehi, Nepal",
    paper:
      "The relationship among the inflation, broad money, and economic growth: evidence from Nepal",
  },
  {
    year: 2018,
    date: "16-17 November 2018",
    conference:
      "International Seminar on Redefining Management Education in Nepal",
    venue: "Lumbini Banijya Campus, Butwal, Rupandehi, Nepal",
    paper:
      "Determinants of profitability in commercial bank: empirical evidence from Nepal",
  },
  {
    year: 2018,
    date: "6-9 August 2018",
    conference:
      "11th Triennial Conference of the Association of Asia Pacific Operational Research Societies (APORS) on Operations Research and Development",
    venue: "Operational Research Society of Nepal",
    paper: "Import, export and economic growth of Nepal: empirical analysis",
  },
];

export const featuredConferences = conferences.filter((c) => c.featured);

/** Appearances where a paper was presented, as opposed to attended. */
export const presentations = conferences.filter((c) => c.paper);

/** All conferences grouped by year, newest year first. */
export function conferencesByYear(): { year: number; items: Conference[] }[] {
  const groups = new Map<number, Conference[]>();
  for (const c of conferences) {
    const bucket = groups.get(c.year);
    if (bucket) bucket.push(c);
    else groups.set(c.year, [c]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
}
