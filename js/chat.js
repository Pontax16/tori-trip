class ChatSystem {
    constructor() {
        this.user = null;
        this.currentChat = null;
        this.chats = [];
        this.messages = [];
        this.database = firebase.database();
        this.storage = firebase.storage();
    }

    // チャットシステムの初期化
    async initialize(user) {
        this.user = user;
        await this.loadChats();
        this.setupPresence();
        this.setupMessageListener();
    }

    // チャット一覧の読み込み
    async loadChats() {
        try {
            const snapshot = await firebase.firestore()
                .collection('chats')
                .where('participants', 'array-contains', this.user.uid)
                .orderBy('lastMessage.timestamp', 'desc')
                .get();

            this.chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.updateChatList();
        } catch (error) {
            console.error('チャット一覧の読み込みに失敗しました:', error);
        }
    }

    // オンライン状態の管理
    setupPresence() {
        const presenceRef = this.database.ref(`presence/${this.user.uid}`);
        const connectedRef = this.database.ref('.info/connected');

        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                presenceRef.onDisconnect().remove();
                presenceRef.set(true);
            }
        });
    }

    // メッセージリスナーの設定
    setupMessageListener() {
        if (!this.currentChat) return;

        const messagesRef = this.database.ref(`messages/${this.currentChat.id}`);
        messagesRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            this.addMessage(message);
        });
    }

    // チャット一覧の更新
    updateChatList() {
        const container = document.querySelector('.chat-list');
        container.innerHTML = this.chats.map(chat => {
            const otherUser = chat.participants.find(p => p.uid !== this.user.uid);
            const unreadCount = chat.unreadCount?.[this.user.uid] || 0;

            return `
                <div class="chat-item ${chat.id === this.currentChat?.id ? 'active' : ''}" 
                     onclick="chatSystem.openChat('${chat.id}')">
                    <div class="chat-item-avatar">
                        <img src="${otherUser.avatar || '../images/default-avatar.png'}" 
                             alt="${otherUser.displayName}">
                    </div>
                    <div class="chat-item-info">
                        <h3 class="chat-item-name">${otherUser.displayName}</h3>
                        <p class="chat-item-preview">${chat.lastMessage?.text || '新しいチャット'}</p>
                    </div>
                    <div class="chat-item-meta">
                        <span class="chat-item-time">
                            ${this.formatTime(chat.lastMessage?.timestamp)}
                        </span>
                        ${unreadCount > 0 ? `
                            <span class="chat-item-badge">${unreadCount}</span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // チャットを開く
    async openChat(chatId) {
        try {
            const doc = await firebase.firestore()
                .collection('chats')
                .doc(chatId)
                .get();

            if (doc.exists) {
                this.currentChat = {
                    id: doc.id,
                    ...doc.data()
                };

                this.updateChatHeader();
                await this.loadMessages();
                this.setupMessageListener();
                this.markAsRead();
            }
        } catch (error) {
            console.error('チャットの読み込みに失敗しました:', error);
        }
    }

    // チャットヘッダーの更新
    updateChatHeader() {
        if (!this.currentChat) return;

        const otherUser = this.currentChat.participants.find(p => p.uid !== this.user.uid);
        document.getElementById('chatAvatar').src = otherUser.avatar || '../images/default-avatar.png';
        document.getElementById('chatName').textContent = otherUser.displayName;

        const presenceRef = this.database.ref(`presence/${otherUser.uid}`);
        presenceRef.on('value', (snapshot) => {
            const status = document.getElementById('chatStatus');
            status.textContent = snapshot.val() ? 'オンライン' : 'オフライン';
            status.className = snapshot.val() ? 'online' : '';
        });
    }

    // メッセージの読み込み
    async loadMessages() {
        if (!this.currentChat) return;

        const messagesRef = this.database.ref(`messages/${this.currentChat.id}`);
        const snapshot = await messagesRef.orderByChild('timestamp').limitToLast(50).once('value');
        
        this.messages = [];
        snapshot.forEach((child) => {
            this.messages.push({
                id: child.key,
                ...child.val()
            });
        });

        this.updateMessages();
    }

    // メッセージの追加
    addMessage(message) {
        this.messages.push(message);
        this.updateMessages();
        this.scrollToBottom();
    }

    // メッセージ一覧の更新
    updateMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = this.messages.map(message => `
            <div class="message ${message.senderId === this.user.uid ? 'sent' : ''}">
                <div class="message-avatar">
                    <img src="${message.senderAvatar || '../images/default-avatar.png'}" 
                         alt="${message.senderName}">
                </div>
                <div class="message-content">
                    <p class="message-text">${this.formatMessage(message.text)}</p>
                    ${message.media ? `
                        <div class="message-media">
                            <img src="${message.media}" alt="共有メディア">
                        </div>
                    ` : ''}
                    <span class="message-time">${this.formatTime(message.timestamp)}</span>
                </div>
            </div>
        `).join('');

        this.scrollToBottom();
    }

    // メッセージの送信
    async sendMessage() {
        if (!this.currentChat) return;

        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text) return;

        const message = {
            text,
            senderId: this.user.uid,
            senderName: this.user.displayName,
            senderAvatar: this.user.photoURL,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            // メッセージの保存
            await this.database.ref(`messages/${this.currentChat.id}`).push(message);

            // 最後のメッセージを更新
            await firebase.firestore()
                .collection('chats')
                .doc(this.currentChat.id)
                .update({
                    lastMessage: {
                        text,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    [`unreadCount.${this.getOtherUserId()}`]: firebase.firestore.FieldValue.increment(1)
                });

            input.value = '';
            input.style.height = 'auto';
        } catch (error) {
            console.error('メッセージの送信に失敗しました:', error);
        }
    }

    // 添付ファイルの送信
    async sendAttachment(file) {
        if (!this.currentChat || !file) return;

        try {
            const ref = this.storage.ref(`chats/${this.currentChat.id}/${Date.now()}_${file.name}`);
            await ref.put(file);
            const url = await ref.getDownloadURL();

            const message = {
                text: 'メディアを共有しました',
                media: url,
                senderId: this.user.uid,
                senderName: this.user.displayName,
                senderAvatar: this.user.photoURL,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            await this.database.ref(`messages/${this.currentChat.id}`).push(message);
        } catch (error) {
            console.error('添付ファイルの送信に失敗しました:', error);
        }
    }

    // 既読にする
    async markAsRead() {
        if (!this.currentChat) return;

        try {
            await firebase.firestore()
                .collection('chats')
                .doc(this.currentChat.id)
                .update({
                    [`unreadCount.${this.user.uid}`]: 0
                });
        } catch (error) {
            console.error('既読の更新に失敗しました:', error);
        }
    }

    // 新規チャットモーダルを開く
    openNewChatModal() {
        const modal = document.createElement('div');
        modal.className = 'new-chat-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>新規チャット</h2>
                <div class="user-search">
                    <input type="text" placeholder="ユーザーを検索" id="newChatUserSearch">
                    <div class="search-results"></div>
                </div>
                <div class="modal-actions">
                    <button onclick="this.closest('.new-chat-modal').remove()">
                        キャンセル
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const searchInput = document.getElementById('newChatUserSearch');
        searchInput.addEventListener('input', () => {
            this.searchUsers(searchInput.value);
        });
    }

    // ユーザー検索
    async searchUsers(query) {
        if (!query) return;

        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .where('displayName', '>=', query)
                .where('displayName', '<=', query + '\uf8ff')
                .limit(10)
                .get();

            const results = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(user => user.id !== this.user.uid);

            this.updateSearchResults(results);
        } catch (error) {
            console.error('ユーザー検索に失敗しました:', error);
        }
    }

    // 検索結果の更新
    updateSearchResults(results) {
        const container = document.querySelector('.search-results');
        if (!container) return;

        container.innerHTML = results.map(user => `
            <div class="search-result-item" onclick="chatSystem.startChat('${user.id}')">
                <img src="${user.photoURL || '../images/default-avatar.png'}" 
                     alt="${user.displayName}">
                <div class="user-info">
                    <h3>${user.displayName}</h3>
                    <p>${user.email}</p>
                </div>
            </div>
        `).join('');
    }

    // 新規チャットの開始
    async startChat(userId) {
        try {
            const chatId = [this.user.uid, userId].sort().join('_');
            let chat = await firebase.firestore()
                .collection('chats')
                .doc(chatId)
                .get();

            if (!chat.exists) {
                const otherUser = await firebase.firestore()
                    .collection('users')
                    .doc(userId)
                    .get();

                await chat.ref.set({
                    participants: [
                        {
                            uid: this.user.uid,
                            displayName: this.user.displayName,
                            avatar: this.user.photoURL
                        },
                        {
                            uid: otherUser.id,
                            displayName: otherUser.data().displayName,
                            avatar: otherUser.data().photoURL
                        }
                    ],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    unreadCount: {
                        [this.user.uid]: 0,
                        [userId]: 0
                    }
                });
            }

            document.querySelector('.new-chat-modal')?.remove();
            await this.openChat(chatId);
        } catch (error) {
            console.error('チャットの作成に失敗しました:', error);
        }
    }

    // 他のユーザーのIDを取得
    getOtherUserId() {
        if (!this.currentChat) return null;
        return this.currentChat.participants.find(p => p.uid !== this.user.uid)?.uid;
    }

    // メッセージのフォーマット
    formatMessage(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    }

    // 時間のフォーマット
    formatTime(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'たった今';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分前`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}時間前`;
        } else {
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        }
    }

    // 最下部にスクロール
    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        container.scrollTop = container.scrollHeight;
    }

    // 絵文字パネルの表示切り替え
    toggleEmoji() {
        // 絵文字パネルの実装
    }

    // 添付ファイルパネルの表示切り替え
    toggleAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.sendAttachment(file);
            }
        };
        input.click();
    }

    // 情報パネルの表示切り替え
    toggleInfo() {
        const panel = document.querySelector('.chat-info-panel');
        panel.classList.toggle('visible');
    }

    // メディアパネルの表示切り替え
    toggleMedia() {
        // メディアパネルの実装
    }

    // 設定パネルの表示切り替え
    toggleSettings() {
        // 設定パネルの実装
    }
}
