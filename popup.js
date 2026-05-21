function handleMedia(command) {
  try {
    const media = document.querySelector('video, audio');
    
    if (command === 'getMeta') {
      if (!media && !('mediaSession' in navigator)) return null;

      let isPaused = true;
      if (media) isPaused = media.paused;
      else if ('mediaSession' in navigator && navigator.mediaSession.playbackState === 'playing') isPaused = false;

      if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
        const meta = navigator.mediaSession.metadata;
        return {
          title: meta.title || document.title,
          artist: meta.artist || window.location.hostname,
          album: meta.album || '',
          artwork: meta.artwork?.length > 0 ? meta.artwork[meta.artwork.length - 1].src : null,
          paused: isPaused
        };
      }
      if (media) return { title: document.title, artist: window.location.hostname, album: '', artwork: null, paused: isPaused };
      return null;
    }

    if (command === 'play') {
      if (media) media.paused ? media.play() : media.pause();
      else document.querySelector('.ytp-play-button, [data-testid="control-button-playpause"], [aria-label="Play"], [aria-label="Pause"]')?.click();
    }
    if (command === 'next') document.querySelector('.ytp-next-button, [data-testid="control-button-skip-forward"], [aria-label="Next"]')?.click();
    if (command === 'prev') document.querySelector('.ytp-prev-button, [data-testid="control-button-skip-back"], [aria-label="Previous"]')?.click();
  } catch (e) {
    return { errorCode: 'ERR_500' };
  }
}

async function getMediaTabs() {
  let audibleTabs = await browser.tabs.query({ audible: true });
  let stored = await browser.storage.local.get('activeMediaTabs');
  let savedTabIds = stored.activeMediaTabs || [];
  
  let allTabIds = new Set([...audibleTabs.map(t => t.id), ...savedTabIds]);
  let validTabs = [];
  
  for (let id of allTabIds) {
    try {
      let tab = await browser.tabs.get(id);
      
      // STRICT FIX: Immediately skip if URL is missing or it is an internal/restricted page
      if (!tab.url || !tab.url.startsWith('http')) {
        continue;
      }
      
      validTabs.push(tab);
    } catch (e) {
      // Tab closed
    }
  }
  return validTabs;
}

async function executeCommand(tabId, command) {
  try {
    const result = await browser.scripting.executeScript({
      target: { tabId: tabId },
      func: handleMedia,
      args: [command]
    });
    return result[0]?.result;
  } catch (e) {
    return { errorCode: 'ERR_403' }; 
  }
}

function extractGradient(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 5;  
      canvas.height = 50; 
      ctx.drawImage(img, 0, 0, 5, 50);
      try {
        const data = ctx.getImageData(0, 0, 5, 50).data;
        let tr=0, tg=0, tb=0, br=0, bg=0, bb=0;
        let topCount=0, bottomCount=0;

        for (let i = 0; i < data.length; i += 4) {
          const y = Math.floor((i / 4) / 5);
          if (y < 25) { 
            tr += data[i]; tg += data[i+1]; tb += data[i+2]; topCount++;
          } else { 
            br += data[i]; bg += data[i+1]; bb += data[i+2]; bottomCount++;
          }
        }
        
        const topColor = `rgb(${~~(tr/topCount)}, ${~~(tg/topCount)}, ${~~(tb/topCount)})`;
        const bottomColor = `rgb(${~~(br/bottomCount)}, ${~~(bg/bottomCount)}, ${~~(bb/bottomCount)})`;
        
        resolve(`linear-gradient(to bottom, ${topColor} 0%, ${bottomColor} 100%)`);
      } catch (e) {
        resolve('#1c1c1c'); 
      }
    };
    img.onerror = () => resolve('#1c1c1c');
  });
}

async function updateUI() {
  const tabs = await getMediaTabs();
  const container = document.getElementById('media-container');
  let activeTabIds = [];
  let errorState = null;

  for (const tab of tabs) {
    const meta = await executeCommand(tab.id, 'getMeta');
    
    if (meta && meta.errorCode) {
      errorState = meta.errorCode;
      continue;
    }
    
    if (!meta) continue; 
    
    activeTabIds.push(tab.id);

    let card = document.querySelector(`.media-card[data-id="${tab.id}"]`);
    
    if (!card) {
      const template = document.getElementById('card-template');
      const clone = template.content.cloneNode(true);
      card = clone.querySelector('.media-card');
      card.dataset.id = tab.id;
      container.appendChild(card);
    }
    
    card.querySelector('.title-el').textContent = meta.title;
    card.querySelector('.artist-el').textContent = meta.artist;
    card.querySelector('.play-btn').textContent = '⏯';
    
    const albumEl = card.querySelector('.album-el');
    if (meta.album) {
      albumEl.textContent = meta.album;
      albumEl.style.display = 'block';
    } else {
      albumEl.style.display = 'none';
    }

    const coverEl = card.querySelector('.cover-el');
    
    if (meta.artwork) {
      if (coverEl.src !== meta.artwork) {
        coverEl.src = meta.artwork;
        extractGradient(meta.artwork).then(bgGradient => {
          card.style.background = bgGradient;
        });
      }
      coverEl.style.display = 'block';
    } else {
      coverEl.style.display = 'none'; 
      card.style.background = '#1c1c1c';
    }
  }

  await browser.storage.local.set({ activeMediaTabs: activeTabIds });

  const activeIdsSet = new Set(activeTabIds.map(id => id.toString()));
  container.querySelectorAll('.media-card').forEach(card => {
    if (!activeIdsSet.has(card.dataset.id)) card.remove();
  });

  if (activeTabIds.length === 0) {
    let msg = errorState === 'ERR_403' ? 'Enable "Access your data for all websites" in Firefox Add-ons manager.' :
              errorState === 'ERR_500' ? 'ERR_500: Internal Script Error' :
              'No Media Playing';
              
    if (!document.getElementById('empty-msg')) {
      container.innerHTML = `<div id="empty-msg" style="color:#b3b3b3; text-align:center; padding: 20px; font-size:14px; line-height: 1.4;">${msg}</div>`;
    } else {
      document.getElementById('empty-msg').textContent = msg;
    }
  } else {
    const emptyMsg = document.getElementById('empty-msg');
    if (emptyMsg) emptyMsg.remove();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  setInterval(updateUI, 1000); 

  document.getElementById('media-container').addEventListener('click', async (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;

    const card = btn.closest('.media-card');
    if (!card) return;

    const tabId = parseInt(card.dataset.id, 10);
    let command = '';

    if (btn.classList.contains('play-btn')) command = 'play';
    else if (btn.classList.contains('next-btn')) command = 'next';
    else if (btn.classList.contains('prev-btn')) command = 'prev';

    if (command) {
      await executeCommand(tabId, command);
      setTimeout(updateUI, 150);
    }
  });
});
