A tiny extension to make Onshape API requests locally instead of requiring a round-trip to the backend for oauth requests. Seems to support full Onshape API functionality. See usage in `sk/src/lib/onshape/requests.ts`.

# Installing
## Chromium
Go to `chrome://extensions/`, enable developer mode, and load the unpacked extension from `onshape_bridge/extension`.

## Firefox
Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select the `onshape_bridge/extension/manifest.json` file.