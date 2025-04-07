class SearchSystem {
    constructor() {
        this.searchIndex = this.buildSearchIndex();
        this.searchHistory = this.loadSearchHistory();
        this.initializeUI();
    }

    // 検索インデックスの構築
    buildSearchIndex() {
        return {
            birds: this.getBirdsData(),
            breeders: this.getBreedersData(),
            articles: this.getArticlesData()
        };
    }

    // 鳥のデータを取得
    getBirdsData() {
        return [
            {
                id: 'budgie-1',
                name: 'セキセイインコ',
                breed: 'セキセイインコ',
                tags: ['小型鳥', '初心者向け', '人気'],
                description: '初心者に最適な小型インコ。明るく活発で人懐っこい性格。',
                image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3',
                price: '15000',
                location: '東京都'
            },
            {
                id: 'cockatiel-1',
                name: 'オカメインコ',
                breed: 'オカメインコ',
                tags: ['中型鳥', '初心者向け', '人気'],
                description: '温厚で甘えん坊な性格。whistleが得意。',
                image: 'https://images.unsplash.com/photo-1591198936750-16d8e15edb9e',
                price: '20000',
                location: '大阪府'
            }
            // 他の鳥データ...
        ];
    }

    // ブリーダーのデータを取得
    getBreedersData() {
        return [
            {
                id: 'breeder-1',
                name: '田中ブリーダー',
                specialties: ['セキセイインコ', 'オカメインコ'],
                location: '東京都世田谷区',
                experience: '15年',
                description: '小型インコの専門ブリーダー。健康な鳥の育成に定評あり。',
                image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3'
            }
            // 他のブリーダーデータ...
        ];
    }

    // 記事のデータを取得
    getArticlesData() {
        return [
            {
                id: 'bird-selection-guide',
                title: 'はじめての鳥選び - 種類別の特徴と相性',
                category: '初心者ガイド',
                tags: ['初心者', '鳥選び', 'アドバイス'],
                content: '初めて鳥を飼うなら、どの種類を選べばいいのでしょうか？各種の特徴や飼い主との相性について詳しく解説します。',
                date: '2025-04-08',
                image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3'
            }
            // 他の記事データ...
        ];
    }

    // 検索履歴の読み込み
    loadSearchHistory() {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    }

    // 検索履歴の保存
    saveSearchHistory() {
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }

    // 検索履歴に追加
    addToHistory(query) {
        if (!query.trim()) return;
        
        this.searchHistory = [
            query,
            ...this.searchHistory.filter(item => item !== query)
        ].slice(0, 10);
        
        this.saveSearchHistory();
        this.updateHistoryUI();
    }

    // 検索の実行
    search(query, filters = {}) {
        if (!query.trim()) return {};

        this.addToHistory(query);
        const results = {};
        const searchQuery = query.toLowerCase();

        // 各カテゴリーで検索
        for (const [category, items] of Object.entries(this.searchIndex)) {
            results[category] = this.searchInCategory(items, searchQuery, filters[category] || {});
        }

        return results;
    }

    // カテゴリー内での検索
    searchInCategory(items, query, filters) {
        return items.filter(item => {
            // 基本的な検索条件
            const basicMatch = this.matchesBasicCriteria(item, query);
            
            // フィルター条件
            const filterMatch = this.matchesFilters(item, filters);
            
            return basicMatch && filterMatch;
        });
    }

    // 基本的な検索条件のマッチング
    matchesBasicCriteria(item, query) {
        const searchableFields = [
            item.name,
            item.description,
            ...(item.tags || []),
            item.breed,
            item.title,
            item.content
        ].filter(Boolean).map(field => field.toLowerCase());

        return searchableFields.some(field => field.includes(query));
    }

    // フィルター条件のマッチング
    matchesFilters(item, filters) {
        return Object.entries(filters).every(([key, value]) => {
            if (!value) return true;
            
            switch (key) {
                case 'priceRange':
                    const price = parseInt(item.price);
                    return price >= value.min && price <= value.max;
                
                case 'location':
                    return item.location.includes(value);
                
                case 'category':
                    return item.category === value;
                
                case 'tags':
                    return value.every(tag => item.tags.includes(tag));
                
                default:
                    return true;
            }
        });
    }

    // UIの初期化
    initializeUI() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = this.getSearchHTML();
        document.body.appendChild(searchContainer);

        this.attachEventListeners();
    }

    // 検索UIのHTML
    getSearchHTML() {
        return `
            <div class="search-overlay"></div>
            <div class="search-panel">
                <div class="search-header">
                    <div class="search-input-container">
                        <input type="text" class="search-input" placeholder="鳥、ブリーダー、記事を検索...">
                        <button class="search-button">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    <button class="close-search">&times;</button>
                </div>

                <div class="search-filters">
                    <div class="filter-group">
                        <label>カテゴリー</label>
                        <select class="category-filter">
                            <option value="">すべて</option>
                            <option value="birds">鳥</option>
                            <option value="breeders">ブリーダー</option>
                            <option value="articles">記事</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>地域</label>
                        <select class="location-filter">
                            <option value="">すべて</option>
                            <option value="東京都">東京都</option>
                            <option value="大阪府">大阪府</option>
                            <option value="神奈川県">神奈川県</option>
                        </select>
                    </div>

                    <div class="filter-group">
                        <label>価格帯</label>
                        <div class="price-range">
                            <input type="number" class="price-min" placeholder="下限">
                            <span>〜</span>
                            <input type="number" class="price-max" placeholder="上限">
                        </div>
                    </div>
                </div>

                <div class="search-history">
                    <h3>検索履歴</h3>
                    <div class="history-items"></div>
                </div>

                <div class="search-results"></div>
            </div>
        `;
    }

    // イベントリスナーの設定
    attachEventListeners() {
        const searchPanel = document.querySelector('.search-panel');
        const searchInput = searchPanel.querySelector('.search-input');
        const searchButton = searchPanel.querySelector('.search-button');
        const closeButton = searchPanel.querySelector('.close-search');
        const filters = searchPanel.querySelectorAll('select, input[type="number"]');

        // 検索ボタンのクリック
        searchButton.addEventListener('click', () => {
            this.performSearch();
        });

        // Enterキーでの検索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // フィルターの変更
        filters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.performSearch();
            });
        });

        // 閉じるボタン
        closeButton.addEventListener('click', () => {
            this.toggleSearch(false);
        });

        // オーバーレイクリックで閉じる
        document.querySelector('.search-overlay').addEventListener('click', () => {
            this.toggleSearch(false);
        });

        // ショートカットキー
        document.addEventListener('keydown', (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                this.toggleSearch(true);
            } else if (e.key === 'Escape') {
                this.toggleSearch(false);
            }
        });

        // 検索履歴の更新
        this.updateHistoryUI();
    }

    // 検索の実行
    performSearch() {
        const searchPanel = document.querySelector('.search-panel');
        const query = searchPanel.querySelector('.search-input').value;
        const category = searchPanel.querySelector('.category-filter').value;
        const location = searchPanel.querySelector('.location-filter').value;
        const minPrice = searchPanel.querySelector('.price-min').value;
        const maxPrice = searchPanel.querySelector('.price-max').value;

        const filters = {
            category: category,
            location: location,
            priceRange: minPrice || maxPrice ? {
                min: parseInt(minPrice) || 0,
                max: parseInt(maxPrice) || Infinity
            } : null
        };

        const results = this.search(query, filters);
        this.displayResults(results);
    }

    // 検索結果の表示
    displayResults(results) {
        const resultsContainer = document.querySelector('.search-results');
        
        if (Object.values(results).every(arr => arr.length === 0)) {
            resultsContainer.innerHTML = '<p class="no-results">検索結果が見つかりませんでした。</p>';
            return;
        }

        let html = '';
        
        // 鳥の検索結果
        if (results.birds && results.birds.length > 0) {
            html += `
                <div class="result-section">
                    <h3>鳥 (${results.birds.length}件)</h3>
                    <div class="result-grid">
                        ${results.birds.map(bird => this.renderBirdResult(bird)).join('')}
                    </div>
                </div>
            `;
        }

        // ブリーダーの検索結果
        if (results.breeders && results.breeders.length > 0) {
            html += `
                <div class="result-section">
                    <h3>ブリーダー (${results.breeders.length}件)</h3>
                    <div class="result-grid">
                        ${results.breeders.map(breeder => this.renderBreederResult(breeder)).join('')}
                    </div>
                </div>
            `;
        }

        // 記事の検索結果
        if (results.articles && results.articles.length > 0) {
            html += `
                <div class="result-section">
                    <h3>記事 (${results.articles.length}件)</h3>
                    <div class="result-grid">
                        ${results.articles.map(article => this.renderArticleResult(article)).join('')}
                    </div>
                </div>
            `;
        }

        resultsContainer.innerHTML = html;
    }

    // 鳥の検索結果の表示
    renderBirdResult(bird) {
        return `
            <div class="result-card">
                <img src="${bird.image}" alt="${bird.name}" loading="lazy">
                <div class="result-content">
                    <h4>${bird.name}</h4>
                    <p class="result-breed">${bird.breed}</p>
                    <p class="result-price">¥${parseInt(bird.price).toLocaleString()}</p>
                    <div class="result-tags">
                        ${(bird.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // ブリーダーの検索結果の表示
    renderBreederResult(breeder) {
        return `
            <div class="result-card">
                <img src="${breeder.image}" alt="${breeder.name}" loading="lazy">
                <div class="result-content">
                    <h4>${breeder.name}</h4>
                    <p class="result-location">${breeder.location}</p>
                    <p class="result-experience">${breeder.experience}の経験</p>
                    <div class="result-specialties">
                        ${breeder.specialties.map(s => `<span class="specialty">${s}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 記事の検索結果の表示
    renderArticleResult(article) {
        return `
            <div class="result-card">
                <img src="${article.image}" alt="${article.title}" loading="lazy">
                <div class="result-content">
                    <div class="result-category">${article.category}</div>
                    <h4>${article.title}</h4>
                    <p class="result-excerpt">${article.content.substring(0, 100)}...</p>
                    <div class="result-tags">
                        ${(article.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 検索履歴の更新
    updateHistoryUI() {
        const historyContainer = document.querySelector('.history-items');
        
        if (!this.searchHistory.length) {
            historyContainer.innerHTML = '<p class="no-history">検索履歴はありません</p>';
            return;
        }

        historyContainer.innerHTML = this.searchHistory
            .map(query => `
                <div class="history-item">
                    <i class="fas fa-history"></i>
                    <span>${query}</span>
                    <button class="remove-history" data-query="${query}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `)
            .join('');

        // 履歴削除ボタンのイベントリスナー
        historyContainer.querySelectorAll('.remove-history').forEach(button => {
            button.addEventListener('click', (e) => {
                const query = e.currentTarget.dataset.query;
                this.searchHistory = this.searchHistory.filter(item => item !== query);
                this.saveSearchHistory();
                this.updateHistoryUI();
            });
        });

        // 履歴クリックで検索
        historyContainer.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-history')) {
                    const query = item.querySelector('span').textContent;
                    document.querySelector('.search-input').value = query;
                    this.performSearch();
                }
            });
        });
    }

    // 検索パネルの表示/非表示
    toggleSearch(show) {
        const searchPanel = document.querySelector('.search-panel');
        const searchOverlay = document.querySelector('.search-overlay');
        
        if (show) {
            searchPanel.classList.add('visible');
            searchOverlay.classList.add('visible');
            document.querySelector('.search-input').focus();
        } else {
            searchPanel.classList.remove('visible');
            searchOverlay.classList.remove('visible');
        }
    }
}
