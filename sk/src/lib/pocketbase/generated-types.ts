/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	Boards: "boards",
	CardPreview: "card_preview",
	Cards: "cards",
	Config: "config",
	Files: "files",
	GroupOverview: "group_overview",
	Groups: "groups",
	Leaderboard: "leaderboard",
	OnshapeDocuments: "onshape_documents",
	Projects: "projects",
	Sections: "sections",
	Subprojects: "subprojects",
	Users: "users",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const BoardsTypeOptions = {
	"blank": "blank",
	"parts": "parts",
	"software": "software",
} as const
export type BoardsTypeOptions = typeof BoardsTypeOptions[keyof typeof BoardsTypeOptions]
export type BoardsRecord<Tcustom_card_fields = unknown, Tlinked_sites = unknown> = {
	created: IsoAutoDateString
	custom_card_fields?: null | Tcustom_card_fields
	description?: string
	id: string
	linked_sites?: null | Tlinked_sites
	sections?: RecordIdString[]
	title?: string
	type: BoardsTypeOptions
	updated: IsoAutoDateString
}

export type CardPreviewRecord<Tassignment_data = unknown, Tassignment_name_cache = unknown, Tboard = unknown, Tcreated = unknown, Tcreated_by = unknown, Tdescription = unknown, Tdue_by = unknown, Tmoved_at = unknown, Tposition = unknown, Tpriority = unknown, Tproject = unknown, Tsection = unknown, Tsubprojects = unknown, Ttitle = unknown, Tupdated = unknown> = {
	assignment_data?: null | Tassignment_data
	assignment_name_cache?: null | Tassignment_name_cache
	board?: null | Tboard
	created?: null | Tcreated
	created_by?: null | Tcreated_by
	description?: null | Tdescription
	due_by?: null | Tdue_by
	id: string
	moved_at?: null | Tmoved_at
	position?: null | Tposition
	priority?: null | Tpriority
	project?: null | Tproject
	section?: null | Tsection
	subprojects?: null | Tsubprojects
	title?: null | Ttitle
	updated?: null | Tupdated
}

export const CardsPriorityOptions = {
	"low": "low",
	"medium": "medium",
	"high": "high",
	"critical": "critical",
} as const
export type CardsPriorityOptions = typeof CardsPriorityOptions[keyof typeof CardsPriorityOptions]
export type CardsRecord<Tassignment_data = unknown, Tmetadata = unknown> = {
	assignment_data?: null | Tassignment_data
	board: RecordIdString
	created: IsoAutoDateString
	created_by?: RecordIdString
	description?: string
	due_by?: IsoDateString
	id: string
	metadata?: null | Tmetadata
	moved_at?: IsoDateString
	position?: number
	priority: CardsPriorityOptions
	project: RecordIdString
	section: RecordIdString
	subprojects?: RecordIdString[]
	title?: string
	updated: IsoAutoDateString
}

export type ConfigRecord = {
	id: string
	key: string
	value?: string
}

export type FilesRecord = {
	file: FileNameString
	id: string
	path: string
}

export type GroupOverviewRecord<Tcard_count = unknown, Tmember_count = unknown> = {
	card_count?: null | Tcard_count
	created: IsoAutoDateString
	description?: string
	id: string
	member_count?: null | Tmember_count
	name?: string
	updated: IsoAutoDateString
}

export type GroupsRecord = {
	created: IsoAutoDateString
	description?: string
	id: string
	name?: string
	updated: IsoAutoDateString
}

export type LeaderboardRecord = {
	created: IsoAutoDateString
	id: string
	project?: RecordIdString
	tasks_assigned?: number
	tasks_completed?: number
	tasks_created?: number
	updated: IsoAutoDateString
	user?: RecordIdString
}

export type OnshapeDocumentsRecord = {
	created: IsoAutoDateString
	id: string
	project: RecordIdString
	subprojects?: RecordIdString
	title?: string
	updated: IsoAutoDateString
}

export const ProjectsTypeOptions = {
	"blank": "blank",
	"manufacturing": "manufacturing",
} as const
export type ProjectsTypeOptions = typeof ProjectsTypeOptions[keyof typeof ProjectsTypeOptions]
export type ProjectsRecord<Tcustom_card_fields = unknown, Tlinked_sites = unknown> = {
	boards?: RecordIdString[]
	color?: string
	created: IsoAutoDateString
	current_part_id?: number
	custom_card_fields?: null | Tcustom_card_fields
	description?: string
	id: string
	linked_sites?: null | Tlinked_sites
	part_id_prefix?: string
	sections?: RecordIdString[]
	subprojects?: RecordIdString[]
	title: string
	type: ProjectsTypeOptions
	updated: IsoAutoDateString
}

export type SectionsRecord = {
	color?: string
	created: IsoAutoDateString
	description?: string
	id: string
	is_completed?: boolean
	position?: number
	title?: string
	updated: IsoAutoDateString
}

export type SubprojectsRecord<Tlinked_sites = unknown> = {
	created: IsoAutoDateString
	description?: string
	id: string
	linked_sites?: null | Tlinked_sites
	name?: string
	part_id_offset?: number
	updated: IsoAutoDateString
}

export type UsersRecord<Tmetadata = unknown> = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email?: string
	emailVisibility?: boolean
	groups?: RecordIdString[]
	id: string
	is_admin?: boolean
	metadata?: null | Tmetadata
	name?: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	username: string
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type BoardsResponse<Tcustom_card_fields = unknown, Tlinked_sites = unknown, Texpand = unknown> = Required<BoardsRecord<Tcustom_card_fields, Tlinked_sites>> & BaseSystemFields<Texpand>
export type CardPreviewResponse<Tassignment_data = unknown, Tassignment_name_cache = unknown, Tboard = unknown, Tcreated = unknown, Tcreated_by = unknown, Tdescription = unknown, Tdue_by = unknown, Tmoved_at = unknown, Tposition = unknown, Tpriority = unknown, Tproject = unknown, Tsection = unknown, Tsubprojects = unknown, Ttitle = unknown, Tupdated = unknown, Texpand = unknown> = Required<CardPreviewRecord<Tassignment_data, Tassignment_name_cache, Tboard, Tcreated, Tcreated_by, Tdescription, Tdue_by, Tmoved_at, Tposition, Tpriority, Tproject, Tsection, Tsubprojects, Ttitle, Tupdated>> & BaseSystemFields<Texpand>
export type CardsResponse<Tassignment_data = unknown, Tmetadata = unknown, Texpand = unknown> = Required<CardsRecord<Tassignment_data, Tmetadata>> & BaseSystemFields<Texpand>
export type ConfigResponse<Texpand = unknown> = Required<ConfigRecord> & BaseSystemFields<Texpand>
export type FilesResponse<Texpand = unknown> = Required<FilesRecord> & BaseSystemFields<Texpand>
export type GroupOverviewResponse<Tcard_count = unknown, Tmember_count = unknown, Texpand = unknown> = Required<GroupOverviewRecord<Tcard_count, Tmember_count>> & BaseSystemFields<Texpand>
export type GroupsResponse<Texpand = unknown> = Required<GroupsRecord> & BaseSystemFields<Texpand>
export type LeaderboardResponse<Texpand = unknown> = Required<LeaderboardRecord> & BaseSystemFields<Texpand>
export type OnshapeDocumentsResponse<Texpand = unknown> = Required<OnshapeDocumentsRecord> & BaseSystemFields<Texpand>
export type ProjectsResponse<Tcustom_card_fields = unknown, Tlinked_sites = unknown, Texpand = unknown> = Required<ProjectsRecord<Tcustom_card_fields, Tlinked_sites>> & BaseSystemFields<Texpand>
export type SectionsResponse<Texpand = unknown> = Required<SectionsRecord> & BaseSystemFields<Texpand>
export type SubprojectsResponse<Tlinked_sites = unknown, Texpand = unknown> = Required<SubprojectsRecord<Tlinked_sites>> & BaseSystemFields<Texpand>
export type UsersResponse<Tmetadata = unknown, Texpand = unknown> = Required<UsersRecord<Tmetadata>> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	boards: BoardsRecord
	card_preview: CardPreviewRecord
	cards: CardsRecord
	config: ConfigRecord
	files: FilesRecord
	group_overview: GroupOverviewRecord
	groups: GroupsRecord
	leaderboard: LeaderboardRecord
	onshape_documents: OnshapeDocumentsRecord
	projects: ProjectsRecord
	sections: SectionsRecord
	subprojects: SubprojectsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	boards: BoardsResponse
	card_preview: CardPreviewResponse
	cards: CardsResponse
	config: ConfigResponse
	files: FilesResponse
	group_overview: GroupOverviewResponse
	groups: GroupsResponse
	leaderboard: LeaderboardResponse
	onshape_documents: OnshapeDocumentsResponse
	projects: ProjectsResponse
	sections: SectionsResponse
	subprojects: SubprojectsResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
