import { app } from "../../scripts/app.js";

const GENERIC_FONTS = {
    "Sans-serif": "sans-serif",
    "Serif": "serif",
    "Monospace": "monospace",
    "System UI": "system-ui, sans-serif",
};

let activePanel = null;

function openTextPanel(preview) {
    activePanel?.close();
    const previousFocus = document.activeElement;
    const dialog = document.createElement("dialog");
    activePanel = dialog;
    dialog.setAttribute("aria-label", "Magik text Display — expanded text");
    Object.assign(dialog.style, {
        width: "94vw", height: "92vh", maxWidth: "94vw", maxHeight: "92vh",
        padding: "20px", boxSizing: "border-box", border: "1px solid #666",
        borderRadius: "12px", background: "var(--comfy-menu-bg, #202020)",
        color: "var(--input-text, #eee)", overflow: "hidden",
    });
    const layout = document.createElement("div");
    Object.assign(layout.style, { display: "flex", flexDirection: "column", height: "100%", gap: "16px", minHeight: "0" });
    const toolbar = document.createElement("div");
    Object.assign(toolbar.style, { display: "flex", alignItems: "center", gap: "12px", flexShrink: "0" });
    const title = document.createElement("span");
    title.textContent = "Magik text Display";
    title.style.flex = "1";
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    const copy = document.createElement("button");
    copy.textContent = "Copy";
    const close = document.createElement("button");
    close.textContent = "Close";
    for (const button of [copy, close]) {
        button.type = "button";
        Object.assign(button.style, { padding: "8px 18px", fontSize: "16px", cursor: "pointer" });
    }
    toolbar.append(title, status, copy, close);
    const area = document.createElement("div");
    Object.assign(area.style, { flex: "1", minHeight: "0", overflow: "auto", display: "flex" });
    const text = document.createElement("div");
    Object.assign(text.style, {
        width: "100%", margin: "auto 0", flexShrink: "0", whiteSpace: "pre-wrap",
        overflowWrap: "anywhere", userSelect: "text", lineHeight: "1.35",
    });
    area.append(text);
    layout.append(toolbar, area);
    dialog.append(layout);
    document.body.append(dialog);
    dialog.showModal();

    const fit = () => {
        if (!dialog.open) return;
        text.textContent = preview.textContent;
        text.style.fontFamily = preview.style.fontFamily;
        // Find the largest whole-pixel size that fits both dimensions.
        let low = 1;
        let high = 128;
        let best = 1;
        while (low <= high) {
            const size = Math.floor((low + high) / 2);
            text.style.fontSize = `${size}px`;
            if (text.scrollHeight <= area.clientHeight && text.scrollWidth <= area.clientWidth) {
                best = size;
                low = size + 1;
            } else {
                high = size - 1;
            }
        }
        text.style.fontSize = `${best}px`;
    };
    let frame = 0;
    const scheduleFit = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fit);
    };
    const resize = new ResizeObserver(scheduleFit);
    resize.observe(area);
    const changes = new MutationObserver(scheduleFit);
    changes.observe(preview, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["style"] });
    document.fonts?.ready.then(scheduleFit);
    document.fonts?.addEventListener("loadingdone", scheduleFit);
    copy.addEventListener("click", async () => {
        const value = text.textContent;
        try {
            if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
            await navigator.clipboard.writeText(value);
            status.textContent = "Copied";
        } catch {
            // Local HTTP installations may lack the modern clipboard API.
            const temporary = document.createElement("textarea");
            temporary.value = value;
            Object.assign(temporary.style, { position: "absolute", opacity: "0", width: "1px", height: "1px" });
            dialog.append(temporary);
            temporary.select();
            try {
                status.textContent = document.execCommand("copy") ? "Copied" : "Copy failed — select the text and press Ctrl+C";
            } catch {
                status.textContent = "Copy failed — select the text and press Ctrl+C";
            } finally {
                temporary.remove();
                copy.focus();
            }
        }
    });
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => {
        cancelAnimationFrame(frame);
        resize.disconnect();
        changes.disconnect();
        document.fonts?.removeEventListener("loadingdone", scheduleFit);
        dialog.remove();
        if (activePanel === dialog) activePanel = null;
        if (previousFocus?.isConnected) previousFocus.focus();
    }, { once: true });
    scheduleFit();
    copy.focus();
    return dialog;
}

app.registerExtension({
    name: "Magik.TextDisplay",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "MagikTextDisplay") return;

        const created = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const result = created?.apply(this, arguments);
            const preview = document.createElement("div");
            Object.assign(preview.style, {
                width: "100%", height: "100%", boxSizing: "border-box",
                padding: "12px", border: "1px solid var(--border-color, #555)",
                borderRadius: "6px", background: "var(--comfy-input-bg, #202020)",
                color: "var(--input-text, #eee)", overflow: "auto",
                whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                userSelect: "text", cursor: "text", lineHeight: "1.35",
            });
            preview.tabIndex = 0;
            preview.setAttribute("aria-label", "Displayed text");
            preview.title = "Double-click to expand";
            let panel = null;
            preview.addEventListener("dblclick", () => { panel = openTextPanel(preview); });
            const removed = this.onRemoved;
            this.onRemoved = function () {
                if (panel?.open) panel.close();
                return removed?.apply(this, arguments);
            };
            // Keep native text selection, scrolling and copying inside the preview.
            for (const event of ["pointerdown", "mousedown", "dblclick", "wheel", "keydown"]) {
                preview.addEventListener(event, (e) => e.stopPropagation());
            }
            this.addDOMWidget("magik_text_preview", "custom", preview, {
                serialize: false, hideOnZoom: false,
                getMinHeight: () => 140,
            });
            this.properties ??= {};
            const updateText = (items) => {
                const values = Array.isArray(items) ? items : [items ?? ""];
                // textContent deliberately keeps braces and HTML as literal text.
                preview.textContent = values.map((value) => String(value)).join("\n\n");
                this.properties.magik_display_text = values;
            };
            const updateStyle = () => {
                const font = this.widgets.find((w) => w.name === "font")?.value ?? "Sans-serif";
                const size = Number(this.widgets.find((w) => w.name === "font_size")?.value);
                preview.style.fontFamily = GENERIC_FONTS[font] ?? `"${font}", ${/Mono|Courier/.test(font) ? "monospace" : /Serif|Georgia/.test(font) ? "serif" : "sans-serif"}`;
                preview.style.fontSize = `${Math.min(128, Math.max(1, Number.isFinite(size) ? size : 20))}px`;
            };
            const saveTypography = () => {
                this.properties.magik_display_font = this.widgets.find((w) => w.name === "font")?.value ?? "Sans-serif";
                const size = Number(this.widgets.find((w) => w.name === "font_size")?.value);
                this.properties.magik_display_font_size = Math.min(128, Math.max(1, Number.isFinite(size) ? size : 20));
            };
            for (const name of ["font", "font_size"]) {
                const widget = this.widgets.find((w) => w.name === name);
                if (!widget) continue;
                const callback = widget.callback;
                widget.callback = function () {
                    const value = callback?.apply(this, arguments);
                    saveTypography();
                    updateStyle();
                    return value;
                };
            }
            const executed = this.onExecuted;
            this.onExecuted = function (message) {
                const value = executed?.apply(this, arguments);
                if (message && Object.hasOwn(message, "text")) updateText(message.text);
                updateStyle();
                return value;
            };
            const configured = this.onConfigure;
            this.onConfigure = function () {
                const value = configured?.apply(this, arguments);
                updateText(this.properties.magik_display_text ?? []);
                updateStyle();
                return value;
            };
            // Restore after the complete configure call: onConfigure may run
            // before LiteGraph has assigned the saved widget values.
            const configure = this.configure;
            this.configure = function (info) {
                const value = configure?.apply(this, arguments);
                const saved = info?.properties ?? {};
                const font = this.widgets.find((w) => w.name === "font");
                const size = this.widgets.find((w) => w.name === "font_size");
                const choices = nodeData.input?.required?.font?.[0];
                if (font && typeof saved.magik_display_font === "string" &&
                    (!Array.isArray(choices) || choices.includes(saved.magik_display_font))) {
                    font.value = saved.magik_display_font;
                }
                if (size && Number.isFinite(saved.magik_display_font_size)) {
                    size.value = Math.min(128, Math.max(1, Math.round(saved.magik_display_font_size)));
                }
                updateText(this.properties.magik_display_text ?? []);
                saveTypography();
                updateStyle();
                return value;
            };
            const serialize = this.onSerialize;
            this.onSerialize = function (info) {
                const value = serialize?.apply(this, arguments);
                saveTypography();
                info.properties ??= {};
                info.properties.magik_display_font = this.properties.magik_display_font;
                info.properties.magik_display_font_size = this.properties.magik_display_font_size;
                return value;
            };
            updateText(this.properties.magik_display_text ?? []);
            updateStyle();
            this.setSize([420, 300]);
            return result;
        };
    },
});
