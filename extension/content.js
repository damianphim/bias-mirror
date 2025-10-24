console.log("Content script injected and running (v3).");

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

  window.addEventListener('message', function(event) {
    if (event.source !== window || event.data.type !== 'BIAS_MIRROR_PDF_RESULT') return;
    
    console.log('[Bias Mirror] Received result from bridge script.');
    const { text, error } = event.data.payload;
    if (error) {
      console.error("Error from pdf_bridge.js:", error);
      showToast(`<b>PDF Error:</b><br/>${error}`, true, 8000);
    } else {
      sendTextForAnalysis(text);
    }
  }, { once: true });

  const loaderScript = document.createElement('script');
  loaderScript.src = chrome.runtime.getURL('pdf_loader.js');
  loaderScript.type = 'module';
  
  loaderScript.onload = () => {
    console.log('[Bias Mirror] pdf_loader.js loaded. Injecting bridge script.');
    const bridgeScript = document.createElement('script');
    bridgeScript.src = chrome.runtime.getURL('pdf_bridge.js');
    const workerUrl = chrome.runtime.getURL('vendor/pdf.worker.min.js');
    bridgeScript.setAttribute('data-worker-src', workerUrl);
    (document.head || document.documentElement).appendChild(bridgeScript);
  };
  
  loaderScript.onerror = () => {
    showToast('<b>Error:</b><br/>Could not load the PDF loader module.', true);
  };
  
  (document.head || document.documentElement).appendChild(loaderScript);
}

// --- HTML Handling Logic ---
function handleHtmlPage() {
  console.log("handleHtmlPage() called.");
  const textSample = document.body.innerText;
  if (!textSample || textSample.trim().length < 250) {
    console.log(`Exiting: Not enough text on the page. Found ${textSample?.trim().length || 0} characters.`);
    return;
  }
  sendTextForAnalysis(textSample);
}

// --- Main Entry Point ---
function main() {
  console.log("main() function has started.");
  if (document.readyState !== 'complete') {
    console.log("Document not ready, waiting for 'load' event.");
    window.addEventListener('load', main, { once: true });
    return;
  }
  
  console.log("Document is complete. Checking page type...");
  const isPdf = document.contentType === 'application/pdf' || document.querySelector('embed[type="application/pdf"]') || window.location.pathname.toLowerCase().endsWith('.pdf');
  console.log(`Is this a PDF page? ${isPdf}`);

  if (isPdf) {
    handlePdfPage();
  } else {
    handleHtmlPage();
  }
}

main();