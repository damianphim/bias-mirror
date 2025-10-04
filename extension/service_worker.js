// extension/service_worker.js
importScripts('config.js'); // Your SUPABASE_URL and SUPABASE_ANON_KEY are here

async function getAiAnalysis(documentText) {
  // Invoke the Edge Function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documentText: documentText })
  });
  if (!response.ok) {
    throw new Error(`AI analysis failed: ${response.statusText}`);
  }
  return response.json();
}

async function saveData({ groupId, docTitle, fingerprint, analysis }) {
  // Now we save the result from the AI to the database
  const { data, error } = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      group_id: groupId,
      doc_title: docTitle,
      doc_fingerprint: fingerprint,
      analysis: analysis // The column is now 'analysis'
    })
  });

  if (error) {
    throw new Error(`Failed to save data: ${error.message}`);
  }
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ANALYZE_TEXT") {
    chrome.storage.sync.get(['groupId'], async ({ groupId }) => {
      if (!groupId) {
        sendResponse({ ok: false, err: "No group set. Please set a group ID in the extension popup." });
        return;
      }
      try {
        // 1. Get analysis from the AI via our Edge Function
        const { analysis } = await getAiAnalysis(msg.text);

        // 2. Save the AI's response to our database
        await saveData({ groupId, docTitle: msg.docTitle, fingerprint: msg.fingerprint, analysis });

        // 3. Store the result for the popup
        chrome.storage.sync.set({ lastSnapshot: { docTitle: msg.docTitle, summary: analysis } });
        sendResponse({ ok: true, analysis: analysis });

      } catch (e) {
        sendResponse({ ok: false, err: e.toString() });
      }
    });
    return true; // Required for async response
  }
});