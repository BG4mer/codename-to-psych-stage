const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('download-btn');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    fileList.innerHTML = '';
    Array.from(files).forEach(file => {
        const li = document.createElement('div');
        li.textContent = file.name;
        fileList.appendChild(li);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let luaCode = '';

            if (file.name.endsWith('.xml')) {
                luaCode = convertCodenameXMLtoLua(content);
            } else if (file.name.endsWith('.hx')) {
                luaCode = convertCodenameHXtoLua(content);
            } else {
                luaCode = `-- Unsupported file type: ${file.name}`;
            }

            preview.value = luaCode;
        };
        reader.readAsText(file);
    });
}

downloadBtn.addEventListener('click', () => {
    const blob = new Blob([preview.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_stage.lua';
    a.click();
    URL.revokeObjectURL(url);
});
