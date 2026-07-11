import type { CardAssignmentData } from "./cards";

export type EntryValue = string |
    { id: string | null, title: string | null } |
    { assignment: CardAssignmentData, names: string[] } |
    { json: any } | null;

export type EntryChanges = {
    [key: string]: {
        old: EntryValue;
        new: EntryValue;
    }
};