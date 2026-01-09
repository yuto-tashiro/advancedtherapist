/**
 * Data Processor for Advanced Therapist Knowledge Platform
 * Processes markdown files and generates structured episode data
 */

const fs = require('fs');
const path = require('path');

class EpisodeProcessor {
    constructor(sourceDir, outputDir) {
        this.sourceDir = sourceDir;
        this.outputDir = outputDir;
        this.episodes = [];
    }

    // Extract episode ID from filename
    extractEpisodeId(filename) {
        const match = filename.match(/^(\d+(?:-\d+)?|番外編-\d+)\.md$/);
        return match ? match[1] : null;
    }

    // Parse markdown content
    parseMarkdown(content, filename) {
        const lines = content.split('\n');
        let summary = '';
        let themes = [];
        let keywords = new Set();
        let sections = [];
        
        // Extract summary (content between ## サマリー and next ##)
        let inSummary = false;
        let summaryLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('## サマリー')) {
                inSummary = true;
                continue;
            }
            
            if (inSummary) {
                if (line.startsWith('##') || line.startsWith('###')) {
                    inSummary = false;
                } else if (line.length > 0) {
                    summaryLines.push(line);
                }
            }
            
            // Extract section headers
            if (line.startsWith('###')) {
                sections.push(line.replace(/^###\s*/, '').replace(/◆\s*/, ''));
            }
            
            // Extract keywords from content
            this.extractKeywords(line, keywords);
        }
        
        summary = summaryLines.join(' ').replace(/^>\s*/, '').substring(0, 500);
        
        // Extract themes from 主なテーマ section
        themes = this.extractThemes(content);
        
        return {
            summary,
            themes,
            keywords: Array.from(keywords),
            sections,
            content
        };
    }

    // Extract themes from content
    extractThemes(content) {
        const themes = [];
        const themePatterns = [
            '働き方', 'キャリア', '理学療法', '歴史', 'メンタルヘルス',
            '精神医療', '教育', '研究', '起業', 'ビジネス',
            '哲学', '科学', 'エビデンス', '評価', '治療',
            '公衆衛生', '地域包括ケア', '高齢化', '介護',
            '発達障害', '認知症', 'うつ', 'ストレス',
            'スポーツ', 'リハビリテーション', '身体', '運動療法'
        ];
        
        themePatterns.forEach(theme => {
            if (content.includes(theme)) {
                themes.push(theme);
            }
        });
        
        return [...new Set(themes)];
    }

    // Extract keywords from text
    extractKeywords(text, keywordSet) {
        const importantTerms = [
            'セラピスト', '理学療法士', 'PT', 'OT', '作業療法士',
            '患者', '治療', '評価', '介入', 'リハビリ',
            '病院', '施設', '地域', '在宅', '訪問',
            'エビデンス', 'EBM', '研究', '論文', '学術',
            '教育', '養成', '大学', '協会', '資格',
            'メンタル', '精神', '心理', 'ストレス', 'ウェルビーイング',
            '起業', '独立', 'フリーランス', 'コンサル',
            '運動', '身体', '機能', '動作', '姿勢'
        ];
        
        importantTerms.forEach(term => {
            if (text.includes(term)) {
                keywordSet.add(term);
            }
        });
    }

    // Calculate similarity between episodes based on shared keywords
    calculateSimilarity(episode1, episode2) {
        const keywords1 = new Set(episode1.keywords);
        const keywords2 = new Set(episode2.keywords);
        const themes1 = new Set(episode1.themes);
        const themes2 = new Set(episode2.themes);
        
        const sharedKeywords = [...keywords1].filter(k => keywords2.has(k)).length;
        const sharedThemes = [...themes1].filter(t => themes2.has(t)).length;
        
        const totalKeywords = keywords1.size + keywords2.size;
        const totalThemes = themes1.size + themes2.size;
        
        const keywordScore = totalKeywords > 0 ? (sharedKeywords * 2) / totalKeywords : 0;
        const themeScore = totalThemes > 0 ? (sharedThemes * 2) / totalThemes : 0;
        
        return (keywordScore * 0.6 + themeScore * 0.4);
    }

    // Find related episodes
    findRelatedEpisodes(currentEpisode, allEpisodes, threshold = 0.3) {
        const related = [];
        
        allEpisodes.forEach(episode => {
            if (episode.id !== currentEpisode.id) {
                const similarity = this.calculateSimilarity(currentEpisode, episode);
                if (similarity >= threshold) {
                    related.push({
                        id: episode.id,
                        title: episode.title,
                        similarity: Math.round(similarity * 100)
                    });
                }
            }
        });
        
        return related.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    }

    // Generate title from filename and content
    generateTitle(filename, content) {
        const id = this.extractEpisodeId(filename);
        
        // Special handling for episode 0 and 番外編
        if (id === '0') return '番組の方向性';
        if (id.startsWith('番外編')) return `番外編 ${id.split('-')[1]}`;
        
        // Try to extract title from first heading or summary
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('##') && !line.includes('サマリー')) {
                return line.replace(/^##\s*/, '').trim();
            }
        }
        
        return `エピソード ${id}`;
    }

    // Process all markdown files
    async processAllFiles() {
        const files = fs.readdirSync(this.sourceDir)
            .filter(f => f.endsWith('.md') && f !== 'README.md');
        
        console.log(`Found ${files.length} markdown files`);
        
        // First pass: parse all files
        for (const file of files) {
            const episodeId = this.extractEpisodeId(file);
            if (!episodeId) continue;
            
            const filePath = path.join(this.sourceDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = this.parseMarkdown(content, file);
            const title = this.generateTitle(file, content);
            
            this.episodes.push({
                id: episodeId,
                filename: file,
                title,
                ...parsed
            });
        }
        
        console.log(`Processed ${this.episodes.length} episodes`);
        
        // Second pass: find related episodes
        this.episodes.forEach(episode => {
            episode.relatedEpisodes = this.findRelatedEpisodes(episode, this.episodes);
        });
        
        // Sort episodes
        this.episodes.sort((a, b) => {
            const getOrder = (id) => {
                if (id === '0') return 0;
                if (id.startsWith('番外編')) return 1000 + parseInt(id.split('-')[1]);
                const parts = id.split('-');
                return parseInt(parts[0]) * 10 + (parts[1] ? parseInt(parts[1]) : 0);
            };
            return getOrder(a.id) - getOrder(b.id);
        });
        
        return this.episodes;
    }

    // Generate episodes index JSON
    generateIndex() {
        const index = {
            generatedAt: new Date().toISOString(),
            totalEpisodes: this.episodes.length,
            episodes: this.episodes.map(ep => ({
                id: ep.id,
                filename: ep.filename,
                title: ep.title,
                summary: ep.summary,
                themes: ep.themes,
                keywords: ep.keywords,
                sections: ep.sections,
                relatedEpisodes: ep.relatedEpisodes
            }))
        };
        
        return index;
    }

    // Extract all unique themes
    getAllThemes() {
        const allThemes = new Set();
        this.episodes.forEach(ep => {
            ep.themes.forEach(theme => allThemes.add(theme));
        });
        return Array.from(allThemes).sort();
    }

    // Save index to file
    saveIndex(filename = 'episodes-index.json') {
        const index = this.generateIndex();
        const outputPath = path.join(this.outputDir, filename);
        fs.writeFileSync(outputPath, JSON.stringify(index, null, 2), 'utf-8');
        console.log(`Index saved to ${outputPath}`);
        
        // Also save theme list
        const themes = this.getAllThemes();
        const themesPath = path.join(this.outputDir, 'themes.json');
        fs.writeFileSync(themesPath, JSON.stringify({ themes }, null, 2), 'utf-8');
        console.log(`Themes saved to ${themesPath}`);
        
        return index;
    }
}

// Run if called directly
if (require.main === module) {
    const sourceDir = path.join(__dirname, '..');
    const outputDir = path.join(__dirname, 'data');
    
    const processor = new EpisodeProcessor(sourceDir, outputDir);
    processor.processAllFiles().then(() => {
        const index = processor.saveIndex();
        console.log('\n=== Processing Complete ===');
        console.log(`Total Episodes: ${index.totalEpisodes}`);
        console.log(`Total Themes: ${processor.getAllThemes().length}`);
        console.log('\nTop Themes:');
        const themeCounts = {};
        processor.episodes.forEach(ep => {
            ep.themes.forEach(theme => {
                themeCounts[theme] = (themeCounts[theme] || 0) + 1;
            });
        });
        Object.entries(themeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([theme, count]) => {
                console.log(`  ${theme}: ${count} episodes`);
            });
    });
}

module.exports = EpisodeProcessor;
