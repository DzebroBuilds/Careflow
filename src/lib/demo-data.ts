// Fake demo data ported from the Wardwell prototype. Every name and initial is invented.
export const HOMES = [
  { key: "A", name: "Alder House", beds: 6 },
  { key: "B", name: "Birch Lane", beds: 5 },
  { key: "C", name: "Cascade Court", beds: 6 },
  { key: "D", name: "Dogwood Place", beds: 6 },
] as const;

// docs: one char per care document in order RIT, ISP, PRMS, Safety Plan, PBSP.
// o = current, d = review due, x = conflict, m = missing. openDiscrepancies = open risk discrepancies.
export const RESIDENTS = [
 {
  "id": "ZB",
  "home": "A",
  "room": "Rm 2",
  "since": 2022,
  "docs": "oodox",
  "openDiscrepancies": 4,
  "flags": [
   "Elopement",
   "Aspiration"
  ],
  "meds": [
   "Lamotrigine 100 mg · BID",
   "Melatonin 3 mg · bedtime",
   "Vitamin D 2000 IU · AM"
  ]
 },
 {
  "id": "DN",
  "home": "A",
  "room": "Rm 1",
  "since": 2021,
  "docs": "ooooo",
  "openDiscrepancies": 0,
  "flags": [
   "Seizure"
  ],
  "meds": [
   "Levetiracetam 500 mg · BID",
   "Sertraline 50 mg · AM"
  ]
 },
 {
  "id": "MK",
  "home": "A",
  "room": "Rm 3",
  "since": 2023,
  "docs": "ooood",
  "openDiscrepancies": 0,
  "flags": [
   "Falls"
  ],
  "meds": [
   "Risperidone 1 mg · bedtime",
   "Metformin 500 mg · BID"
  ]
 },
 {
  "id": "RT",
  "home": "A",
  "room": "Rm 4",
  "since": 2020,
  "docs": "ooooo",
  "openDiscrepancies": 0,
  "flags": [],
  "meds": [
   "Lisinopril 10 mg · AM",
   "Atorvastatin 20 mg · bedtime"
  ]
 },
 {
  "id": "LH",
  "home": "A",
  "room": "Rm 5",
  "since": 2024,
  "docs": "oooxo",
  "openDiscrepancies": 0,
  "flags": [
   "Self-injury"
  ],
  "meds": [
   "Clonidine 0.1 mg · bedtime",
   "Cetirizine 10 mg · AM"
  ]
 },
 {
  "id": "JP",
  "home": "B",
  "room": "Rm 1",
  "since": 2022,
  "docs": "oodmo",
  "openDiscrepancies": 3,
  "flags": [
   "Medication refusal"
  ],
  "meds": [
   "Quetiapine 50 mg · bedtime",
   "Omeprazole 20 mg · AM",
   "Folic acid 1 mg · AM"
  ]
 },
 {
  "id": "AS",
  "home": "B",
  "room": "Rm 2",
  "since": 2019,
  "docs": "ooxoo",
  "openDiscrepancies": 0,
  "flags": [
   "Aspiration"
  ],
  "meds": [
   "Baclofen 10 mg · TID",
   "Famotidine 20 mg · BID"
  ]
 },
 {
  "id": "CW",
  "home": "B",
  "room": "Rm 3",
  "since": 2023,
  "docs": "dooxo",
  "openDiscrepancies": 3,
  "flags": [
   "Elopement",
   "Falls"
  ],
  "meds": [
   "Valproate 250 mg · BID",
   "Lorazepam 0.5 mg · PRN"
  ]
 },
 {
  "id": "EV",
  "home": "B",
  "room": "Rm 4",
  "since": 2021,
  "docs": "oooom",
  "openDiscrepancies": 0,
  "flags": [],
  "meds": [
   "Levothyroxine 75 mcg · AM",
   "Calcium 600 mg · PM"
  ]
 },
 {
  "id": "TG",
  "home": "C",
  "room": "Rm 1",
  "since": 2024,
  "docs": "mdoxx",
  "openDiscrepancies": 6,
  "flags": [
   "Elopement",
   "Self-injury",
   "Seizure"
  ],
  "meds": [
   "Carbamazepine 200 mg · BID",
   "Guanfacine 1 mg · AM",
   "Melatonin 3 mg · bedtime"
  ]
 },
 {
  "id": "NB",
  "home": "C",
  "room": "Rm 2",
  "since": 2020,
  "docs": "oomdo",
  "openDiscrepancies": 0,
  "flags": [
   "Falls"
  ],
  "meds": [
   "Donepezil 5 mg · bedtime",
   "Amlodipine 5 mg · AM"
  ]
 },
 {
  "id": "OL",
  "home": "C",
  "room": "Rm 3",
  "since": 2022,
  "docs": "dddxo",
  "openDiscrepancies": 5,
  "flags": [
   "Aspiration",
   "Medication refusal"
  ],
  "meds": [
   "Olanzapine 10 mg · bedtime",
   "Docusate 100 mg · BID",
   "Vitamin B12 · AM"
  ]
 },
 {
  "id": "SF",
  "home": "C",
  "room": "Rm 4",
  "since": 2023,
  "docs": "oxoom",
  "openDiscrepancies": 3,
  "flags": [
   "Seizure"
  ],
  "meds": [
   "Phenytoin 100 mg · TID",
   "Folic acid 1 mg · AM"
  ]
 },
 {
  "id": "KM",
  "home": "C",
  "room": "Rm 5",
  "since": 2021,
  "docs": "moooo",
  "openDiscrepancies": 0,
  "flags": [],
  "meds": [
   "Sertraline 100 mg · AM",
   "Ibuprofen 400 mg · PRN"
  ]
 },
 {
  "id": "HM",
  "home": "D",
  "room": "Rm 1",
  "since": 2021,
  "docs": "ooooo",
  "openDiscrepancies": 0,
  "flags": [
   "Falls"
  ],
  "meds": [
   "Amlodipine 5 mg · AM",
   "Vitamin D 1000 IU · AM"
  ]
 },
 {
  "id": "CJ",
  "home": "D",
  "room": "Rm 2",
  "since": 2022,
  "docs": "ooood",
  "openDiscrepancies": 0,
  "flags": [
   "Aspiration"
  ],
  "meds": [
   "Baclofen 10 mg · TID",
   "Pantoprazole 40 mg · AM"
  ]
 },
 {
  "id": "AB",
  "home": "D",
  "room": "Rm 3",
  "since": 2023,
  "docs": "ooooo",
  "openDiscrepancies": 0,
  "flags": [
   "Seizure"
  ],
  "meds": [
   "Lamotrigine 150 mg · BID",
   "Melatonin 3 mg · bedtime"
  ]
 },
 {
  "id": "RS",
  "home": "D",
  "room": "Rm 4",
  "since": 2020,
  "docs": "oodoo",
  "openDiscrepancies": 0,
  "flags": [],
  "meds": [
   "Metformin 500 mg · BID",
   "Lisinopril 10 mg · AM",
   "Acetaminophen 500 mg · PRN"
  ]
 },
 {
  "id": "YT",
  "home": "D",
  "room": "Rm 5",
  "since": 2024,
  "docs": "ooooo",
  "openDiscrepancies": 1,
  "flags": [
   "Self-injury"
  ],
  "meds": [
   "Sertraline 50 mg · AM",
   "Hydroxyzine 25 mg · bedtime"
  ]
 }
] as const;

// cpr, background, medAdmin: days until each credential expires (negative = lapsed).
export const STAFF = [
 {
  "name": "Priya Natarajan",
  "role": "House Manager",
  "home": "A",
  "trainingHours": 19,
  "cpr": 212,
  "background": 540,
  "medAdmin": 130
 },
 {
  "name": "Marcus Bell",
  "role": "Direct Support",
  "home": "A",
  "trainingHours": 12,
  "cpr": 9,
  "background": 300,
  "medAdmin": 200
 },
 {
  "name": "Tasha Okoye",
  "role": "Direct Support",
  "home": "A",
  "trainingHours": 22,
  "cpr": 140,
  "background": 410,
  "medAdmin": 96
 },
 {
  "name": "Jordan Wu",
  "role": "Direct Support",
  "home": "A",
  "trainingHours": 24,
  "cpr": 88,
  "background": 620,
  "medAdmin": 175
 },
 {
  "name": "Leon Hartwell",
  "role": "House Manager",
  "home": "B",
  "trainingHours": 17,
  "cpr": 160,
  "background": 380,
  "medAdmin": 150
 },
 {
  "name": "Dana Ruiz",
  "role": "Direct Support",
  "home": "B",
  "trainingHours": 9,
  "cpr": 28,
  "background": 250,
  "medAdmin": -3
 },
 {
  "name": "Rosa Delgado",
  "role": "Direct Support",
  "home": "B",
  "trainingHours": 21,
  "cpr": 110,
  "background": 470,
  "medAdmin": 240
 },
 {
  "name": "Aaliyah Brooks",
  "role": "House Manager",
  "home": "C",
  "trainingHours": 14,
  "cpr": 75,
  "background": -12,
  "medAdmin": 120
 },
 {
  "name": "Tom Reyes",
  "role": "Direct Support",
  "home": "C",
  "trainingHours": 6,
  "cpr": 5,
  "background": 330,
  "medAdmin": 90
 },
 {
  "name": "Chidi Eze",
  "role": "Direct Support",
  "home": "C",
  "trainingHours": 18,
  "cpr": 190,
  "background": 280,
  "medAdmin": 22
 },
 {
  "name": "Wendy Park",
  "role": "Direct Support",
  "home": "C",
  "trainingHours": 20,
  "cpr": 132,
  "background": 510,
  "medAdmin": 300
 },
 {
  "name": "Imani Clarke",
  "role": "House Manager",
  "home": "D",
  "trainingHours": 24,
  "cpr": 260,
  "background": 700,
  "medAdmin": 210
 },
 {
  "name": "Victor Nguyen",
  "role": "Direct Support",
  "home": "D",
  "trainingHours": 21,
  "cpr": 150,
  "background": 430,
  "medAdmin": 180
 },
 {
  "name": "Sofia Marchetti",
  "role": "Direct Support",
  "home": "D",
  "trainingHours": 23,
  "cpr": 97,
  "background": 380,
  "medAdmin": 240
 }
] as const;

export const DISCREPANCY_TEMPLATES = [
 {
  "risk": "Elopement",
  "kind": "miss",
  "docs": [
   "RIT",
   "Safety Plan"
  ],
  "text": "Elopement precautions are listed in the RIT but absent from the Safety Plan.",
  "fix": "Add door-alarm check and line-of-sight steps to the Safety Plan."
 },
 {
  "risk": "Aspiration",
  "kind": "miss",
  "docs": [
   "ISP",
   "PRMS"
  ],
  "text": "Texture-modified diet is in the ISP but not carried into the PRMS.",
  "fix": "Copy the diet texture and positioning protocol into the PRMS."
 },
 {
  "risk": "Falls",
  "kind": "conf",
  "docs": [
   "RIT",
   "ISP"
  ],
  "text": "Fall risk is rated high in the RIT while the ISP lists standard supervision.",
  "fix": "Update ISP supervision level to match the RIT rating."
 },
 {
  "risk": "Seizure",
  "kind": "conf",
  "docs": [
   "PBSP",
   "Safety Plan"
  ],
  "text": "Seizure response steps differ between the PBSP and the Safety Plan.",
  "fix": "Replace Safety Plan steps with the PBSP wording, then re-date both."
 },
 {
  "risk": "Medication refusal",
  "kind": "miss",
  "docs": [
   "ISP",
   "PBSP"
  ],
  "text": "Refusal protocol is written in the ISP but missing from the PBSP.",
  "fix": "Add the two-attempt refusal protocol and notification step to the PBSP."
 },
 {
  "risk": "Self-injury",
  "kind": "miss",
  "docs": [
   "PBSP",
   "RIT"
  ],
  "text": "Self-injury triggers appear in the PBSP but are not flagged in the RIT.",
  "fix": "Add self-injury as an identified risk in the RIT with matching triggers."
 }
] as const;

// Monthly files that are not verified, keyed "home" -> "resident:type" -> status.
export const BAD_MONTHLY = {
 "A": {
  "LH:MAR": "missing"
 },
 "B": {
  "JP:MAR": "missing",
  "CW:ONA": "rejected"
 },
 "C": {
  "TG:MAR": "missing",
  "OL:MAR": "rejected",
  "SF:ONA": "missing",
  "TG:Safety Plan": "missing",
  "OL:Safety Plan": "rejected"
 },
 "D": {
  "CJ:ONA": "missing"
 }
} as const;
