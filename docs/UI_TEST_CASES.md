# UI Test Cases

This document is the executable UI coverage map for TypeWords. Case IDs map to Vitest component tests or Playwright system tests so visual and interaction requirements remain reviewable.

## Viewports

- Desktop: Chromium using the `Desktop Chrome` device profile.
- Mobile: Chromium using the `iPhone 13` device profile.
- Every core route must keep its primary content inside the viewport at both sizes.

## Navigation and accessibility

| ID | Scenario | Expected result | Automated by |
| --- | --- | --- | --- |
| UI-NAV-01 | Open home, words, articles, settings, and cat room directly | Each route renders its primary landmark without page errors | `navigation.spec.ts` |
| UI-NAV-02 | Focus the Word sidebar control and press Enter | The app navigates to the word library | `navigation.spec.ts` |
| UI-NAV-03 | Activate both home practice calls to action | Each action opens the matching practice library | `navigation.spec.ts` |
| UI-A11Y-01 | Render a shared action | It uses native button semantics and exposes disabled/loading state | `base-button.test.ts` |
| UI-A11Y-02 | Render a cat card | The card is keyboard-focusable, has an image alternative, and exposes status text | `cat-card.test.ts` |

## Responsive layout

| ID | Scenario | Expected result | Automated by |
| --- | --- | --- | --- |
| UI-RWD-01 | Open every core route on desktop and mobile | Primary content stays within the viewport and remains at least 240 px wide | `responsive-ui.spec.ts` |
| UI-RWD-02 | Open the home feature list on mobile | Eight cards stack vertically and each card remains readable | `responsive-ui.spec.ts` |
| UI-RWD-03 | Open settings on mobile | Tabs scroll horizontally, content remains readable, and controls remain reachable | `responsive-ui.spec.ts` |
| UI-RWD-04 | Open word and article dashboards on mobile | Summary panels stack rather than clipping horizontally | `responsive-ui.spec.ts` |
| UI-RWD-05 | Open cat room on mobile | Header, points, empty state, and action remain readable without overlap | `responsive-ui.spec.ts` |

## Cat cafe states and interactions

| ID | Scenario | Expected result | Automated by |
| --- | --- | --- | --- |
| UI-CAT-01 | Open an empty cat room | Empty guidance is visible and Start Learning opens the word library | `cat-cafe.spec.ts` |
| UI-CAT-02 | Enter an invalid parent password | The remaining-attempt message is shown | `cat-cafe.spec.ts` |
| UI-CAT-03 | Enter the default parent password | Cat preferences and reset controls become visible | `cat-cafe.spec.ts` |
| UI-CAT-04 | Open the home cat cafe summary | Cat count, points, perfect-game count, and room action are visible | `cat-cafe.spec.ts` |
| UI-CAT-05 | Render healthy, sick, new, runaway, and deceased cat cards | Status text, image treatment, and progress bars match the state | `cat-card.test.ts` |
| UI-CAT-06 | Render the shared cat guide avatar | The exact Huanu avatar asset and accessible name are present | `cat-avatar.test.ts` |
| UI-CAT-07 | Open a populated cat room | HUD, collection progress, rarity, streak, and care counters are visible | `cat-cafe.spec.ts` |
| UI-CAT-08 | Buy a care supply | Points remain unchanged until the explicit confirmation action | `cat-detail-dialog.test.ts`, `cat-cafe.spec.ts` |
| UI-CAT-09 | Open a runaway cat room | The cat is removed from the café grid and appears in the seven-day remote-care station | `cat-cafe.spec.ts` |
| UI-CAT-10 | Open an ICU cat | ICU explanation and medical actions are visible; play actions are disabled | `cat-detail-dialog.test.ts` |

## Business logic supporting the UI

| ID | Scenario | Expected result | Automated by |
| --- | --- | --- | --- |
| UNIT-CAT-01 | Restore persisted cat data | State is loaded once and the ready flag is set | `cat-store.test.ts` |
| UNIT-CAT-02 | Complete a perfect practice session | Exactly one cat is adopted and the perfect count increases | `cat-store.test.ts` |
| UNIT-CAT-03 | Feed, play with, or pet a cat | Points and bounded health, hunger, and affection values update correctly | `cat-store.test.ts` |
| UNIT-CAT-04 | Return after several hours | Offline hunger and health decay are applied | `cat-store.test.ts` |
| UNIT-CAT-05 | Reset cat progress | Cat progress clears while feature preferences remain unchanged | `cat-store.test.ts` |
| UNIT-CAT-06 | Reach daily interaction limits | Further pet/play attempts have no state or point effect | `cat-store.test.ts` |
| UNIT-CAT-07 | Use premium food or medicine | Tier-specific costs and bounded recovery effects apply | `cat-store.test.ts` |
| UNIT-CAT-08 | Leave a cat in ICU across days | Daily rescue points are charged and failed days are tracked | `cat-store.test.ts` |
| UNIT-CAT-09 | Remotely care for a runaway cat for seven days | The cat returns healthy with affection reset to 50 | `cat-store.test.ts` |
| UNIT-CAT-10 | Complete five perfect sessions consecutively | Eligible cats fully recover while ICU/runaway/deceased cats remain unchanged | `cat-store.test.ts` |

## Manual visual review checklist

These details are reviewed with the gstack design screenshots because they are subjective or too brittle for DOM assertions:

- Visual hierarchy has one clear primary action per view.
- Text contrast remains readable in light and dark themes.
- Focus indicators are visible on all keyboard-reachable controls.
- Cat animation does not obscure text or interaction targets.
- Touch targets are at least 44 by 44 px where practical.
- Empty, loading, error, disabled, warning, runaway, sick, and deceased states remain understandable without color alone.
