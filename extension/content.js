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
  chrome.runtime.sendMessage(
    { type: "ANALYZE_TEXT", text: text.slice(0, 15000), docTitle: title, fingerprint },
    (response) => {
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
      showToast(`<b>PDF Error:</b><br/>${error}`, true, 8000);
    } else {
      sendTextForAnalysis(text);
    }
  }, { once: true });

  // 2. Inject the main pdf.js library.
  const pdfLibScript = document.createElement('script');
  pdfLibScript.src = chrome.runtime.getURL('vendor/pdf.min.js');
  
  // 3. When it loads, pass the worker URL and then inject our bridge script.
  pdfLibScript.onload = () => {
    console.log('[Bias Mirror] pdf.min.js loaded. Passing worker URL and injecting bridge.');
    
    // **THE FIX, PART 2:** Securely pass the required URL to the main world.
    window.biasMirrorPdfWorkerSrc = chrome.runtime.getURL('vendor/pdf.worker.min.js');

    const bridgeScript = document.createElement('script');
    bridgeScript.src = chrome.runtime.getURL('pdf_bridge.js');
    (document.head || document.documentElement).appendChild(bridgeScript);
  };
  
  pdfLibScript.onerror = () => {
    showToast('<b>Error:</b><br/>Could not load the core PDF library.', true);
  };
  
  (document.head || document.documentElement).appendChild(pdfLibScript);
}

// --- HTML Handling Logic ---
function handleHtmlPage() {
  const textSample = document.body.innerText;
  if (!textSample || textSample.trim().length < 250) {
    return;
  }
  sendTextForAnalysis(textSample);
}

// --- Main Entry Point ---
function main() {
  if (document.readyState !== 'complete') {
    window.addEventListener('load', main, { once: true });
    return;
  }
  
  const isPdf = document.contentType === 'application/pdf' || document.querySelector('embed[type="application/pdf"]') || window.location.pathname.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    handlePdfPage();
  } else {
    handleHtmlPage();
  }
}

main();