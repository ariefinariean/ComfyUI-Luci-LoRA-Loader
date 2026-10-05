# v0.2.4 verification

Targets the outer renderer DOM-widget frame, not just the inner root: scoped host markers and CSS disable frame hit testing while actual child controls retain pointer-events. Hidden STRING options remain hidden if replaced by the renderer, and the backing frame is hidden. Layout now declares maxHeight as well. Twelve frontend tests pass including host marking and options replacement. Actual live ComfyUI canvas dragging remains unverified.

Canvas hit-area patch: DOM widget now supplies both minimum and maximum height callbacks; its root gets explicit content-derived height/max-height and click-through pointer behavior. The hidden STRING editor is also disabled for hit testing. Twelve JavaScript tests pass, including bounds updates after adding a row. Actual browser hit testing below the node remains unverified; DOM-stub tests cannot prove canvas dragging.

Compact update: empty list and permanent footer removed; saved stacks moved into settings; explicit independent strength steppers; labels and trigger caption on one line; ellipsis removed with right-click actions preserved. Default width is 380 and empty content height is 56 (node floor 146). Existing nodes recalculate height on configure. All 29 tests pass (18 Python, 11 JavaScript), including two DOM-stub interaction tests for empty layout and strength buttons. JavaScript syntax passes. DOM stubs do not validate pixels: actual ComfyUI socket alignment, CSS geometry and resize behavior remain unverified.

v0.2.0 adds explicitly requested Civitai hash lookup, optional browser-local credential storage, remote trigger chips and preview settings with conservative rating filtering. Six additional helper/security tests cover hash invalidation, allowed image hosts, rating classification, normalization and credential separation. Live Civitai lookup, credentials, browser previews and actual ComfyUI UI remain unverified. No private key or model hash was used to contact Civitai during development.

v0.1.4: charcoal/mint surfaces, compact refresh/settings icon controls, functional settings panel, safe resize clamping and grid-based row controls. Source checks and backend tests pass. Live ComfyUI UI verification is still pending; browser control is unavailable in this session.

v0.1.3 replaces the scrolling-row design with content-based minimum height and structural height fitting, preserving the current width. LoRA stack overflow is explicitly visible, not scrollable. Live ComfyUI appearance remains unverified.

User screenshots confirmed v0.1.0 socket overlap and rigid resizing. Fixed: no full-widget upward shift or opaque socket-band coverage; toolbar-only center positioning with a border; fixed-size bounds and forced resize calls removed; scrollable rows and a 320px width floor; folder navigation with exact path preservation. Five additional folder/layout regression tests pass. Live ComfyUI visual verification remains pending; these source-level checks are not a substitute for it.

Passed: 11 Python backend tests, 4 JavaScript state tests, JavaScript syntax check. Cases include independent strengths, optional CLIP, missing-file skip with no triggers, disabled/empty rows, zero-strength semantics, row order, deduplication, old/new ComfyUI APIs, internal errors, and cache invalidation.

Not verified: GPU generation, actual ComfyUI widget geometry, workflow restoration in the live renderer, and browser interactions. Browser control became unavailable before the UI harness could be inspected. The harness is included under tests and is not loaded by ComfyUI.

The running ComfyUI was not restarted, its workflow was not modified, and this pack has not been installed automatically. Install in custom_nodes and restart, then first verify top-toolbar positioning, narrowing the node, right-click deletion, workflow save/reload, and one enabled-LoRA generation. Do not publish as production-tested until these checks pass.
