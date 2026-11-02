export interface TeamSocial {
  linkedin?: string;
  github?: string;
  email?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  shortRole?: string;
  task: string; // dipakai sebagai bio utama di spotlight
  bio?: string; // penjelasan detail untuk poster & spotlight
  photo: string; // path PNG transparan atau placeholder
  hasRealPhoto: boolean;
  initials: string;
  badge: string;
  accentColor: string;
  social: TeamSocial;
}

export const teamMembers: TeamMember[] = [
  {
    id: "galih",
    name: "Mhd. Galih Khairi",
    role: "Frontend Developer & UI/UX Designer",
    task: "Desain web + membuat frontend",
    bio: "Bertanggung jawab atas perancangan antarmuka pengguna (UI), sistem desain, serta implementasi interaktivitas frontend di Central Tracking Dashboard.",
    photo: "/team/galih-transparent.png",
    hasRealPhoto: true,
    initials: "GK",
    badge: "Frontend & UI/UX",
    accentColor: "#38bdf8",
    social: {
      email: "galih.khairi@company.id",
      linkedin: "https://linkedin.com/in/mhd-galih-khairi",
      github: "https://github.com",
    },
  },
  {
    id: "dimas",
    name: "Dimas Yudistira",
    role: "Backend Developer & Software Architect",
    task: "Backend dan struktur sistem",
    bio: "Merancang arsitektur sistem backend, gateway API berlatensi rendah, orkestrasi data operasional, dan keandalan sistem berskala besar.",
    photo: "/team/dimas-transparent.png",
    hasRealPhoto: true,
    initials: "DY",
    badge: "Backend & Architecture",
    accentColor: "#34d399",
    social: {
      email: "dimas.yudistira@company.id",
      linkedin: "https://linkedin.com/in/dimas-yudistira",
      github: "https://github.com",
    },
  },
  {
    id: "pangondion",
    name: "Pangondion Kurniawan Naibaho",
    role: "DevOps Engineer & Database Administrator",
    shortRole: "DevOps Engineer",
    task: "Database, server, VM",
    bio: "Mengelola ketersediaan tinggi cluster database, replikasi data, provisi virtual machine (VM), kestabilan server, dan pipeline deployment CI/CD.",
    photo: "/team/pangondion-transparent.png",
    hasRealPhoto: true,
    initials: "PK",
    badge: "Database & DevOps",
    accentColor: "#818cf8",
    social: {
      email: "pangondion.k@company.id",
      linkedin: "https://linkedin.com/in/pangondion-naibaho",
      github: "https://github.com",
    },
  },
  {
    id: "ihsanul",
    name: "Muhammad Ihsanul Arifin",
    role: "Automation Engineer & Networking Engineer",
    task: "Script otomasi dan infrastruktur jaringan",
    bio: "Membuat script otomasi berbasis Python serta mengelola dan menjaga kestabilan infrastruktur jaringan.",
    photo: "/team/ihsanul-transparent.png",
    hasRealPhoto: true,
    initials: "MI",
    badge: "Automation & Networking",
    accentColor: "#f472b6",
    social: {
      email: "ihsanul.arifin@company.id",
      linkedin: "https://linkedin.com/in/muhammad-ihsanul-arifin",
      github: "https://github.com",
    },
  },
];
