const groupEl = document.getElementById('group');
const lastEl = document.getElementById('last');

chrome.storage.sync.get(['groupId','lastSnapshot'], ({groupId,lastSnapshot})=>{
  if(groupId) groupEl.value = groupId;
  if(lastSnapshot) {
    const g = lastSnapshot.summary.gender, geo = lastSnapshot.summary.geo;
    lastEl.textContent = `Last: ${lastSnapshot.docTitle} • Authors ${lastSnapshot.summary.authors_total} | G:M${g.male}/F${g.female}/?${g.unknown} | Geo: US${geo.US}/EU${geo.EU}/AS${geo.Asia}/O${geo.Other}`;
  }
});

document.getElementById('save').onclick = ()=>{
  chrome.storage.sync.set({groupId: groupEl.value});
};
