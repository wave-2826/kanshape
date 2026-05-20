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
	Cards: "cards",
	Config: "config",
	Files: "files",
	Leaderboard: "leaderboard",
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

export const CardsPriorityOptions = {
	"low": "low",
	"medium": "medium",
	"high": "high",
	"critical": "critical",
} as const
export type CardsPriorityOptions = typeof CardsPriorityOptions[keyof typeof CardsPriorityOptions]
export type CardsRecord<Tdata = unknown, Tdue_data = unknown> = {
	created: IsoAutoDateString
	created_by?: RecordIdString
	data?: null | Tdata
	description?: string
	due_data?: null | Tdue_data
	id: string
	moved_at?: IsoDateString
	position?: number
	priority: CardsPriorityOptions
	project: RecordIdString
	section: RecordIdString
	subproject?: RecordIdString
	title?: string
	updated: IsoAutoDateString
	user_assignments?: RecordIdString[]
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

export const ProjectsTypeOptions = {
	"blank": "blank",
	"manufacturing": "manufacturing",
} as const
export type ProjectsTypeOptions = typeof ProjectsTypeOptions[keyof typeof ProjectsTypeOptions]
export type ProjectsRecord<Tcustom_card_fields = unknown> = {
	color?: string
	created: IsoAutoDateString
	current_part_id?: number
	custom_card_fields?: null | Tcustom_card_fields
	description?: string
	id: string
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

export type SubprojectsRecord = {
	created: IsoAutoDateString
	description?: string
	id: string
	name?: string
	part_id_offset?: number
	updated: IsoAutoDateString
}

export type UsersRecord<Tmetadata = unknown> = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email?: string
	emailVisibility?: boolean
	id: string
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
export type CardsResponse<Tdata = unknown, Tdue_data = unknown, Texpand = unknown> = Required<CardsRecord<Tdata, Tdue_data>> & BaseSystemFields<Texpand>
export type ConfigResponse<Texpand = unknown> = Required<ConfigRecord> & BaseSystemFields<Texpand>
export type FilesResponse<Texpand = unknown> = Required<FilesRecord> & BaseSystemFields<Texpand>
export type LeaderboardResponse<Texpand = unknown> = Required<LeaderboardRecord> & BaseSystemFields<Texpand>
export type ProjectsResponse<Tcustom_card_fields = unknown, Texpand = unknown> = Required<ProjectsRecord<Tcustom_card_fields>> & BaseSystemFields<Texpand>
export type SectionsResponse<Texpand = unknown> = Required<SectionsRecord> & BaseSystemFields<Texpand>
export type SubprojectsResponse<Texpand = unknown> = Required<SubprojectsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Tmetadata = unknown, Texpand = unknown> = Required<UsersRecord<Tmetadata>> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	cards: CardsRecord
	config: ConfigRecord
	files: FilesRecord
	leaderboard: LeaderboardRecord
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
	cards: CardsResponse
	config: ConfigResponse
	files: FilesResponse
	leaderboard: LeaderboardResponse
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
