"""Safe normalization and bounded, mtime-aware hashes for explicit Civitai lookups."""
import hashlib
import os
from collections import OrderedDict
from urllib.parse import urlparse

_hashes = OrderedDict()


def file_hash(path):
    stat = os.stat(path)
    key = (path, stat.st_mtime_ns, stat.st_size)
    if key in _hashes:
        value = _hashes.pop(key)
        _hashes[key] = value
        return value
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    after = os.stat(path)
    if (stat.st_mtime_ns, stat.st_size) != (after.st_mtime_ns, after.st_size):
        raise ValueError('LoRA changed while hashing. Retry after the file finishes saving.')
    value = digest.hexdigest()
    _hashes[key] = value
    while len(_hashes) > 64:
        _hashes.popitem(last=False)
    return value


def safe_image_url(value):
    if not isinstance(value, str):
        return False
    try:
        url = urlparse(value)
        return url.scheme == 'https' and url.hostname == 'image.civitai.com' and not url.username and not url.password and url.port in (None, 443)
    except ValueError:
        return False


def mature(image, model):
    if model.get('nsfw') is True:
        return True
    rating = image.get('nsfw')
    if rating is True:
        return True
    if isinstance(rating, str) and rating.lower() not in ('none', 'false', 'sfw', 'safe'):
        return True
    level = image.get('nsfwLevel')
    if isinstance(level, (int, float)):
        return level > 1
    # Unknown ratings are treated conservatively.
    return not (rating is False or (isinstance(rating, str) and rating.lower() in ('none', 'false', 'sfw', 'safe')))


def normalize_version(data):
    if not isinstance(data, dict):
        raise ValueError('Invalid Civitai response')
    model = data.get('model') if isinstance(data.get('model'), dict) else {}
    words = data.get('trainedWords', [])
    if not isinstance(words, list):
        words = []
    images = []
    for item in data.get('images', []) if isinstance(data.get('images'), list) else []:
        if isinstance(item, dict) and item.get('type', 'image') == 'image' and safe_image_url(item.get('url')):
            images.append({'url': item['url'], 'mature': mature(item, model)})
        if len(images) == 12:
            break
    model_id, version_id = data.get('modelId'), data.get('id')
    url = f'https://civitai.com/models/{model_id}?modelVersionId={version_id}' if isinstance(model_id, int) and isinstance(version_id, int) else None
    return {'name': str(data.get('name', '')), 'family': str(data.get('baseModel', 'Unknown')), 'words': list(dict.fromkeys(w.strip() for w in words if isinstance(w, str) and w.strip())), 'images': images, 'url': url}
