import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

async function getAiAnalysis(documentText) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documentText: documentText })
  });

  if (!response.ok) {
    // Read the error message from the server's response
    const errorBody = await response.text(); 
    throw new Error(`AI analysis failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
}

async function saveData({ groupId, docTitle, fingerprint, analysis }) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
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
      analysis: analysis
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to save data: ${error.message}`);
  }
  return response.json();
}

async function handleAnalysis(msg, sendResponse) {
  try {
    const { groupId } = await chrome.storage.sync.get(['groupId']);
    if (!groupId) {
      sendResponse({ ok: false, err: "No group set. Please set a group ID in the extension popup." });
      return;
    }
    const { analysis } = await getAiAnalysis(msg.text);
    await saveData({ groupId, docTitle: msg.docTitle, fingerprint: msg.fingerprint, analysis });
    await chrome.storage.sync.set({ lastSnapshot: { docTitle: msg.docTitle, summary: analysis } });
    console.log("Service worker sending response:", { ok: true, analysis });
    sendResponse({ ok: true, analysis: analysis });
  } catch (e) {
    console.error("Service worker caught an error:", e.toString());
    sendResponse({ ok: false, err: e.toString() });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "ANALYZE_TEXT") {
    console.log("Service worker received ANALYZE_TEXT:", msg);
    handleAnalysis(msg, sendResponse);
    return true; // Required for async response
  }
});