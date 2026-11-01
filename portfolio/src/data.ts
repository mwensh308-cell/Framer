export const profile = {
  name: 'Wensh',
  fullName: 'Mostafa Nasser',
  email: 'mwensh308@gmail.com',
  location: 'Giza, Egypt (Cairo)',
  website: 'https://wwwensh.online',
};

export const services = [
  {
    name: 'Automation & Vision',
    description:
      'Computer vision, PLC control, pneumatic actuators and conveyor systems, combined into automated inspection and production lines.',
  },
  {
    name: 'Media Buying',
    description:
      'Planning and optimizing ad campaigns: budgets, audience behavior and ROI. I have run campaigns for more than five local brands.',
  },
  {
    name: 'Web & AI Development',
    description:
      'Python scripting, HTML5 Canvas animation, AI-assisted builds, and domain and DNS setup to take a project from idea to live.',
  },
  {
    name: 'E-Commerce',
    description:
      'Running online stores end to end, from catalog and logistics to social media, as I do with El Alameya Store and WenshPro.',
  },
  {
    name: 'Hardware & Security',
    description:
      'PlayStation and DualSense repair, SSD upgrades, hardware support, and cybersecurity fundamentals backed by a Cisco certificate.',
  },
];

const img = (file: string) =>
  `https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2F${file}.png&w=1280&q=85`;

export type Project = {
  name: string;
  category: string;
  href: string;
  col1: [string, string];
  col2: string;
};

export const projects: Project[] = [
  {
    name: 'Automated Quality Inspection',
    category: 'Graduation Project',
    href: `mailto:${profile.email}?subject=Quality%20Inspection%20Project`,
    col1: [
      img('hf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db'),
      img('hf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8'),
    ],
    col2: img('hf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327'),
  },
  {
    name: 'WenshPro Platform',
    category: 'Founder',
    href: profile.website,
    col1: [
      img('hf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f'),
      img('hf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1'),
    ],
    col2: img('hf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea'),
  },
  {
    name: 'El Alameya Store',
    category: 'E-Commerce',
    href: `mailto:${profile.email}?subject=El%20Alameya%20Store`,
    col1: [
      img('hf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f'),
      img('hf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b'),
    ],
    col2: img('hf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee'),
  },
];

const gif = (slug: string) => `https://motionsites.ai/assets/${slug}.gif`;

export const marqueeImages = [
  'hero-space-voyage-preview-eECLH3Yc',
  'hero-codenest-preview-Cgppc2qV',
  'hero-vex-ventures-preview-BczMFIiw',
  'hero-stellar-ai-v2-preview-DjvxjG3C',
  'hero-asme-preview-B_nGDnTP',
  'hero-transform-data-preview-Cx5OU29N',
  'hero-vitara-preview-Cjz2QYyU',
  'hero-terra-preview-BFjrCr7T',
  'hero-skyelite-preview-DHaZIgUv',
  'hero-aethera-preview-DknSlcTa',
  'hero-designpro-preview-D8c5_een',
  'hero-stellar-ai-preview-D3HL6bw1',
  'hero-xportfolio-preview-D4A8maiC',
  'hero-orbit-web3-preview-BXt4OttD',
  'hero-nexora-preview-cx5HmUgo',
  'hero-evr-ventures-preview-DZxeVFEX',
  'hero-planet-orbit-preview-DWAP8Z1P',
  'hero-new-era-preview-CocuDUm9',
  'hero-wealth-preview-B70idl_u',
  'hero-luminex-preview-CxOP7ce6',
  'hero-celestia-preview-0yO3jXO8',
].map(gif);
