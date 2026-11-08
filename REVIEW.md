# Refactoring Review

This review covers the current TypeScript application and its UnoCSS/CSS styling. It recommends structural changes only; it does not change application behaviour or the existing specifications.

## Code

### 1. Split the Explorer into feature renderers — high priority

`src/ui/navigation.ts` is currently responsible for editing state, routing, WSDL upload, command creation, and rendering every Explorer hierarchy. At more than 800 lines it is the largest concentration of repeated DOM construction.

Recommended structure:

```text
src/ui/explorer/
  explorer.ts
  explorer-editor.ts
  explorer-list.ts
  record-types-tree.ts
  data-types-tree.ts
  applications-tree.ts
  middleware-tree.ts
  render-explorer-tree-item.ts
```

- Keep the shared open state and active inline editor in `explorer.ts`.
- Give each top-level hierarchy its own renderer.
- Extract helpers for a tree list, action container, link/label, and inline editor row. These structures are currently recreated for categories, record types, string subtypes, data scopes, middleware, pipelines, and APIs.
- Move WSDL file selection and import orchestration out of the Explorer renderer.

### 2. Extract pipeline transformation logic from its page — high priority

`src/ui/pages/pipeline-page.ts` currently combines:

- contract and record-type structure discovery;
- selectable-node tree construction;
- transformation tree mutation;
- transformation validation rules;
- recursive DOM rendering;
- the pipeline page and tab UI.

Recommended structure:

```text
src/domain/pipelines/
  pipeline.ts
  transform.ts
  transform-selection.ts
src/state/pipelines/
  pipeline-commands.ts
  transform-operations.ts
src/ui/pipelines/
  pipeline-page.ts
  transform-editor.ts
  transform-mapping.ts
```

The selectable-node tree and functions such as finding, adding, deleting, and clearing nested mappings should be pure functions with unit tests. The page should only select data, dispatch commands, and render the returned view model.

### 3. Split the workspace domain model by feature — high priority

`src/domain/workspace.ts` contains record-type constants, WSDL models, application models, middleware models, pipeline models, workspace roots, and factory functions. Record types themselves are separately held under `src/models`, so the domain boundary is inconsistent.

Recommended structure:

```text
src/domain/
  workspace.ts
  record-types.ts
  data-types.ts
  contracts.ts
  applications.ts
  middleware.ts
  pipelines.ts
  repositories.ts
```

`workspace.ts` should compose these feature models rather than define them. Move `src/models/category.ts` and `src/models/record-type.ts` into the record-types domain so there is one obvious home for persisted business models.

### 4. Replace the central command switch with feature command modules — high priority

The command type union and mutation switch in `src/state/commands.ts` grow together. The same command set is manually repeated in:

- `src/state/command-validation.ts` for validation;
- `src/ui/source-control.ts` for grouping and human-readable labels;
- tests and journal replay code.

Create one command definition per feature containing its command types, parser/validator, handler, display group, and display-label function. Compose those definitions in a central registry. This avoids updating several unrelated switches whenever a command is introduced.

Keep journal compatibility explicit: persisted commands should be migrated by version before validation rather than handled through legacy fields inside the current validator.

### 5. Move WSDL parsing out of the UI layer — high priority

`src/persistence/migrations.ts` and `src/state/command-validation.ts` import `parseWsdl` from `src/ui/wsdl-import.ts`. Persistence and state should not depend on UI code.

Move the parser to a neutral module such as:

```text
src/integrations/wsdl/parser.ts
src/integrations/wsdl/model.ts
```

The Explorer may call an application-level import service, while migrations and validation can use the parser directly without reversing the dependency direction.

### 6. Consolidate repository persistence responsibilities — medium priority

`browser-storage.ts`, `repository-store.ts`, `change-journal.ts`, `repository-catalog.ts`, and the local-repository modules all know about related local-storage keys and migration behaviour.

Use `repository-store.ts` as the single persistence gateway for active and archived repository snapshots. Keep storage keys private to it. `browser-storage.ts` should become a one-time legacy importer or be removed after its migration path is no longer needed.

Separate these operations clearly:

- decode and validate stored data;
- migrate schema versions;
- load/save snapshots;
- switch repositories;
- synchronize a fork.

### 7. Use sequential, version-specific migrations — medium priority

`src/persistence/migrations.ts` currently normalizes all historical shapes directly into the current workspace. As more versions are added, legacy aliases and current normalization become interleaved.

Prefer a chain such as `v7ToV8`, `v8ToV9`, followed by a strict current-schema parser. This makes removal of legacy names deliberate, makes each migration independently testable, and avoids accidentally accepting malformed current data.

### 8. Add shared DOM primitives — medium priority

Buttons, labelled fields, empty states, page headers, tabs, cards, lists, and action containers are repeatedly assembled with `document.createElement`. `src/ui/controls.ts` currently covers only a subset of them.

Add small, accessible primitives for:

- primary, secondary, icon, and destructive buttons;
- labelled inputs and selects;
- tab lists and tab buttons;
- page/editor headers;
- empty and error states;
- menus and menu items;
- ordered/unordered list construction.

Keep primitives behaviour-neutral. Feature components should supply labels, callbacks, and data rather than duplicating ARIA attributes and event wiring.

### 9. Unify popup menu behaviour — medium priority

Tree menus in `src/ui/controls.ts` and sidebar-header menus in `src/ui/sidebar-view-header.ts` independently implement opening, closing, focus movement, Escape handling, and menu-item construction.

Extract a single menu controller/component and supply different trigger and item styles. This also creates one place to improve keyboard navigation, outside-click handling, and focus restoration.

### 10. Introduce a navigation service — medium priority

Routes are constructed and inspected through `window.location.hash` in the Explorer, router, and pages. Create typed route builders and a single navigation service. This removes repeated route strings and prevents selection logic from drifting away from router parsing.

Suggested API:

```ts
routes.recordType(definitionId)
routes.stringSubtype(definitionId)
routes.pipeline(middlewareId, pipelineId)
navigate(route)
```

### 11. Replace direct alerts and confirmations — medium priority

`window.alert` and `window.confirm` are spread across controls, navigation, workspace import, theme/repository actions, and record-type editing. Introduce a notification and confirmation service so error handling and destructive confirmations are consistent and testable.

### 12. Clarify `children` versus `included` terminology — specification needed

The persisted record-type model uses `children`, while selectors and the editor present those records as `included`. This creates opportunities for invented paths or UI/domain terminology to diverge.

Before changing code, define whether `children` is a domain relationship whose serialized representation is `included[]`, or whether the domain property itself should be renamed. Once specified, use separate names for the relationship and its serialized projection rather than treating them as interchangeable.

### 13. Add focused tests around newly extracted boundaries — medium priority

The current tests cover commands and persistence well, but the most complex recent behaviour is inside page-rendering closures. Add unit tests for:

- record-type and WSDL selectable-node trees;
- level-aware array/object/attribute choices;
- recursive transformation operations;
- old loop-to-mapping migration;
- typed route generation and parsing;
- Explorer feature renderers where actions differ.

### Recommended code refactoring order

1. Extract and test pure pipeline transformation selection/operations.
2. Move WSDL parsing out of `ui`.
3. Split `navigation.ts` into feature trees and shared Explorer primitives.
4. Split domain models by feature.
5. Split commands, validation, and labels into feature command definitions.
6. Consolidate persistence and convert migrations to sequential steps.

## Styling

### 1. Remove duplicated structural CSS — high priority

`src/style.css` and `src/styles/workbench.css` both define Explorer tree marker removal, expander rotation, action visibility, row sizing constraints, and related selectors. Keep global reset rules in `style.css`, workbench structural rules in `workbench.css`, and feature-specific structural selectors beside their feature shortcuts.

In particular, consolidate:

- `.explorer-tree-item-row` rules;
- `::-webkit-details-marker` rules;
- open-state expander rotation;
- hover/focus action visibility;
- hidden menu handling.

### 2. Establish one token source and one consumption path — high priority

The styling system currently spans:

- palette variables in `theme-palettes.css`;
- layout/control variables in `workbench.css`;
- Uno theme aliases in `workbench-theme.ts`;
- arbitrary values embedded in shortcuts.

Keep palette and theme-switchable semantic values as CSS custom properties. Put stable size, spacing, typography, radius, duration, and z-index tokens in one token module, then expose them consistently through Uno. Avoid defining the same size both as a CSS variable and as an Uno theme value, such as the sidebar resizer width.

### 3. Create composable control shortcuts — high priority

Several shortcuts repeat the same border, surface, height, typography, focus, and disabled rules:

- `ui-select-control`;
- `ui-text-input`;
- `data-type-input`;
- `attribute-type`;
- `relationship-control`;
- `pipeline-loop-path`.

Define base shortcuts such as `ui-control`, `ui-control-focus`, `ui-select`, and `ui-input`, then compose feature-specific shortcuts from them. Do the same for icon buttons and menu items.

### 4. Merge duplicated menu styling — high priority

Explorer menus and sidebar-view menus use nearly identical containers, floating panels, and menu items in `explorer-shortcuts.ts` and `workbench-shortcuts.ts`. Introduce generic shortcuts such as:

- `ui-menu-container`;
- `ui-menu`;
- `ui-menu-item`;
- `ui-menu-item-danger`;
- `ui-icon-button`.

Feature shortcuts should only add differences that are intentional.

### 5. Split `editor-shortcuts.ts` by feature — high priority

`src/styles/editor-shortcuts.ts` contains general editor layout, record types, string data types, WSDL/API pages, and pipeline transforms. Split it to mirror the UI feature structure:

```text
src/styles/
  editor-primitives-shortcuts.ts
  record-type-shortcuts.ts
  data-type-shortcuts.ts
  contract-shortcuts.ts
  pipeline-shortcuts.ts
```

The Uno configuration can merge these modules as it does today.

### 6. Replace feature names on shared styles — medium priority

Pipeline tabs and cards currently reuse `api-tabs`, `api-tab`, `api-card`, `api-card-title`, and `api-empty-state`. Conversely, all transformation mappings use classes named `pipeline-loop`, including object and field mappings.

Create semantic shared names such as `editor-tabs`, `editor-tab`, `editor-card`, and `editor-empty-state`. Rename transformation styles to `transform-mapping`, `transform-mapping-header`, and `transform-mapping-children`. Feature names should remain only where the visual treatment is genuinely feature-specific.

### 7. Consolidate empty, status, and metadata styles — medium priority

`empty-state`, `attributes-empty`, `api-empty-state`, and `ui-status-text` overlap. Define a shared empty-state primitive with optional compact and centred variants. Likewise, use shared metadata, badge, section-heading, and technical-name styles rather than creating closely related feature versions.

### 8. Remove inline presentation styles — medium priority

Examples include the record-type title icon styles in `src/ui/icons.ts` and `forkForm.style.display` in `src/ui/source-control.ts`. Prefer class/state changes:

- put icon dimensions and colour entirely in shortcuts;
- use `hidden`, `aria-expanded`, or a `data-state` attribute for form visibility;
- reserve inline styles and CSS variables for genuinely dynamic values, such as the user-selected sidebar width.

### 9. Standardize state selectors — medium priority

The styles mix classes, `aria-pressed`, `aria-selected`, `data-dragging`, `[open]`, `[hidden]`, and direct inline display changes. Adopt a rule:

- native state attributes for semantic controls (`open`, `hidden`, `disabled`);
- ARIA attributes for accessible selected/pressed states;
- `data-*` attributes only for non-semantic visual state;
- classes for stable component identity, not transient state.

This will reduce CSS selectors and JavaScript class manipulation.

### 10. Align responsive values with named breakpoints — medium priority

`workbench-theme.ts` defines a `compact` breakpoint at `43.75rem`, while `style.css` independently uses `700px`. Use the named breakpoint consistently. Keep layout-specific container queries for the resizable Explorer, because its available width is independent of viewport width.

### 11. Normalize theme token naming — medium priority

Theme keys use camelCase (`recordType`, `dataType`, `dataScope`) while shortcut utilities use both camelCase and kebab-case forms. Choose one convention and apply it across CSS variables, Uno theme keys, and shortcut utilities. This removes ambiguity about which utilities Uno will generate and avoids inline colour fallbacks.

### 12. Add styling verification — medium priority

Add a small rendered component/state gallery or visual test page containing:

- all button and input states;
- menus and tree rows at narrow and wide sidebar widths;
- light and dark themes;
- record, API, and pipeline editor primitives;
- empty, error, selected, disabled, and destructive states.

This provides a safe target for consolidating shortcuts without repeatedly checking every application route.

### Recommended styling refactoring order

1. Remove duplicate rules between `style.css` and `workbench.css`.
2. Add shared control, icon-button, menu, card, tab, and empty-state shortcuts.
3. Rename shared `api-*` styles and genericize transformation mapping styles.
4. Split `editor-shortcuts.ts` by feature.
5. Normalize tokens, responsive values, and naming.
6. Remove remaining inline presentation styles and add a visual state gallery.
