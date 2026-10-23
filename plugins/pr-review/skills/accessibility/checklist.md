# Accessibility checklist

Target: WCAG 2.2 level AA. Shared by the `accessibility` skill (audits) and the
accessibility angle of the `review` skill (one PR). Each item names its success
criterion so findings can cite it. Framework primitives that already handle a
pattern (Radix, React Aria, Headless UI, native elements) get credit: flag only props
or wrappers that break what they provide.

## Names, roles and structure

- Every interactive element is a real `<button>`, `<a href>`, `<input>`, `<select>` or
  a widget with the full ARIA pattern (role, state, keyboard). `<div onClick>` and
  `<span onClick>` are findings. (4.1.2, 2.1.1)
- Every control has an accessible name that matches its visible label: text content,
  `<label htmlFor>`, `aria-label` for icon-only buttons, `aria-labelledby`. The
  visible label's words appear in the name. (4.1.2, 2.5.3)
- Images: meaningful ones have `alt` that says what matters; decorative ones `alt=""`
  or `aria-hidden`; SVG icons inside labelled buttons are `aria-hidden`. (1.1.1)
- One `<h1>` per page and headings that don't skip levels for styling; landmarks
  (`<main>`, `<nav>`, `<header>`, `<footer>`); a skip link when there is repeated
  navigation. (1.3.1, 2.4.1, 2.4.6)
- Each route sets a distinct `<title>`; `<html lang>` is set. (2.4.2, 3.1.1)
- Lists, tables (`<th scope>`, caption) and form groups (`<fieldset>`/`<legend>`) use
  their real elements when the content is one. (1.3.1)
- No `aria-hidden="true"` on anything focusable or containing focusables; no
  `role="presentation"` on interactive elements; no redundant or wrong ARIA. (4.1.2)

## Keyboard and focus

- Everything that works with a pointer works with a keyboard alone, in a logical
  order; no positive `tabIndex`. Custom widgets follow the WAI-ARIA APG keys (arrows
  in menus, tabs, listboxes; Escape closes). (2.1.1, 2.4.3)
- Focus is always visible: no `outline: none` / `outline-none` without a
  replacement of enough contrast; `:focus-visible` styles exist in both themes.
  (2.4.7, 1.4.11)
- Focus is not hidden behind sticky headers, toasts or overlays. (2.4.11)
- No keyboard traps, except modal dialogs, which trap focus while open, start focus
  inside, close on Escape and return focus to the trigger. (2.1.2)
- After route changes, deletes and async loads, focus goes somewhere sensible (the
  new heading, the next item), not back to `<body>`. (2.4.3)
- Drag-and-drop and other dragging gestures have a single-pointer and a keyboard
  alternative (buttons to move, keyboard sensors). (2.5.7, 2.1.1)
- Pointer targets are at least 24×24 CSS px, or spaced so a 24px circle doesn't
  overlap another target. (2.5.8)

## Forms and errors

- Every input has a persistent visible label (a placeholder is not a label) and the
  right `type` and `autocomplete` for personal data. (3.3.2, 1.3.5)
- Errors are shown in text next to the field, tied to it with `aria-describedby` and
  `aria-invalid`, and announced or focused on submit; not by colour alone. (3.3.1,
  3.3.3, 4.1.3)
- Required fields are marked in text or with `required`, not only with colour or `*`
  without explanation. (3.3.2)
- Sign-in doesn't depend on a cognitive test: paste is allowed in password and code
  fields, and password managers work. (3.3.8)
- Information already entered in a flow isn't asked for again. (3.3.7)

## Visual

- Text contrast at least 4.5:1 (3:1 for 18.66px bold / 24px and up); UI component
  boundaries, focus rings and meaningful icons at least 3:1. Check every theme
  (light and dark) and states (hover, disabled is exempt, placeholder is not).
  (1.4.3, 1.4.11)
- Colour is never the only signal (errors, status, required, links inside text need
  an underline or 3:1 against surrounding text plus a non-colour cue on focus/hover).
  (1.4.1)
- Works at 320 CSS px wide without horizontal scrolling (except content that needs
  two dimensions, like images, maps, tables), and at 200% zoom without loss.
  Text containers don't clip with increased text spacing. (1.4.10, 1.4.4, 1.4.12)
- Content shown on hover or focus (tooltips, popovers) can be dismissed with Escape,
  stays while the pointer is over it, and doesn't vanish on its own. (1.4.13)
- No fixed `user-scalable=no` or `maximum-scale=1` in the viewport meta. (1.4.4)

## Motion, time and media

- `prefers-reduced-motion` turns off or reduces non-essential animation, parallax
  and auto-scrolling; nothing flashes more than three times a second. (2.3.3, 2.3.1)
- Anything that moves, blinks or auto-updates for more than 5 s can be paused.
  (2.2.2)
- Timeouts warn and can be extended, unless essential. (2.2.1)
- Video has captions; audio-only and video-only content has a transcript or
  description. Autoplaying audio can be stopped. (1.2.x, 1.4.2)

## Dynamic content

- Status messages (saved, copied, n results, upload progress, errors from async
  work) are announced through an `aria-live` / `role="status"` region that exists
  before the message is inserted. (4.1.3)
- Loading states are perceivable to screen readers (`aria-busy`, a status message),
  not only a spinner.
- Content order in the DOM matches the visual order (CSS `order`, absolute
  positioning and grid placement can break it). (1.3.2)

## Generated output

- Documents the app produces for users (PDFs, exports, emails) carry a title and
  language, and text stays text where the format allows (e.g. a text layer on PDFs).
  Emails have a plain-text part and real headings.
