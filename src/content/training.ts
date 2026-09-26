import type { Training } from "./types";

/* ==========================================================================
   Training, credentials and workshops, newest first.

   `role` separates sessions Sandip delivered (Session Expert, Trainer,
   Editor-in-Chief) from those he attended (Trainee), which the old flat
   list ran together.
   ========================================================================== */

export const training: Training[] = [
  {
    year: 2026,
    date: "6 June 2026",
    title: "ICT Integration in Research",
    organizer:
      "Yerawati Aadarsha Multiple Campus, Dang (UGC supported)",
    role: "Session Expert",
  },
  {
    year: 2026,
    date: "19 April 2026",
    title: "AI Integration in Research and Publications",
    organizer: "Janapriya Multiple Campus (UGC supported)",
    role: "Session Expert",
    detail: "Faculty Professional Development, Second Cohort.",
  },
  {
    year: 2026,
    date: "April 2026",
    title: "Digital and Blended Learning",
    organizer: "Lumbini Banijya Campus (UGC supported)",
    role: "Session Expert",
  },
  {
    year: 2026,
    date: "30-31 January 2026",
    title:
      "Integrating AI in Research Methodology: Tools, Techniques, and Practices",
    organizer:
      "Research Management Cell, Lumbini Banijya Campus, with support of the University Grants Commission",
    role: "Trainee",
  },
  {
    year: 2026,
    date: "10-11 January 2026",
    title:
      "Master Training of Trainers (MTOT), Faculty Professional Development Programme",
    organizer: "University Grants Commission (UGC), Nepal",
    role: "Certified Master Trainer",
    detail:
      "Modules covered teaching excellence, curriculum design, student-centered pedagogies, assessment and feedback, inclusive teaching, digital and blended learning, research supervision, the Scholarship of Teaching and Learning (SOTL), and institutional quality assurance.",
    credential: true,
    badge: "UGC certified",
  },
  {
    year: 2025,
    date: "June-December 2025",
    title: "Research Ethics and Plagiarism (2 credits, score 80%)",
    organizer:
      "SWAYAM, Indira Gandhi National Open University, New Delhi, India",
    role: "Trainee",
  },
  {
    year: 2025,
    date: "22 June 2025",
    title:
      "Integration of AI Tools for Curriculum Development, Faculty Professional Development Training (First Cohort)",
    organizer:
      "Lumbini Banijya Campus, with support of the University Grants Commission",
    role: "Session Expert",
  },
  {
    year: 2025,
    date: "2 February 2025",
    title: "Workshop on Research Writing",
    organizer: "Research Management Cell, Lumbini Banijya Campus",
    role: "Trainee",
  },
  {
    year: 2024,
    date: "29-30 November 2024",
    title: "4th International Conference Proceeding Committee",
    organizer: "Lumbini Banijya Campus, Butwal, Rupandehi",
    role: "Editor-in-Chief",
  },
  {
    year: 2024,
    date: "23-25 May 2024",
    title: "Advanced Data Analysis & Case Development",
    organizer: "Research Management Cell, Lumbini Banijya Campus",
    role: "Trainee",
  },
  {
    year: 2023,
    date: "13 October 2023",
    title: "Orientation on Stock Market",
    organizer: "Parroha Multiple Campus, Sainamaina, Rupandehi",
    role: "Trainer",
  },
  {
    year: 2023,
    date: "1-7 July 2023",
    title:
      "Statistical Data Analysis and Interpretation Using SmartPLS and Bibliometrics",
    organizer:
      "Department of Research and Development, Lumbini Banijya Campus",
    role: "Trainee",
  },
  {
    year: 2023,
    date: "22 June 2023",
    title: "Research Methodology & Data Analysis",
    organizer:
      "Department of Research and Development, Lumbini Banijya Campus",
    role: "Trainee",
  },
  {
    year: 2022,
    date: "30 April 2022",
    title: "Mixed Methods of Business Research and Model Building",
    organizer:
      "Department of Research and Development, Lumbini Banijya Campus",
    role: "Trainee",
  },
];

/** Sessions Sandip delivered, as opposed to attended. */
export const trainingDelivered = training.filter(
  (t) => t.role !== "Trainee",
);
