import type { ResumeData } from '@/lib/types';
import { DEFAULT_DESIGN } from '@/lib/defaults';

/**
 * Rich sample content for creative / multi-section template previews (templates page, dashboard).
 * Placeholder data only — no real PII.
 */
const creativeShowcaseResume: ResumeData = {
  personalInfo: {
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 010-2044',
    location: 'San Francisco, CA',
    linkedIn: 'linkedin.com/in/example',
    website: 'https://example.com',
    summary:
      'Product-minded full-stack engineer focused on scalable web apps, clean UX, and measurable impact. Experienced with modern TypeScript stacks, REST and event-driven APIs, and shipping features in agile teams.',
    yearsOfExperience: 4,
  },
  experience: [
    {
      id: 'exp_1',
      company: 'Northwind Labs',
      position: 'Senior Software Engineer',
      startDate: '2022-03',
      endDate: '',
      current: true,
      description: 'Lead engineer for customer-facing dashboards and internal tooling.',
      achievements: [
        'Reduced p95 API latency by 38% via caching, query tuning, and batch endpoints.',
        'Mentored three engineers; introduced design reviews and incident retrospectives.',
        'Partnered with design on accessibility improvements (WCAG 2.1 AA focus areas).',
      ],
    },
    {
      id: 'exp_2',
      company: 'Acme Digital',
      position: 'Software Engineer',
      startDate: '2019-06',
      endDate: '2022-02',
      current: false,
      description: 'Full-stack development on e-commerce and content platforms.',
      achievements: [
        'Shipped checkout improvements that lifted conversion on key flows.',
        'Built CI pipelines and automated integration tests for critical paths.',
      ],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'State University',
      degree: 'B.S. Computer Science',
      field: 'Computer Science',
      startYear: '2015',
      endYear: '2019',
      gpa: '3.7',
    },
  ],
  skills: [
    { id: 'skill_1', name: 'TypeScript', level: 'advanced' },
    { id: 'skill_2', name: 'React / Next.js', level: 'advanced' },
    { id: 'skill_3', name: 'Node.js', level: 'intermediate' },
    { id: 'skill_4', name: 'PostgreSQL', level: 'intermediate' },
    { id: 'skill_5', name: 'AWS', level: 'intermediate' },
  ],
  certificates: [
    {
      id: 'cert_1',
      name: 'Cloud Developer Associate',
      organization: 'Example Cert Body',
      issueDate: '2024-06',
      expiryDate: '',
    },
  ],
  softSkills: [
    { id: 'soft_1', name: 'Cross-functional collaboration', level: 'advanced' },
    { id: 'soft_2', name: 'Written communication', level: 'advanced' },
  ],
  custom: {
    title: 'Highlights',
    content: '',
  },
  projects: [
    {
      id: 'proj_1',
      title: 'Analytics Platform',
      role: 'Next.js, PostgreSQL, streaming',
      startDate: '2024-01',
      endDate: '',
      description:
        '<ul><li>Real-time metrics pipeline with role-based dashboards.</li><li>Cut report generation time with materialized views and incremental refresh.</li></ul>',
    },
  ],
  jobTitle: 'Full-Stack Engineer',
  jobDescription: '',
  design: {
    ...DEFAULT_DESIGN,
    templateId: 'creative',
    personalDetails: {
      ...DEFAULT_DESIGN.personalDetails,
    },
  },
};

export default creativeShowcaseResume;
