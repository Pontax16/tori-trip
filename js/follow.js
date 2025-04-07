class FollowSystem {
    constructor() {
        this.user = null;
        this.followers = [];
        this.following = [];
        this.suggestions = [];
    }

    // フォローシステムの初期化
    async initialize(user) {
        this.user = user;
        await Promise.all([
            this.loadFollowers(),
            this.loadFollowing(),
            this.loadSuggestions()
        ]);
    }

    // フォロワーの読み込み
    async loadFollowers() {
        try {
            const snapshot = await firebase.firestore()
                .collection('follows')
                .where('followingId', '==', this.user.uid)
                .get();

            const followerIds = snapshot.docs.map(doc => doc.data().followerId);
            
            if (followerIds.length > 0) {
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', followerIds)
                    .get();

                this.followers = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                this.followers = [];
            }

            this.updateFollowersUI();
        } catch (error) {
            console.error('フォロワーの読み込みに失敗しました:', error);
        }
    }

    // フォロー中ユーザーの読み込み
    async loadFollowing() {
        try {
            const snapshot = await firebase.firestore()
                .collection('follows')
                .where('followerId', '==', this.user.uid)
                .get();

            const followingIds = snapshot.docs.map(doc => doc.data().followingId);
            
            if (followingIds.length > 0) {
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', followingIds)
                    .get();

                this.following = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                this.following = [];
            }

            this.updateFollowingUI();
        } catch (error) {
            console.error('フォロー中ユーザーの読み込みに失敗しました:', error);
        }
    }

    // おすすめユーザーの読み込み
    async loadSuggestions() {
        try {
            // フォロー中のユーザーのフォロー先を取得
            const followingIds = this.following.map(user => user.id);
            const suggestionsSet = new Set();

            for (const followingId of followingIds) {
                const snapshot = await firebase.firestore()
                    .collection('follows')
                    .where('followerId', '==', followingId)
                    .limit(5)
                    .get();

                snapshot.docs.forEach(doc => {
                    const suggestedId = doc.data().followingId;
                    if (suggestedId !== this.user.uid && !followingIds.includes(suggestedId)) {
                        suggestionsSet.add(suggestedId);
                    }
                });
            }

            // 共通の興味タグを持つユーザーを取得
            if (this.user.interests && this.user.interests.length > 0) {
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .where('interests', 'array-contains-any', this.user.interests)
                    .limit(10)
                    .get();

                snapshot.docs.forEach(doc => {
                    if (doc.id !== this.user.uid && !followingIds.includes(doc.id)) {
                        suggestionsSet.add(doc.id);
                    }
                });
            }

            // ユーザー情報を取得
            const suggestionIds = Array.from(suggestionsSet);
            if (suggestionIds.length > 0) {
                const usersSnapshot = await firebase.firestore()
                    .collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', suggestionIds)
                    .get();

                this.suggestions = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                this.suggestions = [];
            }

            this.updateSuggestionsUI();
        } catch (error) {
            console.error('おすすめユーザーの読み込みに失敗しました:', error);
        }
    }

    // フォロワーUIの更新
    updateFollowersUI() {
        const container = document.querySelector('.followers-list');
        if (!container) return;

        container.innerHTML = this.followers.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <img src="${user.photoURL || '../images/default-avatar.png'}" 
                         alt="${user.displayName}" 
                         class="user-avatar">
                    <div class="user-info">
                        <h3>${user.displayName}</h3>
                        <p>${user.bio || ''}</p>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="stat">
                        <span class="stat-value">${user.articleCount || 0}</span>
                        <span class="stat-label">記事</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${user.followerCount || 0}</span>
                        <span class="stat-label">フォロワー</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="follow-button ${this.isFollowing(user.id) ? 'following' : ''}"
                            onclick="followSystem.toggleFollow('${user.id}')">
                        ${this.isFollowing(user.id) ? 'フォロー中' : 'フォローする'}
                    </button>
                    <button class="chat-button" onclick="chatSystem.startChat('${user.id}')">
                        <i class="fas fa-comment"></i>
                        メッセージ
                    </button>
                </div>
            </div>
        `).join('');
    }

    // フォロー中UIの更新
    updateFollowingUI() {
        const container = document.querySelector('.following-list');
        if (!container) return;

        container.innerHTML = this.following.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <img src="${user.photoURL || '../images/default-avatar.png'}" 
                         alt="${user.displayName}" 
                         class="user-avatar">
                    <div class="user-info">
                        <h3>${user.displayName}</h3>
                        <p>${user.bio || ''}</p>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="stat">
                        <span class="stat-value">${user.articleCount || 0}</span>
                        <span class="stat-label">記事</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${user.followerCount || 0}</span>
                        <span class="stat-label">フォロワー</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="follow-button following"
                            onclick="followSystem.toggleFollow('${user.id}')">
                        フォロー中
                    </button>
                    <button class="chat-button" onclick="chatSystem.startChat('${user.id}')">
                        <i class="fas fa-comment"></i>
                        メッセージ
                    </button>
                </div>
            </div>
        `).join('');
    }

    // おすすめUIの更新
    updateSuggestionsUI() {
        const container = document.querySelector('.suggestions-list');
        if (!container) return;

        container.innerHTML = this.suggestions.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <img src="${user.photoURL || '../images/default-avatar.png'}" 
                         alt="${user.displayName}" 
                         class="user-avatar">
                    <div class="user-info">
                        <h3>${user.displayName}</h3>
                        <p>${user.bio || ''}</p>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="stat">
                        <span class="stat-value">${user.articleCount || 0}</span>
                        <span class="stat-label">記事</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${user.followerCount || 0}</span>
                        <span class="stat-label">フォロワー</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="follow-button"
                            onclick="followSystem.toggleFollow('${user.id}')">
                        フォローする
                    </button>
                    <button class="chat-button" onclick="chatSystem.startChat('${user.id}')">
                        <i class="fas fa-comment"></i>
                        メッセージ
                    </button>
                </div>
            </div>
        `).join('');
    }

    // フォロー状態の切り替え
    async toggleFollow(userId) {
        if (userId === this.user.uid) return;

        const isFollowing = this.isFollowing(userId);
        const batch = firebase.firestore().batch();

        const followDoc = firebase.firestore()
            .collection('follows')
            .doc(`${this.user.uid}_${userId}`);

        const userDoc = firebase.firestore()
            .collection('users')
            .doc(userId);

        const currentUserDoc = firebase.firestore()
            .collection('users')
            .doc(this.user.uid);

        try {
            if (isFollowing) {
                // フォロー解除
                batch.delete(followDoc);
                batch.update(userDoc, {
                    followerCount: firebase.firestore.FieldValue.increment(-1)
                });
                batch.update(currentUserDoc, {
                    followingCount: firebase.firestore.FieldValue.increment(-1)
                });

                await batch.commit();
                this.following = this.following.filter(user => user.id !== userId);
            } else {
                // フォロー
                const userSnapshot = await userDoc.get();
                if (!userSnapshot.exists) return;

                const userData = userSnapshot.data();
                batch.set(followDoc, {
                    followerId: this.user.uid,
                    followingId: userId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                batch.update(userDoc, {
                    followerCount: firebase.firestore.FieldValue.increment(1)
                });
                batch.update(currentUserDoc, {
                    followingCount: firebase.firestore.FieldValue.increment(1)
                });

                await batch.commit();
                this.following.push({
                    id: userId,
                    ...userData
                });
            }

            // UI更新
            this.updateFollowersUI();
            this.updateFollowingUI();
            this.updateSuggestionsUI();

            // 通知送信
            if (!isFollowing) {
                await this.sendFollowNotification(userId);
            }
        } catch (error) {
            console.error('フォロー操作に失敗しました:', error);
        }
    }

    // フォロー通知の送信
    async sendFollowNotification(userId) {
        try {
            await firebase.firestore()
                .collection('notifications')
                .add({
                    type: 'follow',
                    senderId: this.user.uid,
                    senderName: this.user.displayName,
                    senderAvatar: this.user.photoURL,
                    receiverId: userId,
                    read: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('通知の送信に失敗しました:', error);
        }
    }

    // フォロー中かどうかの確認
    isFollowing(userId) {
        return this.following.some(user => user.id === userId);
    }

    // ユーザー検索
    async searchUsers(query) {
        if (!query) return [];

        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .where('displayName', '>=', query)
                .where('displayName', '<=', query + '\uf8ff')
                .limit(10)
                .get();

            return snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(user => user.id !== this.user.uid);
        } catch (error) {
            console.error('ユーザー検索に失敗しました:', error);
            return [];
        }
    }

    // フォロワー数の取得
    getFollowerCount() {
        return this.followers.length;
    }

    // フォロー中数の取得
    getFollowingCount() {
        return this.following.length;
    }
}
