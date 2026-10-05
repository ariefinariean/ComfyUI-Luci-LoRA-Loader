"""Original Luci stack loader. UI state travels through a standard STRING input."""
import inspect
import json
import math
import os
import logging
from collections import OrderedDict

import folder_paths
import comfy.sd
import comfy.utils

log = logging.getLogger(__name__)


def parse_state(value):
    try:
        state = json.loads(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Luci LoRA Loader: invalid stack JSON") from exc
    if not isinstance(state, dict) or not isinstance(state.get("rows", []), list):
        raise ValueError("Luci LoRA Loader: stack must contain a rows list")
    rows = state.get("rows", [])
    if len(rows) > 256:
        raise ValueError("Luci LoRA Loader: maximum 256 rows")
    for row in rows:
        if not isinstance(row, dict) or not isinstance(row.get("name", ""), str):
            raise ValueError("Luci LoRA Loader: invalid row")
        for key in ("model", "clip"):
            v = row.get(key, 1)
            if isinstance(v, bool) or not isinstance(v, (float, int)) or not math.isfinite(v) or not -10 <= v <= 10:
                raise ValueError(f"Luci LoRA Loader: {key} strength must be finite and between -10 and 10")
        if not isinstance(row.get("selected", []), list) or not all(isinstance(w, str) for w in row.get("selected", [])):
            raise ValueError("Luci LoRA Loader: trigger words must be a list of strings")
    return state


def supports(fn, argument):
    try:
        return argument in inspect.signature(fn).parameters
    except (ValueError, TypeError):
        return False


class LuciLoRALoader:
    CATEGORY = "👻 Luci/Loaders"
    DESCRIPTION = "Apply LoRAs in row order. Missing files warn and skip. Connect triggers to your prompt; this output does not modify the prompt automatically."
    RETURN_TYPES = ("MODEL", "CLIP", "STRING")
    RETURN_NAMES = ("MODEL", "CLIP", "triggers")
    FUNCTION = "apply"

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"model": ("MODEL",), "stack": ("STRING", {"default": '{"rows":[]}', "multiline": True})}, "optional": {"clip": ("CLIP",)}}

    @classmethod
    def VALIDATE_INPUTS(cls, stack):
        try:
            parse_state(stack)
            return True
        except ValueError as exc:
            return str(exc)

    @classmethod
    def IS_CHANGED(cls, stack, **kwargs):
        state = parse_state(stack)
        stamps = []
        for row in state.get("rows", []):
            if row.get("on", True) and row.get("name"):
                path = folder_paths.get_full_path("loras", row["name"])
                try:
                    stat = os.stat(path) if path else None
                    stamps.append((row["name"], stat.st_mtime_ns, stat.st_size) if stat else (row["name"], None))
                except OSError:
                    stamps.append((row["name"], None))
        return json.dumps(stamps)

    def __init__(self):
        self.cache = OrderedDict()

    def apply(self, model, stack, clip=None):
        state = parse_state(stack)
        words, seen, skipped = [], set(), []
        applied = 0
        mode = state.get("cache", "last")
        limit = 0 if mode == "none" else 4 if mode == "bounded" else 1
        while len(self.cache) > limit:
            self.cache.popitem(last=False)
        for row in state.get("rows", []):
            name = row.get("name", "")
            if not row.get("on", True) or not name:
                continue
            path = folder_paths.get_full_path("loras", name)
            if not path or not os.path.isfile(path):
                skipped.append(name)
                log.warning("[Luci LoRA Loader] Missing file, skipped: %s", name)
                continue
            sm, sc = row.get("model", 1), row.get("clip", 1) if clip is not None else 0
            if sm != 0 or sc != 0:
                stat = os.stat(path)
                key = (path, stat.st_mtime_ns, stat.st_size)
                try:
                    if key in self.cache:
                        data, metadata = self.cache.pop(key)
                    elif supports(comfy.utils.load_torch_file, "return_metadata"):
                        data, metadata = comfy.utils.load_torch_file(path, safe_load=True, return_metadata=True)
                    else:
                        data, metadata = comfy.utils.load_torch_file(path, safe_load=True), None
                    if limit:
                        self.cache[key] = (data, metadata)
                        while len(self.cache) > limit:
                            self.cache.popitem(last=False)
                    options = {"lora_metadata": metadata} if supports(comfy.sd.load_lora_for_models, "lora_metadata") else {}
                    model, clip = comfy.sd.load_lora_for_models(model, clip, data, sm, sc, **options)
                except Exception as exc:
                    self.cache.pop(key, None)
                    raise RuntimeError(f"Luci LoRA Loader could not apply '{name}': {exc}") from exc
                applied += 1
            for word in row.get("selected", []):
                word = word.strip()
                if word and word.casefold() not in seen:
                    words.append(word)
                    seen.add(word.casefold())
        separator = state.get("separator", ", ")
        if not isinstance(separator, str):
            separator = ", "
        return {"ui": {"luci_status": [{"applied": applied, "missing": skipped}]}, "result": (model, clip, separator.join(words))}
