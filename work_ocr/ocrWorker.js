importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@latest');

self.onmessage = (event) => {
    const { imageDataUrl } = event.data;

    Tesseract.recognize(
        imageDataUrl,
        'eng',
        {
            logger: info => console.log(info)
        }
    ).then(({ data: { text } }) => {
        self.postMessage(text); // Send the recognized text back to the main thread
    });
};
