A tiny extension to make Onshape API requests locally instead of requiring a round-trip to the backend for oauth requests. Seems to support full Onshape API functionality. See usage in `sk/src/lib/onshape/requests.ts`.

### Disclaimer
This extension is only intended for development use to make API testing slightly easier (like the [Onshape Glassworks API explorer](https://cad.onshape.com/glassworks/explorer/#/) provides). It does not collect or otherwise obtain authentication credentials; it only uses the browser's stored cookies (with `credentials: 'include'` on a fetch request) and is specifically designed made to avoid volume API calls with caching in an effort to stay in the spirit of Onshape's API TOS. That being said, it's critical that users review Onshape's API terms of use (presented in the [developer portal](https://cad.onshape.com/appstore/dev-portal) on first login) and firmly adhere to its [API limits](https://onshape-public.github.io/docs/auth/limits/). Our understanding is that this small tool falls within Onshape's API terms of use, and especially their intent, because we will only ever be making a few dozens of API calls in development.

We have plans to make the extension use proper API keys until we get a robust oauth backend in place (as the Onshape API blocks direct client calls through CORS headers), but this was the easiest to implement for now.

# Installing
(read disclaimer before using please!)

## Chromium
Go to `chrome://extensions/`, enable developer mode, and load the unpacked extension from `onshape_bridge/extension`.

## Firefox
Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select the `onshape_bridge/extension/manifest.json` file.
