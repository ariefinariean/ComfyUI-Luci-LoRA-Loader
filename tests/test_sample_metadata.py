import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('sample_civitai', pathlib.Path(__file__).parents[1] / 'civitai.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SampleMetadataTests(unittest.TestCase):
    def test_model_and_sample_fields_are_bounded(self):
        data = module.normalize_version({'id': 2, 'modelId': 1, 'name': 'v2', 'model': {'name': 'Mood', 'type': 'LORA'}, 'images': [{'url': 'https://image.civitai.com/sample.png', 'nsfw': False, 'width': 1024, 'height': 1536, 'meta': {'prompt': 'x' * 14000, 'seed': 42, 'steps': 8, 'unknown': 'ignored', 'sampler': {'bad': 'shape'}}}]})
        self.assertEqual(data['modelName'], 'Mood')
        self.assertEqual(data['images'][0]['meta']['seed'], '42')
        self.assertEqual(len(data['images'][0]['meta']['prompt']), 12000)
        self.assertNotIn('unknown', data['images'][0]['meta'])
        self.assertNotIn('sampler', data['images'][0]['meta'])

    def test_missing_sample_metadata_is_empty(self):
        data = module.normalize_version({'images': [{'url': 'https://image.civitai.com/sample.png'}]})
        self.assertEqual(data['images'][0]['meta'], {})
        self.assertTrue(data['images'][0]['mature'])
