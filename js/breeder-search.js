class BreederSearchSystem {
    constructor() {
        this.user = null;
        this.db = firebase.firestore();
        this.currentFilters = {
            species: [],
            location: null,
            rating: 0,
            price: {
                min: 0,
                max: null
            },
            experience: 0
        };
        this.searchResults = [];
        this.lastVisible = null;
        this.loading = false;
    }

    // 検索システムの初期化
    async initialize(user) {
        this.user = user;
        await this.loadInitialBreeders();
        this.setupInfiniteScroll();
        this.setupFilterListeners();
    }

    // 初期ブリーダー読み込み
    async loadInitialBreeders() {
        try {
            const snapshot = await this.db.collection('breeders')
                .orderBy('rating', 'desc')
                .limit(12)
                .get();

            this.searchResults = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
            this.updateResults();
        } catch (error) {
            console.error('ブリーダーの読み込みに失敗しました:', error);
        }
    }

    // 無限スクロールの設定
    setupInfiniteScroll() {
        const container = document.querySelector('.breeder-results');
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !this.loading) {
                    this.loadMoreBreeders();
                }
            },
            { threshold: 0.1 }
        );

        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        container.appendChild(sentinel);
        observer.observe(sentinel);
    }

    // フィルターリスナーの設定
    setupFilterListeners() {
        // 鳥種フィルター
        document.querySelectorAll('.species-filter').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.currentFilters.species.push(checkbox.value);
                } else {
                    this.currentFilters.species = this.currentFilters.species
                        .filter(species => species !== checkbox.value);
                }
                this.refreshSearch();
            });
        });

        // 地域フィルター
        const locationSelect = document.getElementById('locationFilter');
        if (locationSelect) {
            locationSelect.addEventListener('change', () => {
                this.currentFilters.location = locationSelect.value || null;
                this.refreshSearch();
            });
        }

        // 評価フィルター
        const ratingFilter = document.getElementById('ratingFilter');
        if (ratingFilter) {
            ratingFilter.addEventListener('input', () => {
                this.currentFilters.rating = parseFloat(ratingFilter.value);
                this.refreshSearch();
            });
        }

        // 価格フィルター
        const priceMinInput = document.getElementById('priceMinFilter');
        const priceMaxInput = document.getElementById('priceMaxFilter');
        if (priceMinInput && priceMaxInput) {
            priceMinInput.addEventListener('input', () => {
                this.currentFilters.price.min = parseInt(priceMinInput.value) || 0;
                this.refreshSearch();
            });
            priceMaxInput.addEventListener('input', () => {
                this.currentFilters.price.max = parseInt(priceMaxInput.value) || null;
                this.refreshSearch();
            });
        }

        // 経験年数フィルター
        const experienceFilter = document.getElementById('experienceFilter');
        if (experienceFilter) {
            experienceFilter.addEventListener('input', () => {
                this.currentFilters.experience = parseInt(experienceFilter.value);
                this.refreshSearch();
            });
        }
    }

    // 検索の更新
    async refreshSearch() {
        this.loading = true;
        this.searchResults = [];
        this.lastVisible = null;
        
        try {
            let query = this.db.collection('breeders');

            // フィルターの適用
            if (this.currentFilters.species.length > 0) {
                query = query.where('species', 'array-contains-any', this.currentFilters.species);
            }
            
            if (this.currentFilters.location) {
                query = query.where('location', '==', this.currentFilters.location);
            }

            if (this.currentFilters.rating > 0) {
                query = query.where('rating', '>=', this.currentFilters.rating);
            }

            if (this.currentFilters.experience > 0) {
                query = query.where('experience', '>=', this.currentFilters.experience);
            }

            query = query.orderBy('rating', 'desc');

            const snapshot = await query.limit(12).get();

            this.searchResults = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(breeder => {
                if (this.currentFilters.price.min > 0 && breeder.averagePrice < this.currentFilters.price.min) {
                    return false;
                }
                if (this.currentFilters.price.max && breeder.averagePrice > this.currentFilters.price.max) {
                    return false;
                }
                return true;
            });

            this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
            this.updateResults();
        } catch (error) {
            console.error('検索の更新に失敗しました:', error);
        } finally {
            this.loading = false;
        }
    }

    // さらにブリーダーを読み込む
    async loadMoreBreeders() {
        if (!this.lastVisible || this.loading) return;

        this.loading = true;
        try {
            let query = this.db.collection('breeders')
                .orderBy('rating', 'desc')
                .startAfter(this.lastVisible)
                .limit(12);

            // フィルターの適用
            if (this.currentFilters.species.length > 0) {
                query = query.where('species', 'array-contains-any', this.currentFilters.species);
            }
            
            if (this.currentFilters.location) {
                query = query.where('location', '==', this.currentFilters.location);
            }

            if (this.currentFilters.rating > 0) {
                query = query.where('rating', '>=', this.currentFilters.rating);
            }

            if (this.currentFilters.experience > 0) {
                query = query.where('experience', '>=', this.currentFilters.experience);
            }

            const snapshot = await query.get();

            const newBreeders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(breeder => {
                if (this.currentFilters.price.min > 0 && breeder.averagePrice < this.currentFilters.price.min) {
                    return false;
                }
                if (this.currentFilters.price.max && breeder.averagePrice > this.currentFilters.price.max) {
                    return false;
                }
                return true;
            });

            this.searchResults = [...this.searchResults, ...newBreeders];
            this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
            this.updateResults(true);
        } catch (error) {
            console.error('追加のブリーダー読み込みに失敗しました:', error);
        } finally {
            this.loading = false;
        }
    }

    // 検索結果の更新
    updateResults(append = false) {
        const container = document.querySelector('.breeder-results');
        if (!container) return;

        if (!append) {
            container.innerHTML = '';
        }

        const newResults = this.searchResults.map(breeder => `
            <div class="breeder-card">
                <div class="breeder-header">
                    <img src="${breeder.profileImage || '../images/default-breeder.png'}" 
                         alt="${breeder.name}" 
                         class="breeder-avatar">
                    <div class="breeder-info">
                        <h3>${breeder.name}</h3>
                        <div class="breeder-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${breeder.location}
                        </div>
                        <div class="breeder-rating">
                            ${this.generateStars(breeder.rating)}
                            <span class="rating-count">(${breeder.reviewCount || 0}件)</span>
                        </div>
                    </div>
                    <button class="favorite-button ${breeder.isFavorite ? 'active' : ''}"
                            onclick="breederSearchSystem.toggleFavorite('${breeder.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="breeder-body">
                    <div class="breeder-species">
                        <h4>取扱い鳥種</h4>
                        <div class="species-tags">
                            ${breeder.species.map(species => `
                                <span class="species-tag">${species}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div class="breeder-stats">
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            <span>経験年数: ${breeder.experience}年</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-hand-holding-usd"></i>
                            <span>平均価格: ¥${breeder.averagePrice.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-home"></i>
                            <span>年間販売数: ${breeder.annualSales || 0}羽</span>
                        </div>
                    </div>
                    <p class="breeder-description">${breeder.description || ''}</p>
                </div>
                <div class="breeder-footer">
                    <button class="contact-button" onclick="breederSearchSystem.contactBreeder('${breeder.id}')">
                        <i class="fas fa-envelope"></i>
                        問い合わせ
                    </button>
                    <button class="view-profile-button" onclick="breederSearchSystem.viewProfile('${breeder.id}')">
                        <i class="fas fa-user"></i>
                        プロフィール
                    </button>
                </div>
            </div>
        `).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', newResults);
        } else {
            container.innerHTML = newResults || `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>条件に一致するブリーダーが見つかりませんでした。</p>
                </div>
            `;
        }
    }

    // 星評価の生成
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        return `
            ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
            ${halfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
            ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
            <span class="rating-value">${rating.toFixed(1)}</span>
        `;
    }

    // お気に入りの切り替え
    async toggleFavorite(breederId) {
        if (!this.user) {
            authSystem.toggleAuth(true);
            return;
        }

        try {
            const breederRef = this.db.collection('breeders').doc(breederId);
            const userRef = this.db.collection('users').doc(this.user.uid);

            const breeder = this.searchResults.find(b => b.id === breederId);
            if (!breeder) return;

            const isFavorite = breeder.isFavorite;

            if (isFavorite) {
                await userRef.update({
                    favoriteBreeders: firebase.firestore.FieldValue.arrayRemove(breederId)
                });
                breeder.isFavorite = false;
            } else {
                await userRef.update({
                    favoriteBreeders: firebase.firestore.FieldValue.arrayUnion(breederId)
                });
                breeder.isFavorite = true;
            }

            this.updateResults();
        } catch (error) {
            console.error('お気に入りの更新に失敗しました:', error);
        }
    }

    // ブリーダーへの問い合わせ
    contactBreeder(breederId) {
        if (!this.user) {
            authSystem.toggleAuth(true);
            return;
        }

        const breeder = this.searchResults.find(b => b.id === breederId);
        if (!breeder) return;

        // チャットシステムを使用して問い合わせを開始
        chatSystem.startChat(breederId);
    }

    // プロフィールの表示
    viewProfile(breederId) {
        window.location.href = `/breeders/${breederId}`;
    }
}
