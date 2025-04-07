class FavoriteSystem {
    constructor() {
        this.favorites = this.loadFavorites();
        this.initializeUI();
    }

    // お気に入りの読み込み
    loadFavorites() {
        return JSON.parse(localStorage.getItem('favorites') || JSON.stringify({
            birds: {},
            breeders: {},
            articles: {}
        }));
    }

    // お気に入りの保存
    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.updateUI();
    }

    // アイテムのお気に入り状態を切り替え
    toggleFavorite(type, id, data) {
        if (this.favorites[type][id]) {
            delete this.favorites[type][id];
        } else {
            this.favorites[type][id] = {
                ...data,
                addedAt: new Date().toISOString()
            };
        }
        this.saveFavorites();
        this.updateFavoriteButton(type, id);
        return this.isFavorite(type, id);
    }

    // お気に入りかどうかを確認
    isFavorite(type, id) {
        return !!this.favorites[type][id];
    }

    // お気に入りボタンの更新
    updateFavoriteButton(type, id) {
        const buttons = document.querySelectorAll(`.favorite-button[data-type="${type}"][data-id="${id}"]`);
        const isFavorite = this.isFavorite(type, id);
        
        buttons.forEach(button => {
            button.classList.toggle('active', isFavorite);
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
            }
            const count = button.querySelector('.favorite-count');
            if (count) {
                count.textContent = this.getFavoriteCount(type, id);
            }
        });
    }

    // お気に入りの数を取得
    getFavoriteCount(type, id) {
        // 実際のアプリケーションでは、サーバーから取得する
        return Math.floor(Math.random() * 100) + 1;
    }

    // お気に入りパネルの初期化
    initializeUI() {
        const panel = this.createFavoritePanel();
        document.body.appendChild(panel);
        
        // トグルボタンの追加
        const toggleButton = document.createElement('button');
        toggleButton.className = 'favorite-panel-toggle';
        toggleButton.innerHTML = '<i class="fas fa-heart"></i>';
        toggleButton.addEventListener('click', () => this.togglePanel());
        document.body.appendChild(toggleButton);
    }

    // お気に入りパネルの作成
    createFavoritePanel() {
        const panel = document.createElement('div');
        panel.className = 'favorite-panel';
        panel.innerHTML = `
            <div class="favorite-panel-header">
                <h3>お気に入り</h3>
                <button class="close-panel">&times;</button>
            </div>
            <div class="favorite-panel-tabs">
                <button class="tab-button active" data-tab="birds">鳥</button>
                <button class="tab-button" data-tab="breeders">ブリーダー</button>
                <button class="tab-button" data-tab="articles">記事</button>
            </div>
            <div class="favorite-panel-content">
                <div class="tab-content active" data-tab="birds"></div>
                <div class="tab-content" data-tab="breeders"></div>
                <div class="tab-content" data-tab="articles"></div>
            </div>
        `;

        // タブ切り替えの処理
        panel.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;
                this.switchTab(tab);
            });
        });

        // パネルを閉じる処理
        panel.querySelector('.close-panel').addEventListener('click', () => {
            this.togglePanel();
        });

        return panel;
    }

    // タブの切り替え
    switchTab(tab) {
        const panel = document.querySelector('.favorite-panel');
        panel.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tab);
        });
        panel.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tab);
        });
        this.updateTabContent(tab);
    }

    // タブコンテンツの更新
    updateTabContent(tab) {
        const content = document.querySelector(`.tab-content[data-tab="${tab}"]`);
        const items = this.favorites[tab];
        
        if (Object.keys(items).length === 0) {
            content.innerHTML = `<p class="no-favorites">お気に入りの${this.getTabName(tab)}はありません</p>`;
            return;
        }

        content.innerHTML = Object.entries(items)
            .sort((a, b) => new Date(b[1].addedAt) - new Date(a[1].addedAt))
            .map(([id, data]) => this.renderFavoriteItem(tab, id, data))
            .join('');

        // 削除ボタンのイベントリスナーを設定
        content.querySelectorAll('.remove-favorite').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = button.dataset.id;
                this.toggleFavorite(tab, id);
            });
        });
    }

    // タブ名の取得
    getTabName(tab) {
        const names = {
            birds: '鳥',
            breeders: 'ブリーダー',
            articles: '記事'
        };
        return names[tab] || tab;
    }

    // お気に入りアイテムのレンダリング
    renderFavoriteItem(type, id, data) {
        const commonClasses = 'favorite-item';
        const commonAttributes = `data-id="${id}" data-type="${type}"`;
        
        switch (type) {
            case 'birds':
                return `
                    <div class="${commonClasses}" ${commonAttributes}>
                        <img src="${data.image}" alt="${data.name}" loading="lazy">
                        <div class="favorite-item-content">
                            <h4>${data.name}</h4>
                            <p>${data.breed}</p>
                        </div>
                        <button class="remove-favorite" data-id="${id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            
            case 'breeders':
                return `
                    <div class="${commonClasses}" ${commonAttributes}>
                        <img src="${data.image}" alt="${data.name}" loading="lazy">
                        <div class="favorite-item-content">
                            <h4>${data.name}</h4>
                            <p>${data.location}</p>
                        </div>
                        <button class="remove-favorite" data-id="${id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            
            case 'articles':
                return `
                    <div class="${commonClasses}" ${commonAttributes}>
                        <div class="favorite-item-content">
                            <h4>${data.title}</h4>
                            <p>${data.category}</p>
                        </div>
                        <button class="remove-favorite" data-id="${id}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
        }
    }

    // パネルの表示/非表示を切り替え
    togglePanel() {
        const panel = document.querySelector('.favorite-panel');
        const isVisible = panel.classList.toggle('visible');
        
        if (isVisible) {
            this.updateUI();
        }
    }

    // UI全体の更新
    updateUI() {
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            this.updateTabContent(activeTab.dataset.tab);
        }
    }

    // お気に入りボタンの作成
    createFavoriteButton(type, id, data = {}) {
        const button = document.createElement('button');
        button.className = 'favorite-button';
        button.dataset.type = type;
        button.dataset.id = id;
        
        const isFavorite = this.isFavorite(type, id);
        button.innerHTML = `
            <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            <span class="favorite-count">${this.getFavoriteCount(type, id)}</span>
        `;
        
        button.addEventListener('click', () => {
            this.toggleFavorite(type, id, data);
        });
        
        return button;
    }
}
