export const WORKER_CATEGORIES = [
  {
    value: "household",
    label: "Household Services",
    skills: ["Maid", "Cook", "Nanny", "Babysitter", "Driver", "Elder Caregiver", "Patient Attendant"],
  },
  {
    value: "home-repair",
    label: "Home Repair",
    skills: ["Electrician", "Plumber", "Carpenter", "AC Technician", "RO Technician", "Painter"],
  },
  {
    value: "automotive",
    label: "Automotive",
    skills: ["Mechanic", "EV Technician", "Car Wash Professional", "Driver"],
  },
  {
    value: "construction",
    label: "Construction",
    skills: ["Mason", "Labourer", "Welder", "Fabricator", "Site Supervisor"],
  },
  {
    value: "healthcare",
    label: "Healthcare",
    skills: ["Nurse", "Physiotherapist", "Caregiver"],
  },
];

export const ALL_SKILLS = WORKER_CATEGORIES.flatMap((c) => c.skills);

export const categoryLabel = (value) =>
  WORKER_CATEGORIES.find((c) => c.value === value)?.label || value || "";

export const skillsForCategory = (value) =>
  WORKER_CATEGORIES.find((c) => c.value === value)?.skills || [];
