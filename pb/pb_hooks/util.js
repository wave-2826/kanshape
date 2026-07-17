/// <reference path="../pb_data/types.d.ts" />

// parses JSON values retrieved from pocketbase as byte-arrays
function parseJSON(bytes) {
    const str = bytes.map((c) => String.fromCharCode(c)).join("");
    return JSON.parse(str);
}

/**
* @param {string} path
*/
function parseJSONFile(path) {
    return parseJSON($os.readFile(path));
}

/**
 * @param {number} mode 
 * @returns fs.FileMode
 */
function fileMode(mode) {
    return /** @type os.FileMode */(/** @type unknown */(0o755));
}
fileMode.rwx = fileMode(0o755);
fileMode.rw = fileMode(0o644);

module.exports = {
    parseJSON,
    parseJSONFile,
    fileMode
};