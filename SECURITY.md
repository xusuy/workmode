# Security Considerations

## Why `<all_urls>` Permission?

WorkMode requires the `<all_urls>` permission because its core functionality is to work on ANY webpage the user visits. The purpose is to allow users to camouflage their browsing activity in public workspaces by overlaying a WPS-like interface.

## What This Extension Does

- **Reads:** Paragraph text content from the current page (using DOM queries)
- **Displays:** A full-screen overlay with WPS-like styling
- **Stores:** No data is transmitted or stored remotely

## What This Extension Does NOT Do

- ❌ No network requests to external servers
- ❌ No tracking or analytics
- ❌ No data collection or transmission
- ❌ No modification of original page content (only overlay)
- ❌ No access to passwords, forms, or sensitive inputs

## Transparency

The source code is fully visible and open. You can review exactly what the extension does by examining `content.js`.

## Installation

This extension is intended for personal/local use via "Load unpacked" in Edge/Chrome developer mode. It is not distributed via the Chrome Web Store.