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
    if (message.action === 'processImage') {
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
            const croppedImageDataUrl = canvas.toDataURL();

            // Use Tesseract.js to perform OCR on the cropped image
            Tesseract.recognize(
                croppedImageDataUrl,
                'eng', // Language to use for recognition
                {
                    logger: info => console.log(info) // Optional logger to track progress
                }
            ).then(({ data: { text } }) => {
                console.log('Recognized text:', text); // Log the recognized text

                // Translate the recognized text using MyMemory API
                fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        const translatedText = data.responseData.translatedText || "Translation not found.";
                        console.log('Translated text:', translatedText); // Log the translated text

                        // Create a box to contain the text
                        const box = document.createElement('div');
                        box.style.position = 'absolute';
                        box.style.left = `${abs_startX}px`;
                        box.style.top = `${abs_startY}px`;
                        box.style.border = '2px solid red'; // Style the box
                        box.style.backgroundColor = 'white'; // Background color
                        box.style.padding = '10px';
                        box.style.zIndex = '1000'; // Ensure the box is on top

                        // Create a text element to display the OCR result
                        const textElement = document.createElement('p');
                        textElement.innerText = `OCR: ${text}\nTranslation: ${translatedText}`; // Set the recognized and translated text
                        textElement.style.margin = '0';

                        // Append the text to the box
                        box.appendChild(textElement);
                        document.body.appendChild(box);

                        // Function to handle clicks outside the box
                        const handleClickOutside = (event) => {
                            if (!box.contains(event.target)) {
                                document.body.removeChild(box); // Remove the box
                                document.removeEventListener('click', handleClickOutside); // Clean up the event listener
                            }
                        };

                        // Add click event listener to the document
                        document.addEventListener('click', handleClickOutside);
                    })
                    .catch(error => {
                        console.error('Error during translation:', error);
                    });
            });
        };

        image.onerror = () => {
            console.error('Image loading failed.');
        };
    }
});
