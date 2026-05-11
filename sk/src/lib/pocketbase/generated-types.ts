/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Authorigins = "_authOrigins",
	Externalauths = "_externalAuths",
	Mfas = "_mfas",
	Otps = "_otps",
	Superusers = "_superusers",
	Cards = "cards",
	Config = "config",
	Projects = "projects",
	Sections = "sections",
	Subprojects = "subprojects",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
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
	created?: IsoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated?: IsoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated?: IsoDateString
}

export type MfasRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	method: string
	recordRef: string
	updated?: IsoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created?: IsoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated?: IsoDateString
}

export type SuperusersRecord = {
	created?: IsoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	verified?: boolean
}

export type CardsRecord<Tdata = unknown> = {
	assignments?: RecordIdString[]
	created?: IsoDateString
	created_by?: RecordIdString
	data?: null | Tdata
	description?: string
	id: string
	moved_at?: IsoDateString
	position?: number
	section: RecordIdString
	subproject?: RecordIdString
	title?: string
	updated?: IsoDateString
}

export type ConfigRecord = {
	created?: IsoDateString
	id: string
	key: string
	updated?: IsoDateString
	value?: string
}

export type ProjectsRecord = {
	created?: IsoDateString
	current_part_id?: number
	description?: string
	id: string
	part_id_prefix?: string
	title?: string
	updated?: IsoDateString
}

export type SectionsRecord = {
	created?: IsoDateString
	id: string
	position?: number
	title?: string
	updated?: IsoDateString
}

export type SubprojectsRecord = {
	created?: IsoDateString
	description?: string
	id: string
	name?: string
	project?: RecordIdString
	updated?: IsoDateString
}

export type UsersRecord<Tmetadata = unknown> = {
	avatar?: string
	created?: IsoDateString
	email?: string
	emailVisibility?: boolean
	id: string
	metadata?: null | Tmetadata
	name?: string
	password: string
	tokenKey: string
	updated?: IsoDateString
	username: string
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type CardsResponse<Tdata = unknown, Texpand = unknown> = Required<CardsRecord<Tdata>> & BaseSystemFields<Texpand>
export type ConfigResponse<Texpand = unknown> = Required<ConfigRecord> & BaseSystemFields<Texpand>
export type ProjectsResponse<Texpand = unknown> = Required<ProjectsRecord> & BaseSystemFields<Texpand>
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
	projects: ProjectsResponse
	sections: SectionsResponse
	subprojects: SubprojectsResponse
	users: UsersResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: '_authOrigins'): RecordService<AuthoriginsResponse>
	collection(idOrName: '_externalAuths'): RecordService<ExternalauthsResponse>
	collection(idOrName: '_mfas'): RecordService<MfasResponse>
	collection(idOrName: '_otps'): RecordService<OtpsResponse>
	collection(idOrName: '_superusers'): RecordService<SuperusersResponse>
	collection(idOrName: 'cards'): RecordService<CardsResponse>
	collection(idOrName: 'config'): RecordService<ConfigResponse>
	collection(idOrName: 'projects'): RecordService<ProjectsResponse>
	collection(idOrName: 'sections'): RecordService<SectionsResponse>
	collection(idOrName: 'subprojects'): RecordService<SubprojectsResponse>
	collection(idOrName: 'users'): RecordService<UsersResponse>
}
