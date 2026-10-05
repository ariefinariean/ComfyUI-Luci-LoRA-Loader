"""Local-only list/metadata endpoints; never fetch remote metadata automatically."""
import json
import os
import struct
import asyncio
from urllib.parse import urlparse
from aiohttp import ClientSession, ClientTimeout, ClientError
from aiohttp import web
import folder_paths
from server import PromptServer
from .civitai import file_hash, normalize_version


@PromptServer.instance.routes.get('/luci/lora/list')
async def list_loras(request):
    return web.json_response({"files": folder_paths.get_filename_list("loras")})


@PromptServer.instance.routes.get('/luci/lora/info')
async def info(request):
    name = request.query.get("name", "")
    if name not in folder_paths.get_filename_list("loras"):
        return web.json_response({"missing": True, "words": []})
    path = folder_paths.get_full_path("loras", name)
    metadata, words = {}, []
    try:
        if path and path.lower().endswith('.safetensors'):
            with open(path, 'rb') as handle:
                length = struct.unpack('<Q', handle.read(8))[0]
                if length > 16 * 1024 * 1024:
                    raise ValueError("Metadata header exceeds safe limit")
                metadata = json.loads(handle.read(length)).get('__metadata__', {})
        for key in ('trigger_words', 'trainedWords', 'ss_trigger_words'):
            value = metadata.get(key)
            if isinstance(value, str):
                words.extend(w.strip() for w in value.split(',') if w.strip())
        # Sidecar is only read beside a validated local LoRA path.
        sidecar = os.path.splitext(path)[0] + '.civitai.info'
        if os.path.isfile(sidecar) and os.path.getsize(sidecar) <= 1024 * 1024:
            with open(sidecar, encoding='utf-8') as handle:
                data = json.load(handle)
            words.extend(w for w in data.get('trainedWords', []) if isinstance(w, str))
        return web.json_response({"missing": False, "size": os.path.getsize(path), "words": list(dict.fromkeys(words)), "family": metadata.get('ss_base_model_version', metadata.get('modelspec.architecture', 'Unknown'))})
    except (OSError, ValueError, struct.error, TypeError, AttributeError) as exc:
        return web.json_response({"missing": False, "words": [], "warning": str(exc)})


@PromptServer.instance.routes.post('/luci/lora/civitai')
async def civitai_lookup(request):
    # Credential never goes into workflow state, URL query parameters, logs,
    # filesystem, or metadata cache. Same-origin JSON POST only.
    origin = request.headers.get('Origin')
    if origin and urlparse(origin).netloc != request.host:
        return web.json_response({'error': 'Cross-origin lookup refused'}, status=403)
    if request.content_type != 'application/json' or request.content_length is None or request.content_length > 8192:
        return web.json_response({'error': 'Expected a small JSON request'}, status=400)
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise ValueError('Invalid lookup request')
        name, key = body.get('name', ''), body.get('key', '')
        if not isinstance(name, str) or name not in folder_paths.get_filename_list('loras'):
            return web.json_response({'error': 'LoRA file is missing'}, status=404)
        if not isinstance(key, str) or len(key) > 1024 or any(c in key for c in '\r\n'):
            raise ValueError('Invalid API key format')
        path = folder_paths.get_full_path('loras', name)
        digest = await asyncio.to_thread(file_hash, path)
        headers = {'Accept': 'application/json'}
        if key.strip():
            headers['Authorization'] = 'Bearer ' + key.strip()
        async with ClientSession(timeout=ClientTimeout(total=30)) as session:
            async with session.get('https://civitai.com/api/v1/model-versions/by-hash/' + digest, headers=headers, allow_redirects=False) as response:
                if response.status != 200:
                    messages = {404: 'No matching Civitai version found', 401: 'Civitai rejected the API key', 403: 'Civitai denied access', 429: 'Civitai rate limit reached; try again later'}
                    return web.json_response({'error': messages.get(response.status, 'Civitai lookup failed (HTTP ' + str(response.status) + ')')}, status=502)
                raw = bytearray()
                async for chunk in response.content.iter_chunked(65536):
                    raw.extend(chunk)
                    if len(raw) > 4 * 1024 * 1024:
                        raise ValueError('Civitai metadata is too large')
                result = normalize_version(json.loads(raw))
        return web.json_response(result)
    except (OSError, ValueError, TypeError):
        return web.json_response({'error': 'Could not read file or parse Civitai metadata'}, status=400)
    except (ClientError, asyncio.TimeoutError):
        return web.json_response({'error': 'Civitai is unreachable or timed out. Local metadata still works.'}, status=502)
