export const site = {
  name: 'Clinton Tano',
  url: 'https://clintontano.com',
  title: 'Clinton Tano | Law & Tech from Accra',
  description:
    'Clinton Tano is a Ghanaian law graduate building at the intersection of law and technology in Accra. Founder and CEO of RoomBerl and Decidendi.',
  location: 'Accra, Ghana',
  email: 'clinton@decidendi.legal',
  booking: 'https://calendly.com/tanoclinton167/30min',
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

export const decidendi = {
  name: 'Decidendi',
  href: 'https://decidendi.legal',
  domain: 'decidendi.legal',
  role: 'Founder and CEO',
  period: 'August 2026 to present',
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

export const roomberl = {
  name: 'RoomBerl',
  href: 'https://roomberl.com',
  domain: 'roomberl.com',
  role: 'Founder and CEO',
  period: 'April 2024 to present',
  tagline: 'Africa’s first AI-powered university roommate matching system.',
  summary: 'Pairs students with compatible roommates by personality, and integrates with university housing offices.',
} as const;

export const practice = [
  {
    id: 'design',
    title: 'Design',
    body: 'UI and UX in Figma: flows, interfaces and prototypes that make a product easy to understand and easy to use.',
  },
  {
    id: 'build',
    title: 'Build',
    body: 'I ship working software using AI-assisted development, taking an idea from first sketch to a released product people can use.',
  },
  {
    id: 'law',
    title: 'Law',
    body: 'Legal training from the University of Ghana School of Law. It shapes how I read, reason and write.',
  },
] as const;
