import importlib.util
import json
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path

folder = types.ModuleType('folder_paths')
comfy = types.ModuleType('comfy'); comfy.sd = types.ModuleType('comfy.sd'); comfy.utils = types.ModuleType('comfy.utils')
sys.modules.update({'folder_paths': folder, 'comfy': comfy, 'comfy.sd': comfy.sd, 'comfy.utils': comfy.utils})
spec = importlib.util.spec_from_file_location('luci_loader', Path(__file__).parents[1] / 'lora_loader.py')
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)


class LoaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = os.path.join(self.temp.name, 'test.safetensors')
        Path(self.path).write_bytes(b'demo')
        folder.get_full_path = lambda category, name: self.path if name == 'test' else None
        self.loads = []; self.applies = []
        def load(path, safe_load=True, return_metadata=False):
            self.loads.append(path)
            return ({'weights': 1}, {'meta': 1}) if return_metadata else {'weights': 1}
        def apply(model, clip, data, sm, sc, lora_metadata=None):
            self.applies.append((sm, sc, lora_metadata))
            return model + 'L', clip + 'L' if clip else None
        comfy.utils.load_torch_file = load
        comfy.sd.load_lora_for_models = apply
        self.node = module.LuciLoRALoader()

    def state(self, rows, **settings):
        return json.dumps({'rows': rows, **settings})

    def row(self, **values):
        return {'name': 'test', 'on': True, 'model': .9, 'clip': .4, 'selected': ['trigger'], **values}

    def test_independent_strengths_metadata_and_output(self):
        out = self.node.apply('M', self.state([self.row()]), 'C')
        self.assertEqual(out['result'], ('ML', 'CL', 'trigger'))
        self.assertEqual(self.applies, [(.9, .4, {'meta': 1})])

    def test_missing_skips_without_trigger(self):
        out = self.node.apply('M', self.state([self.row(name='gone', selected=['wrong']), self.row()]), 'C')
        self.assertEqual(out['result'], ('ML', 'CL', 'trigger'))
        self.assertEqual(out['ui']['luci_status'][0]['missing'], ['gone'])

    def test_disabled_and_empty_pass_through(self):
        for rows in ([], [self.row(on=False)]):
            self.assertEqual(self.node.apply('M', self.state(rows), 'C')['result'], ('M', 'C', ''))
        self.assertEqual(self.loads, [])

    def test_clip_optional(self):
        self.assertEqual(self.node.apply('M', self.state([self.row()]))['result'], ('ML', None, 'trigger'))
        self.assertEqual(self.applies[0][1], 0)

    def test_zero_strength_keeps_selected_words_without_loading(self):
        out = self.node.apply('M', self.state([self.row(model=0, clip=0)]), 'C')
        self.assertEqual(out['result'], ('M', 'C', 'trigger'))
        self.assertFalse(self.loads)

    def test_order_and_dedup(self):
        out = self.node.apply('M', self.state([self.row(selected=['Cat', 'A']), self.row(selected=['cat', 'B'])]), 'C')
        self.assertEqual(out['result'], ('MLL', 'CLL', 'Cat, A, B'))

    def test_custom_trigger_separator(self):
        out = self.node.apply('M', self.state([self.row(selected=['one', 'two'])], separator=' | '), 'C')
        self.assertEqual(out['result'][2], 'one | two')

    def test_old_comfy_signatures(self):
        comfy.utils.load_torch_file = lambda path, safe_load=True: {'weights': 1}
        comfy.sd.load_lora_for_models = lambda model, clip, data, sm, sc: (model, clip)
        self.assertEqual(self.node.apply('M', self.state([self.row()]), 'C')['result'], ('M', 'C', 'trigger'))

    def test_real_typeerror_not_retried_or_hidden(self):
        def broken(*args, **kwargs):
            raise TypeError('internal load error')
        comfy.sd.load_lora_for_models = broken
        with self.assertRaisesRegex(RuntimeError, 'internal load error'):
            self.node.apply('M', self.state([self.row()]), 'C')

    def test_mtime_cache_invalidation(self):
        state = self.state([self.row()])
        before = self.node.IS_CHANGED(state)
        self.node.apply('M', state, 'C'); self.node.apply('M', state, 'C')
        self.assertEqual(len(self.loads), 1)
        Path(self.path).write_bytes(b'changed file')
        self.assertNotEqual(before, self.node.IS_CHANGED(state))
        self.node.apply('M', state, 'C')
        self.assertEqual(len(self.loads), 2)
        self.assertEqual(len(self.node.cache), 1)

    def test_none_cache(self):
        state = self.state([self.row()], cache='none')
        self.node.apply('M', state, 'C'); self.node.apply('M', state, 'C')
        self.assertEqual(len(self.loads), 2)
        self.assertFalse(self.node.cache)

    def test_invalid_state(self):
        for value in ('bad', '[]', self.state([self.row(model=float('nan'))]), self.state([self.row(clip=11)])):
            self.assertNotEqual(self.node.VALIDATE_INPUTS(value), True)


if __name__ == '__main__':
    unittest.main()
