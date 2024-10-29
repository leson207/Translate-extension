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

function startDrawing(e)
{
    if (!e.ctrlKey) return;
    
    abs_startX = e.pageX;
    abs_startY = e.pageY;
    isDrawing = true;

    overlay = createElement('div', overlayStyles);
    document.body.appendChild(overlay);

    box = createElement('div', boxStyles);
    box.style.left = `${abs_startX}px`;
    box.style.top = `${abs_startY}px`;
    document.body.appendChild(box);

    rel_startX = e.clientX;
    rel_startY = e.clientY;
}

function drawBox(e)
{
    if (!isDrawing) return;

    abs_endX = e.pageX;
    abs_endY = e.pageY;

    box.style.width = `${Math.abs(abs_endX - abs_startX)}px`;
    box.style.height = `${Math.abs(abs_endY - abs_startY)}px`;
    box.style.left = `${Math.min(abs_startX, abs_endX)}px`;
    box.style.top = `${Math.min(abs_startY, abs_endY)}px`;

    rel_endX = e.clientX;
    rel_endY = e.clientY;
}

function stopDrawing()
{
    if (!isDrawing) return;
    isDrawing = false;

    const boxCoordinates = {
        startX: Math.min(rel_startX, rel_endX),
        startY: Math.min(rel_startY, rel_endY),
        width: Math.abs(rel_endX - rel_startX),
        height: Math.abs(rel_endY - rel_startY)
    };

    document.body.removeChild(overlay);
    document.body.removeChild(box);
    
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'capture', coordinates: boxCoordinates });
    }, 300);

}

document.addEventListener('mousedown', startDrawing);
document.addEventListener('mousemove', drawBox);
document.addEventListener('mouseup', stopDrawing);

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'processImage')
    {
        const { dataUrl, coordinates } = message;
        const { startX, startY, width, height } = coordinates;

        const image = new Image();
        image.src = dataUrl;

        image.onload = () => {
            // Create a canvas to crop the image
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // Set the canvas size to match the selected crop area
            canvas.width = width;
            canvas.height = height;
            
            // Calculate the scaling factor based on the image size
            const scaleX = image.width / window.innerWidth; // Adjust based on actual width
            const scaleY = image.height / window.innerHeight; // Adjust based on actual height
            
            // Calculate the actual source coordinates for cropping
            const sourceX = startX * scaleX;
            const sourceY = startY * scaleY;

            context.drawImage(
                image,
                sourceX, sourceY, width * scaleX, height * scaleY, // Source coordinates and size
                0, 0, width, height // Destination canvas size
            );
            

            // Convert the canvas to a data URL (cropped image)
            canvas.toBlob((blob) => {
                if (blob)  // Ensure blob is not null
                {
                    const url = URL.createObjectURL(blob);
                    
                    // Download the cropped image
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'cropped_screenshot.png';
                    document.body.appendChild(a); // Append the link to the document
                    a.click(); // Trigger the download
                    document.body.removeChild(a); // Clean up the link element
                    
                    // Revoke the URL after a short delay
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
