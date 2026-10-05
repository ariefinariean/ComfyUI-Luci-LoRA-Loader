from .lora_loader import LuciLoRALoader
from . import routes

NODE_CLASS_MAPPINGS = {"LuciLoRALoader": LuciLoRALoader}
NODE_DISPLAY_NAME_MAPPINGS = {"LuciLoRALoader": "👻 Luci LoRA Loader"}
WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
