import type { ProfileLink, ResearchInterest, Stat } from "./types";

export const profile = {
  name: "Sandip Paudel",
  role: "Assistant Professor of Finance",
  affiliations: [
    "Lumbini Banijya Campus, Tribhuvan University",
    "PhD Candidate, DDU Gorakhpur University",
  ],

  /** One-line positioning used in the hero and page metadata. */
  tagline:
    "Academic research in finance and economics, and consulting for organisations that need the same rigour applied to their own data.",

  emails: ["sandip.paudel@lbc.edu.np", "sandippaudel1995@gmail.com"],
  phone: "+977 9857011047",
  phoneHref: "tel:+9779857011047",
  office:
    "Department of Finance, Lumbini Banijya Campus, Butwal, Rupandehi, Nepal",

  photo: "/images/sandip-photo.webp",
} as const;

export const profileLinks: ProfileLink[] = [
  {
    label: "Google Scholar",
    href: "https://scholar.google.com/citations?user=TCUUU7wAAAAJ&hl=en",
  },
  { label: "ORCID", href: "https://orcid.org/0000-0003-4689-7477" },
  { label: "GitHub", href: "https://github.com/SandipPaudel" },
];

/** Long-form bio, rendered as consecutive paragraphs. */
export const bio: string[] = [
  "I am an Assistant Professor in the Department of Finance at Lumbini Banijya Campus, Butwal, where I have taught since 2019. I am concurrently pursuing a PhD at DDU Gorakhpur University. My teaching covers Corporate Finance, Financial Institutions and Markets, Financial Management, Entrepreneurial Finance and Venture Capital, and Research Methodology at both undergraduate and postgraduate levels.",
  "Over the past several years I have supervised more than one hundred final-year projects and theses, and I run workshops on quantitative methods and data analysis for faculty and graduate students across Nepal.",
  "Alongside that academic work I consult for organisations in Nepal on data analysis, business strategy and CRM workflows, bringing the same empirical standards to commercial questions that I apply to published research.",
];

export const researchInterests: ResearchInterest[] = [
  {
    title: "Financial econometrics",
    description: "Panel data, linear and non-linear time-series methods.",
  },
  {
    title: "Market efficiency and long-memory volatility",
    description:
      "MFDFA, GARCH family models, and applications to NEPSE and sector indices.",
  },
  {
    title: "Behavioral finance",
    description:
      "Personal financial behavior, financial literacy, and decision-making among Nepali households and students.",
  },
  {
    title: "Bibliometric analysis",
    description:
      "Mapping the literature on green finance, ESG performance, and Industry 5.0 to identify thematic structures and research gaps.",
  },
];

export const stats: Stat[] = [
  { value: "100+", label: "Students Mentored" },
  { value: "7", label: "Peer-Reviewed Articles" },
  { value: "15", label: "Conference Presentations" },
  { value: "13", label: "Research Trainings" },
];
