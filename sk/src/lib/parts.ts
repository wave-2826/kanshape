/**
 * Constructs a part ID string. The current part ID format is:
 * `{project id}-{part number + subproject offset}{revision letter}`.
 * For example, the second revision of part 1 of project `2826-26` in subproject `1000` would be `2826-26-1001B`.
 * @param projectIdPrefix
 * @param subprojectOffset
 * @param partNumber
 * @param revision
 */
export function createPartIDString(projectIdPrefix: string, subprojectOffset: number, partNumber: number, revision: number) {
    const partNumberWithOffset = partNumber + subprojectOffset;
    return `${projectIdPrefix}-${partNumberWithOffset.toString().padStart(4, '0')}${String.fromCharCode(64 + revision)}`;
}