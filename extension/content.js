// ---- content.js (HTML + PDF aware) ----
console.log("[Bias Mirror] content script loaded on", location.href);

/** ---------- Shared analyzers ---------- **/
function analyzeText(raw) {
  const text = (raw || "").toString();
  const lines = text.split(/\n/).filter((l) => l.length < 160);

  // Author extraction (naive)
  const nameRegex = /\b([A-Z][a-z]+)\s([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\b/g;
  let authors = [];
  for (const line of lines) {
    if (/(^|\s)by\s+[A-Z][a-z]+|References|Bibliography|\(\d{4}\)/i.test(line)) {
      let m;
      while ((m = nameRegex.exec(line)) !== null) {
        authors.push({ first: m[1], last: m[2] });
      }
    }
  }
  authors = Array.from(new Map(authors.map((a) => [a.first + " " + a.last, a])).values());

  // Gender map (expanded)
  const genderMap = {
    "james":"male","john":"male","robert":"male","michael":"male","william":"male",
    "david":"male","richard":"male","joseph":"male","thomas":"male","charles":"male",
    "christopher":"male","daniel":"male","matthew":"male","anthony":"male","mark":"male",
    "donald":"male","steven":"male","paul":"male","andrew":"male","joshua":"male",
    "kenneth":"male","kevin":"male","brian":"male","george":"male","edward":"male",
    "ronald":"male","timothy":"male","jason":"male","jeffrey":"male","ryan":"male",
    "jacob":"male","gary":"male","nicholas":"male","eric":"male","jonathan":"male",
    "stephen":"male","larry":"male","justin":"male","scott":"male","brandon":"male",
    "benjamin":"male","samuel":"male","gregory":"male","frank":"male","alexander":"male",
    "patrick":"male","raymond":"male","jack":"male","dennis":"male","jerry":"male",
    "tyler":"male","aaron":"male","jose":"male","adam":"male","henry":"male","nathan":"male",
    "douglas":"male","zachary":"male","peter":"male","kyle":"male","walter":"male",
    "ethan":"male","jeremy":"male","harold":"male","keith":"male","christian":"male",
    "roger":"male","noah":"male","gerald":"male","carl":"male","terry":"male",
    "sean":"male","arthur":"male","lawrence":"male","jordan":"male","dylan":"male",
    "mary":"female","patricia":"female","linda":"female","barbara":"female","elizabeth":"female",
    "jennifer":"female","maria":"female","susan":"female","margaret":"female","dorothy":"female",
    "lisa":"female","nancy":"female","karen":"female","betty":"female","helen":"female",
    "sandra":"female","donna":"female","carol":"female","ruth":"female","sharon":"female",
    "michelle":"female","laura":"female","sarah":"female","kimberly":"female","deborah":"female",
    "jessica":"female","shirley":"female","cynthia":"female","angela":"female","melissa":"female",
    "brenda":"female","amy":"female","anna":"female","rebecca":"female","virginia":"female",
    "kathleen":"female","pamela":"female","martha":"female","debra":"female","amanda":"female",
    "stephanie":"female","carolyn":"female","christine":"female","marie":"female","janet":"female",
    "catherine":"female","frances":"female","ann":"female","joyce":"female","diane":"female",
    "alice":"female","julie":"female","heather":"female","teresa":"female","doris":"female",
    "gloria":"female","evelyn":"female","jean":"female","cheryl":"female","mildred":"female",
    "katherine":"female","joan":"female","ashley":"female","judith":"female","rose":"female",
    "alex":"unknown","jordan":"unknown","taylor":"unknown","casey":"unknown","riley":"unknown",
    "jamie":"unknown","jesse":"unknown","morgan":"unknown","pat":"unknown","sam":"unknown"
  };

  const genderCounts = { male: 0, female: 0, unknown: 0 };
  for (const a of authors) {
    const g = genderMap[a.first.toLowerCase()] || "unknown";
    genderCounts[g]++;
  }

  // Geography regions
  const geoRegions = {
    US: ["united states","usa","u.s.","u.s.a"],
    EU: [
      "united kingdom","uk","germany","france","italy","spain","netherlands",
      "belgium","sweden","poland","ireland","austria","denmark","finland",
      "portugal","greece","norway","switzerland"
    ],
    Asia: [
      "china","india","japan","south korea","indonesia","pakistan","bangladesh",
      "philippines","vietnam","thailand","malaysia","singapore","hong kong","taiwan"
    ]
  };

  const lower = text.toLowerCase();
  const matched = new Set();
  for (const region in geoRegions) {
    for (const token of geoRegions[region]) {
      if (lower.includes(token)) matched.add(`${region}::${token}`);
    }
  }
  const geoCounts = { US: 0, EU: 0, Asia: 0, Other: 0 };
  for (const key of matched) {
    const [region] = key.split("::");
    geoCounts[region] = (geoCounts[region] || 0) + 1;
  }

  // TLD hints from links
  document.querySelectorAll('a[href]').forEach((a) => {
    const h = a.href;
    if (/\.ac\.uk|\.uk\//.test(h) || /\.de\/|\.fr\/|\.it\/|\.es\//.test(h)) geoCounts.EU++;
    else if (/\.edu|\.gov|\.mil|\.us\//.test(h)) geoCounts.US++;
    else if (/\.(cn|in|jp|kr|sg)\//.test(h)) geoCounts.Asia++;
  });

  return { authors_total: authors.length, gender: genderCounts, geo: geoCounts };
}

function showToast(counts) {
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;right:12px;bottom:12px;background:#111;color:#fff;padding:10px 12px;border-radius:12px;font:12px system-ui;z-index:999999;box-shadow:0 8px 24px rgba(0,0,0,.25)";
  const g = counts.gender, geo = counts.geo;
  box.innerHTML =
    `<b>Bias Mirror</b><br/>Authors: ${counts.authors_total}` +
    `<br/>Gender: M ${g.male} • F ${g.female} • ? ${g.unknown}` +
    `<br/>Geo: US ${geo.US} • EU ${geo.EU} • Asia ${geo.Asia} • Oth ${geo.Other}`;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 6000);
}

function sendCounts(counts) {
  const title = document.title || location.href;
  const fingerprint = btoa(encodeURIComponent(location.hostname + "::" + title)).slice(0, 64);
  chrome.runtime?.sendMessage?.(
    { type: "BIAS_COUNTS", docTitle: title, fingerprint, counts },
    (res) => console.log("[Bias Mirror] sent to SW", res)
  );
}

/** ---------- PDF support ---------- **/
function isLikelyPdfPage() {
  return /\.pdf(\?|#|$)/i.test(location.href) || document.contentType === "application/pdf";
}

function addAnalyzePdfButton() {
  const btn = document.createElement("button");
  btn.textContent = "Bias Mirror: Analyze PDF";
  btn.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:999999;padding:10px 12px;border-radius:12px;background:#111;color:#fff;border:none;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer";
  document.body.appendChild(btn);
  btn.addEventListener("click", runPdfFlow);
}

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("vendor/pdf.min.js");
    s.onload = resolve;
    s.onerror = reject;
    document.documentElement.appendChild(s);
  });
  const pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("vendor/pdf.worker.min.js");
  return pdfjsLib;
}

async function fetchPdfBytes(url) {
  const resp = await fetch(url, { mode: "cors" });
  if (!resp.ok) throw new Error("PDF fetch failed: " + resp.status);
  return await resp.arrayBuffer();
}

async function extractPdfText(ab, maxPages = 5) {
  const pdfjsLib = await loadPdfJs();
  const doc = await pdfjsLib.getDocument({ data: ab }).promise;
  let out = "";
  const limit = Math.min(doc.numPages, maxPages);
  for (let p = 1; p <= limit; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map(i => i.str).join("\n") + "\n";
  }
  return out;
}

async function runPdfFlow() {
  try {
    console.log("[Bias Mirror] PDF mode starting…");
    const ab = await fetchPdfBytes(location.href);
    const extracted = await extractPdfText(ab, 5); // first 5 pages for speed
    const counts = analyzeText(extracted);
    console.log("[Bias Mirror] PDF analysis", counts);
    showToast(counts);
    sendCounts(counts);
  } catch (e) {
    console.error("[Bias Mirror] PDF analysis failed", e);
    alert("Bias Mirror: PDF analysis failed. See console for details.");
  }
}

/** ---------- Entry point ---------- **/
(function main() {
  if (isLikelyPdfPage()) {
    // Show a button so users can opt-in (fetching a large PDF can be ~MBs)
    addAnalyzePdfButton();
  } else {
    try {
      const counts = analyzeText(document.body?.innerText || "");
      console.log("[Bias Mirror] HTML analysis", counts);
      showToast(counts);
      sendCounts(counts);
    } catch (e) {
      console.error("[Bias Mirror] HTML analysis failed", e);
    }
  }
})();
