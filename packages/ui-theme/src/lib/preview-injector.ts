/**
 * Preview Injector — injects/removes a <style> tag for live CSS variable preview.
 *
 * Used by the branding modal to show changes in real-time before saving.
 */

const PREVIEW_ID = "branding-preview";

/**
 * Inject or update a <style> tag that overrides CSS custom properties.
 * Creates the tag if it doesn't exist; updates content if it does.
 */
export function injectPreview(
  overrides: { light: Record<string, string>; dark: Record<string, string> },
): void {
  if (typeof document === "undefined") return;

  let style = document.getElementById(PREVIEW_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = PREVIEW_ID;
    style.setAttribute("data-branding-preview", "true");
    document.head.appendChild(style);
  }

  const lightVars = Object.entries(overrides.light)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  const darkVars = Object.entries(overrides.dark)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

  style.textContent = `:root {\n${lightVars}\n}\n.dark {\n${darkVars}\n}`;
}

/**
 * Remove the preview <style> tag from the document head.
 */
export function removePreview(): void {
  if (typeof document === "undefined") return;
  const style = document.getElementById(PREVIEW_ID);
  if (style) style.remove();
}

/**
 * Apply permanent overrides (after save). Same mechanism as preview
 * but uses a different ID so it persists across modal open/close.
 */
export function applyOverrides(
  overrides: { light: Record<string, string>; dark: Record<string, string> } | null,
): void {
  if (typeof document === "undefined") return;
  const ID = "branding-overrides";

  // Remove existing
  const existing = document.getElementById(ID);
  if (existing) existing.remove();

  if (!overrides) return;

  const style = document.createElement("style");
  style.id = ID;

  const lightVars = Object.entries(overrides.light)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  const darkVars = Object.entries(overrides.dark)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");

  style.textContent = `:root {\n${lightVars}\n}\n.dark {\n${darkVars}\n}`;
  document.head.appendChild(style);
}
