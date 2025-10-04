// service_worker.js

// Import the configuration variables from config.js
importScripts('config.js');

async function postCounts({groupId, docTitle, fingerprint, counts}) {
  // The 'on_conflict' parameter is not needed here and can cause issues.
  // The 'Prefer' header handles the upsert logic.
  const url = `${SUPABASE_URL}/rest/v1/documents`;
  const payload = {
    group_id: groupId,
    doc_title: docTitle,
    doc_fingerprint: fingerprint,
    counts
  };

  // Your fetch logic was already correct for handling upserts.
  await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      // This header tells Supabase to update the row if a duplicate is found.
      "Prefer": "resolution=merge-duplicates"
    },
    body: JSON.stringify(payload)
  });
}

// The hardcoded keys are now removed from this file.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "BIAS_COUNTS") {
    chrome.storage.sync.get(['groupId'], async ({groupId}) => {
      if (!groupId) {
        sendResponse({ok: false, err: "no group set"});
        return;
      }
      try {
        // Check if SUPABASE_URL is loaded before proceeding
        if (typeof SUPABASE_URL === 'undefined') {
          throw new Error("Supabase config not loaded.");
        }
        await postCounts({groupId, docTitle: msg.docTitle, fingerprint: msg.fingerprint, counts: msg.counts});
        chrome.storage.sync.set({lastSnapshot: {docTitle: msg.docTitle, summary: msg.counts}});
        sendResponse({ok: true});
      } catch (e) {
        sendResponse({ok: false, err: String(e)});
      }
    });
    return true; // Required for async sendResponse
  }
});