document.getElementById("captureBtn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "capture" }, (response) => {
      if (response && response.dataUrl) {
        const imgElement = document.getElementById("screenshotPreview");
        imgElement.src = response.dataUrl; // Set the src to the captured image data URL
        imgElement.style.display = 'block'; // Show the image
      }
    });
  });
  