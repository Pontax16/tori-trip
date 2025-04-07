class ProfileSystem {
    constructor() {
        this.user = null;
        this.profile = null;
        this.activities = [];
        this.articles = [];
        this.comments = [];
        this.favorites = [];
    }

    // プロフィールの読み込み
    async loadProfile(uid) {
        try {
            const doc = await firebase.firestore()
                .collection('users')
                .doc(uid)
                .get();

            if (doc.exists) {
                this.profile = doc.data();
                this.updateProfileUI();
                await Promise.all([
                    this.loadActivities(),
                    this.loadArticles(),
                    this.loadComments(),
                    this.loadFavorites()
                ]);
            }
        } catch (error) {
            console.error('プロフィールの読み込みに失敗しました:', error);
        }
    }

    // プロフィールUIの更新
    updateProfileUI() {
        document.getElementById('profileName').textContent = this.profile.displayName || 'ユーザー名';
        document.getElementById('profileBio').textContent = this.profile.bio || '自己紹介文がここに表示されます。';
        
        if (this.profile.avatarUrl) {
            document.getElementById('profileAvatar').src = this.profile.avatarUrl;
        }

        document.getElementById('articleCount').textContent = this.profile.articleCount || 0;
        document.getElementById('commentCount').textContent = this.profile.commentCount || 0;
        document.getElementById('favoriteCount').textContent = this.profile.favoriteCount || 0;
    }

    // 活動履歴の読み込み
    async loadActivities() {
        try {
            const snapshot = await firebase.firestore()
                .collection('activities')
                .where('userId', '==', this.profile.uid)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            this.activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateActivitiesUI();
        } catch (error) {
            console.error('活動履歴の読み込みに失敗しました:', error);
        }
    }

    // 活動履歴UIの更新
    updateActivitiesUI() {
        const container = document.querySelector('.activity-timeline');
        container.innerHTML = this.activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <h3>${this.getActivityTitle(activity)}</h3>
                    <p>${activity.description}</p>
                    <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    // 記事の読み込み
    async loadArticles() {
        try {
            const snapshot = await firebase.firestore()
                .collection('articles')
                .where('authorId', '==', this.profile.uid)
                .orderBy('createdAt', 'desc')
                .limit(6)
                .get();

            this.articles = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateArticlesUI();
        } catch (error) {
            console.error('記事の読み込みに失敗しました:', error);
        }
    }

    // 記事UIの更新
    updateArticlesUI() {
        const container = document.querySelector('.articles-grid');
        container.innerHTML = this.articles.map(article => `
            <div class="article-card">
                <div class="card-image">
                    <img src="${article.thumbnail || '../images/default-article.jpg'}" alt="${article.title}">
                </div>
                <div class="card-content">
                    <h3>${article.title}</h3>
                    <p>${article.description}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                        <span><i class="fas fa-heart"></i> ${article.likes || 0}</span>
                        <span><i class="fas fa-comment"></i> ${article.comments || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // コメントの読み込み
    async loadComments() {
        try {
            const snapshot = await firebase.firestore()
                .collection('comments')
                .where('userId', '==', this.profile.uid)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            this.comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateCommentsUI();
        } catch (error) {
            console.error('コメントの読み込みに失敗しました:', error);
        }
    }

    // コメントUIの更新
    updateCommentsUI() {
        const container = document.querySelector('.comments-list');
        container.innerHTML = this.comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <a href="/blog/articles/${comment.articleId}" class="comment-article">${comment.articleTitle}</a>
                    <span class="comment-time">${this.formatTime(comment.createdAt)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
            </div>
        `).join('');
    }

    // お気に入りの読み込み
    async loadFavorites() {
        try {
            const snapshot = await firebase.firestore()
                .collection('favorites')
                .where('userId', '==', this.profile.uid)
                .orderBy('createdAt', 'desc')
                .limit(6)
                .get();

            this.favorites = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateFavoritesUI();
        } catch (error) {
            console.error('お気に入りの読み込みに失敗しました:', error);
        }
    }

    // お気に入りUIの更新
    updateFavoritesUI() {
        const container = document.querySelector('.favorites-grid');
        container.innerHTML = this.favorites.map(favorite => `
            <div class="favorite-card">
                <div class="card-image">
                    <img src="${favorite.thumbnail || '../images/default-favorite.jpg'}" alt="${favorite.title}">
                </div>
                <div class="card-content">
                    <h3>${favorite.title}</h3>
                    <p>${favorite.description}</p>
                    <div class="card-meta">
                        <span><i class="fas ${this.getFavoriteIcon(favorite.type)}"></i> ${favorite.type}</span>
                        <span>${this.formatTime(favorite.createdAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // プロフィール編集モーダルを開く
    openEditModal() {
        const modal = document.createElement('div');
        modal.className = 'edit-profile-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>プロフィールを編集</h2>
                <form id="editProfileForm">
                    <div class="form-group">
                        <label for="displayName">表示名</label>
                        <input type="text" id="displayName" value="${this.profile.displayName || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="bio">自己紹介</label>
                        <textarea id="bio" rows="4">${this.profile.bio || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="avatar">プロフィール画像</label>
                        <input type="file" id="avatar" accept="image/*">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="cancel-button" onclick="this.closest('.edit-profile-modal').remove()">
                            キャンセル
                        </button>
                        <button type="submit" class="save-button">
                            保存
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfile(e.target);
            modal.remove();
        });
    }

    // プロフィールの保存
    async saveProfile(form) {
        try {
            const updates = {
                displayName: form.displayName.value,
                bio: form.bio.value
            };

            const avatarFile = form.avatar.files[0];
            if (avatarFile) {
                const storageRef = firebase.storage().ref();
                const avatarRef = storageRef.child(`avatars/${this.profile.uid}`);
                await avatarRef.put(avatarFile);
                updates.avatarUrl = await avatarRef.getDownloadURL();
            }

            await firebase.firestore()
                .collection('users')
                .doc(this.profile.uid)
                .update(updates);

            this.profile = {
                ...this.profile,
                ...updates
            };

            this.updateProfileUI();
        } catch (error) {
            console.error('プロフィールの保存に失敗しました:', error);
        }
    }

    // タブの切り替え
    switchTab(tab) {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });
    }

    // アクティビティのアイコンを取得
    getActivityIcon(type) {
        const icons = {
            article: 'fa-newspaper',
            comment: 'fa-comment',
            like: 'fa-heart',
            favorite: 'fa-bookmark',
            follow: 'fa-user-plus'
        };
        return icons[type] || 'fa-circle';
    }

    // アクティビティのタイトルを取得
    getActivityTitle(activity) {
        const titles = {
            article: '新しい記事を投稿しました',
            comment: '記事にコメントしました',
            like: '記事にいいねしました',
            favorite: 'お気に入りに追加しました',
            follow: 'フォローしました'
        };
        return titles[activity.type] || '新しい活動';
    }

    // お気に入りのアイコンを取得
    getFavoriteIcon(type) {
        const icons = {
            bird: 'fa-dove',
            breeder: 'fa-user-tie',
            article: 'fa-newspaper'
        };
        return icons[type] || 'fa-star';
    }

    // 時間のフォーマット
    formatTime(timestamp) {
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'たった今';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分前`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}時間前`;
        } else {
            return `${Math.floor(diff / 86400000)}日前`;
        }
    }
}
