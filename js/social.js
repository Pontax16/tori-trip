class SocialSystem {
    constructor() {
        this.providers = {
            twitter: new firebase.auth.TwitterAuthProvider(),
            facebook: new firebase.auth.FacebookAuthProvider(),
            instagram: null // Instagram Basic Display APIを使用
        };
        this.user = null;
        this.connections = {};
        this.initializeUI();
    }

    // UIの初期化
    initializeUI() {
        const container = document.createElement('div');
        container.className = 'social-container';
        container.innerHTML = this.getSocialHTML();
        document.body.appendChild(container);

        this.attachEventListeners();
    }

    // ソーシャルUIのHTML
    getSocialHTML() {
        return `
            <div class="social-settings">
                <div class="social-header">
                    <h2>SNS連携</h2>
                    <p>SNSアカウントと連携して、投稿の共有やフォロワーとの交流ができます。</p>
                </div>
                <div class="social-connections">
                    <div class="connection-item" data-provider="twitter">
                        <div class="connection-info">
                            <i class="fab fa-twitter"></i>
                            <div class="connection-details">
                                <h3>Twitter</h3>
                                <p>ツイートの共有と自動投稿</p>
                            </div>
                        </div>
                        <button class="connect-button">
                            <i class="fas fa-link"></i>
                            連携する
                        </button>
                    </div>
                    <div class="connection-item" data-provider="facebook">
                        <div class="connection-info">
                            <i class="fab fa-facebook"></i>
                            <div class="connection-details">
                                <h3>Facebook</h3>
                                <p>投稿の共有とページ連携</p>
                            </div>
                        </div>
                        <button class="connect-button">
                            <i class="fas fa-link"></i>
                            連携する
                        </button>
                    </div>
                    <div class="connection-item" data-provider="instagram">
                        <div class="connection-info">
                            <i class="fab fa-instagram"></i>
                            <div class="connection-details">
                                <h3>Instagram</h3>
                                <p>写真の共有と投稿連携</p>
                            </div>
                        </div>
                        <button class="connect-button">
                            <i class="fas fa-link"></i>
                            連携する
                        </button>
                    </div>
                </div>
                <div class="social-settings-section">
                    <h3>共有設定</h3>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" data-setting="autoShare">
                            新規投稿を自動的に共有
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" data-setting="includeHashtags">
                            ハッシュタグを含める
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" data-setting="includeThumbnail">
                            サムネイル画像を含める
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    // イベントリスナーの設定
    attachEventListeners() {
        document.querySelectorAll('.connection-item').forEach(item => {
            const provider = item.dataset.provider;
            const button = item.querySelector('.connect-button');
            
            button.addEventListener('click', () => {
                if (button.classList.contains('connected')) {
                    this.disconnectProvider(provider);
                } else {
                    this.connectProvider(provider);
                }
            });
        });

        // 設定の変更を監視
        document.querySelectorAll('.setting-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSettings({
                    [checkbox.dataset.setting]: checkbox.checked
                });
            });
        });
    }

    // プロバイダーとの連携
    async connectProvider(provider) {
        try {
            let result;
            switch (provider) {
                case 'twitter':
                    result = await firebase.auth().signInWithPopup(this.providers.twitter);
                    break;
                case 'facebook':
                    result = await firebase.auth().signInWithPopup(this.providers.facebook);
                    break;
                case 'instagram':
                    result = await this.connectInstagram();
                    break;
            }

            if (result) {
                await this.saveConnection(provider, result);
                this.updateConnectionUI(provider, true);
                this.showSuccessToast(`${provider}との連携が完了しました`);
            }
        } catch (error) {
            console.error(`${provider}との連携に失敗しました:`, error);
            this.showErrorToast(`${provider}との連携に失敗しました`);
        }
    }

    // Instagram連携
    async connectInstagram() {
        const clientId = 'YOUR_INSTAGRAM_CLIENT_ID';
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/instagram/callback`);
        const scope = 'basic,publish_media';
        
        const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
        
        return new Promise((resolve, reject) => {
            const popup = window.open(authUrl, 'instagram-auth', 'width=600,height=600');
            
            window.addEventListener('message', async (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'instagram_auth') {
                    const { code } = event.data;
                    try {
                        const response = await fetch('/api/instagram/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ code })
                        });
                        
                        if (!response.ok) throw new Error('Token exchange failed');
                        
                        const data = await response.json();
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }

    // 連携の解除
    async disconnectProvider(provider) {
        try {
            await firebase.firestore()
                .collection('users')
                .doc(firebase.auth().currentUser.uid)
                .collection('connections')
                .doc(provider)
                .delete();

            delete this.connections[provider];
            this.updateConnectionUI(provider, false);
            this.showSuccessToast(`${provider}との連携を解除しました`);
        } catch (error) {
            console.error(`${provider}との連携解除に失敗しました:`, error);
            this.showErrorToast(`${provider}との連携解除に失敗しました`);
        }
    }

    // 連携情報の保存
    async saveConnection(provider, result) {
        const connection = {
            provider,
            accessToken: result.credential.accessToken,
            connected: true,
            connectedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (result.additionalUserInfo?.profile) {
            connection.profile = result.additionalUserInfo.profile;
        }

        await firebase.firestore()
            .collection('users')
            .doc(firebase.auth().currentUser.uid)
            .collection('connections')
            .doc(provider)
            .set(connection);

        this.connections[provider] = connection;
    }

    // 連携UIの更新
    updateConnectionUI(provider, connected) {
        const item = document.querySelector(`.connection-item[data-provider="${provider}"]`);
        const button = item.querySelector('.connect-button');
        
        button.classList.toggle('connected', connected);
        button.innerHTML = connected ? 
            '<i class="fas fa-unlink"></i>連携解除' :
            '<i class="fas fa-link"></i>連携する';
    }

    // 設定の更新
    async updateSettings(settings) {
        try {
            await firebase.firestore()
                .collection('users')
                .doc(firebase.auth().currentUser.uid)
                .update({
                    socialSettings: {
                        ...this.user.socialSettings,
                        ...settings
                    }
                });

            this.showSuccessToast('設定を保存しました');
        } catch (error) {
            console.error('設定の保存に失敗しました:', error);
            this.showErrorToast('設定の保存に失敗しました');
        }
    }

    // 記事の共有
    async shareArticle(article, providers = ['twitter', 'facebook']) {
        for (const provider of providers) {
            if (!this.connections[provider]?.connected) continue;

            try {
                switch (provider) {
                    case 'twitter':
                        await this.shareToTwitter(article);
                        break;
                    case 'facebook':
                        await this.shareToFacebook(article);
                        break;
                    case 'instagram':
                        if (article.image) {
                            await this.shareToInstagram(article);
                        }
                        break;
                }
            } catch (error) {
                console.error(`${provider}への共有に失敗しました:`, error);
            }
        }
    }

    // Twitterでの共有
    async shareToTwitter(article) {
        const text = this.formatShareText(article);
        const url = `${window.location.origin}/blog/articles/${article.id}`;
        
        const tweet = `${text}\n${url}`;
        
        // Twitter APIを使用して投稿
        await fetch('/api/twitter/tweet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tweet,
                token: this.connections.twitter.accessToken
            })
        });
    }

    // Facebookでの共有
    async shareToFacebook(article) {
        const url = `${window.location.origin}/blog/articles/${article.id}`;
        
        // Facebook Graph APIを使用して投稿
        await fetch('/api/facebook/share', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                message: this.formatShareText(article),
                token: this.connections.facebook.accessToken
            })
        });
    }

    // Instagramでの共有
    async shareToInstagram(article) {
        if (!article.image) return;
        
        // Instagram Graph APIを使用して投稿
        await fetch('/api/instagram/share', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageUrl: article.image,
                caption: this.formatShareText(article),
                token: this.connections.instagram.accessToken
            })
        });
    }

    // 共有テキストのフォーマット
    formatShareText(article) {
        let text = article.title;
        
        if (this.user.socialSettings?.includeHashtags) {
            text += '\n\n' + article.tags.map(tag => `#${tag}`).join(' ');
        }
        
        return text;
    }

    // 成功トースト表示
    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    // エラートースト表示
    showErrorToast(message) {
        this.showToast(message, 'error');
    }

    // トースト表示
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `social-toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });
        
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}
