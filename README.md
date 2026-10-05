# 👻 Luci LoRA Loader

v0.2.8 aligns strength and notes fields and uses individual sample ratings,
not the model-level mature flag, when deciding which previews to display.
Unknown and mature sample ratings still require the opt-in setting.

## Panel layout update (v0.2.7)

The actual details panel now uses the approved concept structure: header lookup,
model information beside Preview, strength guidance beside personal notes,
trigger controls and sample gallery below. Narrow windows stack these regions.
The component harness is available via `node tests/details_preview.mjs`.

## Preview update (v0.2.6)

After explicit Civitai lookup, an empty **Preview** saves the first permitted
sample image as a browser-local copy. Existing previews are not overwritten.
You can replace it with your own PNG/JPEG/WebP or remove it. Images are limited
to 5 MB. Preview filtering settings still apply. If Civitai blocks browser
downloads or storage is unavailable, a warning is shown and manual upload
remains available. Removing it allows a subsequent lookup to fill it again.

## Details update (v0.2.5)

Explicit Civitai lookup now shows filename, SHA-256, model name, version,
type, base model, trained words and the model link. Up to 12 permitted samples
have expandable generation settings and copyable positive/negative prompts.
Missing metadata is shown as Not provided; sample settings are never applied.
Personal notes and uploaded previews are browser-local and are not in workflows.

The details panel now includes **Your preview image**: choose a PNG, JPEG or
WebP up to 5 MB, replace it, or remove it. Images are saved per LoRA filename
in this browser's IndexedDB, not uploaded to a service or embedded in workflows.
They do not transfer to another browser and clearing site data removes them.
This is independent of the optional Civitai previews.

A standalone ComfyUI custom node in the 👻 Luci category. Apply a stack of LoRAs with separate MODEL and CLIP strengths, local trigger words, and visible missing-file warnings.

v0.2.4 uses charcoal surfaces with mint accents, separate MODEL/CLIP strengths, folder navigation, optional Civitai lookup and previews, and compact non-scrolling rows. The toolbar provides refresh and settings icons. Settings cover default strength, arrow step, trigger separator, memory mode, filename extensions, browser-saved defaults and optional online metadata.

## Installation

Extract this folder into `ComfyUI/custom_nodes/ComfyUI-Luci-LoRA-Loader`, restart ComfyUI, then refresh the browser. Search for **👻 Luci LoRA Loader**. No additional Python packages are needed beyond ComfyUI's dependencies. This pack does not replace Pixaroma, AusBoss or Power Model Loader.

## Use

1. Connect your MODEL and, optionally, CLIP. Outputs stay in the standard top-right positions.
2. Click **+ Add LoRA**, choose a file, then set the always-visible MODEL and CLIP boxes. The enabled-count/refresh toolbar uses the empty area between the top sockets.
3. Click **i** for local file details, editable suggested low/max strengths and trigger chips. Add your own words, or select locally discovered ones. Suggestions are user-defined guidance, not automatic best settings.
4. Connect the `triggers` STRING output into your positive prompt text composition. It does not automatically insert words into a prompt or enable a LoRA by matching words.
5. Right-click a row to move, duplicate or delete only that LoRA.

Missing files retain a red warning row and are skipped; their words never reach the triggers output. Corrupt or incompatible files raise an error naming the file. An enabled, present LoRA at zero strengths is a deliberate no-op but retains its selected words. Duplicate trigger words are removed case-insensitively.

**Saved LoRA stacks** are available in the gear settings and persist in browser local storage. Workflows independently preserve all rows through the standard `stack` STRING input. Presets are browser-specific, not synced to another device. Loading a preset replaces this node's stack, not any other nodes.

### Compact layout and canvas hit-area update (v0.2.4)

The DOM widget has bounded height and a click-through root and outer renderer frame to address the canvas dead area below the node. The hidden backing editor and its frame are excluded from mouse hit testing.

The empty node no longer reserves a blank list or stacks footer. Each row has independent MODEL/CLIP values with explicit up/down buttons; their labels share the trigger-text line. Right-click a row to move, duplicate or delete it. Add LoRA remains outside the non-scrolling list. Loading an existing node recalculates its height for the current contents.

Replace the existing custom-node folder rather than installing a second copy. Restart ComfyUI and hard-refresh the browser to load the new JavaScript and CSS.

Memory defaults to the last LoRA. Choose none or bounded (up to four files) in Settings. Caches invalidate when file size or modification time changes. Four large LoRAs can use substantial RAM.

Local metadata reads supported safetensors trigger fields and `.civitai.info` sidecars. The info panel also offers an explicit Civitai lookup by SHA-256 hash. Only the hash is sent, not the file. Anonymous lookup is the default; optional keys are stored in browser local storage, not in the workflow, presets, server files, or logs. Browser storage is not encrypted and other extensions on the same origin may access it. Remove keys using Settings. Lookup uses the documented [Civitai API](https://github.com/civitai/civitai/wiki/REST-API-Reference).

Settings control lookup visibility, previews, and mature-rated previews (off by default). Unknown ratings are hidden conservatively. Up to four permitted Civitai previews appear only after a requested lookup; images load directly from image.civitai.com with no-referrer. API ratings are not a guarantee of safe content. Disable previews if needed. Lookup failure does not affect generation. Metadata words are offered as chips, not silently added to the prompt. No chain import or XY sweep integration is included yet.

## Verification

Backend unit tests cover strengths, missing files, disabled rows, optional CLIP, metadata API compatibility, ordering, trigger deduplication, failures and cache invalidation. Frontend state tests cover serialization and reordering. These tests use stand-ins, not GPU inference. Live ComfyUI execution and renderer compatibility still require an installation smoke test; do not treat passing unit tests as a live-generation guarantee.

## License

MIT. Original implementation; existing loaders were inspected as behavioral references, not vendored into this package.
