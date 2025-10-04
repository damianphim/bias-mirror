async function postCounts({groupId, docTitle, fingerprint, counts}) {
  const url = `${SUPABASE_URL}/rest/v1/documents?on_conflict=group_id,doc_fingerprint`;
  const payload = {
    group_id: groupId,
    doc_title: docTitle,
    doc_fingerprint: fingerprint,
    counts
  };
  await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    },
    body: JSON.stringify(payload)
  });
}

const SUPABASE_URL = "https://dhicfnhofbwcemveknye.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoaWNmbmhvZmJ3Y2VtdmVrbnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTMyMTEsImV4cCI6MjA3NTA4OTIxMX0.xKEpeIxSdUzRIrai3idTIS5TEmsQBM0Uuly6LBlvqXo";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  if(msg.type==="BIAS_COUNTS"){
    chrome.storage.sync.get(['groupId'], async ({groupId})=>{
      if(!groupId){ sendResponse({ok:false, err:"no group set"}); return; }
      try {
        await postCounts({groupId, docTitle: msg.docTitle, fingerprint: msg.fingerprint, counts: msg.counts});
        chrome.storage.sync.set({lastSnapshot: {docTitle: msg.docTitle, summary: msg.counts}});
        sendResponse({ok:true});
      } catch(e){
        sendResponse({ok:false, err:String(e)});
      }
    });
    return true;
  }
});
