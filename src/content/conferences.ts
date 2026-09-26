import type { Conference } from "./types";

/* Selected conference presentations, newest first. */
export const conferences: Conference[] = [
  {
    date: "March 2026",
    paper:
      "Towards Industry 5.0: a bibliometric analysis of green finance, digital transformation, and ESG research",
    venue: "1st National Conference, Rapti Babai Campus, Dang, Nepal",
  },
  {
    date: "February 2026",
    paper:
      "Market efficiency under permanent short-sale bans: comparative evidence from Nepal, India, and Pakistan",
    venue:
      "1st International Conference on the Future of Work, Birgunj Public College",
    featured: true,
  },
  {
    date: "February 2026",
    paper:
      "Socio-cultural drivers of women's empowerment in rural Nepal: the mediating role of family support",
    venue:
      "1st International Conference on the Future of Work, Birgunj Public College",
  },
  {
    date: "February 2026",
    paper:
      "An experimental study of learning method in financial concept retention among BBA-FA students",
    venue:
      "1st International Conference on the Future of Work, Birgunj Public College",
  },
  {
    date: "September 2025",
    paper:
      "Non-linear properties of the Nepalese capital market: an MFDFA approach",
    venue:
      "RUEC 1st International Research Conference, Rajshahi, Bangladesh",
    award: "Best Oral Presenter",
    featured: true,
  },
  {
    date: "June 2025",
    paper:
      "Role of energy consumption in enhancing economic growth: evidence from Nepal",
    venue: "Butwal Kalika Campus, Rupandehi, Nepal",
  },
  {
    date: "May 2025",
    paper:
      "Quantitative trading strategies, backtesting, and performance analysis of NEPSE using Python",
    venue: "Mahakavi Devkota Campus, Sunwal, Nawalparasi, Nepal",
  },
  {
    date: "May 2025",
    paper:
      "Multifractal properties in the Nepalese stock market through DFA: a comprehensive exploration",
    venue: "Marsyangdi Multiple Campus, Lamjung, Nepal",
  },
  {
    date: "February 2025",
    paper:
      "Navigating personal finance: how financial literacy, behavior, and attitude shape financial management among college students",
    venue: "Kailali Multiple Campus, Dhangadhi, Nepal",
  },
  {
    date: "July 2024",
    paper:
      "Predictive modeling of Nepal Stock Exchange index: an ARIMA approach",
    venue:
      "International Conference on Sustainable Business and Management, Pokhara",
    award: "Best Paper Presenter",
    featured: true,
  },
];

/** Year parsed from the trailing token of `date`, e.g. "March 2026" -> 2026. */
export function conferenceYear(c: Conference): number {
  return Number(c.date.trim().split(/\s+/).pop());
}

export const featuredConferences = conferences.filter((c) => c.featured);

/** All conferences, newest year first, for /research/conferences. */
export function conferencesByYear(): { year: number; items: Conference[] }[] {
  const groups = new Map<number, Conference[]>();
  for (const c of conferences) {
    const y = conferenceYear(c);
    const bucket = groups.get(y);
    if (bucket) bucket.push(c);
    else groups.set(y, [c]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
}
