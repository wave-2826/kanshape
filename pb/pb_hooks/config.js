/**
 * Get the value of a config option by key
 * @template T [null]
 * @param {string} key The key of the config option to retrieve
 * @param {T} defaultValue The default value to return if the config option is not found (default: null)
 * @returns {string | T} The value of the config option, or the default value if not found
 */
function getConfigOption(key, defaultValue = null) {
    try {
        const record = $app.findFirstRecordByData("config", "key", key);
        if(record) {
            return record.get("value");
        }
    } catch(err) {
        // record probably not found
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
    try {
        const value = getConfigOption(key);
        if(value) return value;
    } catch(err) {
        throw new BadRequestError(`Missing required application config option: ${key}`);
    }
    throw new BadRequestError(`Missing required application config option: ${key}`);
}

module.exports = {
    getConfigOption,
    getRequiredConfigOption
};