'use strict';
// Launch catalog. Prices are in major units here and converted to minor units by the seeder.
// Specs use shared labels per category so comparison pages can line them up side by side.

const categories = [
  {
    slug: 'consoles',
    comparable: true,
    name: 'Consoles',
    headline: 'PlayStation Consoles',
    intro:
      'Every current PlayStation console we sell is brand new, sealed and covered by our local warranty. ' +
      'Choose the PS5 Pro if you play on a 4K TV and want the sharpest image and highest frame rates, ' +
      'the PS5 Slim if you want the full PS5 library for less, or a PS4 if you are building a budget setup for a second room.',
    tips: [
      { q: 'Disc or Digital Edition?', a: 'Digital Edition is cheaper but only runs games bought from PlayStation Store. If you buy used games or collect discs, take the Disc Edition — or add the PS5 Disc Drive later.' },
      { q: 'Does the PS5 Pro include a disc drive?', a: 'No. The PS5 Pro ships without a drive; add the PS5 Disc Drive if you play physical games.' },
      { q: 'Do PS4 games run on PS5?', a: 'The vast majority of PS4 games are playable on PS5 and PS5 Pro, often with faster loading.' },
    ],
  },
  {
    slug: 'controllers',
    comparable: true,
    name: 'Controllers',
    headline: 'DualSense & DualShock Controllers',
    intro:
      'A second controller is the single most useful upgrade for any console. The DualSense adds haptic feedback and adaptive triggers on PS5; ' +
      'the DualSense Edge adds back buttons and swappable stick modules for competitive players; the DualShock 4 remains the controller for PS4.',
    tips: [
      { q: 'Does a DualShock 4 work on PS5?', a: 'Yes, but only for PS4 games running on PS5. PS5 games require a DualSense or DualSense Edge.' },
      { q: 'Why choose the DualSense Edge?', a: 'Remappable back buttons, adjustable trigger stops and replaceable stick modules — built for shooters and competitive play.' },
    ],
  },
  {
    slug: 'audio',
    comparable: true,
    name: 'Audio',
    headline: 'PlayStation Headsets & Earbuds',
    intro:
      'PS5 Tempest 3D AudioTech lets you hear footsteps above, below and behind you. The Pulse range is tuned for it: ' +
      'Pulse Elite and Pulse Explore use planar magnetic drivers and lossless PlayStation Link, while Pulse 3D is the best-value wireless option.',
    tips: [
      { q: 'What is PlayStation Link?', a: 'A low-latency, lossless wireless connection used by Pulse Elite and Pulse Explore. The USB adapter is included.' },
      { q: 'Will Pulse headsets work on PS4?', a: 'Pulse 3D works on PS4 via its USB adapter. Pulse Elite and Pulse Explore are designed for PS5 and PlayStation Portal.' },
    ],
  },
  {
    slug: 'vr-and-remote-play',
    name: 'VR & Remote Play',
    headline: 'PS VR2 & PlayStation Portal',
    intro:
      'Take PS5 beyond the TV. PlayStation VR2 puts you inside the game with 4K HDR OLED displays and eye tracking, ' +
      'while PlayStation Portal streams your PS5 over Wi-Fi to an 8-inch handheld screen so you can keep playing while someone else uses the TV.',
    tips: [
      { q: 'Does PlayStation Portal work without a PS5?', a: 'No. Portal streams games from your own PS5 via Remote Play over Wi-Fi.' },
      { q: 'Is PS VR2 compatible with PS5 Pro?', a: 'Yes — PS VR2 works with PS5, PS5 Slim and PS5 Pro.' },
    ],
  },
  {
    slug: 'charging-and-storage',
    name: 'Charging & Upgrades',
    headline: 'Charging, Stands & Console Upgrades',
    intro:
      'Small upgrades that make a setup feel finished: charge two controllers without tying up the console, add a disc drive to a Digital or Pro console, ' +
      'or stand your PS5 vertically. Everything here is official PlayStation hardware.',
    tips: [
      { q: 'Which consoles fit the PS5 Disc Drive?', a: 'PS5 Slim Digital Edition and PS5 Pro. It does not fit the original launch PS5.' },
    ],
  },
  {
    slug: 'style-and-extras',
    name: 'Style & Extras',
    headline: 'Covers, Cameras & Remotes',
    intro:
      'Make your console yours with swappable covers, stream your face-cam with the HD Camera, or control films and apps with the Media Remote.',
    tips: [
      { q: 'Do PS5 Slim covers fit the original PS5?', a: 'No — covers are model-specific. The covers we stock are for PS5 Slim.' },
    ],
  },
];

const products = [
  // ── Consoles ──────────────────────────────────────────────────────────────
  {
    slug: 'ps5-pro', name: 'PlayStation 5 Pro', category: 'consoles', kind: 'console', art: 'ps5pro', featured: 1, year: 2024,
    platforms: ['ps5'],
    tagline: 'The most powerful PlayStation ever made.',
    description:
      'PS5 Pro pairs an upgraded GPU with advanced ray tracing and PlayStation Spectral Super Resolution (PSSR) to deliver sharper 4K images at higher frame rates. ' +
      'It ships with a 2TB SSD, Wi-Fi 7 and the DualSense controller. Disc drive sold separately.',
    highlights: ['Upgraded GPU with advanced ray tracing', 'AI-driven PSSR upscaling', '2TB SSD built in', 'Wi-Fi 7', '8K output support'],
    specs: { Storage: '2TB SSD', 'Disc drive': 'Optional (sold separately)', 'Max resolution': '8K output', 'Ray tracing': 'Advanced', Wireless: 'Wi-Fi 7', 'Controller included': 'DualSense', 'VR support': 'PS VR2' },
    variants: [
      { sku: 'PS5PRO-2TB', name: '2TB — Digital (add Disc Drive)', edition: 'Pro', storage: '2TB', color: 'White', hex: 'f2f4f8', price: 42999, compare: 44999, stock: 12 },
    ],
  },
  {
    slug: 'ps5-slim', name: 'PlayStation 5 Slim', category: 'consoles', kind: 'console', art: 'ps5', featured: 1, year: 2023,
    platforms: ['ps5'],
    tagline: 'Full PS5 power in a slimmer design.',
    description:
      'The PS5 Slim is 30% smaller than the launch model with a larger 1TB SSD. Lightning-fast loading, haptic feedback, adaptive triggers and Tempest 3D Audio — ' +
      'available as a Disc Edition or a Digital Edition that can be upgraded with the PS5 Disc Drive at any time.',
    highlights: ['1TB SSD', 'Up to 120fps with 120Hz output', 'Ray tracing', 'Tempest 3D AudioTech', 'Disc or Digital Edition'],
    specs: { Storage: '1TB SSD', 'Disc drive': 'Disc Edition: built in / Digital: optional', 'Max resolution': '4K (8K output)', 'Ray tracing': 'Yes', Wireless: 'Wi-Fi 6', 'Controller included': 'DualSense', 'VR support': 'PS VR2' },
    variants: [
      { sku: 'PS5S-DISC-1TB', name: 'Disc Edition — 1TB', edition: 'Disc', storage: '1TB', color: 'White', hex: 'f2f4f8', price: 29999, compare: 31999, stock: 25 },
      { sku: 'PS5S-DIG-1TB', name: 'Digital Edition — 1TB', edition: 'Digital', storage: '1TB', color: 'White', hex: 'e8ecf3', price: 25999, stock: 18 },
    ],
  },
  {
    slug: 'ps4-slim', name: 'PlayStation 4 Slim', category: 'consoles', kind: 'console', art: 'ps4', year: 2016,
    platforms: ['ps4'],
    tagline: 'The legendary library, at the best price.',
    description:
      'A compact, quiet PS4 with access to one of the greatest game libraries ever made. Ideal as a second console for a bedroom or for younger players.',
    highlights: ['Huge PS4 game library', 'Quiet, compact design', 'HDR support', 'DualShock 4 included'],
    specs: { Storage: '500GB / 1TB HDD', 'Disc drive': 'Built in', 'Max resolution': '1080p', 'Ray tracing': 'No', Wireless: 'Wi-Fi 5', 'Controller included': 'DualShock 4', 'VR support': 'No (PS VR2 is PS5 only)' },
    variants: [
      { sku: 'PS4S-500', name: '500GB — Jet Black', storage: '500GB', color: 'Jet Black', hex: '1b1d24', price: 11999, stock: 8 },
      { sku: 'PS4S-1TB', name: '1TB — Jet Black', storage: '1TB', color: 'Jet Black', hex: '1b1d24', price: 13499, stock: 6 },
    ],
  },
  {
    slug: 'ps4-pro', name: 'PlayStation 4 Pro', category: 'consoles', kind: 'console', art: 'ps4pro', year: 2016,
    platforms: ['ps4'],
    tagline: '4K-ready PS4 gaming.',
    description:
      'The most capable PS4, with a boosted GPU for 4K checkerboard rendering and higher, steadier frame rates in enhanced games.',
    highlights: ['4K output with enhanced games', 'Boost mode', '1TB HDD', 'DualShock 4 included'],
    specs: { Storage: '1TB HDD', 'Disc drive': 'Built in', 'Max resolution': '4K (checkerboard)', 'Ray tracing': 'No', Wireless: 'Wi-Fi 5', 'Controller included': 'DualShock 4', 'VR support': 'No (PS VR2 is PS5 only)' },
    variants: [
      { sku: 'PS4P-1TB', name: '1TB — Jet Black', storage: '1TB', color: 'Jet Black', hex: '1b1d24', price: 16999, stock: 4 },
    ],
  },

  // ── Controllers ───────────────────────────────────────────────────────────
  {
    slug: 'dualsense-wireless-controller', name: 'DualSense Wireless Controller', category: 'controllers', kind: 'accessory', art: 'dualsense', featured: 1, year: 2020,
    platforms: ['ps5'],
    tagline: 'Feel every moment.',
    description:
      'Haptic feedback, adaptive triggers, a built-in microphone and an iconic design. The DualSense is the controller every PS5 game is built around — pick your colour.',
    highlights: ['Haptic feedback', 'Adaptive triggers', 'Built-in mic & headset jack', 'USB-C charging'],
    specs: { Connection: 'Bluetooth / USB-C', 'Haptic feedback': 'Yes', 'Adaptive triggers': 'Yes', 'Back buttons': 'No', 'Swappable sticks': 'No', 'Built-in mic': 'Yes', 'Works with': 'PS5 (PC via Bluetooth)' },
    variants: [
      { sku: 'DS-WHITE', name: 'White', color: 'White', hex: 'f2f4f8', price: 3999, stock: 40 },
      { sku: 'DS-BLACK', name: 'Midnight Black', color: 'Midnight Black', hex: '22252e', price: 3999, stock: 30 },
      { sku: 'DS-RED', name: 'Cosmic Red', color: 'Cosmic Red', hex: 'c8203a', price: 4199, stock: 22 },
      { sku: 'DS-PINK', name: 'Nova Pink', color: 'Nova Pink', hex: 'f39bc4', price: 4199, stock: 14 },
      { sku: 'DS-BLUE', name: 'Starlight Blue', color: 'Starlight Blue', hex: '6fa8ff', price: 4199, stock: 16 },
      { sku: 'DS-CAMO', name: 'Grey Camouflage', color: 'Grey Camouflage', hex: '8d929c', price: 4299, stock: 9 },
    ],
  },
  {
    slug: 'dualsense-edge', name: 'DualSense Edge Wireless Controller', category: 'controllers', kind: 'accessory', art: 'edge', featured: 1, year: 2023,
    platforms: ['ps5'],
    tagline: 'Built for high performance play.',
    description:
      'The pro controller for PS5: two remappable back buttons, adjustable trigger stops, replaceable stick modules and on-the-fly control profiles — with a braided cable and carrying case.',
    highlights: ['Remappable back buttons', 'Replaceable stick modules', 'Adjustable trigger stops', 'Carrying case included'],
    specs: { Connection: 'Bluetooth / USB-C', 'Haptic feedback': 'Yes', 'Adaptive triggers': 'Yes', 'Back buttons': '2 (remappable)', 'Swappable sticks': 'Yes', 'Built-in mic': 'Yes', 'Works with': 'PS5 (PC via Bluetooth)' },
    variants: [
      { sku: 'DSE-WHITE', name: 'White', color: 'White', hex: 'f2f4f8', price: 10999, compare: 11999, stock: 10 },
      { sku: 'DSE-BLACK', name: 'Midnight Black', color: 'Midnight Black', hex: '22252e', price: 11499, stock: 5 },
    ],
  },
  {
    slug: 'dualshock-4', name: 'DualShock 4 Wireless Controller', category: 'controllers', kind: 'accessory', art: 'dualshock', year: 2016,
    platforms: ['ps4', 'ps5'],
    platformNotes: { ps5: 'PS4 games only' },
    tagline: 'The PS4 classic.',
    description: 'The precision controller for PS4, with touch pad, light bar, built-in speaker and 3.5mm headset jack. Also works on PS5 when playing PS4 games.',
    highlights: ['Touch pad & light bar', 'Built-in speaker', '3.5mm headset jack', 'Share button'],
    specs: { Connection: 'Bluetooth / Micro-USB', 'Haptic feedback': 'Rumble', 'Adaptive triggers': 'No', 'Back buttons': 'No', 'Swappable sticks': 'No', 'Built-in mic': 'No', 'Works with': 'PS4 (PS5 for PS4 games)' },
    variants: [
      { sku: 'DS4-BLACK', name: 'Jet Black', color: 'Jet Black', hex: '1b1d24', price: 2499, stock: 20 },
      { sku: 'DS4-WHITE', name: 'Glacier White', color: 'Glacier White', hex: 'eef0f4', price: 2499, stock: 10 },
      { sku: 'DS4-RED', name: 'Magma Red', color: 'Magma Red', hex: 'b3192f', price: 2599, stock: 7 },
    ],
  },

  // ── Audio ─────────────────────────────────────────────────────────────────
  {
    slug: 'pulse-elite', name: 'PULSE Elite Wireless Headset', category: 'audio', kind: 'accessory', art: 'headset', featured: 1, year: 2024,
    platforms: ['ps5'],
    tagline: 'Hear it all, lossless.',
    description:
      'Planar magnetic drivers tuned for Tempest 3D AudioTech, lossless low-latency PlayStation Link, a retractable AI-enhanced noise-rejecting mic and up to 30 hours of battery.',
    highlights: ['Planar magnetic drivers', 'PlayStation Link lossless audio', 'Retractable noise-rejecting mic', 'Up to 30h battery'],
    specs: { Drivers: 'Planar magnetic', Connection: 'PlayStation Link / Bluetooth', Battery: 'Up to 30 hours', Microphone: 'Retractable, AI noise rejection', 'Form factor': 'Over-ear headset', 'Works with': 'PS5, PS Portal, PC, mobile' },
    variants: [
      { sku: 'PULSE-ELITE', name: 'White', color: 'White', hex: 'f2f4f8', price: 6999, stock: 15 },
    ],
  },
  {
    slug: 'pulse-explore', name: 'PULSE Explore Wireless Earbuds', category: 'audio', kind: 'accessory', art: 'earbuds', year: 2024,
    platforms: ['ps5'],
    tagline: 'Lossless audio, anywhere.',
    description:
      'True wireless earbuds with planar magnetic drivers, PlayStation Link and hidden noise-rejecting mics. The charging case extends play time on the go.',
    highlights: ['Planar magnetic drivers', 'PlayStation Link & Bluetooth', 'Noise-rejecting mics', 'Charging case'],
    specs: { Drivers: 'Planar magnetic', Connection: 'PlayStation Link / Bluetooth', Battery: 'Up to 5h (+10h with case)', Microphone: 'Hidden, AI noise rejection', 'Form factor': 'In-ear earbuds', 'Works with': 'PS5, PS Portal, PC, mobile' },
    variants: [
      { sku: 'PULSE-EXPLORE', name: 'White', color: 'White', hex: 'f2f4f8', price: 8999, stock: 7 },
    ],
  },
  {
    slug: 'pulse-3d', name: 'PULSE 3D Wireless Headset', category: 'audio', kind: 'accessory', art: 'headset', year: 2020,
    platforms: ['ps5', 'ps4'],
    tagline: '3D audio, made for PS5.',
    description: 'Dual noise-cancelling mics, 3D audio tuning and a comfortable design at a great price. Works wirelessly on PS5 and PS4 via the included USB adapter.',
    highlights: ['Tuned for 3D audio', 'Dual noise-cancelling mics', 'Up to 12h battery', 'Works on PS5 & PS4'],
    specs: { Drivers: 'Dynamic 40mm', Connection: 'USB wireless adapter / 3.5mm', Battery: 'Up to 12 hours', Microphone: 'Dual hidden noise-cancelling', 'Form factor': 'Over-ear headset', 'Works with': 'PS5, PS4, PC' },
    variants: [
      { sku: 'PULSE3D-WHITE', name: 'White', color: 'White', hex: 'f2f4f8', price: 4499, stock: 18 },
      { sku: 'PULSE3D-BLACK', name: 'Midnight Black', color: 'Midnight Black', hex: '22252e', price: 4499, stock: 12 },
    ],
  },

  // ── VR & Remote Play ──────────────────────────────────────────────────────
  {
    slug: 'playstation-vr2', name: 'PlayStation VR2', category: 'vr-and-remote-play', kind: 'accessory', art: 'vr', featured: 1, year: 2023,
    platforms: ['ps5'],
    tagline: 'Feel the world beyond.',
    description:
      'Next-generation VR for PS5 with 4K HDR OLED displays (2000×2040 per eye), a 110° field of view, eye tracking, headset haptics and PS VR2 Sense controllers.',
    highlights: ['4K HDR OLED displays', 'Eye tracking', '110° field of view', 'Sense controllers included'],
    specs: { Display: 'OLED, 2000×2040 per eye', 'Refresh rate': '90Hz / 120Hz', Connection: 'Single USB-C to PS5', 'Works with': 'PS5, PS5 Slim, PS5 Pro', 'In the box': 'Headset + 2 Sense controllers' },
    variants: [
      { sku: 'PSVR2', name: 'Standard', color: 'White', hex: 'f2f4f8', price: 24999, compare: 27999, stock: 6 },
    ],
  },
  {
    slug: 'playstation-portal', name: 'PlayStation Portal Remote Player', category: 'vr-and-remote-play', kind: 'accessory', art: 'portal', featured: 1, year: 2023,
    platforms: ['ps5'],
    tagline: 'Your PS5, on an 8-inch screen.',
    description:
      'Stream games from your PS5 over Wi-Fi to an 8-inch 1080p LCD at up to 60fps, with the full DualSense feature set — haptics and adaptive triggers — built in.',
    highlights: ['8" 1080p LCD, up to 60fps', 'DualSense haptics & adaptive triggers', 'Remote Play over Wi-Fi', 'PlayStation Link audio'],
    specs: { Display: '8" LCD, 1080p', 'Refresh rate': 'Up to 60fps', Connection: 'Wi-Fi (Remote Play)', 'Works with': 'PS5 (requires your console)', 'In the box': 'Portal + USB cable' },
    variants: [
      { sku: 'PORTAL-WHITE', name: 'White', color: 'White', hex: 'f2f4f8', price: 12999, stock: 11 },
      { sku: 'PORTAL-BLACK', name: 'Midnight Black', color: 'Midnight Black', hex: '22252e', price: 13499, stock: 4 },
    ],
  },

  // ── Charging & Upgrades ───────────────────────────────────────────────────
  {
    slug: 'dualsense-charging-station', name: 'DualSense Charging Station', category: 'charging-and-storage', kind: 'accessory', art: 'charger', year: 2020,
    platforms: ['ps5'],
    tagline: 'Two controllers, always ready.',
    description: 'Charge two DualSense controllers at once without your console — just click them in. Charges as fast as the PS5 itself.',
    highlights: ['Charges two DualSense controllers', 'Click-in design', 'No console needed'],
    specs: { Compatible: 'DualSense (not Edge)', Capacity: '2 controllers', Power: 'AC adapter included', 'Works with': 'PS5 controllers' },
    variants: [{ sku: 'DS-CHARGE', name: 'White', color: 'White', hex: 'f2f4f8', price: 1799, stock: 26 }],
  },
  {
    slug: 'ps5-disc-drive', name: 'Disc Drive for PS5 Consoles', category: 'charging-and-storage', kind: 'accessory', art: 'discdrive', year: 2023,
    platforms: ['ps5'],
    platformNotes: { ps5: 'PS5 Slim Digital & PS5 Pro' },
    tagline: 'Play discs on Digital & Pro.',
    description: 'Attach to a PS5 Slim Digital Edition or PS5 Pro to play Ultra HD Blu-ray, Blu-ray and DVD discs, plus physical PS5 and PS4 games. One-time online pairing required.',
    highlights: ['Ultra HD Blu-ray playback', 'Plays PS5 & PS4 discs', 'Tool-free attachment'],
    specs: { Compatible: 'PS5 Slim Digital, PS5 Pro', Capacity: 'Ultra HD Blu-ray', Power: 'From console', 'Works with': 'PS5 Slim Digital, PS5 Pro' },
    variants: [{ sku: 'PS5-DISCDRIVE', name: 'Standard', color: 'White', hex: 'f2f4f8', price: 4999, stock: 14 }],
  },
  {
    slug: 'ps5-vertical-stand', name: 'PS5 Vertical Stand', category: 'charging-and-storage', kind: 'accessory', art: 'stand', year: 2023,
    platforms: ['ps5'],
    tagline: 'Stand tall.',
    description: 'The official vertical stand for PS5 Slim and PS5 Pro. A metal base that locks your console upright securely.',
    highlights: ['Metal construction', 'Fits PS5 Slim & PS5 Pro', 'Secure lock-in mount'],
    specs: { Compatible: 'PS5 Slim, PS5 Pro', Capacity: '1 console', Power: 'None', 'Works with': 'PS5 Slim, PS5 Pro' },
    variants: [{ sku: 'PS5-STAND', name: 'Silver', color: 'Silver', hex: 'c9ced6', price: 1499, stock: 30 }],
  },

  // ── Style & extras ───────────────────────────────────────────────────────
  {
    slug: 'ps5-slim-console-covers', name: 'PS5 Slim Console Covers', category: 'style-and-extras', kind: 'accessory', art: 'covers', year: 2024,
    platforms: ['ps5'],
    platformNotes: { ps5: 'PS5 Slim only' },
    tagline: 'Make it yours.',
    description: 'Swap the top covers of your PS5 Slim in seconds. Matching colours are available across DualSense controllers.',
    highlights: ['Tool-free swap', 'Matches DualSense colours', 'Fits Disc & Digital Edition'],
    specs: { Compatible: 'PS5 Slim (Disc & Digital)', Finish: 'Metallic / matte', 'Works with': 'PS5 Slim' },
    variants: [
      { sku: 'COVER-RED', name: 'Volcanic Red', color: 'Volcanic Red', hex: 'b01e32', price: 2499, stock: 9 },
      { sku: 'COVER-BLUE', name: 'Cobalt Blue', color: 'Cobalt Blue', hex: '2b56d9', price: 2499, stock: 8 },
      { sku: 'COVER-BLACK', name: 'Midnight Black', color: 'Midnight Black', hex: '22252e', price: 2499, stock: 12 },
    ],
  },
  {
    slug: 'hd-camera', name: 'HD Camera for PS5', category: 'style-and-extras', kind: 'accessory', art: 'camera', year: 2020,
    platforms: ['ps5'],
    tagline: 'Put yourself in the stream.',
    description: 'Dual 1080p lenses with background removal so you can add yourself to broadcasts and share-play sessions.',
    highlights: ['Dual 1080p lenses', 'Background removal', 'Built-in stand'],
    specs: { Resolution: '1080p', Lenses: 'Dual wide-angle', 'Works with': 'PS5' },
    variants: [{ sku: 'HD-CAM', name: 'Standard', color: 'Black', hex: '22252e', price: 2999, stock: 10 }],
  },
  {
    slug: 'media-remote', name: 'PS5 Media Remote', category: 'style-and-extras', kind: 'accessory', art: 'remote', year: 2020,
    platforms: ['ps5'],
    tagline: 'Movie night, simplified.',
    description: 'Navigate films, series and streaming apps with dedicated playback and app buttons. Controls compatible TV power and volume too.',
    highlights: ['Dedicated app buttons', 'TV power & volume control', 'Voice-command button'],
    specs: { Connection: 'Bluetooth + IR', Power: '2× AA (included)', 'Works with': 'PS5' },
    variants: [{ sku: 'MEDIA-REMOTE', name: 'Standard', color: 'White', hex: 'f2f4f8', price: 1299, stock: 20 }],
  },
];

// Bundles reference variant SKUs.
const bundles = [
  {
    slug: 'ps5-slim-starter-pack', name: 'PS5 Slim Starter Pack', discount: 10,
    description: 'Everything for couch co-op from day one: PS5 Slim Disc Edition, a second DualSense and the Charging Station.',
    items: [['PS5S-DISC-1TB', 1], ['DS-BLACK', 1], ['DS-CHARGE', 1]],
  },
  {
    slug: 'pro-competitive-setup', name: 'Pro Competitive Setup', discount: 8,
    description: 'Maximum performance: PS5 Pro, DualSense Edge and PULSE Elite for low-latency, lossless audio.',
    items: [['PS5PRO-2TB', 1], ['DSE-BLACK', 1], ['PULSE-ELITE', 1]],
  },
  {
    slug: 'pro-disc-upgrade-kit', name: 'PS5 Pro + Disc Drive Kit', discount: 5,
    description: 'The PS5 Pro with the Disc Drive and Vertical Stand — play your physical collection in style.',
    items: [['PS5PRO-2TB', 1], ['PS5-DISCDRIVE', 1], ['PS5-STAND', 1]],
  },
  {
    slug: 'ps4-classic-pack', name: 'PS4 Classic Pack', discount: 7,
    description: 'A PS4 Slim 1TB with a second DualShock 4 — the perfect budget two-player setup.',
    items: [['PS4S-1TB', 1], ['DS4-RED', 1]],
  },
];

const reviews = [
  ['ps5-pro', 'Karim A.', 5, 'Night and day on my 4K TV', 'Coming from a launch PS5, the image is noticeably sharper and 60fps modes finally look great. Delivered in two days, sealed.'],
  ['ps5-pro', 'Youssef M.', 4, 'Beast — remember the disc drive', 'Amazing performance. I added the disc drive from the bundle page and saved money.'],
  ['ps5-slim', 'Nour H.', 5, 'Perfect first PS5', 'Quiet, compact and the store helped me pick Disc vs Digital on WhatsApp. Great service.'],
  ['dualsense-wireless-controller', 'Omar S.', 5, 'Cosmic Red looks unreal', 'Haptics are incredible. Colour is even better in person.'],
  ['dualsense-edge', 'Hassan T.', 5, 'Back buttons changed my game', 'Mapped jump and crouch to the back paddles — huge difference in shooters.'],
  ['pulse-elite', 'Mariam K.', 5, 'Best headset I have owned', 'Footsteps are pinpoint accurate and the battery lasts all week.'],
  ['playstation-portal', 'Ali R.', 4, 'Great for when the TV is busy', 'Works flawlessly on home Wi-Fi. Screen is bright and sharp.'],
  ['playstation-vr2', 'Salma F.', 5, 'Mind-blowing', 'The OLED screens and eye tracking are next level.'],
];

const coupons = [
  { code: 'WELCOME10', percent: 10, min: 1000 },
  { code: 'EL3ALAMY5', percent: 5, min: 0 },
];

module.exports = { categories, products, bundles, reviews, coupons };
