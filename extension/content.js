// ADDED LOG
console.log("Content script has been injected and is running.");

// --- UI Feedback ---
function showToast(message, isError = false, duration = 6000) {
  const existingToast = document.getElementById('bias-mirror-toast');
  if (existingToast) existingToast.remove();
  const box = document.createElement('div');
  box.id = 'bias-mirror-toast';
  box.style.cssText = `position:fixed; right:12px; bottom:12px; background: ${isError ? '#D22B2B' : '#111'}; color:#fff; padding:10px 12px; border-radius:12px; font:13px system-ui; z-index:2147483647; box-shadow:0 8px 24px rgba(0,0,0,.25); max-width: 300px; transition: opacity 0.5s ease-in-out; opacity: 1;`;
  box.innerHTML = message;
  document.body.appendChild(box);
  setTimeout(() => {
      box.style.opacity = '0';
      setTimeout(() => box.remove(), 500);
  }, duration - 500);
}

// --- Data Submission ---
function sendTextForAnalysis(text) {
  showToast(`<b>Bias Mirror</b><br/>Sending document for AI analysis...`);
  const title = document.title || location.href;
  const fingerprint = btoa(encodeURIComponent(location.hostname + "::" + title)).slice(0, 64);

  // LOG TO CONFIRM THIS FUNCTION IS CALLED
  console.log("SUCCESS: sendTextForAnalysis() is being called.");

  chrome.runtime.sendMessage(
    { type: "ANALYZE_TEXT", text: text.slice(0, 15000), docTitle: title, fingerprint },
    (response) => {
      console.log('[Bias Mirror] Response from service worker:', response);
      if (chrome.runtime.lastError) {
          showToast(`<b>Extension Error:</b><br/>${chrome.runtime.lastError.message}`, true);
          return;
      }
      if (response?.ok) {
        showToast(`<b>Analysis Complete</b><br/><b>Focus:</b> ${response.analysis.geographic_focus}`);
      } else {
        showToast(`<b>API Error:</b><br/>${response?.err || 'An unknown error occurred.'}`, true);
      }
    }
  );
}

// --- PDF Handling Logic ---
function handlePdfPage() {
  console.log('[Bias Mirror] PDF page detected. Starting injection process.');
  showToast(`<b>Bias Mirror</b><br/>Loading PDF analyzer...`);

  // 1. Listen for the result from our bridge script.
  window.addEventListener('message', function(event) {
    if (event.source !== window || event.data.type !== 'BIAS_MIRROR_PDF_RESULT') return;
    
    console.log('[Bias Mirror] Received result from bridge script.');
    const { text, error } = event.data.payload;
    if (error) {
      console.error("Error from pdf_bridge.js:", error); // Make error visible in console
      showToast(`<b>PDF Error:</b><br/>${error}`, true, 8000);
    } else {
      sendTextForAnalysis(text);
    }
  }, { once: true });

  // 2. Inject the main pdf.js library.
  // For this method to work, vendor/pdf.min.js MUST be a legacy build, not a module.
  // This is because it needs to create the global `window.pdfjsLib` object.
  const pdfLibScript = document.createElement('script');
  pdfLibScript.src = chrome.runtime.getURL('vendor/pdf.min.js');
  
  pdfLibScript.onload = () => {
    console.log('[Bias Mirror] pdf.min.js loaded. Injecting bridge script.');
    
    const bridgeScript = document.createElement('script');
    bridgeScript.src = chrome.runtime.getURL('pdf_bridge.js');
    
    // **THE CORRECT FIX:** Pass the dynamic URL via a data attribute.
    const workerUrl = chrome.runtime.getURL('vendor/pdf.worker.min.js');
    bridgeScript.setAttribute('data-worker-src', workerUrl);
    
    (document.head || document.documentElement).appendChild(bridgeScript);
  };
  
  pdfLibScript.onerror = () => {
    showToast('<b>Error:</b><br/>Could not load the core PDF library.', true);
  };
  
  (document.head || document.documentElement).appendChild(pdfLibScript);
}

// --- HTML Handling Logic ---
function handleHtmlPage() {
  // LOG TO CONFIRM HTML PATH
  console.log("handleHtmlPage() called.");

  const textSample = document.body.innerText;
  if (!textSample || textSample.trim().length < 250) {
    // LOG FOR SILENT EXIT
    console.log(`Exiting: Not enough text on the page. Found ${textSample?.trim().length || 0} characters.`);
    return;
  }
  sendTextForAnalysis(textSample);
}

// --- Main Entry Point ---
function main() {
  // LOG TO CONFIRM MAIN IS RUNNING
  console.log("main() function has started.");

  if (document.readyState !== 'complete') {
    // LOG FOR WAITING
    console.log("Document not ready, waiting for 'load' event.");
    window.addEventListener('load', main, { once: true });
    return;
  }

  // LOG AFTER PAGE HAS LOADED
  console.log("Document is complete. Checking page type...");

  const isPdf = document.contentType === 'application/pdf' || document.querySelector('embed[type="application/pdf"]') || window.location.pathname.toLowerCase().endsWith('.pdf');

  // LOG THE RESULT OF THE PDF CHECK
  console.log(`Is this a PDF page? ${isPdf}`);

  if (isPdf) {
    handlePdfPage();
  } else {
    handleHtmlPage();
  }
}

main();