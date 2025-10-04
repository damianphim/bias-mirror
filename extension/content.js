// A simple toast function to show feedback
function showToast(message, isError = false) {
  const box = document.createElement('div');
  box.style.cssText = `
    position:fixed; right:12px; bottom:12px;
    background: ${isError ? '#D22B2B' : '#111'}; color:#fff;
    padding:10px 12px; border-radius:12px; font:13px system-ui;
    z-index:999999; box-shadow:0 8px 24px rgba(0,0,0,.25);
    max-width: 300px;
    transition: opacity 0.5s ease-in-out;
    opacity: 1;
  `;
  box.innerHTML = message;
  document.body.appendChild(box);
  setTimeout(() => {
      box.style.opacity = '0';
      setTimeout(() => box.remove(), 500);
  }, 5500);
}

// Main logic to extract text and send for analysis
async function runAnalysis() {
  let textSample = '';
  // Check if the page is a PDF (by content type or URL)
  const isPdf = document.contentType === 'application/pdf' || window.location.pathname.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    showToast(`<b>Bias Mirror</b><br/>PDF detected. Analyzing sampled pages...`);
    try {
      // Correctly set the worker source using the chrome extension API
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdf.worker.min.js');
      
      const pdf = await pdfjsLib.getDocument(window.location.href).promise;
      
      // Smart sampling logic
      const pagesToSample = new Set([1, 2, pdf.numPages, pdf.numPages - 1].filter(p => p > 0 && p <= pdf.numPages));
      
      let fullText = '';
      for (const pageNum of Array.from(pagesToSample).sort((a,b) => a-b)) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      textSample = fullText;

    } catch (error) {
      showToast(`<b>PDF Error:</b><br/>${error.message}`, true);
      return; 
    }
  } else {
    // Standard HTML Page Logic
    textSample = document.body.innerText;
  }

  // Ensure there's enough text to be worth analyzing
  if (!textSample || textSample.trim().length < 200) {
    // Silently ignore pages with too little text
    return;
  }

  showToast(`<b>Bias Mirror</b><br/>Sending document for AI analysis...`);
  const title = document.title || location.href;
  const fingerprint = btoa(encodeURIComponent(location.hostname + "::" + title)).slice(0, 64);

  chrome.runtime?.sendMessage(
    { type: "ANALYZE_TEXT", text: textSample.slice(0, 15000), docTitle: title, fingerprint },
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

// Run the analysis
runAnalysis();