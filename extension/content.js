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

// --- PDF Handling ---
function handlePdfPage() {
  console.log('[Bias Mirror] PDF page detected. Injecting PDF.js library...');
  showToast(`<b>Bias Mirror</b><br/>Loading PDF analyzer...`);

  // Inject the script and wait for it to load
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('vendor/pdf.min.js');
  script.onload = async () => {
    console.log('[Bias Mirror] PDF.js library loaded.');
    try {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) throw new Error("pdfjsLib is not available on the window object.");

      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdf.worker.min.js');
      const pdf = await pdfjsLib.getDocument(window.location.href).promise;
      
      const pagesToSample = new Set([1, 2, pdf.numPages].filter(p => p > 0 && p <= pdf.numPages));
      let fullText = '';
      for (const pageNum of Array.from(pagesToSample)) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\\n';
      }
      sendTextForAnalysis(fullText);
    } catch (error) {
      console.error('[Bias Mirror] PDF processing failed:', error);
      showToast(`<b>PDF Error:</b><br/>${error.message}`, true, 8000);
    }
  };
  script.onerror = () => {
    console.error('[Bias Mirror] Failed to load pdf.min.js');
    showToast('<b>Error:</b><br/>Could not load the core PDF library.', true);
  };
  document.head.appendChild(script);
}

// --- HTML Handling ---
function handleHtmlPage() {
  console.log("[Bias Mirror] HTML page detected.");
  const textSample = document.body.innerText;
  if (!textSample || textSample.trim().length < 250) {
    return;
  }
  sendTextForAnalysis(textSample);
}

// --- Main Entry Point ---
function main() {
  // Give the page a moment to load fully before we do anything
  if (document.readyState === 'complete') {
    console.log("[Bias Mirror] Document is complete. Running main logic.");
    const isPdf = document.contentType === 'application/pdf' || document.querySelector('embed[type="application/pdf"]') || window.location.pathname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      handlePdfPage();
    } else {
      handleHtmlPage();
    }
  } else {
    window.addEventListener('load', main, { once: true });
  }
}

main();