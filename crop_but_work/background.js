chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'capture')
  {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'processImage', dataUrl: dataUrl, coordinates: message.coordinates });
      });
  }
});
