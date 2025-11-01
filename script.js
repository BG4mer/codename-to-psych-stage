const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const output = document.getElementById('output');
let selectedFile = null;

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  selectedFile = e.dataTransfer.files[0];
  dropZone.textContent = `File selected: ${selectedFile.name}`;
});

fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  dropZone.textContent = `File selected: ${selectedFile.name}`;
});

convertBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    output.textContent = 'Please select or drop a file first.';
    return;
  }

  const text = await selectedFile.text();
  let result = '';

  if (selectedFile.name.endsWith('.xml')) {
    result = convertCodenameXML(text);
  } else if (selectedFile.name.endsWith('.hx')) {
    result = convertCodenameHX(text);
  } else {
    result = 'Unsupported file type.';
  }

  output.textContent = result;
  downloadConvertedFile(selectedFile.name, result);
});

function convertCodenameXML(xml) {
  const lines = xml.split('\n').filter(line => line.includes('<sprite'));
  let lua = 'function onCreate()\n';
  for (const line of lines) {
    const nameMatch = line.match(/name=\"(.*?)\"/);
    const spriteMatch = line.match(/sprite=\"(.*?)\"/);
    const xMatch = line.match(/x=\"(.*?)\"/);
    const yMatch = line.match(/y=\"(.*?)\"/);
    const scaleMatch = line.match(/scale=\"(.*?)\"/);

    if (nameMatch && spriteMatch) {
      const name = nameMatch[1];
      const sprite = spriteMatch[1];
      const x = xMatch ? xMatch[1] : '0';
      const y = yMatch ? yMatch[1] : '0';
      const scale = scaleMatch ? scaleMatch[1] : '1';
      lua += `makeLuaSprite('${name}', '${sprite}', ${x}, ${y})\n`;
      lua += `scaleLuaSprite('${name}', ${scale}, ${scale})\n`;
      lua += `addLuaSprite('${name}', false)\n\n`;
    }
  }
  lua += 'end';
  return lua;
}

function convertCodenameHX(hx) {
  let lua = 'function onCreatePost()\n';
  if (hx.includes('vid.play()')) lua += '-- Converted video play event from Codename\n';
  lua += 'end';
  return lua;
}

function downloadConvertedFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.(xml|hx)$/i, '.lua');
  a.click();
  URL.revokeObjectURL(url);
}