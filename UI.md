# UI inventory

This document describes the UI currently rendered by the application. It is organised by screen location rather than by generic control type so that similarly styled controls with different purposes remain distinguishable.

## Visual foundation

- **Application font:** IBM Plex Sans Variable is used for general UI text. IBM Plex Mono is used for technical names, including record types, attributes, data types, data scopes, generated values, and change descriptions.
- **Colour system:** the application uses a light slate background, white cards, slate borders and text, and blue for selection, focus, types, and primary actions. Amber identifies folders and basic data types; cyan identifies data scopes; emerald identifies relationship attributes; red identifies destructive actions and conflicts.
- **Icons:** Lucide icons are used throughout. Standard icons are 16px with a 1.75 stroke width. Most tree action icons are 14px.
- **Focus and selection:** interactive inputs use blue borders or outlines on focus. Selected tree rows use a pale-blue background, dark-blue text, and an inset blue ring.
- **Technical names:** the shared `technical-name` and `schema-attribute-name` styles apply IBM Plex Mono. Attribute names are 14px, semibold, and slate-800.
- **Responsive behaviour:** below 700px, main-content padding reduces to 16px, page headers stack, attribute grids become flexible-height, and relationship selector fields become a single column.

## Application shell

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Workspace shell | Outermost application container. Holds the activity bar, left sidebar, and main content. | Full viewport height; flex row; slate-50 background; slate-900 text; IBM Plex Sans. |
| Activity bar | Narrow strip at the far left. Switches what is shown in the adjacent sidebar. | Fixed 48px width; dark slate-900 background; slate-700 right border; vertically stacked controls. |
| Workspace sidebar | Between the activity bar and main content. Displays either Explorer or Source Control. | Starts at 256px wide; minimum 192px; maximum 480px; horizontally resizable; scrollable; slate-50 background and slate-200 right border; 8px padding. |
| Main content | Large area to the right of the sidebar. Displays the selected overview or designer page. | Flexible width; 32px padding; minimum width constrained to prevent overflow. |

## Activity bar controls

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Explorer button | First button in the far-left activity bar. Shows the workspace hierarchy in the sidebar. Uses the Lucide Files icon. | 40px square, transparent background, slate-400 icon. Hover is white. The active state has a blue left border and white icon. |
| Source Control button | Second activity-bar button. Shows repository, pending-change, commit, and history controls. Uses the Lucide Git Branch icon. | Same styling as Explorer. |
| Pending-change badge | Bottom-right overlay on the Source Control button. Shows the number of pending changes; an exclamation mark indicates a loading error. Hidden when there are no pending changes. | Small blue circular badge, white 10px text, minimum 16px width. |

## Explorer sidebar

### Workspace import and export

These controls are always at the top of Explorer, above the hierarchy.

| Element | Behaviour | Current styling |
| --- | --- | --- |
| Import button | Opens a hidden JSON file picker. After validation and confirmation, replaces the current workspace and navigates to Record Types. Uses the Upload icon. | Half-width, 32px-high white button with slate border, 12px text, rounded corners. Hover darkens the text and background. |
| Export button | Downloads the complete current workspace, including top-level definitions, as JSON. Uses the Download icon. | Same styling as Import. |
| Import confirmation/error | Native browser confirmation before replacement; native alert if parsing or validation fails. | Browser-native dialog styling. |

### Hierarchy behaviour and shared tree controls

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Expand/collapse chevron | At the start of every expandable hierarchy row. Clicking the row summary opens or closes that branch. | 16px slate-500 chevron; rotates 90 degrees when open. Non-expandable rows reserve the same space with an invisible spacer. |
| Selected hierarchy row | Applied to the record type or string subtype represented by the current route. | Pale-blue background, blue inset ring, dark-blue text. |
| Tree action group | At the right edge of root, category, record-type, basic-string, subtype, and data-scope rows where actions exist. | Hidden by default; becomes visible when its row is hovered or contains keyboard focus. Actions are aligned horizontally with a 2px gap. |
| Add action | Plus icon at the right of an eligible tree row. Performs the action directly when only one kind can be added; opens a menu when multiple kinds are available. | 24px square transparent icon button; slate icon; rounded; slate-300 hover background. |
| More actions | Ellipsis icon at the right of eligible rows. Opens the Rename/Delete menu. | Same icon-button styling as Add. |
| Action menu | Positioned below and right-aligned with an Add or More button. | Minimum 144px width; white background; slate border; rounded corners; shadow; 12px menu items. Destructive items use red text and a pale-red hover state. |
| Inline name editor | Replaces a tree label while creating or renaming a node. Enter or blur commits; Escape cancels. | 24px high; white background; blue border; 13px text. Technical entities use IBM Plex Mono. |
| Delete confirmation/blocking message | Delete actions ask for confirmation. Deletes that would break references instead show an alert explaining what must be removed first. | Browser-native confirmation or alert. |

### Record Types hierarchy

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Record Types root | First top-level tree row. Links to the Record Types overview and expands categories. Its Add button creates a category. | Semibold 13px root row with folder icon, 28px minimum height, rounded hover background. |
| Record root type | First item beneath Record Types. Opens the non-deletable `Record` type designer. | File Database icon in blue; monospaced name; standard record-type row. It has no Add or More controls. |
| Category row | Beneath Record Types. Expands its record types. Uses an amber folder icon. | 13px row with left padding and rounded slate hover background. Category name uses the general sans font. |
| Category Add button | Right side of a category row. Creates a top-level record type in that category. | Shared tree Add action. |
| Category More menu | Right side of a category row. Renames the category or deletes it. Deletion is blocked until the category has no record types. | Shared tree menu; Delete is red. |
| Record-type row | Beneath a category or another record type. Opens that record type page. All record types use the blue File Database icon. | Monospaced, truncated name in slate-600; 28px row; rounded hover state. |
| Record-type Add menu | Right side of every non-root record type. Offers **Child record type** and **Subtype**. The new node is created inline beneath its parent. | Plus trigger with the shared white popup menu. |
| Record-type More menu | Right side of every non-root record type. Offers Rename and Delete. Delete includes all descendants and is blocked while external relationship attributes reference the type or descendants. | Shared tree menu; Delete is red. |
| Child/subtype nesting | Children and subtypes appear directly below the parent without intermediate “Children” or “Subtypes” folders. | Additional 16px indentation. They currently use the same File Database icon and row treatment as other record types. |

### Data Types hierarchy

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Data Types root | Second top-level tree row. Expands the basic JSON types. | Same top-level folder treatment as Record Types. |
| Basic JSON type row | Lists `string`, `number`, `boolean`, `object`, `array`, and `null`. | Amber Braces icon and monospaced 13px name. |
| String Add button | Right side of the `string` row. Creates a string subtype using an inline editor. Names are converted to and validated as UpperCamelCase. | Shared tree Add action. |
| String subtype row | Nested below `string`. Opens the string subtype designer. | Amber Braces icon; monospaced, truncated name; selected row uses the shared blue selection style. |
| String subtype More menu | Right side of a subtype row. Offers Rename and Delete. Delete is blocked while attributes use the subtype. | Shared tree menu; Delete is red. |

### Applications and Data Flows hierarchy

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Applications root | Third top-level row. Expands the persisted Data Scopes collection. | Standard top-level folder row. |
| Data Scopes collection | Persisted structural folder beneath Applications. Expands named data scopes. Its Add button creates a data scope inline. | Standard structural folder row with the shared tree Add action. |
| Data-scope row | Beneath Data Scopes. Displays a named application scope and expands its APIs and CLIENTs categories. | Cyan Database icon and monospaced name in a standard 28px tree row. |
| Data-scope More menu | Right side of a data-scope row. Offers Rename and Delete with confirmation. | Shared tree menu; Delete is red. |
| APIs category | Persisted category beneath each data scope. Expands imported API definitions. Its Add button opens a WSDL file picker. | Cyan Server icon, standard structural label, and shared tree Add action. |
| CLIENTs category | Persisted category beneath each data scope. Currently contains no child definitions or actions. | Cyan Square Arrow Out Up Right icon and standard structural label. |
| Imported API row | Beneath APIs. Opens the read-only WSDL API editor. | Cyan File Code icon and monospaced technical name in a standard tree row; the current API uses the shared selected style. |
| Data Flows root | Fourth top-level row. Currently has no children or actions. | Standard top-level folder row. |

## Source Control sidebar

### Header and repository controls

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Source Control heading | Top of the Source Control sidebar. | Uppercase, tracked, semibold 12px slate-600 text with a bottom border. |
| Pending count | Right side of the Source Control heading. | Slate-200 rounded badge with 12px slate-700 text. |
| Active repository selector | First control in the repository card. Switches between locally registered Source and Fork repositories. | Full two-column width; pale-slate background; slate border; rounded; 12px text; blue focus border. |
| Repository name | Beneath the selector, left side. | Truncated semibold 12px slate-800 text. |
| Repository type badge | Beneath the selector, right side. Shows Source or Fork. | Uppercase 10px blue text on a pale-blue rounded background. |
| Active layer | Under the repository identity. Shows Source or Fork layer. | 10px slate-500 text. |
| Upstream status | Fork repositories only. Reports whether an upstream synchronization commit exists. | Full-width 10px slate-500 text. |

### Fork creation

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Create Fork button | In the repository card when a Source is active. Reveals the inline fork-name form. | Small 12px blue text button with a pale-blue hover background. |
| Fork name input | Inline form revealed beneath Create Fork. Defaults to “{repository name} Fork”. | White 12px input with slate border and blue focus border; fills remaining row width. |
| Fork Create button | Submits the fork-name form, clones the Source, and switches to the new Fork. | Compact blue primary button with semibold white 12px text. |
| Fork Cancel button | Closes the fork-name form without creating a repository. | Compact pale-slate button with slate text. |

### Pull from Source

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Pull status | Fork repositories only. Shows “Up to date” or the incoming change count. | 12px slate-700 text above a subtle top divider. |
| Incoming commit list | Appears when Source commits are available. Lists their commit messages as a preview. | Unbulleted grid with 10px slate-500 text. |
| Pull from Source button | Applies conflict-free incoming Source commits to the Fork. Disabled and labelled “Pull blocked” when conflicts exist. | Compact blue primary button with semibold white text; disabled state is slate-300. |
| Pull conflict message | Appears below the pull controls when overlapping Source and Fork changes are detected. | 10px red-700 text. |

### Commit and history controls

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Commit message input | Beneath the repository card. Required before a local commit can be created. | White 12px input with slate border and blue focus border. |
| Commit button | Below the message input. Commits all pending UI changes. Disabled when there are no pending changes. | 28px-high blue primary button with semibold white text; disabled state is slate-300 with a not-allowed cursor. |
| No pending changes message | Replaces the change groups when the journal has no uncommitted entries. | 12px slate-500 text with vertical padding. |
| Change group heading | Groups pending changes under Record Types, Data Types, Applications, or Workspace. | Semibold 12px slate-700 text. |
| Pending-change row | Human-readable change description with revision number. | 28px minimum height; 12px; rounded hover background. Description is monospaced slate-600; revision is 10px slate-400. |
| History heading | Above committed history at the bottom of the panel. | Uppercase, tracked, semibold 12px slate-600 text with a top divider. |
| Commit-history row | Shows commit message, layer, change count, and local timestamp. | Vertically stacked row with subtle bottom divider. Message is semibold 12px slate-700; details are 10px slate-400. |
| Source Control error | Replaces panel content when repository or journal data cannot be loaded. | Pale-red rounded box with 12px red-700 text. |

## Record Types overview page

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Record Types page title | Main content when the Record Types root is selected. | 30px bold heading in a centred container up to 1024px wide. |
| Category card | One card per category below the page title. | White background, slate border, 12px radius, 20px padding; cards are arranged in a vertical grid. |
| Category heading | Top of each category card. | 18px bold text. |
| Record-type summary row | Lists each top-level record type in the category. Currently display-only. | Pale-slate rounded row with blue File Database icon, monospaced text, and 10px vertical padding. |
| Empty states | Shown when there are no categories or a category has no record types. | Slate-500 text with no extra decoration. |

## Record type designer page

### Designer header

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Record type eyebrow | Top-left above the record type name. Always reads “RECORD TYPE”. | Uppercase, widely tracked, semibold 12px slate-500 text. |
| Parent record name | Above a child record type’s own name. Identifies its containment parent. | Monospaced semibold 14px slate-500 text. |
| Record type icon and name | Main title line. The name is the selected record type. | Blue File Database icon followed by a bold 30px monospaced heading. |
| Supertype hierarchy | Beneath the record type name. Shows inheritance from `Record` through intermediate supertypes using `>` separators. | Monospaced 12px slate-500 text. |
| Classification segmented control | Right side of the header. Sets the record type to Social, Physical, or Counts As. | White segmented group with slate border and rounded corners. Each segment is semibold 12px; selected segment uses pale-blue background and blue text. |

### Schema card and fixed fields

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Schema card | Main centred object-definition surface below the header. | White card, slate border, 12px radius, clipped overflow; maximum width 1024px. |
| Fixed `id` row | First row of every record type. States that instance IDs are required, non-nullable strings. | 80px two-line grid with lock icon, monospaced semibold name, blue type badge, slate constraint pills, and visible slate divider. |
| Fixed `type` row | Second fixed row. States that type is a required, non-nullable string fixed to the record type name. | Same as `id`, plus a monospaced slate fixed-value line such as `= "JournalEntry"`. |
| Type badge | Used in fixed, inherited, standard, and relationship rows. | Content-width pale-blue rounded badge with monospaced 12px blue text. |
| Constraint badge | Shows Required, Nullable, or Not nullable where applicable. | Rounded pale-slate pill with 12px slate-600 text. |

### Attributes section

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Attributes header | Between fixed fields and the attribute list. | Pale-slate background, bottom border, 12px vertical and 16px horizontal padding. Title is monospaced semibold 14px. |
| Add attribute button | Right side of the Attributes header. Adds a standard attribute and focuses its name. Uses a Plus icon. | Shared 24px tree-style icon button. |
| Add relationship attribute button | Beside Add attribute. Adds a relationship-derived attribute and opens its selector. Uses a Link icon. | Shared 24px tree-style icon button. |
| Empty attributes message | Shown when there are no inherited, standard, or relationship attributes. | Centred 14px slate-500 text with 32px vertical padding. |

### Unified attribute row

Fixed fields, inherited attributes, standard attributes, and relationship attributes use the same collapsed row structure. Their semantic differences are communicated through their icon, editability, supporting information, and available actions rather than through different layouts.

| Element | Position and behaviour | Shared styling |
| --- | --- | --- |
| `attribute-row` | Shared container for every attribute variant. | Height `--attribute-row-height` (`5rem`); two-row grid; columns for icon, flexible name, type, secondary detail, and actions; full width; `colors.border.strong` divider. |
| `attribute-icon` | First column on the first line. Identifies fixed, inherited, standard, or relationship status. | `--icon-size-default` square; centred; does not shrink; colour comes from the relevant text or entity token. |
| `attribute-name` | Second column on the first line. Display text or an input depending on editability. | Minimum width `0`; single line with ellipsis; `fontFamily.mono`; `fontSize.body`; `fontWeight.semibold`; `colors.text.primary`. |
| `attribute-type` | Third column on the first line. Display badge or selector depending on editability. | Consistent `8rem` column; `fontFamily.mono`; `fontSize.ui`; display values use the shared type badge; editable values use the shared select treatment. |
| `attribute-actions` | Final column on the first line. | Right-aligned compact icon buttons using `--control-height-compact`; the column remains reserved when a variant has actions. |
| `attribute-supporting-information` | Second column on the second line. Shows provenance such as `Inherited from Record` or a relationship source; blank for ordinary attributes. | Single line with ellipsis; `fontSize.ui`; `colors.text.muted`; technical names use `fontFamily.mono`. |
| `attribute-constraints` | Third column on the second line, aligned beneath the type. | Horizontal collection of shared constraint badges. Fixed-width alignment is preserved when no constraints are displayed. |
| `attribute-literal-value` | Fourth column on the second line. Shows a fixed value such as `= "JournalEntry"`; blank when the attribute has no literal value. | Single line with ellipsis; `fontFamily.mono`; `fontSize.ui`; `colors.text.muted`. |

Variant mapping:

| Variant | Icon | Name | Type | Supporting information | Constraints | Literal value | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fixed `id` | Lock | `id` | `string` | Blank | Required; Not nullable | Blank | None |
| Fixed `type` | Lock | `type` | `string` | Blank | Required; Not nullable | Record-type name literal | None |
| Inherited | Inheritance | Display name | Display type | `Inherited from {supertype}` | Inherited constraints | Blank | None |
| Standard | Drag handle | Editable name | Editable type | Blank | Nullable toggle | Blank | Delete |
| Relationship | Link | Generated name | Resolved type | Relationship source or mode switch | Derived constraints when applicable | Blank | Delete |

An expanded relationship selector adds a third row beneath this shared two-row summary. Its record-type selector, optional role input, and source-attribute selector span the content columns without changing the placement of the summary fields above.

### Inherited attribute row

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Inheritance icon | First column of an inherited row. Indicates the attribute comes from a supertype. | 16px blue Shapes icon. |
| Inherited name | First line, second column. Display-only. | Shared monospaced semibold 14px attribute-name style. |
| Inherited type | First line, third column. Display-only. | Shared pale-blue type badge. |
| Origin | Second line. Reads `from {supertype}`. | Monospaced 12px blue-600 text. |
| Nullability | Second line, third column. Display-only. | Shared constraint badge. |
| Row surface | Mixed into the main attributes list. | 80px, two-line grid; very pale slate background; visible divider between rows. |

### Standard attribute row

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Drag handle | First column. Dragging it reorders standard attributes. A blue inset line marks the current drop target. | 16px slate-400 Grip icon with grab cursor. |
| Attribute name input | First line, second column. Renames the attribute on change; Enter commits by blurring. | Monospaced semibold 14px; transparent border/background until hover or focus; blue focus border on white. |
| Data-type selector | First line, third column. Selects a basic JSON type or string subtype. Unavailable stored types remain visible as disabled options. | Pale-slate rounded select with slate border and monospaced 12px text; blue focus border. |
| Nullable toggle | Second line beneath the name. Switches between Nullable and Not nullable. | Rounded white pill with slate border and 12px text; active state uses pale-blue background, blue border, and blue text. |
| Delete attribute button | First line, far right. Deletes after confirmation. If relationships reference the attribute, displays a blocking alert instead. | Shared 24px icon button with Trash icon; turns red on hover. |
| Row surface | Each owned attribute in the Attributes list. | Fixed 80px two-line grid with a visible slate divider. |

### Relationship attribute row

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Relationship icon | First column. Distinguishes denormalised relationship attributes. | 16px emerald Link icon. |
| Generated attribute name | First line, second column. Displays `RecordType_attributeName` or `RecordType_roleAttributeName`; blank while unresolved. | Monospaced semibold 14px, truncated if necessary. |
| Resolved type | First line, third column. Derived from the selected source attribute. | Shared pale-blue type badge; em dash while unresolved. |
| Relationship/Name switch | Second line. Alternates between the generated name and the relationship selector. Disabled until an incomplete relationship has a record type and attribute. | 28px white bordered button with Arrow Left/Right icon and 12px text; pale-slate hover state. |
| Record-type selector | Expanded selector, first column. Chooses the related record type and initially targets its `id`. | Pale-slate, bordered, rounded 12px monospaced select. |
| Optional role input | Expanded selector, second column. Supplies the optional role used in the generated attribute name. | Same relationship-control styling; placeholder “Role (optional)”. |
| Source-attribute selector | Expanded selector, third column. Offers `id` plus the selected record type’s own attributes. | Same relationship-control styling. |
| Delete relationship button | First line, far right. Deletes after confirmation. | Shared Trash icon button with red hover. |
| Row surface | Collapsed rows match the 80px attribute depth. Expanded rows grow to fit a third selector line. | Two-line grid with slate divider; expanded selector is a three-column grid and becomes one column on narrow screens. |

### Included section

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Included header | At the same schema-card level as Attributes, below the attribute list. | Same pale-slate header and monospaced 14px title as Attributes. |
| Included record row | Automatically lists the lowest applicable record types from child hierarchies. Display-only. | 56px row with blue File Database icon, monospaced semibold name, and slate divider. |
| Empty included message | Shown when the record type has no child types to include. | Same centred 14px slate-500 empty-state treatment as Attributes. |

## String subtype designer page

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| String subtype eyebrow | Above the subtype name in the main header. | Uppercase, widely tracked, semibold 12px slate-500 text. |
| Subtype page title | Current subtype name. Updates immediately after a valid rename. | Bold 30px monospaced heading. |
| Definition form | Centred below the header. Values persist as they change; there is no submit button. | White card up to 768px wide; slate border; 12px radius; 24px padding; 20px field gaps. |
| Type name input | First form field. Enforces UpperCamelCase and updates the tree label. | Full-width white input with slate border, 14px monospaced text, blue focus border and pale-blue focus ring. |
| Regex pattern input | Second field. Stores the validation pattern. | Same monospaced input styling; includes an example regex placeholder. |
| Example string input | Third field. Stores a representative value. | Same monospaced input styling; includes a date-like example placeholder. |
| Description textarea | Fourth field. Stores free text and can be resized vertically. | Same bordered field treatment, but uses IBM Plex Sans and 24px line height. |
| Field labels | Above each subtype input. | Semibold 14px slate-700 text. |

## WSDL API editor page

The WSDL API editor presents imported information without allowing configuration overrides. All values are read-only and come from the persisted WSDL API model.

### Editor header and tabs

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| API eyebrow | Above the API name. Always reads “WSDL API”. | Uppercase, widely tracked, semibold 12px muted text. |
| API icon and name | Main title line for the selected imported API. | Cyan File Code icon followed by a 30px monospaced technical name. |
| Source metadata | Beneath the title. Shows WSDL version and original filename. | Compact muted text; filename uses the monospaced font. |
| API tab strip | Beneath the header. Switches between Overview, Operations, Contracts, and Raw WSDL without changing the route. | Surface-subtle background with a subtle bottom border; 36px-high buttons; the selected tab uses accent text and an accent bottom border. |

### Overview tab

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Extraction summary | First card. Shows counts for services, endpoints, operations, messages, contracts, and flattened fields. | Responsive grid of compact surface-subtle statistic cells inside a bordered surface card. |
| Target namespace | Read-only namespace captured from the WSDL definition. | Monospaced, wrapping value beneath a muted label. |
| Policy list | Displays captured WS-Policy assertion names; shows an empty state when none exist. | Compact neutral pills that wrap within the card. |

### Operations tab

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Endpoint card | Lists service, port, address, SOAP protocol, and binding for each endpoint. | Bordered surface card with monospaced technical values and a compact protocol badge. |
| Operation card | Lists interface, direction, input/output messages, faults, and every SOAP binding variant. | Bordered surface card; operation name is a monospaced section heading; binding details use a compact two-column grid. |
| Invocation value | SOAP action, style, body use, address, binding, or message identifier. | Wrapping monospaced 12px read-only text. |
| Developer call guide | Inside each operation card. Explains the HTTP method, compatible endpoint, SOAP protocol, content type, SOAP action handling, and request contract for each binding. It does not allow these values to be overridden. | Read-only callout divided into compact labelled rows, using monospaced text for values and code examples. |
| Request envelope example | Shows a representative SOAP envelope using the captured input root element and target namespace. It is illustrative rather than editable. | Dark, horizontally scrollable code surface with 12px monospaced text. |
| Response guide | Describes whether the operation is one-way or request/response and identifies the captured success and fault contracts, including their root elements and field counts. | Compact read-only response rows with direction badges and monospaced contract names. |

### Contracts tab

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Contract disclosure | One expandable section for each operation input, output, or fault contract. The first contract is open initially. | Bordered surface disclosure with a subtle header and Chevron expander. |
| Contract identity | Shows direction, operation, message, root element, and field count. | Direction pill plus monospaced technical names and muted metadata. |
| Contract field row | Shows the flattened XML path, node kind, resolved/primitive type, cardinality, nullability, compositor, documentation, and schema constraints. | Dense responsive grid with strong row dividers; paths and types use the monospaced font; metadata and constraints use compact pills. |
| Empty contract state | Shown when a message has no resolved root element or fields. | Muted 14px text with compact padding. |

### Raw WSDL tab

| Element | Location and behaviour | Current styling |
| --- | --- | --- |
| Raw WSDL source | Displays the original imported WSDL exactly as persisted. It is read-only and horizontally scrollable. | Bordered dark code surface with light 12px monospaced text and preserved whitespace. |

## Routes without a main-content view

Selecting the Data Types root, Applications root, a data scope, or Data Flows currently clears the main content because no overview/designer page has been implemented for those routes. Imported API routes open the WSDL API editor. Their hierarchy elements remain available in Explorer.

## Styling ownership

- Reusable visual tokens and component shortcuts are defined in `uno.config.ts`.
- Small layout rules that depend on DOM relationships, hierarchy state, drag state, or responsive breakpoints are defined in `src/style.css`.
- UI construction and behaviour live under `src/ui/`, split between navigation, Source Control, shared controls, tree rendering, and page renderers.

## UI Architecture

### Theme Definition

The theme will be named **Workbench Light**. The following names and values are the proposed source-of-truth tokens. Colour, font, radius, shadow, and breakpoint tokens belong in the UnoCSS `theme`; runtime layout dimensions and stacking levels are CSS custom properties.

#### UnoCSS colour tokens

| Theme name | Value | Swatch | Use |
| --- | --- | --- | --- |
| `colors.canvas` | `#f8fafc` | ![#f8fafc](docs/ui-swatches/f8fafc.svg) | Workspace background outside raised surfaces. |
| `colors.surface.DEFAULT` | `#ffffff` | ![#ffffff](docs/ui-swatches/ffffff.svg) | Editor surfaces, forms, menus, and primary cards. |
| `colors.surface.subtle` | `#f1f5f9` | ![#f1f5f9](docs/ui-swatches/f1f5f9.svg) | Sidebars, section headers, inputs at rest, and hover surfaces. |
| `colors.surface.muted` | `#e2e8f0` | ![#e2e8f0](docs/ui-swatches/e2e8f0.svg) | Disabled surfaces and stronger neutral fills. |
| `colors.chrome.title` | `#f1f5f9` | ![#f1f5f9](docs/ui-swatches/f1f5f9.svg) | Title Bar background. |
| `colors.chrome.activity` | `#0f172a` | ![#0f172a](docs/ui-swatches/0f172a.svg) | Activity Bar background. |
| `colors.chrome.activityHover` | `#1e293b` | ![#1e293b](docs/ui-swatches/1e293b.svg) | Activity Bar hover background. |
| `colors.chrome.status` | `#1d4ed8` | ![#1d4ed8](docs/ui-swatches/1d4ed8.svg) | Status Bar background. |
| `colors.text.primary` | `#1e293b` | ![#1e293b](docs/ui-swatches/1e293b.svg) | Main readable text. |
| `colors.text.secondary` | `#475569` | ![#475569](docs/ui-swatches/475569.svg) | Secondary labels and controls. |
| `colors.text.muted` | `#64748b` | ![#64748b](docs/ui-swatches/64748b.svg) | Supporting descriptions and metadata. |
| `colors.text.faint` | `#94a3b8` | ![#94a3b8](docs/ui-swatches/94a3b8.svg) | Disabled text and low-priority metadata. |
| `colors.text.inverse` | `#ffffff` | ![#ffffff](docs/ui-swatches/ffffff.svg) | Text on dark or strongly coloured surfaces. |
| `colors.border.DEFAULT` | `#cbd5e1` | ![#cbd5e1](docs/ui-swatches/cbd5e1.svg) | Standard control and region borders. |
| `colors.border.subtle` | `#e2e8f0` | ![#e2e8f0](docs/ui-swatches/e2e8f0.svg) | Dividers and low-emphasis borders. |
| `colors.border.strong` | `#94a3b8` | ![#94a3b8](docs/ui-swatches/94a3b8.svg) | Emphasised separators and drag targets. |
| `colors.accent.50` | `#eff6ff` | ![#eff6ff](docs/ui-swatches/eff6ff.svg) | Subtle active and hover backgrounds. |
| `colors.accent.100` | `#dbeafe` | ![#dbeafe](docs/ui-swatches/dbeafe.svg) | Selected row and selected tab backgrounds. |
| `colors.accent.200` | `#bfdbfe` | ![#bfdbfe](docs/ui-swatches/bfdbfe.svg) | Selected borders. |
| `colors.accent.300` | `#93c5fd` | ![#93c5fd](docs/ui-swatches/93c5fd.svg) | Keyboard focus ring. |
| `colors.accent.500` | `#3b82f6` | ![#3b82f6](docs/ui-swatches/3b82f6.svg) | Active icons and indicators. |
| `colors.accent.600` | `#2563eb` | ![#2563eb](docs/ui-swatches/2563eb.svg) | Primary buttons and focused borders. |
| `colors.accent.700` | `#1d4ed8` | ![#1d4ed8](docs/ui-swatches/1d4ed8.svg) | Primary-button hover and active text. |
| `colors.accent.900` | `#1e3a8a` | ![#1e3a8a](docs/ui-swatches/1e3a8a.svg) | Selected text with strong contrast. |
| `colors.success.50` | `#f0fdf4` | ![#f0fdf4](docs/ui-swatches/f0fdf4.svg) | Success background. |
| `colors.success.600` | `#16a34a` | ![#16a34a](docs/ui-swatches/16a34a.svg) | Success icon or indicator. |
| `colors.success.700` | `#15803d` | ![#15803d](docs/ui-swatches/15803d.svg) | Success text. |
| `colors.warning.50` | `#fffbeb` | ![#fffbeb](docs/ui-swatches/fffbeb.svg) | Warning background. |
| `colors.warning.600` | `#d97706` | ![#d97706](docs/ui-swatches/d97706.svg) | Warning icon or indicator. |
| `colors.warning.700` | `#b45309` | ![#b45309](docs/ui-swatches/b45309.svg) | Warning text. |
| `colors.danger.50` | `#fef2f2` | ![#fef2f2](docs/ui-swatches/fef2f2.svg) | Error, conflict, and destructive-hover background. |
| `colors.danger.600` | `#dc2626` | ![#dc2626](docs/ui-swatches/dc2626.svg) | Destructive action and error indicator. |
| `colors.danger.700` | `#b91c1c` | ![#b91c1c](docs/ui-swatches/b91c1c.svg) | Error and conflict text. |
| `colors.info.50` | `#ecfeff` | ![#ecfeff](docs/ui-swatches/ecfeff.svg) | Informational background. |
| `colors.info.600` | `#0891b2` | ![#0891b2](docs/ui-swatches/0891b2.svg) | Informational indicator. |
| `colors.info.700` | `#0e7490` | ![#0e7490](docs/ui-swatches/0e7490.svg) | Informational text. |
| `colors.entity.recordType` | `#3b82f6` | ![#3b82f6](docs/ui-swatches/3b82f6.svg) | Record-type icons. |
| `colors.entity.dataType` | `#d97706` | ![#d97706](docs/ui-swatches/d97706.svg) | Data-type icons. |
| `colors.entity.dataScope` | `#0891b2` | ![#0891b2](docs/ui-swatches/0891b2.svg) | Data-scope icons. |
| `colors.entity.relationship` | `#059669` | ![#059669](docs/ui-swatches/059669.svg) | Relationship icons. |
| `colors.entity.inherited` | `#2563eb` | ![#2563eb](docs/ui-swatches/2563eb.svg) | Inheritance indicators. |

#### UnoCSS typography tokens

| Theme name | Value | Use |
| --- | --- | --- |
| `fontFamily.sans` | `"IBM Plex Sans Variable", sans-serif` | General interface text. |
| `fontFamily.mono` | `"IBM Plex Mono", monospace` | Technical identifiers and generated values. |
| `fontSize.caption` | `0.625rem` | Badges, status details, revisions, and compact metadata. |
| `fontSize.ui` | `0.75rem` | Buttons, tree actions, panel headings, and compact controls. |
| `fontSize.body` | `0.875rem` | Form fields, labels, and standard content. |
| `fontSize.section` | `1.125rem` | Page section headings. |
| `fontSize.title` | `1.875rem` | Editor title. |
| `lineHeight.caption` | `0.875rem` | Caption line height. |
| `lineHeight.ui` | `1rem` | Compact interface line height. |
| `lineHeight.body` | `1.25rem` | Standard interface line height. |
| `lineHeight.section` | `1.5rem` | Section heading line height. |
| `lineHeight.title` | `2.25rem` | Editor-title line height. |
| `fontWeight.regular` | `400` | Normal text. |
| `fontWeight.medium` | `500` | Active tabs and compact emphasis. |
| `fontWeight.semibold` | `600` | Labels, buttons, and technical names. |
| `fontWeight.bold` | `700` | Page and editor headings. |

#### UnoCSS shape, depth, and breakpoint tokens

| Theme name | Value | Use |
| --- | --- | --- |
| `borderRadius.sm` | `0.25rem` | Tree rows, compact controls, and badges. |
| `borderRadius.md` | `0.375rem` | Inputs, buttons, tabs, and menus. |
| `borderRadius.lg` | `0.75rem` | Editor cards and large forms. |
| `borderRadius.full` | `9999px` | Pills and circular counts. |
| `boxShadow.floating` | `0 4px 12px rgb(15 23 42 / 0.12)` | Menus and tooltips. |
| `boxShadow.overlay` | `0 16px 40px rgb(15 23 42 / 0.18)` | Command Palette and dialogs. |
| `breakpoints.compact` | `43.75rem` | Compact layout at 700px and below. |
| `breakpoints.wide` | `80rem` | Additional space for optional supporting regions. |

Spacing will use the standard `presetWind3` quarter-rem scale rather than introducing a second spacing system.

#### CSS custom properties for workspace dimensions

| Property | Value | Use |
| --- | --- | --- |
| `--workbench-title-bar-height` | `2.25rem` | Title Bar height. |
| `--workbench-activity-bar-width` | `3rem` | Activity Bar width. |
| `--workbench-primary-sidebar-width` | `16rem` | Default Primary Sidebar width. |
| `--workbench-secondary-sidebar-width` | `18rem` | Default Secondary Sidebar width. |
| `--workbench-sidebar-min-width` | `12rem` | Minimum width of either sidebar. |
| `--workbench-sidebar-max-width` | `30rem` | Maximum width of either sidebar. |
| `--workbench-sidebar-title-height` | `2.25rem` | Height of a sidebar view title and its action area. |
| `--workbench-editor-tabs-height` | `2.25rem` | Editor tab-strip height. |
| `--workbench-bottom-panel-height` | `16rem` | Default expanded Bottom Panel height. |
| `--workbench-status-bar-height` | `1.5rem` | Status Bar height. |
| `--workbench-editor-padding` | `2rem` | Default Editor Area content padding. |
| `--workbench-editor-max-width` | `72rem` | Maximum width of designer content. |
| `--control-height-compact` | `1.5rem` | Compact tree and icon controls. |
| `--control-height-default` | `2rem` | Standard buttons, selects, and inputs. |
| `--tree-row-height` | `1.75rem` | Hierarchy row height. |
| `--attribute-row-height` | `5rem` | Collapsed attribute-row height. |
| `--icon-size-default` | `1rem` | Standard icon size. |
| `--icon-size-compact` | `0.875rem` | Compact action icon size. |

#### CSS custom properties for motion and stacking

| Property | Value | Use |
| --- | --- | --- |
| `--duration-fast` | `100ms` | Hover, focus, and selection transitions. |
| `--duration-layout` | `160ms` | Opening and closing panels or supporting regions. |
| `--easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Standard interface motion. |
| `--z-dropdown` | `30` | Menus and dropdowns. |
| `--z-command-palette` | `50` | Command Palette. |
| `--z-dialog` | `60` | Modal dialogs. |
| `--z-notification` | `70` | Notifications and urgent transient messages. |

#### Required state mappings

| State | Token mapping |
| --- | --- |
| Hover | `surface.subtle` background with `text.primary`. |
| Keyboard focus | `accent.600` focused border plus a 2px `accent.300` outer ring. |
| Selected | `accent.100` background, `accent.200` border, and `accent.900` text. |
| Pressed/active | `accent.50` background and `accent.700` text. |
| Disabled | `surface.muted` background with `text.faint`; no hover change. |
| Destructive | `danger.600` text or fill; hover uses `danger.50`. |
| Warning | `warning.50` background with `warning.700` text and `warning.600` icon. |
| Error/conflict | `danger.50` background with `danger.700` text and `danger.600` icon. |
| Success/synchronized | `success.50` background with `success.700` text and `success.600` icon. |
| Dirty/uncommitted | A small `accent.500` dot; the surrounding item retains its normal selection and validation colours. |

### Workspace Structure

- Workspace Shell:
  - Title Bar
  - Activity Bar
  - Primary Sidebar
  - Editor Area
  - Secondary Sidebar
  - Bottom Panel
  - Status Bar
  - Command Palette

| Element | Applied theme |
| --- | --- |
| Workspace Shell | `colors.canvas` background, `colors.text.primary` text, and `fontFamily.sans`. Its grid uses `--workbench-title-bar-height`, `--workbench-activity-bar-width`, `--workbench-status-bar-height`, and the current sidebar and panel dimensions. Layout changes use `--duration-layout` and `--easing-standard`. |
| Title Bar | `colors.chrome.title` background, `colors.border.subtle` bottom border, `colors.text.secondary` standard text, and `colors.text.primary` workspace name. Uses `--workbench-title-bar-height`, `fontSize.ui`, `fontWeight.medium`, and compact controls based on `--control-height-compact`. |
| Activity Bar | `colors.chrome.activity` background, `colors.text.faint` inactive icons, `colors.text.inverse` hovered icons, and `colors.chrome.activityHover` hover background. The selected activity uses `colors.accent.500`. Uses `--workbench-activity-bar-width`, `--icon-size-default`, and `--duration-fast`. |
| Primary Sidebar | `colors.surface.subtle` background, `colors.border.subtle` right border, `colors.text.secondary` standard text, and `colors.text.primary` active labels. Uses `--workbench-primary-sidebar-width` with `--workbench-sidebar-min-width` and `--workbench-sidebar-max-width`. Tree rows use `--tree-row-height`; selection uses the Selected state mapping. |
| Editor Area | `colors.canvas` outer background with `colors.surface.DEFAULT` designer surfaces, `colors.text.primary` content, and `--workbench-editor-padding`. Designer content uses `--workbench-editor-max-width`. The tab strip uses `--workbench-editor-tabs-height`, `colors.surface.subtle`, and `colors.border.subtle`; selected tabs use the Selected state mapping and dirty tabs use the Dirty state mapping. Titles use `fontSize.title`, `lineHeight.title`, and `fontWeight.bold`. Technical names use `fontFamily.mono`. |
| Secondary Sidebar | `colors.surface.subtle` background, `colors.border.subtle` left border, and the same text hierarchy and compact controls as the Primary Sidebar. Uses `--workbench-secondary-sidebar-width` with the shared sidebar minimum and maximum widths. |
| Bottom Panel | `colors.surface.DEFAULT` background, `colors.border.DEFAULT` top border, `colors.text.primary` content, and `colors.text.muted` supporting details. Uses `--workbench-bottom-panel-height`; panel headings use `fontSize.ui` and `fontWeight.semibold`. Warning, error, conflict, and success entries use their corresponding state mappings. |
| Status Bar | `colors.chrome.status` background with `colors.text.inverse` text and icons. Uses `--workbench-status-bar-height`, `fontSize.caption`, `lineHeight.caption`, and compact icons based on `--icon-size-compact`. Status items use semantic success, warning, or danger tokens when attention is required. |
| Command Palette | `colors.surface.DEFAULT` background, `colors.border.DEFAULT` border, `borderRadius.lg`, and `boxShadow.overlay`. Uses `colors.text.primary` results, `colors.text.muted` supporting text, the Selected state mapping for the active result, and the Keyboard focus mapping for its input. It appears at `--z-command-palette`; opening and selection transitions use `--duration-fast`. |

### Primary Sidebar

#### Common

| Element | Purpose and location | Applied theme and specific style |
| --- | --- | --- |
| `sidebar-view-header` | First row at the top of every Primary Sidebar view. Contains the view title and its right-aligned actions. | Height `--workbench-sidebar-title-height` (`2.25rem`); full width; horizontal layout with vertically centred contents and space between the title and actions; `0.5rem` horizontal padding; `colors.surface.subtle` background; `colors.border.subtle` bottom border. |
| `sidebar-view-title` | Identifies the active sidebar view, such as Explorer or Version Control. | `fontFamily.sans`; `fontSize.ui` (`0.75rem`); `lineHeight.ui` (`1rem`); `fontWeight.semibold` (`600`); `colors.text.secondary`; uppercase text; `0.08em` letter spacing; single line with overflow truncated. |
| `sidebar-view-actions` | Holds contextual actions at the right side of the sidebar header. | Horizontal layout; vertically centred; `0.25rem` gap; does not shrink; uses compact controls. |
| `sidebar-view-count` | Shows a numeric count beside the active sidebar title, immediately before the More Actions button within `sidebar-view-actions`. Hidden when the count is zero. | Minimum width `1.25rem`; height `1.25rem`; `0.375rem` horizontal padding; inline-flex layout with centred contents; `borderRadius.full`; `colors.surface.muted` background; `colors.text.secondary`; `fontFamily.sans`; `fontSize.caption` (`0.625rem`); `lineHeight.caption` (`0.875rem`); `fontWeight.semibold` (`600`); tabular numerals; does not shrink. |
| `sidebar-view-menu-trigger` | Three-dot More Actions button within `sidebar-view-actions`. Opens the menu belonging to the active sidebar view. | `1.5rem` square icon button; Lucide `MoreHorizontal` at `--icon-size-compact` (`0.875rem`); `borderRadius.sm` (`0.25rem`); transparent background; `colors.text.muted`. Hover uses `colors.surface.muted` and `colors.text.primary`; keyboard focus uses the standard focus mapping. Its popup uses `colors.surface.DEFAULT`, `colors.border.DEFAULT`, `borderRadius.md`, `boxShadow.floating`, and `--z-dropdown`. |

#### Explorer

| Element | Styling | Content |
| --- | --- | --- |
| `sidebar-view-header` | No Explorer-specific override. | Contains `sidebar-view-title` and `sidebar-view-actions`. |
| `sidebar-view-title` | No Explorer-specific override. | Explorer |
| `sidebar-view-actions` | No Explorer-specific override. | Contains `sidebar-view-menu-trigger`. |
| `sidebar-view-menu-trigger` | No Explorer-specific override. | Lucide `MoreHorizontal` icon. Menu items: Import and Export. |
| `explorer-tree` | Full available width; no list marker, margin, or padding; `colors.surface.subtle` background; `fontFamily.sans`; `fontSize.body` (`0.875rem`); `lineHeight.body` (`1.25rem`); `colors.text.secondary`. | Contains the Record Types, Data Types, Applications, and Data Flows root `tree-item` elements. |
| `tree-item` | No list marker; full available width; minimum width `0`; content may wrap only when it cannot be truncated safely. It has no independent background because visible states belong to `tree-item-row`. | Contains one `tree-item-row` and, when expandable, one `tree-item-children` group. |
| `tree-item-row` | Minimum height `--tree-row-height` (`1.75rem`); full width; horizontal layout; vertically centred; `0.375rem` horizontal padding; `borderRadius.sm`; transparent background. Hover uses `colors.surface.muted` and `colors.text.primary`. Keyboard focus uses the standard focus mapping. The current item uses the Selected state mapping. State transitions use `--duration-fast`. | Contains the expander, icon, label, and optional actions for one visible hierarchy entry. Clicking its label opens the associated editor; clicking its non-label area may expand or collapse it. |
| `tree-item-expander` | `--icon-size-default` (`1rem`) square; does not shrink; `0.125rem` right margin; `colors.text.muted`; transparent background and border. Rotates `90deg` when expanded using `--duration-fast` and `--easing-standard`. A non-expandable item reserves the same space with an invisible spacer. | Lucide `ChevronRight` for expandable items. |
| `tree-item-icon` | `--icon-size-compact` (`0.875rem`) square; does not shrink; `0.375rem` right margin. Colour comes from the entity tokens: `entity.recordType`, `entity.dataType`, `entity.dataScope`, or `text.muted` for structural folders. | Displays the icon that identifies the entity or structural node represented by the row. |
| `tree-item-label` | Minimum width `0`; fills remaining row width; single line with ellipsis overflow; transparent background and border; `colors.text.secondary` at rest and `colors.text.primary` on hover or selection. Structural labels use `fontFamily.sans` and `fontWeight.medium`; model identifiers use `fontFamily.mono` and `fontWeight.regular`. | Displays the root, category, record-type, data-type, subtype, data-scope, or data-flow name and acts as the item’s navigation target when applicable. |
| `tree-item-actions` | Pushed to the far right; horizontal layout; vertically centred; `0.125rem` gap; does not shrink. Hidden at rest and shown when `tree-item-row` is hovered or contains keyboard focus. Each action is `--control-height-compact` (`1.5rem`) square with `borderRadius.sm`, transparent background, `colors.text.muted`, and `--icon-size-compact`; hover uses `colors.surface.muted` and `colors.text.primary`. | Contains contextual Add and More Actions controls when they are valid for the item. |
| `tree-item-children` | No list marker or margin; `1rem` left padding; full available width. Nested rows otherwise retain the same height and state styling as their parents. | Contains the nested `tree-item` elements belonging to an expandable item. |

#### Version Control

| Element | Styling | Content |
| --- | --- | --- |
| `sidebar-view-header` | Uses the shared Primary Sidebar header style. The title truncates before the fixed-width actions when space is limited. | Contains `sidebar-view-title` and `sidebar-view-actions`. |
| `sidebar-view-title` | No Version Control-specific override. | Source Control |
| `sidebar-view-actions` | No Version Control-specific override. | Contains `sidebar-view-count` followed by `sidebar-view-menu-trigger`. |
| `sidebar-view-count` | Uses the shared compact count badge. Hidden when its value is zero; values above `99` display as `99+`. | Number of pending changes. |
| `sidebar-view-menu-trigger` | No Version Control-specific override. | Lucide `MoreHorizontal` icon and Version Control commands. |
| `select-control` | Full available width; height `--control-height-default` (`2rem`); `0.5rem` horizontal padding; `borderRadius.md`; `colors.surface.DEFAULT` background; `colors.border.DEFAULT` border; `colors.text.primary`; `fontSize.ui`; keyboard focus uses the standard focus mapping. | Repository combo box showing the active repository and allowing another repository to be selected. |
| `button-primary` | Minimum height `--control-height-default`; `0.75rem` horizontal padding; `borderRadius.md`; no visible border; `colors.accent.600` background; `colors.text.inverse`; `fontSize.ui`; `fontWeight.semibold`. Hover uses `colors.accent.700`; disabled state uses `colors.surface.muted` and `colors.text.faint`; keyboard focus uses the standard focus mapping. | Commit, Pull, and confirmation actions. |
| `button-secondary` | Minimum height `--control-height-default`; `0.75rem` horizontal padding; `borderRadius.md`; `colors.surface.DEFAULT` background; `colors.border.DEFAULT` border; `colors.text.secondary`; `fontSize.ui`. Hover uses `colors.surface.muted` and `colors.text.primary`; keyboard focus uses the standard focus mapping. | Create Fork, Cancel, and other supporting actions. |
| `text-input` | Full available width; minimum height `--control-height-default`; `0.5rem` horizontal padding; `borderRadius.md`; `colors.surface.DEFAULT` background; `colors.border.DEFAULT` border; `colors.text.primary`; `fontSize.ui`; placeholder uses `colors.text.faint`; keyboard focus uses the standard focus mapping. | Commit message or fork name entry. |
| `section-title` | `0.5rem` horizontal padding; `fontFamily.sans`; `fontSize.ui`; `lineHeight.ui`; `fontWeight.semibold`; uppercase; `0.06em` letter spacing; `colors.text.secondary`. | Changes and History section headings. |
| `item-title` | Single line with ellipsis overflow; `fontFamily.sans`; `fontSize.ui`; `lineHeight.ui`; `fontWeight.semibold`; `colors.text.primary`. | Human-readable change description or commit message. |
| `metadata-text` | Single line with ellipsis overflow; `fontFamily.sans`; `fontSize.caption`; `lineHeight.caption`; `fontWeight.regular`; `colors.text.muted`. Technical identifiers may use `fontFamily.mono`. | Repository type, layer, upstream, revision, date, and other supporting details. |
| `status-text` | `fontFamily.sans`; `fontSize.ui`; `lineHeight.body`; `fontWeight.regular`; `colors.text.secondary`. Semantic states use the corresponding success, warning, or info colour. | Pull status, synchronization status, and empty-state messages. |
| `error-text` | `0.5rem` padding; `borderRadius.md`; `colors.danger.50` background; `colors.danger.700` text; `fontSize.ui`; `lineHeight.body`. | Conflicts, loading failures, and operation errors. |
| `list-row` | Minimum height `--tree-row-height`; horizontal or compact stacked layout according to its content; `0.375rem` horizontal and `0.25rem` vertical padding; `borderRadius.sm`; transparent background. Hover uses `colors.surface.muted`; selected state uses the Selected state mapping. | One pending change or history entry containing `item-title` and optional `metadata-text`. |
