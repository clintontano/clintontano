export const site = {
  name: 'Clinton Tano',
  url: 'https://clintontano.vercel.app',
  title: 'Clinton Tano | Law, design and AI from Accra',
  description:
    'Clinton Tano is a law graduate, designer and builder in Accra, Ghana. Founder of Decidendi, where practising legal experts test how well AI models reason about law.',
  location: 'Accra, Ghana',
  email: 'clinton@decidendi.legal',
} as const;

export const socials = [
  { label: 'X', handle: '@clinton_tano', href: 'https://x.com/clinton_tano' },
  { label: 'LinkedIn', handle: 'clinton-tano', href: 'https://linkedin.com/in/clinton-tano-916805290/' },
  { label: 'GitHub', handle: 'clintontano', href: 'https://github.com/clintontano' },
] as const;

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Practice', href: '#practice' },
  { label: 'Contact', href: '#contact' },
] as const;

export const marquee = [
  'Law graduate',
  'UI/UX designer',
  'Founder of Decidendi',
  'Builds apps with AI',
  'Accra, Ghana',
  'University of Ghana School of Law, 2026',
] as const;

export const decidendi = {
  name: 'Decidendi',
  href: 'https://decidendi.legal',
  domain: 'decidendi.legal',
  role: 'Founder',
  headline: 'Legal reasoning is where models quietly fail.',
  summary:
    'Decidendi tests how well AI models handle legal reasoning. Practising legal experts across Ghana, Nigeria, Kenya and the wider Commonwealth do the judging, so AI labs and annotation primes get expert coverage for African and Commonwealth jurisdictions.',
  work: [
    { title: 'Grade', body: 'Model answers, marked against rubrics.' },
    { title: 'Rank', body: 'Competing answers, ordered by expert preference.' },
    { title: 'Red-team', body: 'Probing for invented authority and misapplied tests.' },
    { title: 'Write', body: 'Reference answers to hold models against.' },
  ],
  jurisdictions: ['Ghana', 'Nigeria', 'Kenya', 'Commonwealth'],
} as const;

export const earlier = [
  {
    id: 'roomberl',
    name: 'RoomBerl',
    href: 'https://roomberl.com',
    domain: 'roomberl.com',
    kicker: 'Roommate matching',
    tagline: 'Africa’s first AI-powered university roommate matching system.',
    summary:
      'Pairs students with compatible roommates by personality, and integrates with university housing offices.',
  },
  {
    id: 'lorryfare',
    name: 'Lorryfare',
    href: 'https://lorryfare.com',
    domain: 'lorryfare.com',
    kicker: 'Transit, Accra',
    tagline: 'Know when the next trotro is arriving.',
    summary: 'Real-time tracking for shuttles and trotros. Launching in Accra, with the waitlist open now.',
  },
] as const;

export const practice = [
  {
    id: 'design',
    title: 'Design',
    body: 'UI and UX in Figma: flows, interfaces and prototypes that make a product easy to understand and easy to use.',
  },
  {
    id: 'build',
    title: 'Build',
    body: 'I build apps with AI, taking an idea from a rough sketch to something people can open and use.',
  },
  {
    id: 'law',
    title: 'Law',
    body: 'Legal training from the University of Ghana School of Law. It shapes how I read, reason and write.',
  },
] as const;
