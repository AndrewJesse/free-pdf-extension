// Local Manifest V3 service worker.
// PDF bytes stay in the popup. This worker does not fetch or upload anything.

chrome.runtime.onInstalled.addListener(() => {
  // Installed. Document tools run in the popup on this device.
});
