# Magik text Display

## Installation

Extract `magik_text_display` into `ComfyUI/custom_nodes/`, restart ComfyUI,
then refresh the browser (Ctrl+Shift+R if necessary).
Add **Magik → Text → Magik text Display**.
No extra Python dependencies are required.

## Usage

Connect a STRING output to **text**, choose **font**, and set **font_size**
from **1 to 128 px** (default: 20). Run the workflow to display the text.
Changing typography updates the existing display immediately, without rerunning.
The node runs even when its output is unconnected.

The preview preserves whitespace, line breaks, literal braces and HTML text.
Text is selectable and copyable. Resize the node to enlarge the preview;
long content scrolls within it. The last preview and font settings are saved
with the workflow. Saved workflow files therefore include the displayed text.

Double-click the text area to open a panel occupying most of the screen.
It uses the selected font and automatically chooses the largest size that fits,
up to 128 px, adjusting when the window or text changes. A Copy button copies
the complete displayed text. Close using Close, Escape, or the backdrop.
Extremely long text can scroll if it cannot fit even at 1 px.

The **text** output passes through the original strings unchanged. A STRING
list is shown together, separated by a blank line, and remains a STRING list
on output; the display separators are never added to output strings.

## Fonts

The selector includes generic browser fonts, System UI, Noto, DejaVu,
Liberation, Arial, Georgia, Verdana and Courier New. Named fonts must be
installed on the computer running your browser; otherwise the browser uses
a matching generic fallback. No fonts are downloaded or bundled.
Sizes are CSS pixels before ComfyUI canvas zoom.

## Implementation

`__init__.py` registers `MagikTextDisplay` and exposes `./js`.
`magik_text_display.py` returns UI text plus the unchanged output list.
`js/magik_text_display.js` creates the DOM preview and binds typography controls.
Only this node type is patched. Rendering uses `textContent`, not HTML parsing.
