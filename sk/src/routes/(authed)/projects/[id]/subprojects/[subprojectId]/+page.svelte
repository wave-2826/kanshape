<script lang="ts">
    import { page } from "$app/state";
    import { link } from "$lib/actions";
    import type { ProjectLinkedSite, TypedBoardsResponse, TypedSubprojectOverviewResponse } from "$lib/data/project";
    import { Kanban, Settings } from "lucide-svelte";
    import { getProjectContext } from "../../context";
    import ProjectPage from "../../ProjectPage.svelte";
    import { watch, watchOne, type ExpandResponse } from "$lib/pocketbase";
    import { deasyncify } from "$lib/util";
    import type { Readable } from "svelte/store";
    import { Collections } from "$lib/pocketbase/generated-types";
    import BoardOverviewItems from "../../BoardOverviewItems.svelte";
    import type { ListResult } from "pocketbase";
    import type { TypedCardPreviewResponse } from "$lib/data/kanban";
    import KanbanMenu from "$lib/components/kanban/KanbanMenu.svelte";
    import Masonry from "$lib/components/Masonry.svelte";
    import CardViewPanel from "$lib/components/kanban/cardView/CardViewPanel.svelte";
    import { untrack } from "svelte";
    import { nav } from "$lib/navigation";
    import KanbanListEntry from "$lib/components/kanban/KanbanListEntry.svelte";
    
    const subprojectId = $derived(page.params.subprojectId);
    
    const project = $derived(getProjectContext().project);
    const subproject = $derived.by(() => {
        if(!project) return null;
        return $project?.expand.subprojects?.find((sp) => sp.id === subprojectId) ?? null;
    });
    
    const subprojectOverview = $derived(subproject ?
        deasyncify(watchOne(Collections.SubprojectOverview, subproject.id)) :
        null
    );

    const cards = $derived(subproject ?
        deasyncify(watch(Collections.CardPreview, {
            filter: `subprojects ~ "${subproject.id}"`,
            sort: "position,created"
        }, 1, 500, {
            waitForConnection: true,
            pollOnChange: [Collections.Cards]
        })) :
        null
    );

    let openCardId: string | null = $state(null);
    const openCard = $derived.by(() => {
        if(!openCardId || untrack(() => !cards)) return null;
        return untrack(() => $cards?.items.find((c) => c.id === openCardId)) ?? null;
    });

    // This is kind of a mess, but we need information from the open card's board, which depends
    // on the open card, so we need to do a bunch of fetching to gather that information. It's not
    // the worst, at least.
    const openCardBoard = $derived(openCard ? deasyncify(watchOne(Collections.Boards, openCard.board, {
        expand: "sections"
    })) : null);
    // It would be ideal to fetch only the open card's dependencies here, but that would benefit from
    // a separate cached card loading system or something
    // TODO: Don't fetch all board cards
    const openCardBoardCards = $derived(openCardBoard ? deasyncify(watch(Collections.CardPreview, {
        filter: `board = "${$openCardBoard?.id}"`,
        sort: "position,created"
    }, 1, 500, {
        waitForConnection: true,
        pollOnChange: [Collections.Cards]
    })) : null);
</script>

{#if project && $project !== null && subproject !== null}
    <ProjectPage
        project={$project}
        subtitle={subproject.name}
        linkedSites={subproject.linked_sites as ProjectLinkedSite[]}
        onshapeLinks={subproject}
    >
        {#snippet navItems()}
            <button use:link={`/projects/${$project.id}/subprojects/${subproject.id}/settings`}>
                <Settings />
                Settings
            </button>
        {/snippet}
        
        <div class="shell" data-modal-target>
            {#if $openCardBoard}
                <CardViewPanel
                    board={$openCardBoard}
                    boardCards={$openCardBoardCards ? $openCardBoardCards.items : []}
                    bind:card={
                        () => openCardId,
                        (id) => {
                            if(!$openCardBoardCards) return;
                            if(id && !$cards?.items.find((c) => c.id === id)) {
                                // this card is from another subproject; open its board
                                // TODO: open the linked card with a query param or something
                                const v = $openCardBoardCards.items.find(c => c.id === id);
                                if(!v) {
                                    console.warn(`Card ${id} not found in board ${$openCardBoard.id}`);
                                } else {
                                    nav(`/projects/${$project.id}/boards/${v?.board}`);
                                }
                            }
                            openCardId = id;
                        }
                    }
                    subprojects={$project.expand.subprojects ?? []}
                />
            {/if}
    
            <div class="content" style="--project-color: {$project.color || 'var(--accent)'}">
                {#if subprojectOverview && $subprojectOverview}
                    <BoardOverviewItems
                        cardCount={$subprojectOverview.card_count}
                        finishedCardCount={$subprojectOverview.finished_card_count}
                        overdueCardCount={$subprojectOverview.overdue_card_count}
                        nextDue={$subprojectOverview.next_due}
                    />
                {:else}
                    <p class="empty">Loading overview...</p>
                {/if}

                <h2><Kanban /> Cards ({$subprojectOverview?.card_count ?? 0})</h2>
                {#if cards}
                    {#if $cards !== null}
                        <KanbanMenu project={$project} cards={$cards.items} />
                        <div class="card-list">
                            {#if $cards.items.length > 0}
                                <Masonry colWidth="minmax(min(20rem, 100%), 1fr)"items={$cards.items}>
                                    {#each $cards.items as card (card.id)}
                                        <!-- TODO: a way to open any card in its board -->
                                        <KanbanListEntry
                                            showBoard boardColor={$project.color}
                                            card={card}
                                            onclick={() => openCardId = card.id}
                                        />
                                    {/each}
                                </Masonry>
                            {:else}
                                <p class="empty-cards">No cards found</p>
                            {/if}
                        </div>
                    {:else}
                        <p class="empty">Failed to load cards</p>
                    {/if}
                {:else}
                    <p class="empty">Loading cards...</p>
                {/if}
            </div>
        </div>
    </ProjectPage>
{:else}
    <p>Loading...</p>
{/if}

<!-- svelte-ignore css_unused_selector - shared styles -->
<style lang="scss">
@use "../../../../overview.scss";

.shell {
    flex: 1;
    min-height: 0;
    position: relative;
}

.content {
    padding: 0 1rem 1rem 1rem;
    overflow-y: auto;
    height: 100%;
}

h2 {
    margin-bottom: 0.5rem;
}

.card-list {
    margin: 0.5rem;
    padding: 0.5rem;
    border-radius: 4px;
    background-color: var(--bg-primary);
}

.empty-cards {
    color: var(--text-tertiary);
    font-size: var(--font-tiny);
    font-style: italic;
    text-align: center;
    padding: 0.5rem 0;
}
</style>