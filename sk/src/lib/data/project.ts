import type { ProjectsResponse } from "../pocketbase/generated-types";

export type TypedProjectsResponse<Expand = {}> = ProjectsResponse<CustomCardFields, ProjectLinkedSite[], Expand>;

export type CustomCardFields = {
    [id: string]: never
};

export type ProjectLinkedSite = {
    name: string;
    url: string;
    icon?: string | "site";
};