/**
 * Advanced Therapist Knowledge Platform
 * Main Application Logic
 */

class AdvancedTherapistApp {
    constructor() {
        this.episodes = [];
        this.allThemes = [];
        this.filteredEpisodes = [];
        this.activeFilters = new Set();
        this.searchQuery = '';
        this.bookmarks = new Set();
        this.fuse = null;
        this.network = null;
        this.currentEpisode = null;

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.loadBookmarks();
            this.setupEventListeners();
            this.renderThemeFilters();
            this.renderEpisodes();
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('データの読み込みに失敗しました');
        }
    }

    async loadData() {
        const response = await fetch('data/episodes-index.json');
        const data = await response.json();
        this.episodes = data.episodes;
        this.filteredEpisodes = [...this.episodes];

        // Extract all unique themes
        const themesSet = new Set();
        this.episodes.forEach(ep => {
            ep.themes.forEach(theme => themesSet.add(theme));
        });
        this.allThemes = Array.from(themesSet).sort();

        // Initialize Fuse.js for fuzzy search
        this.fuse = new Fuse(this.episodes, {
            keys: ['title', 'summary', 'themes', 'keywords', 'sections'],
            threshold: 0.3,
            includeScore: true
        });
    }

    loadBookmarks() {
        const saved = localStorage.getItem('advancedTherapist_bookmarks');
        if (saved) {
            this.bookmarks = new Set(JSON.parse(saved));
        }
    }

    saveBookmarks() {
        localStorage.setItem('advancedTherapist_bookmarks',
            JSON.stringify([...this.bookmarks]));
    }

    toggleBookmark(episodeId) {
        if (this.bookmarks.has(episodeId)) {
            this.bookmarks.delete(episodeId);
        } else {
            this.bookmarks.add(episodeId);
        }
        this.saveBookmarks();
        this.updateBookmarkButtons(episodeId);
    }

    updateBookmarkButtons(episodeId) {
        document.querySelectorAll(`[data-episode-id="${episodeId}"]`).forEach(btn => {
            btn.classList.toggle('active', this.bookmarks.has(episodeId));
        });
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');

        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            clearSearch.style.display = this.searchQuery ? 'block' : 'none';
            this.applyFilters();
        });

        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearSearch.style.display = 'none';
            this.applyFilters();
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Modal
        const modal = document.getElementById('episodeModal');
        const modalClose = modal.querySelector('.modal-close');
        const modalOverlay = modal.querySelector('.modal-overlay');

        modalClose.addEventListener('click', () => this.closeModal());
        modalOverlay.addEventListener('click', () => this.closeModal());

        // Modal bookmark
        document.getElementById('modalBookmark').addEventListener('click', () => {
            if (this.currentEpisode) {
                this.toggleBookmark(this.currentEpisode.id);
            }
        });

        // Bookmarks actions
        document.getElementById('exportBookmarks').addEventListener('click', () => {
            this.exportBookmarks();
        });

        document.getElementById('clearBookmarks').addEventListener('click', () => {
            if (confirm('すべてのブックマークを削除しますか?')) {
                this.bookmarks.clear();
                this.saveBookmarks();
                this.renderBookmarks();
            }
        });

        // Graph controls
        document.getElementById('resetGraph')?.addEventListener('click', () => {
            if (this.network) {
                this.network.fit();
            }
        });

        document.getElementById('fitGraph')?.addEventListener('click', () => {
            if (this.network) {
                this.network.fit({ animation: true });
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
            if (e.key === '/' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    renderThemeFilters() {
        const container = document.getElementById('themeFilters');
        container.innerHTML = this.allThemes.map(theme => `
            <div class="theme-tag" data-theme="${theme}">
                ${theme}
            </div>
        `).join('');

        container.querySelectorAll('.theme-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                const theme = tag.dataset.theme;
                if (this.activeFilters.has(theme)) {
                    this.activeFilters.delete(theme);
                    tag.classList.remove('active');
                } else {
                    this.activeFilters.add(theme);
                    tag.classList.add('active');
                }
                this.applyFilters();
            });
        });
    }

    applyFilters() {
        let results = [...this.episodes];

        // Apply search
        if (this.searchQuery) {
            const searchResults = this.fuse.search(this.searchQuery);
            results = searchResults.map(r => r.item);
        }

        // Apply theme filters
        if (this.activeFilters.size > 0) {
            results = results.filter(ep =>
                ep.themes.some(theme => this.activeFilters.has(theme))
            );
        }

        this.filteredEpisodes = results;
        this.renderEpisodes();
        this.updateFilterStats();
    }

    updateFilterStats() {
        const count = this.filteredEpisodes.length;
        document.getElementById('resultCount').textContent =
            `${count}エピソード`;

        const clearBtn = document.getElementById('clearFilters');
        clearBtn.style.display =
            (this.activeFilters.size > 0 || this.searchQuery) ? 'block' : 'none';
    }

    clearFilters() {
        this.activeFilters.clear();
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('clearSearch').style.display = 'none';
        document.querySelectorAll('.theme-tag').forEach(tag => {
            tag.classList.remove('active');
        });
        this.applyFilters();
    }

    renderEpisodes() {
        const grid = document.getElementById('episodesGrid');
        const noResults = document.getElementById('noResults');

        if (this.filteredEpisodes.length === 0) {
            grid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        noResults.style.display = 'none';

        grid.innerHTML = this.filteredEpisodes.map(ep =>
            this.createEpisodeCard(ep)
        ).join('');

        // Add click listeners
        grid.querySelectorAll('.episode-card').forEach(card => {
            const episodeId = card.dataset.episodeId;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-btn')) {
                    this.showEpisodeDetail(episodeId);
                }
            });
        });

        // Add bookmark listeners
        grid.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const episodeId = btn.dataset.episodeId;
                this.toggleBookmark(episodeId);
            });
        });
    }

    createEpisodeCard(episode) {
        const isBookmarked = this.bookmarks.has(episode.id);
        const themesHtml = episode.themes.slice(0, 3).map(theme =>
            `<span class="theme-badge">${theme}</span>`
        ).join('');

        return `
            <div class="episode-card" data-episode-id="${episode.id}">
                <div class="episode-header">
                    <div class="episode-badge">EP ${episode.id}</div>
                    <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" 
                            data-episode-id="${episode.id}"
                            aria-label="ブックマーク">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M5 5h14v16l-7-4-7 4V5z" stroke="currentColor" stroke-width="2" fill="${isBookmarked ? 'currentColor' : 'none'}"/>
                        </svg>
                    </button>
                </div>
                <h3 class="episode-title">${episode.title}</h3>
                <p class="episode-summary">${episode.summary}</p>
                <div class="episode-themes">${themesHtml}</div>
                <div class="episode-meta">
                    <span>${episode.sections.length} セクション</span>
                    <span>${episode.relatedEpisodes.length} 関連</span>
                </div>
            </div>
        `;
    }

    showEpisodeDetail(episodeId) {
        const episode = this.episodes.find(ep => ep.id === episodeId);
        if (!episode) return;

        this.currentEpisode = episode;
        const modal = document.getElementById('episodeModal');

        // Update modal content
        document.getElementById('modalBadge').textContent = `EP ${episode.id}`;
        document.getElementById('modalTitle').textContent = episode.title;

        const modalBookmark = document.getElementById('modalBookmark');
        modalBookmark.classList.toggle('active', this.bookmarks.has(episode.id));
        modalBookmark.dataset.episodeId = episode.id;

        // Themes
        const themesHtml = episode.themes.map(theme =>
            `<span class="theme-badge">${theme}</span>`
        ).join('');
        document.getElementById('modalThemes').innerHTML = themesHtml;

        // Summary
        document.getElementById('modalSummary').textContent = episode.summary;

        // Sections
        if (episode.sections.length > 0) {
            const sectionsHtml = `
                <h3>主なセクション</h3>
                <ul>
                    ${episode.sections.map(section => `<li>${section}</li>`).join('')}
                </ul>
            `;
            document.getElementById('modalSections').innerHTML = sectionsHtml;
        } else {
            document.getElementById('modalSections').innerHTML = '';
        }

        // Related episodes
        if (episode.relatedEpisodes.length > 0) {
            const relatedHtml = `
                <h3>関連エピソード</h3>
                <div class="related-episodes">
                    ${episode.relatedEpisodes.map(rel => `
                        <div class="related-episode" data-episode-id="${rel.id}">
                            <span class="similarity-badge">${rel.similarity}%</span>
                            <span class="related-episode-title">${rel.title}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            document.getElementById('modalRelated').innerHTML = relatedHtml;

            // Add click listeners to related episodes
            document.querySelectorAll('.related-episode').forEach(el => {
                el.addEventListener('click', () => {
                    const relatedId = el.dataset.episodeId;
                    this.showEpisodeDetail(relatedId);
                });
            });
        } else {
            document.getElementById('modalRelated').innerHTML = '';
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('episodeModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentEpisode = null;
    }

    switchView(viewName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Initialize view-specific content
        if (viewName === 'graph' && !this.network) {
            this.initKnowledgeGraph();
        } else if (viewName === 'bookmarks') {
            this.renderBookmarks();
        }
    }

    initKnowledgeGraph() {
        const container = document.getElementById('knowledgeGraph');

        // Prepare nodes and edges
        const nodes = this.episodes.map(ep => ({
            id: ep.id,
            label: `EP ${ep.id}\n${ep.title.substring(0, 20)}...`,
            title: ep.title,
            color: {
                background: '#2C5F6F',
                border: '#1E4450',
                highlight: {
                    background: '#D4AF37',
                    border: '#C19B2E'
                }
            },
            font: {
                color: '#FFFFFF',
                size: 12
            }
        }));

        const edges = [];
        this.episodes.forEach(ep => {
            ep.relatedEpisodes.forEach(rel => {
                // Only add edge if similarity is high enough and avoid duplicates
                if (rel.similarity >= 30) {
                    const edgeId = [ep.id, rel.id].sort().join('-');
                    if (!edges.find(e => e.id === edgeId)) {
                        edges.push({
                            id: edgeId,
                            from: ep.id,
                            to: rel.id,
                            value: rel.similarity / 20,
                            title: `関連度: ${rel.similarity}%`
                        });
                    }
                }
            });
        });

        const data = { nodes, edges };
        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                borderWidth: 2,
                shadow: true
            },
            edges: {
                color: {
                    color: '#CCCCCC',
                    highlight: '#D4AF37'
                },
                smooth: {
                    type: 'continuous'
                }
            },
            physics: {
                stabilization: true,
                barnesHut: {
                    gravitationalConstant: -2000,
                    springConstant: 0.001,
                    springLength: 200
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200
            }
        };

        this.network = new vis.Network(container, data, options);

        // Add click listener
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const episodeId = params.nodes[0];
                this.showEpisodeDetail(episodeId);
            }
        });
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarksList');
        const noBookmarks = document.getElementById('noBookmarks');

        const bookmarkedEpisodes = this.episodes.filter(ep =>
            this.bookmarks.has(ep.id)
        );

        if (bookmarkedEpisodes.length === 0) {
            container.style.display = 'none';
            noBookmarks.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        noBookmarks.style.display = 'none';

        container.innerHTML = bookmarkedEpisodes.map(ep =>
            this.createEpisodeCard(ep)
        ).join('');

        // Add click listeners
        container.querySelectorAll('.episode-card').forEach(card => {
            const episodeId = card.dataset.episodeId;
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.bookmark-btn')) {
                    this.showEpisodeDetail(episodeId);
                }
            });
        });

        container.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const episodeId = btn.dataset.episodeId;
                this.toggleBookmark(episodeId);
                // Re-render bookmarks view
                setTimeout(() => this.renderBookmarks(), 100);
            });
        });
    }

    exportBookmarks() {
        const bookmarkedEpisodes = this.episodes.filter(ep =>
            this.bookmarks.has(ep.id)
        );

        const exportData = {
            exportedAt: new Date().toISOString(),
            totalBookmarks: bookmarkedEpisodes.length,
            episodes: bookmarkedEpisodes.map(ep => ({
                id: ep.id,
                title: ep.title,
                summary: ep.summary,
                themes: ep.themes
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)],
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `advanced-therapist-bookmarks-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    showError(message) {
        alert(message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AdvancedTherapistApp();
});
