# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-30
- Primary product surfaces: post feed, post detail, editor, my posts, authentication
- Evidence reviewed: approved browser mockups and user-provided navy color reference

## Brand
- Personality: calm, confident, friendly, precise
- Trust signals: generous spacing, clear state feedback, restrained motion
- Avoid: gradients, glassmorphism, excessive shadows, decorative clutter

## Product goals
- Goals: make reading and writing feel effortless; keep authentication and reactions understandable
- Non-goals: dashboard density, social-network complexity, WYSIWYG rich-text editing
- Success signals: users can browse, sign in, write, edit, delete, and like without instruction

## Personas and jobs
- Primary personas: casual readers and individual writers
- User jobs: discover posts, read comfortably, publish thoughts, manage personal posts
- Key contexts of use: desktop and mobile web

## Information architecture
- Primary navigation: brand/home, my posts, theme, write, account
- Core routes/screens: feed, detail, editor, my posts
- Content hierarchy: title → summary/content → Markdown heading TOC → author/time → reactions

## Design principles
- Content first: decoration never competes with writing
- Friendly clarity: controls look actionable and states are explicit
- Tradeoffs: raw Markdown with safe live preview over WYSIWYG editor; hash routing over frontend framework

## Visual language
- Color: brand navy `#071047`; dark canvas `#080B16`; cool neutral surfaces
- Typography: system sans-serif stack; tight Korean headline tracking
- Spacing/layout rhythm: 4px base, 24–32px page rhythm, max width 1080px
- Shape/radius/elevation: 14–24px radii, subtle single-layer shadows
- Motion: 160–220ms transitions; disabled under reduced motion
- Imagery/iconography: optional post thumbnails; inline SVG icons only

## Components
- Existing components to reuse: none
- New/changed components: app header, post card, hero, Markdown editor/preview, text-color controls, four-level post TOC, visibility card selector, empty/error/loading states, toast
- Variants and states: light/dark, liked/unliked, signed-in/anonymous, public/private
- Token/component ownership: CSS custom properties in `styles.css`

## Accessibility
- Target standard: WCAG 2.1 AA
- Keyboard/focus behavior: visible focus ring, semantic buttons and links
- Contrast/readability: text and interactive colors meet AA contrast
- Screen-reader semantics: landmarks, headings, labels, live status region
- Reduced motion and sensory considerations: honor `prefers-reduced-motion`

## Responsive behavior
- Supported breakpoints/devices: 360px mobile through desktop
- Layout adaptations: single-column feed, compact header, full-width editor controls, sticky right-side TOC moved above the article on mobile
- Touch/hover differences: 44px touch targets; hover is enhancement only

## Interaction states
- Loading: skeleton cards or concise loading status
- Empty: contextual message and writing action
- Error: readable inline panel plus toast
- Success: brief toast and route transition
- Disabled: reduced contrast and blocked pointer events
- Offline/slow network: fetch errors remain recoverable with retry

## Content voice
- Tone: concise, warm, plain Korean
- Terminology: 내 글, 글쓰기, 공개, 비공개, 좋아요
- Microcopy rules: explain the next action; avoid technical terms

## Implementation constraints
- Framework/styling system: vanilla HTML, CSS, and ES modules served by Spring Boot
- Design-token constraints: CSS variables are the only theme source
- Markdown constraints: store raw Markdown; allow only validated inline hex colors; derive TOC entries from `#` through `####`; never inject user HTML with `innerHTML`
- Performance constraints: no external font or UI dependency
- Compatibility constraints: modern evergreen browsers
- Test/screenshot expectations: Spring static-resource tests plus desktop/mobile browser verification

## Open questions
- None for the approved first release.
