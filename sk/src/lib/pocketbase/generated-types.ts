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
	ActiveWebhooks: "active_webhooks",
	ActivityLog: "activity_log",
	ActivityLogPreview: "activity_log_preview",
	AssignedCards: "assigned_cards",
	BoardOverview: "board_overview",
	Boards: "boards",
	CardAssignmentCache: "card_assignment_cache",
	CardPreview: "card_preview",
	Cards: "cards",
	Config: "config",
	ExportQueue: "export_queue",
	Files: "files",
	GroupOverview: "group_overview",
	Groups: "groups",
	Leaderboard: "leaderboard",
	OauthTransactions: "oauth_transactions",
	OnshapeApiCache: "onshape_api_cache",
	OnshapeDocuments: "onshape_documents",
	PartCards: "part_cards",
	Parts: "parts",
	ProjectOverview: "project_overview",
	Projects: "projects",
	Sections: "sections",
	SubprojectOverview: "subproject_overview",
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

export type ActiveWebhooksRecord<Tevents = unknown> = {
	client_id?: string
	company_id?: string
	created: IsoAutoDateString
	document_id?: string
	events: null | Tevents
	id: string
	updated: IsoAutoDateString
	url: string
	webhook_id: string
}

export const ActivityLogActionOptions = {
	"create": "create",
	"update": "update",
	"delete": "delete",
} as const
export type ActivityLogActionOptions = typeof ActivityLogActionOptions[keyof typeof ActivityLogActionOptions]

export const ActivityLogEntityTypeOptions = {
	"project": "project",
	"board": "board",
	"section": "section",
	"card": "card",
	"subproject": "subproject",
} as const
export type ActivityLogEntityTypeOptions = typeof ActivityLogEntityTypeOptions[keyof typeof ActivityLogEntityTypeOptions]
export type ActivityLogRecord<Tchanges = unknown> = {
	action: ActivityLogActionOptions
	actor?: RecordIdString
	changes?: null | Tchanges
	date: IsoAutoDateString
	entity_id?: string
	entity_title?: string
	entity_type: ActivityLogEntityTypeOptions
	id: string
	project_id?: RecordIdString
}

export const ActivityLogPreviewActionOptions = {
	"create": "create",
	"update": "update",
	"delete": "delete",
} as const
export type ActivityLogPreviewActionOptions = typeof ActivityLogPreviewActionOptions[keyof typeof ActivityLogPreviewActionOptions]

export const ActivityLogPreviewEntityTypeOptions = {
	"project": "project",
	"board": "board",
	"section": "section",
	"card": "card",
	"subproject": "subproject",
} as const
export type ActivityLogPreviewEntityTypeOptions = typeof ActivityLogPreviewEntityTypeOptions[keyof typeof ActivityLogPreviewEntityTypeOptions]
export type ActivityLogPreviewRecord<Tchanges = unknown> = {
	action: ActivityLogPreviewActionOptions
	actor?: RecordIdString
	actor_name?: string
	changes?: null | Tchanges
	date: IsoAutoDateString
	entity_id?: string
	entity_title?: string
	entity_type: ActivityLogPreviewEntityTypeOptions
	id: string
	project_color?: string
	project_id?: RecordIdString
	project_title: string
}

export const AssignedCardsPriorityOptions = {
	"low": "low",
	"medium": "medium",
	"high": "high",
	"critical": "critical",
} as const
export type AssignedCardsPriorityOptions = typeof AssignedCardsPriorityOptions[keyof typeof AssignedCardsPriorityOptions]
export type AssignedCardsRecord<Tpriority_number = unknown> = {
	board_id?: RecordIdString
	board_title?: string
	due_by?: IsoDateString
	id: string
	priority: AssignedCardsPriorityOptions
	priority_number?: null | Tpriority_number
	project_color?: string
	project_id?: RecordIdString
	project_title: string
	section_color?: string
	section_title?: string
	title?: string
}

export type BoardOverviewRecord<Tcard_count = unknown, Tfinished_card_count = unknown, Tnext_due = unknown, Toverdue_card_count = unknown> = {
	card_count?: null | Tcard_count
	finished_card_count?: null | Tfinished_card_count
	id: string
	next_due?: null | Tnext_due
	overdue_card_count?: null | Toverdue_card_count
	project_id?: RecordIdString
	title?: string
}

export const BoardsTypeOptions = {
	"blank": "blank",
	"parts": "parts",
	"software": "software",
} as const
export type BoardsTypeOptions = typeof BoardsTypeOptions[keyof typeof BoardsTypeOptions]
export type BoardsRecord<Tcustom_card_fields = unknown, Tlinked_sites = unknown> = {
	created: IsoAutoDateString
	current_part_id?: number
	custom_card_fields?: null | Tcustom_card_fields
	description?: string
	id: string
	linked_sites?: null | Tlinked_sites
	part_id_prefix?: string
	sections?: RecordIdString[]
	title?: string
	type: BoardsTypeOptions
	updated: IsoAutoDateString
}

export type CardAssignmentCacheRecord = {
	card: RecordIdString
	created: IsoAutoDateString
	group?: RecordIdString
	id: string
	updated: IsoAutoDateString
	user?: RecordIdString
}

export const CardPreviewPriorityOptions = {
	"low": "low",
	"medium": "medium",
	"high": "high",
	"critical": "critical",
} as const
export type CardPreviewPriorityOptions = typeof CardPreviewPriorityOptions[keyof typeof CardPreviewPriorityOptions]
export type CardPreviewRecord<Tassignment_data = unknown, Tassignment_name_cache = unknown, Tdescription = unknown, Tsubprojects = unknown> = {
	assignment_data?: null | Tassignment_data
	assignment_name_cache?: null | Tassignment_name_cache
	board: RecordIdString
	board_name?: string
	created: IsoAutoDateString
	created_by?: RecordIdString
	dependencies?: RecordIdString[]
	description?: null | Tdescription
	due_by?: IsoDateString
	duration_days?: number
	id: string
	moved_at?: IsoDateString
	position?: number
	priority: CardPreviewPriorityOptions
	section: RecordIdString
	section_color?: string
	section_name?: string
	subprojects?: null | Tsubprojects
	title?: string
	updated: IsoAutoDateString
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
	dependencies?: RecordIdString[]
	description?: string
	due_by?: IsoDateString
	duration_days?: number
	files?: FileNameString[]
	id: string
	metadata?: null | Tmetadata
	moved_at?: IsoDateString
	position?: number
	priority: CardsPriorityOptions
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

export type ExportQueueRecord = {
	card?: RecordIdString
	created_by?: RecordIdString
	error_message?: string
	file_id?: string
	id: string
	part_record?: RecordIdString
	status: string
	timestamp: IsoAutoDateString
	translation_id?: string
	type: string
	webhook_id?: string
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
	user: RecordIdString
}

export const OauthTransactionsProviderOptions = {
	"onshape": "onshape",
} as const
export type OauthTransactionsProviderOptions = typeof OauthTransactionsProviderOptions[keyof typeof OauthTransactionsProviderOptions]
export type OauthTransactionsRecord = {
	created: IsoAutoDateString
	id: string
	provider?: OauthTransactionsProviderOptions
	redirect_uri?: string
	return_to?: string
	updated: IsoAutoDateString
	user?: RecordIdString
}

export type OnshapeApiCacheRecord<Tbody = unknown, Theaders = unknown> = {
	body?: null | Tbody
	hash?: string
	headers?: null | Theaders
	id: string
	statusCode?: number
	timestamp?: number
}

export type OnshapeDocumentsRecord = {
	created: IsoAutoDateString
	id: string
	project?: RecordIdString
	subproject?: RecordIdString
	title?: string
	updated: IsoAutoDateString
	workspace_id?: string
}

export const PartCardsPriorityOptions = {
	"low": "low",
	"medium": "medium",
	"high": "high",
	"critical": "critical",
} as const
export type PartCardsPriorityOptions = typeof PartCardsPriorityOptions[keyof typeof PartCardsPriorityOptions]
export type PartCardsRecord<Tassignment_data = unknown, Tassignment_name_cache = unknown, Tdescription = unknown, Tsubprojects = unknown> = {
	assignment_data?: null | Tassignment_data
	assignment_name_cache?: null | Tassignment_name_cache
	board: RecordIdString
	board_name?: string
	created: IsoAutoDateString
	created_by?: RecordIdString
	dependencies?: RecordIdString[]
	description?: null | Tdescription
	due_by?: IsoDateString
	duration_days?: number
	id: string
	moved_at?: IsoDateString
	position?: number
	priority: PartCardsPriorityOptions
	project?: RecordIdString
	project_color?: string
	project_title: string
	section: RecordIdString
	section_color?: string
	section_name?: string
	subprojects?: null | Tsubprojects
	title?: string
	updated: IsoAutoDateString
}

export const PartsWvmOptions = {
	"w": "w",
	"v": "v",
	"m": "m",
} as const
export type PartsWvmOptions = typeof PartsWvmOptions[keyof typeof PartsWvmOptions]

export const PartsTypeOptions = {
	"part": "part",
	"assembly": "assembly",
} as const
export type PartsTypeOptions = typeof PartsTypeOptions[keyof typeof PartsTypeOptions]
export type PartsRecord<Tpart_data = unknown> = {
	configuration?: string
	created: IsoAutoDateString
	current_card?: RecordIdString
	document_id: string
	element_id: string
	id: string
	part_data?: null | Tpart_data
	part_id?: string
	past_revision_cards?: RecordIdString[]
	preview_model?: FileNameString
	revision?: number
	type: PartsTypeOptions
	updated: IsoAutoDateString
	wvm: PartsWvmOptions
	wvm_id: string
}

export type ProjectOverviewRecord<Tboards = unknown, Tcard_count = unknown, Tfinished_card_count = unknown, Tnext_due = unknown, Toverdue_card_count = unknown, Tsubprojects = unknown> = {
	boards?: null | Tboards
	card_count?: null | Tcard_count
	color?: string
	finished_card_count?: null | Tfinished_card_count
	id: string
	next_due?: null | Tnext_due
	overdue_card_count?: null | Toverdue_card_count
	subprojects?: null | Tsubprojects
	title: string
}

export type ProjectsRecord<Tlinked_sites = unknown> = {
	boards?: RecordIdString[]
	color?: string
	created: IsoAutoDateString
	description?: string
	id: string
	linked_sites?: null | Tlinked_sites
	subprojects?: RecordIdString[]
	title: string
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

export type SubprojectOverviewRecord<Tcard_count = unknown, Tfinished_card_count = unknown, Tnext_due = unknown, Toverdue_card_count = unknown> = {
	card_count?: null | Tcard_count
	finished_card_count?: null | Tfinished_card_count
	id: string
	name?: string
	next_due?: null | Tnext_due
	overdue_card_count?: null | Toverdue_card_count
	project_id?: RecordIdString
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

export type UsersRecord<Tmetadata = unknown, Tonshape_oauth = unknown> = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email?: string
	emailVisibility?: boolean
	groups?: RecordIdString[]
	id: string
	is_admin?: boolean
	metadata?: null | Tmetadata
	name?: string
	onshape_oauth?: null | Tonshape_oauth
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
export type ActiveWebhooksResponse<Tevents = unknown, Texpand = unknown> = Required<ActiveWebhooksRecord<Tevents>> & BaseSystemFields<Texpand>
export type ActivityLogResponse<Tchanges = unknown, Texpand = unknown> = Required<ActivityLogRecord<Tchanges>> & BaseSystemFields<Texpand>
export type ActivityLogPreviewResponse<Tchanges = unknown, Texpand = unknown> = Required<ActivityLogPreviewRecord<Tchanges>> & BaseSystemFields<Texpand>
export type AssignedCardsResponse<Tpriority_number = unknown, Texpand = unknown> = Required<AssignedCardsRecord<Tpriority_number>> & BaseSystemFields<Texpand>
export type BoardOverviewResponse<Tcard_count = unknown, Tfinished_card_count = unknown, Tnext_due = unknown, Toverdue_card_count = unknown, Texpand = unknown> = Required<BoardOverviewRecord<Tcard_count, Tfinished_card_count, Tnext_due, Toverdue_card_count>> & BaseSystemFields<Texpand>
export type BoardsResponse<Tcustom_card_fields = unknown, Tlinked_sites = unknown, Texpand = unknown> = Required<BoardsRecord<Tcustom_card_fields, Tlinked_sites>> & BaseSystemFields<Texpand>
export type CardAssignmentCacheResponse<Texpand = unknown> = Required<CardAssignmentCacheRecord> & BaseSystemFields<Texpand>
export type CardPreviewResponse<Tassignment_data = unknown, Tassignment_name_cache = unknown, Tdescription = unknown, Tsubprojects = unknown, Texpand = unknown> = Required<CardPreviewRecord<Tassignment_data, Tassignment_name_cache, Tdescription, Tsubprojects>> & BaseSystemFields<Texpand>
export type CardsResponse<Tassignment_data = unknown, Tmetadata = unknown, Texpand = unknown> = Required<CardsRecord<Tassignment_data, Tmetadata>> & BaseSystemFields<Texpand>
export type ConfigResponse<Texpand = unknown> = Required<ConfigRecord> & BaseSystemFields<Texpand>
export type ExportQueueResponse<Texpand = unknown> = Required<ExportQueueRecord> & BaseSystemFields<Texpand>
export type FilesResponse<Texpand = unknown> = Required<FilesRecord> & BaseSystemFields<Texpand>
export type GroupOverviewResponse<Tcard_count = unknown, Tmember_count = unknown, Texpand = unknown> = Required<GroupOverviewRecord<Tcard_count, Tmember_count>> & BaseSystemFields<Texpand>
export type GroupsResponse<Texpand = unknown> = Required<GroupsRecord> & BaseSystemFields<Texpand>
export type LeaderboardResponse<Texpand = unknown> = Required<LeaderboardRecord> & BaseSystemFields<Texpand>
export type OauthTransactionsResponse<Texpand = unknown> = Required<OauthTransactionsRecord> & BaseSystemFields<Texpand>
export type OnshapeApiCacheResponse<Tbody = unknown, Theaders = unknown, Texpand = unknown> = Required<OnshapeApiCacheRecord<Tbody, Theaders>> & BaseSystemFields<Texpand>
export type OnshapeDocumentsResponse<Texpand = unknown> = Required<OnshapeDocumentsRecord> & BaseSystemFields<Texpand>
export type PartCardsResponse<Tassignment_data = unknown, Tassignment_name_cache = unknown, Tdescription = unknown, Tsubprojects = unknown, Texpand = unknown> = Required<PartCardsRecord<Tassignment_data, Tassignment_name_cache, Tdescription, Tsubprojects>> & BaseSystemFields<Texpand>
export type PartsResponse<Tpart_data = unknown, Texpand = unknown> = Required<PartsRecord<Tpart_data>> & BaseSystemFields<Texpand>
export type ProjectOverviewResponse<Tboards = unknown, Tcard_count = unknown, Tfinished_card_count = unknown, Tnext_due = unknown, Toverdue_card_count = unknown, Tsubprojects = unknown, Texpand = unknown> = Required<ProjectOverviewRecord<Tboards, Tcard_count, Tfinished_card_count, Tnext_due, Toverdue_card_count, Tsubprojects>> & BaseSystemFields<Texpand>
export type ProjectsResponse<Tlinked_sites = unknown, Texpand = unknown> = Required<ProjectsRecord<Tlinked_sites>> & BaseSystemFields<Texpand>
export type SectionsResponse<Texpand = unknown> = Required<SectionsRecord> & BaseSystemFields<Texpand>
export type SubprojectOverviewResponse<Tcard_count = unknown, Tfinished_card_count = unknown, Tnext_due = unknown, Toverdue_card_count = unknown, Texpand = unknown> = Required<SubprojectOverviewRecord<Tcard_count, Tfinished_card_count, Tnext_due, Toverdue_card_count>> & BaseSystemFields<Texpand>
export type SubprojectsResponse<Tlinked_sites = unknown, Texpand = unknown> = Required<SubprojectsRecord<Tlinked_sites>> & BaseSystemFields<Texpand>
export type UsersResponse<Tmetadata = unknown, Tonshape_oauth = unknown, Texpand = unknown> = Required<UsersRecord<Tmetadata, Tonshape_oauth>> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	active_webhooks: ActiveWebhooksRecord
	activity_log: ActivityLogRecord
	activity_log_preview: ActivityLogPreviewRecord
	assigned_cards: AssignedCardsRecord
	board_overview: BoardOverviewRecord
	boards: BoardsRecord
	card_assignment_cache: CardAssignmentCacheRecord
	card_preview: CardPreviewRecord
	cards: CardsRecord
	config: ConfigRecord
	export_queue: ExportQueueRecord
	files: FilesRecord
	group_overview: GroupOverviewRecord
	groups: GroupsRecord
	leaderboard: LeaderboardRecord
	oauth_transactions: OauthTransactionsRecord
	onshape_api_cache: OnshapeApiCacheRecord
	onshape_documents: OnshapeDocumentsRecord
	part_cards: PartCardsRecord
	parts: PartsRecord
	project_overview: ProjectOverviewRecord
	projects: ProjectsRecord
	sections: SectionsRecord
	subproject_overview: SubprojectOverviewRecord
	subprojects: SubprojectsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	active_webhooks: ActiveWebhooksResponse
	activity_log: ActivityLogResponse
	activity_log_preview: ActivityLogPreviewResponse
	assigned_cards: AssignedCardsResponse
	board_overview: BoardOverviewResponse
	boards: BoardsResponse
	card_assignment_cache: CardAssignmentCacheResponse
	card_preview: CardPreviewResponse
	cards: CardsResponse
	config: ConfigResponse
	export_queue: ExportQueueResponse
	files: FilesResponse
	group_overview: GroupOverviewResponse
	groups: GroupsResponse
	leaderboard: LeaderboardResponse
	oauth_transactions: OauthTransactionsResponse
	onshape_api_cache: OnshapeApiCacheResponse
	onshape_documents: OnshapeDocumentsResponse
	part_cards: PartCardsResponse
	parts: PartsResponse
	project_overview: ProjectOverviewResponse
	projects: ProjectsResponse
	sections: SectionsResponse
	subproject_overview: SubprojectOverviewResponse
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
