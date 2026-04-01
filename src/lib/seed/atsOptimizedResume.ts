import type { ResumeData } from '@/lib/types';
import { DEFAULT_DESIGN } from '@/lib/defaults';

/** Stable IDs only — random/time-based IDs break SSR/client hydration (e.g. data-id on resume blocks). */
const atsOptimizedResume: ResumeData = {
  personalInfo: {
    fullName: 'Pushparaj E',
    email: 'pushparajraje52141@gmail.com',
    phone: '+91 7603881811',
    location: 'Chennai, India',
    linkedIn: '',
    website: '',
    summary:
      'Results-oriented Fullstack Developer with 1 year of experience building scalable web applications using the MERN stack (Node.js, Express, React). Skilled in API design, performance optimization, and delivering production-ready features. Seeking to contribute to product-driven engineering teams.',
    yearsOfExperience: 1
  },
  experience: [
    {
      id: 'exp_ats_urbancode',
      company: 'Urbancode',
      position: 'Fullstack Developer',
      startDate: '2024-06',
      endDate: '2025-06',
      current: false,
      description:
        'Led fullstack development and delivery of multiple web applications; designed and implemented the Zen Lead Management System (CRM) with React, Node.js, and PostgreSQL.',
      achievements: [
        'Built and deployed 5+ production web apps using MERN; improved application performance by ~25% and reduced development time by ~20%.',
        'Optimized backend queries and reduced latency by up to ~40% for targeted endpoints.',
        'Integrated Twilio for communications and implemented monitoring/deployment workflows.'
      ]
    },
    {
      id: 'exp_ats_lssc',
      company: 'Leather Sector Skill Council (LSSC)',
      position: 'Backend Developer (Intern)',
      startDate: '2023-01',
      endDate: '2024-12',
      current: false,
      description:
        'Contributed to Scale LMS (v1.0) backend architecture, developed REST APIs, and implemented Firebase authentication.',
      achievements: [
        'Developed REST APIs and improved system reliability, contributing to broader internal adoption.',
        'Worked in Agile teams to design, test, and deploy features.'
      ]
    }
  ],
  education: [
    {
      id: 'edu_ats_kec',
      institution: 'Kings Engineering College',
      degree: 'B.E., Computer Science & Engineering',
      field: 'Computer Science',
      startYear: '2021',
      endYear: '2025',
      gpa: '8.5'
    }
  ],
  skills: [
    { id: 'skill_ats_javascript', name: 'JavaScript', level: 'advanced' },
    { id: 'skill_ats_typescript', name: 'TypeScript', level: 'intermediate' },
    { id: 'skill_ats_node', name: 'Node.js', level: 'advanced' },
    { id: 'skill_ats_react', name: 'React', level: 'advanced' },
    { id: 'skill_ats_express', name: 'Express', level: 'advanced' },
    { id: 'skill_ats_postgres', name: 'PostgreSQL', level: 'intermediate' },
    { id: 'skill_ats_mongo', name: 'MongoDB', level: 'intermediate' },
    { id: 'skill_ats_firebase', name: 'Firebase', level: 'intermediate' },
    { id: 'skill_ats_rest', name: 'REST API', level: 'advanced' },
    { id: 'skill_ats_git', name: 'Git', level: 'advanced' },
    { id: 'skill_ats_redux', name: 'Redux Toolkit', level: 'intermediate' },
    { id: 'skill_ats_premiere', name: 'Adobe Premiere Pro', level: 'intermediate' }
  ],
  jobTitle: 'Fullstack Developer',
  jobDescription: '',
  jobTarget: { position: 'Fullstack Developer', company: '', description: '' },
  design: DEFAULT_DESIGN
};

export default atsOptimizedResume;
