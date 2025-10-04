// This script runs in the main page world and has NO access to chrome.* APIs.

(async function() {
  try {
    // This variable is set by content.js right before this script is injected.
    const workerSrc = window.biasMirrorPdfWorkerSrc;
    if (!workerSrc) {
      throw new Error("PDF worker source URL was not provided by the content script.");
    }

    const pdfjsLib = window.pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    
    const pdf = await pdfjsLib.getDocument(window.location.href).promise;
    
    const pagesToSample = new Set([1, 2, pdf.numPages].filter(p => p > 0 && p <= pdf.numPages));
    let fullText = '';
    
    for (const pageNum of Array.from(pagesToSample)) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\\n';
    }
    
    // Use postMessage to securely send the result back to our content script.
    window.postMessage({ type: 'BIAS_MIRROR_PDF_RESULT', payload: { text: fullText } }, '*');

  } catch (error) {
    window.postMessage({ type: 'BIAS_MIRROR_PDF_RESULT', payload: { error: error.message } }, '*');
  }
})();