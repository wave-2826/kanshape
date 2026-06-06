/**
 * Get the value of a config option by key
 * @param {string} key The key of the config option to retrieve
 * @param {string | null} defaultValue The default value to return if the config option is not found (default: null)
 * @returns {string | null} The value of the config option, or the default value if not found
 */
function getConfigOption(key, defaultValue = null) {
    const record = $app.findFirstRecordByData("config", "key", key);
    if(record) {
        return record.get("value");
    }
    return defaultValue;
}

/**
 * Get the value of a required option; errors if the option is not found
 * @param {string} key 
 * @returns {string} The value of the config option
 * @throws {Error} If the config option is not found
 */
function getRequiredConfigOption(key) {
    const value = getConfigOption(key);
    if(value === null) {
        throw new Error(`Missing required application config option: ${key}`);
    }
    return value;
}

module.exports = {
    getConfigOption,
    getRequiredConfigOption
};