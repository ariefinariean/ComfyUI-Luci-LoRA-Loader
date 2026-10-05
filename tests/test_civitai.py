import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('luci_civitai', Path(__file__).parents[1] / 'civitai.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CivitaiTests(unittest.TestCase):
    def test_hash_and_invalidation(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test'
            path.write_bytes(b'one')
            self.assertEqual(module.file_hash(path), hashlib.sha256(b'one').hexdigest())
            path.write_bytes(b'two different')
            self.assertEqual(module.file_hash(path), hashlib.sha256(b'two different').hexdigest())

    def test_allowed_preview_host(self):
        self.assertTrue(module.safe_image_url('https://image.civitai.com/test.jpg'))
        for url in ('http://image.civitai.com/test', 'https://evil.example/test', 'https://image.civitai.com.evil.test/a', 'https://user:pass@image.civitai.com/a', 'https://image.civitai.com:invalid/a'):
            self.assertFalse(module.safe_image_url(url))

    def test_ratings_fail_closed(self):
        self.assertTrue(module.mature({}, {}))
        self.assertFalse(module.mature({'nsfw': 'None'}, {}))
        self.assertTrue(module.mature({'nsfw': 'Mature'}, {}))
        self.assertFalse(module.mature({'nsfwLevel': 1}, {}))
        self.assertTrue(module.mature({'nsfwLevel': 2}, {}))
        self.assertTrue(module.mature({'nsfw': False}, {'nsfw': True}))

    def test_normalization_dedups_and_rejects_bad_images(self):
        data = {'id': 12, 'modelId': 8, 'trainedWords': ['cat', 'cat', None, ' dog '], 'images': [{'url': 'https://image.civitai.com/a', 'nsfw': False}, {'url': 'https://evil.example/b', 'nsfw': False}]}
        out = module.normalize_version(data)
        self.assertEqual(out['words'], ['cat', 'dog'])
        self.assertEqual(len(out['images']), 1)
        self.assertFalse(out['images'][0]['mature'])
        self.assertEqual(out['url'], 'https://civitai.com/models/8?modelVersionId=12')

    def test_invalid_response(self):
        with self.assertRaises(ValueError):
            module.normalize_version([])

    def test_credential_not_in_workflow_or_query(self):
        root = Path(__file__).parents[1]
        js = (root / 'web/luci_lora.js').read_text(encoding='utf-8')
        self.assertNotIn('state.apiKey', js)
        self.assertNotIn('state.key', js)
        routes = (root / 'routes.py').read_text(encoding='utf-8')
        self.assertIn("headers['Authorization']", routes)
        self.assertIn('allow_redirects=False', routes)
        self.assertNotIn('?token=', routes)


if __name__ == '__main__':
    unittest.main()
