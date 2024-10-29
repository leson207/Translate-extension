chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture") {
      chrome.tabs.captureVisibleTab(null, {}, (dataUrl) => {
        const blob = dataURLToBlob(dataUrl);
        const reader = new FileReader();
  
        reader.onloadend = function() {
          const url = reader.result; // The data URL of the image
          chrome.downloads.download({
            url: url,
            filename: "screenshot.png",
            saveAs: false // Show the Save As dialog
          });
  
          sendResponse({ dataUrl: url }); // Send the data URL back to the popup
        };
  
        reader.readAsDataURL(blob); // Read the blob as a data URL
      });
      return true; // Keep the message channel open for sendResponse
    }
  });
  
  // Helper function to convert Data URL to Blob
  function dataURLToBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }
  