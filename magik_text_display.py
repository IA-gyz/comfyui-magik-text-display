"""Text preview with browser-side typography and unchanged text output."""

FONTS = [
    "Sans-serif", "Serif", "Monospace", "System UI",
    "Noto Sans", "Noto Serif", "Noto Sans Mono",
    "DejaVu Sans", "DejaVu Serif", "DejaVu Sans Mono",
    "Liberation Sans", "Liberation Serif", "Liberation Mono",
    "Arial", "Georgia", "Verdana", "Courier New",
]


class MagikTextDisplay:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "text": ("STRING", {"forceInput": True}),
            "font": (FONTS, {"default": "Sans-serif"}),
            "font_size": ("INT", {"default": 20, "min": 1, "max": 128, "step": 1}),
            "autofit": ("BOOLEAN", {"default": False}),
        }}

    INPUT_IS_LIST = True
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    OUTPUT_IS_LIST = (True,)
    FUNCTION = "display"
    CATEGORY = "Magik/Text"
    OUTPUT_NODE = True
    DESCRIPTION = "Display incoming text using selectable fonts and sizes from 1 to 128 px; enable autofit to fill the preview area."

    def display(self, text, font, font_size, autofit):
        # Consume the complete input list once so the preview includes every item.
        return {"ui": {"text": list(text)}, "result": (list(text),)}
