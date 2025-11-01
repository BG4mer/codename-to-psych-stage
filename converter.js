// Converts Codename XML stage to Psych Engine Lua
function convertCodenameXMLtoLua(xml) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const stage = xmlDoc.getElementsByTagName("stage")[0];

    let lua = "function onCreate()\n";

    // Sprites
    const sprites = stage.getElementsByTagName("sprite");
    for (let s of sprites) {
        const x = s.getAttribute("x") || 0;
        const y = s.getAttribute("y") || 0;
        const sprite = s.getAttribute("sprite");
        const scale = s.getAttribute("scale") || 1;
        lua += `makeLuaSprite('${sprite}', 'Stages/${stage.getAttribute("folder")}${sprite}', ${x}, ${y});\n`;
        lua += `scaleLuaSprite('${sprite}', ${scale}, ${scale});\n`;
        lua += `addLuaSprite('${sprite}', false);\n\n`;
    }

    // Characters
    const chars = ["girlfriend", "dad", "boyfriend"];
    for (let c of chars) {
        const el = stage.getElementsByTagName(c)[0];
        if (el) {
            const x = el.getAttribute("x") || 0;
            const y = el.getAttribute("y") || 0;
            lua += `${c} = makeLuaSprite('${c}', '', ${x}, ${y});\n`;
        }
    }

    lua += "end";
    return lua;
}

// Converts Codename HX mid-song code to Psych Engine Lua
function convertCodenameHXtoLua(hx) {
    let lua = "function onCreatePost()\n";

    // Example: just triggers time bar customization as a base
    if (hx.includes("setTimeBarColors")) {
        lua += "setTimeBarColors('FFFFFF', 'BFBFBF')\n";
    }

    // This part can be extended: parse vid.play(), visibility changes, events etc.
    if (hx.includes("vid.play()")) {
        lua += "-- Video play detected; convert to onEvent or other Lua actions\n";
    }

    lua += "end";
    return lua;
}
