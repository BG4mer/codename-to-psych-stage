const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const output = document.getElementById('output');
let selectedFiles = [];

// ensure input supports multiple (index.html already has multiple attribute)
fileInput.setAttribute('multiple', '');

// UX: drag/drop & selection
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(fileList) {
  selectedFiles = Array.from(fileList || []);
  if (selectedFiles.length === 0) {
    dropZone.textContent = 'Drop .xml or .hx files here or click to select';
    convertBtn.disabled = true;
    return;
  }
  dropZone.textContent = `Files: ${selectedFiles.map(f => f.name).join(', ')}`;
  convertBtn.disabled = false;
}

// Convert & download all selected files
convertBtn.addEventListener('click', async () => {
  if (!selectedFiles || selectedFiles.length === 0) {
    output.textContent = 'No files selected.';
    return;
  }
  output.textContent = '';
  for (const file of selectedFiles) {
    const text = await file.text();
    let lua = '';
    if (file.name.toLowerCase().endsWith('.xml')) {
      lua = convertCodenameXML(text);
    } else if (file.name.toLowerCase().endsWith('.hx')) {
      lua = convertCodenameHXAdvanced(text);
    } else {
      lua = `-- Unsupported file type: ${file.name}`;
    }
    output.textContent += `-- ${file.name} -> ${file.name.replace(/\.(xml|hx)$/i, '.lua')}\n${lua}\n\n`;
    downloadConvertedFile(file.name, lua);
  }
});

// ---------------- XML -> LUA (DOMParser-based, more robust) ---------------
function convertCodenameXML(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) return `-- XML parse error: ${err.textContent}`;

    const stage = doc.querySelector('stage');
    if (!stage) return '-- No <stage> element found';

    const folderRaw = stage.getAttribute('folder') || '';
    const folder = folderRaw.replace(/\\/g,'/').replace(/\/+$/,'');
    const pathFor = name => (folder ? folder + '/' : '') + name;

    const luaLines = ['function onCreate()'];

    // sprites
    const sprites = Array.from(stage.querySelectorAll('sprite'));
    sprites.forEach(sp => {
      const sname = sp.getAttribute('name') || sp.getAttribute('sprite') || 'sprite';
      const spriteFile = sp.getAttribute('sprite') || sname;
      const x = sp.getAttribute('x') || '0';
      const y = sp.getAttribute('y') || '0';
      const scale = sp.getAttribute('scale');
      const scrollx = sp.getAttribute('scrollx');
      const scrolly = sp.getAttribute('scrolly');

      luaLines.push(`  makeLuaSprite('${sname}', '${pathFor(spriteFile)}', ${x}, ${y});`);
      if (scrollx !== null || scrolly !== null) {
        const sx = scrollx !== null ? parseFloat(scrollx) : 1;
        const sy = scrolly !== null ? parseFloat(scrolly) : sx;
        luaLines.push(`  setScrollFactor('${sname}', ${sx}, ${sy});`);
      } else {
        luaLines.push(`  setScrollFactor('${sname}', 1, 1);`);
      }
      if (scale !== null) luaLines.push(`  scaleLuaSprite('${sname}', ${parseFloat(scale)}, ${parseFloat(scale)});`);
      luaLines.push(`  addLuaSprite('${sname}', false);`);
      if (sp.getAttribute('antialiasing') !== null) luaLines.push(`  setProperty('${sname}.antialiasing', ${sp.getAttribute('antialiasing') === 'true'});`);
      if (sp.getAttribute('updateHitbox') === 'true') luaLines.push(`  updateHitbox('${sname}');`);
      luaLines.push('');
    });

    // characters (girlfriend/dad/boyfriend)
    const gf = stage.querySelector('girlfriend');
    if (gf) {
      const gx = gf.getAttribute('x') || '0';
      const gy = gf.getAttribute('y') || '0';
      const a = gf.getAttribute('alpha');
      luaLines.push('  -- girlfriend');
      luaLines.push(`  setProperty('gf.x', ${gx});`);
      luaLines.push(`  setProperty('gf.y', ${gy});`);
      if (a !== null) luaLines.push(`  setProperty('gf.alpha', ${parseFloat(a)});`);
      luaLines.push('');
    }

    const dad = stage.querySelector('dad');
    if (dad) {
      const dx = dad.getAttribute('x') || '0';
      const dy = dad.getAttribute('y') || '0';
      const cx = dad.getAttribute('camxoffset');
      const cy = dad.getAttribute('camyoffset');
      luaLines.push('  -- dad');
      luaLines.push(`  setProperty('dad.x', ${dx});`);
      luaLines.push(`  setProperty('dad.y', ${dy});`);
      if (cx !== null || cy !== null) luaLines.push(`  setProperty('dadCameraOffset', {${cx||0}, ${cy||0}});`);
      luaLines.push('');
    }

    const bf = stage.querySelector('boyfriend');
    if (bf) {
      const bx = bf.getAttribute('x') || '0';
      const by = bf.getAttribute('y') || '0';
      const cx = bf.getAttribute('camxoffset');
      const cy = bf.getAttribute('camyoffset');
      luaLines.push('  -- boyfriend');
      luaLines.push(`  setProperty('boyfriend.x', ${bx});`);
      luaLines.push(`  setProperty('boyfriend.y', ${by});`);
      if (cx !== null || cy !== null) luaLines.push(`  setProperty('boyfriendCameraOffset', {${cx||0}, ${cy||0}});`);
      luaLines.push('');
    }

    luaLines.push('end');

    // onCreatePost for zooms/skins if present
    const zoom = stage.getAttribute('zoom');
    const gfZoom = stage.getAttribute('gfZoom');
    const noteSkin = stage.getAttribute('noteSkin');
    const timeBarSkin = stage.getAttribute('timeBarSkin');
    if (zoom !== null || gfZoom !== null || noteSkin !== null || timeBarSkin !== null) {
      luaLines.push('\nfunction onCreatePost()');
      if (zoom !== null) luaLines.push(`  setProperty('defaultCamZoom', ${parseFloat(zoom)});`);
      if (gfZoom !== null) luaLines.push(`  setProperty('defaultGFZoom', ${parseFloat(gfZoom)});`);
      if (timeBarSkin !== null) luaLines.push(`  -- timeBarSkin: ${timeBarSkin}`);
      if (noteSkin !== null) luaLines.push(`  -- noteSkin: ${noteSkin}`);
      luaLines.push('end');
    }

    return luaLines.join('\n');
  } catch (e) {
    return `-- XML parse error: ${e.message}`;
  }
}

// ---------------- HX -> LUA (advanced - best-effort) ----------------
function convertCodenameHXAdvanced(hx) {
  // 1) Try detect a video asset name used via Paths.video('name', 'ext')
  let videoName = null;
  const vidNameMatch = hx.match(/Paths\\.video\\(['"]([^'"]+)['"]/);
  if (vidNameMatch) videoName = vidNameMatch[1];

  // 2) Extract step-based actions (if (step == N) {...}) and single-line `if (step == N) something;`
  const normalized = hx.replace(/\r?\n/g, ' ');
  const stepActions = [];
  let m;
  const stepBlockRe = /if\s*\(\s*step\s*==\s*(\d+)\s*\)\s*\{([^}]*)\}/g;
  while ((m = stepBlockRe.exec(normalized)) !== null) {
    stepActions.push({ step: parseInt(m[1], 10), body: m[2].trim() });
  }
  const stepSingleRe = /if\s*\(\s*step\s*==\s*(\d+)\s*\)\s*([^;]+);/g;
  while ((m = stepSingleRe.exec(normalized)) !== null) {
    const s = parseInt(m[1], 10);
    const b = m[2].trim();
    if (!stepActions.some(x => x.step === s)) stepActions.push({ step: s, body: b });
  }

  // 3) Convert executeEvent({...}) occurrences to triggerEvent(name, value1, value2) where possible
  const triggerLines = [];
  const exeRe = /executeEvent\(\s*\{([^}]*)\}\s*\)\s*;/g;
  while ((m = exeRe.exec(hx)) !== null) {
    const inner = m[1];
    const nameMatch = inner.match(/name\s*:\s*['"]([^'"]+)['"]/);
    const paramsMatch = inner.match(/params\s*:\s*\[([^\]]*)\]/);
    if (nameMatch) {
      const ename = nameMatch[1];
      let params = [];
      if (paramsMatch) {
        params = paramsMatch[1].split(',').map(s => s.trim()).filter(Boolean).map(s => s.replace(/^['"]|['"]$/g, ''));
      }
      triggerLines.push(`triggerEvent('${ename}', '${params[0]||''}', '${params[1]||''}')`);
    }
  }

  // Build output
  const out = [];
  if (videoName) {
    out.push(`-- Detected video asset: ${videoName}`);
    out.push(`-- Use startVideo('${videoName}') to play this video in Psych (if appropriate).`);
    out.push('');
  }

  out.push('function onStepHit()');
  if (stepActions.length === 0 && triggerLines.length === 0) {
    out.push('  -- no step-based actions detected (best-effort parser)');
  } else {
    // sort by step
    stepActions.sort((a,b) => a.step - b.step);
    for (const act of stepActions) {
      const step = act.step;
      const body = act.body;
      let luaBody = '';
      if (/vid\.play\s*\(\s*\)/.test(body) && videoName) {
        luaBody += `    startVideo('${videoName}')\n`;
      }
      if (/vid\.visible\s*=\s*false/.test(body)) {
        luaBody += `    setProperty('${videoName}.visible', false)\n`;
      }
      if (!luaBody) luaBody = `    -- original: ${body}\n`;
      out.push(`  if curStep == ${step} then`);
      out.push(luaBody);
      out.push('  end');
    }

    if (triggerLines.length) {
      out.push('  -- Converted executeEvent calls:');
      triggerLines.forEach(t => out.push(`  ${t};`));
    }
  }
  out.push('end');

  // Try to convert postCreate -> onCreate (basic hint)
  const postCreateMatch = hx.match(/function\s+postCreate\s*\(\)\s*\{([\s\S]*?)\}\s*/);
  if (postCreateMatch) {
    out.unshift('-- Converted postCreate -> onCreate (best-effort)');
    out.unshift('function onCreate()');
    const videoLoadMatch = postCreateMatch[1].match(/vid\.load\([^)]*Paths\.video\(\s*['"]([^'"]+)['"]/);
    if (videoLoadMatch) out.unshift(`-- Note: original code loads video '${videoLoadMatch[1]}'; add video setup if needed.`);
    out.unshift('');
  }

  return out.join('\n');
}

// ---------------- utility ----------------
function downloadConvertedFile(filename, content) {
  const outName = filename.replace(/\.(xml|hx)$/i, '.lua');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
