// extension/service_worker.js

console.log("Service worker script has started.");

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message listener has been triggered."); // New log

  if (msg.type === "ANALYZE_TEXT") {
    console.log("ANALYZE_TEXT message received:", msg); // New log

    // Send a hardcoded response immediately
    const fakeAnalysis = {
      geographic_focus: "Test successful!"
    };
    sendResponse({ ok: true, analysis: fakeAnalysis });

    // We don't return true because this is synchronous
    return;
  }
});