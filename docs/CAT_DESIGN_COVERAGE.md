# Cat Study English Design Coverage

This document maps the sibling `cat_study_english` design set to its Web implementation in TypeWords. The source designs remain the product authority; this file records platform adaptation and test evidence.

## Implemented core loop

| Source design | Web implementation | Evidence |
| --- | --- | --- |
| Cat adoption | A perfect non-empty practice session adopts one cat | `cat-store.test.ts` |
| Cat randomization | Common, rare, and premium tiers unlock by historical cat count; cards expose non-color rarity labels | `cat-store.test.ts`, `cat-card.test.ts` |
| Points economy | Learning points pay for basic/premium food, normal/luxury toys, medicine, and ICU daily care | `cat-store.test.ts`, `cat-detail-dialog.test.ts` |
| Cat state management | Healthy, sick, ICU, runaway, and deceased states; offline decay; medicine; ICU charging | `cat-store.test.ts` |
| Cat interaction | Pet/play feedback, per-cat daily limits, state restrictions, and cross-day reset | `cat-store.test.ts` |
| Runaway recovery | Runaway cats leave the café grid and enter a seven-day remote-care station | `cat-store.test.ts`, `cat-cafe.spec.ts` |
| Community heal | Five consecutive perfect sessions restore eligible cats and preserve ICU/runaway states | `cat-store.test.ts` |
| Cat room UX | Collection-first room, HUD, rarity, new-cat marker, empty state, care station, detail sheet | `cat-cafe.spec.ts` |
| HUD | Cat count, points, care warnings, collection completion, perfect streak, community heals | `cat-hud.test.ts`, `cat-cafe.spec.ts` |
| Parent panel | Password gate plus cat, economy, rarity, medical, runaway, and deceased summaries | `cat-cafe.spec.ts` |
| Accessibility | Native buttons, visible labels, confirmation before spending, 48 px care targets, responsive layouts | UI and system suites |
| Art source | The shared guide avatar is an exact copy of `../cat_study_english/稀有猫的照片/花奴-三花猫.jpg` | `cat-avatar.test.ts` and SHA-256 verification |

## Web adaptations

- SQLite tables are represented by the existing IndexedDB persistence layer.
- Drag and shake gestures are represented by explicit single-tap toy actions for motor accessibility.
- Unity sprite animation is represented by CSS transitions and real cat photography already approved for this Web project.
- The source design contains conflicting prototype and final economy tables. TypeWords preserves its established 20-point food and 50-point toy prices, then prices premium supplies above those anchors.
- The design phrase “feed runaway cats to hunger 100” conflicts with feeding reducing hunger. The Web version interprets the intended behavior as one successful remote feed per consecutive day for seven days.

## Not applicable or deferred

| Design item | Reason |
| --- | --- |
| Unity scene hierarchy, Android insets APIs, TextMeshPro | Platform-specific; Web equivalents are responsive CSS and semantic HTML |
| Custom cat photo upload and artist redraw pipeline | Requires a privacy/product workflow beyond the current local photo registry |
| 3D adoption ceremony and authored audio set | No approved production animation/audio assets in the sibling project |
| Immutable SQLite points ledger | Current application persistence is IndexedDB; a ledger migration is a separate data architecture change |
| Café furniture decoration store and memory garden | Requires approved assets and a broader progression system |

These deferred items are not silently simulated. They should be implemented only when their data model and production assets are approved.
