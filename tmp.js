let startX, startY, endX, endY;
let isDrawing = false;
let box = null;
let overlay = null;

const overlayStyles = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    zIndex: '9999'
};

const boxStyles = {
    position: 'absolute',
    border: '2px solid red',
    backgroundColor: 'rgba(255, 0, 0, 0.2)'
};

function createElement(tag, styles) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    return element;
}

document.addEventListener('mousedown', (e) => {
    if (!e.ctrlKey) return;
    
    startX = e.pageX;
    startY = e.pageY;
    isDrawing = true;

    overlay = createElement('div', overlayStyles);
    document.body.appendChild(overlay);

    box = createElement('div', boxStyles);
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    document.body.appendChild(box);

    start_X = e.clientX;
    start_Y = e.clientY;
});

document.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    endX = e.pageX;
    endY = e.pageY;

    box.style.width = `${Math.abs(endX - startX)}px`;
    box.style.height = `${Math.abs(endY - startY)}px`;
    box.style.left = `${Math.min(startX, endX)}px`;
    box.style.top = `${Math.min(startY, endY)}px`;

    end_X = e.clientX;
    end_Y = e.clientY;
});

document.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;

    const boxCoordinates =
    {
        startX: Math.min(start_X, end_X),
        startY: Math.min(start_Y, end_Y),
        width: Math.abs(end_X - start_X),
        height: Math.abs(end_Y - start_Y)
    };

    document.body.removeChild(overlay);
    document.body.removeChild(box);
    
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'capture', coordinates: boxCoordinates });
    }, 300);

});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'processImage') {
    const { dataUrl, coordinates } = message;
    const { startX, startY, width, height } = coordinates;

    const image = new Image();
    image.src = dataUrl;

    image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        const scaleX = image.width / window.innerWidth;
        const scaleY = image.height / window.innerHeight;

        const sourceX = startX * scaleX;
        const sourceY = startY * scaleY;

        context.drawImage(
            image,
            sourceX, sourceY, width * scaleX, height * scaleY,
            0, 0, width, height
        );

        canvas.toBlob((blob) => {
            if (blob)
            {
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = 'cropped_screenshot.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
            else
            {
                console.error('Blob is null, check the canvas drawing code.');
            }
        }, 'image/png');
    };

    image.onerror = () => {
      console.error('Image loading failed.');
    };
  }
});
