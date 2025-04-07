class CommentSystem {
    constructor() {
        this.comments = this.loadComments();
        this.moderationQueue = this.loadModerationQueue();
    }

    // コメントの読み込み
    loadComments() {
        return JSON.parse(localStorage.getItem('comments') || '{}');
    }

    // モデレーションキューの読み込み
    loadModerationQueue() {
        return JSON.parse(localStorage.getItem('moderationQueue') || '{}');
    }

    // コメントの保存
    saveComments() {
        localStorage.setItem('comments', JSON.stringify(this.comments));
    }

    // モデレーションキューの保存
    saveModerationQueue() {
        localStorage.setItem('moderationQueue', JSON.stringify(this.moderationQueue));
    }

    // 新規コメントの追加
    addComment(articleId, comment) {
        const now = new Date().toISOString();
        const newComment = {
            id: `comment_${Date.now()}`,
            content: this.sanitizeInput(comment.content),
            author: this.sanitizeInput(comment.author),
            timestamp: now,
            likes: 0,
            replies: []
        };

        // スパム判定
        if (this.isSpam(newComment.content)) {
            return {
                success: false,
                message: 'スパムの可能性があるため、投稿を制限しました。'
            };
        }

        // モデレーションキューに追加
        if (!this.moderationQueue[articleId]) {
            this.moderationQueue[articleId] = [];
        }
        this.moderationQueue[articleId].push(newComment);
        this.saveModerationQueue();

        return {
            success: true,
            message: 'コメントは確認後に表示されます。'
        };
    }

    // コメントの承認
    approveComment(articleId, commentId) {
        const queuedComments = this.moderationQueue[articleId] || [];
        const commentIndex = queuedComments.findIndex(c => c.id === commentId);

        if (commentIndex === -1) return false;

        const comment = queuedComments[commentIndex];
        if (!this.comments[articleId]) {
            this.comments[articleId] = [];
        }

        this.comments[articleId].push(comment);
        this.moderationQueue[articleId].splice(commentIndex, 1);

        this.saveComments();
        this.saveModerationQueue();
        return true;
    }

    // コメントの取得
    getComments(articleId) {
        return this.comments[articleId] || [];
    }

    // モデレーションキューの取得
    getModerationQueue(articleId) {
        return this.moderationQueue[articleId] || [];
    }

    // コメントへの返信
    addReply(articleId, commentId, reply) {
        const articleComments = this.comments[articleId];
        if (!articleComments) return false;

        const comment = articleComments.find(c => c.id === commentId);
        if (!comment) return false;

        const newReply = {
            id: `reply_${Date.now()}`,
            content: this.sanitizeInput(reply.content),
            author: this.sanitizeInput(reply.author),
            timestamp: new Date().toISOString(),
            likes: 0
        };

        comment.replies.push(newReply);
        this.saveComments();
        return true;
    }

    // いいね機能
    toggleLike(articleId, commentId) {
        const articleComments = this.comments[articleId];
        if (!articleComments) return false;

        const comment = articleComments.find(c => c.id === commentId);
        if (!comment) return false;

        comment.likes += 1;
        this.saveComments();
        return true;
    }

    // 入力のサニタイズ
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // スパム判定
    isSpam(content) {
        const spamPatterns = [
            /https?:\/\/\S+/gi,  // URL
            /[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\w.,!?-]/g,  // 不適切な文字
            /(.)\1{4,}/  // 文字の繰り返し
        ];

        return spamPatterns.some(pattern => pattern.test(content));
    }

    // コメントの描画
    renderComments(articleId, containerId) {
        const container = document.getElementById(containerId);
        const comments = this.getComments(articleId);

        if (!comments.length) {
            container.innerHTML = '<p class="no-comments">コメントはまだありません。最初のコメントを投稿してみましょう！</p>';
            return;
        }

        const commentsHtml = comments.map(comment => this.renderComment(comment)).join('');
        container.innerHTML = commentsHtml;
        this.attachEventListeners(articleId, containerId);
    }

    // 個別コメントの描画
    renderComment(comment) {
        const replies = comment.replies.map(reply => `
            <div class="comment-reply" data-reply-id="${reply.id}">
                <div class="reply-header">
                    <span class="reply-author">${reply.author}</span>
                    <span class="reply-timestamp">${this.formatDate(reply.timestamp)}</span>
                </div>
                <div class="reply-content">${reply.content}</div>
                <div class="reply-actions">
                    <button class="like-button" data-reply-id="${reply.id}">
                        <i class="fas fa-heart"></i> ${reply.likes}
                    </button>
                </div>
            </div>
        `).join('');

        return `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-timestamp">${this.formatDate(comment.timestamp)}</span>
                </div>
                <div class="comment-content">${comment.content}</div>
                <div class="comment-actions">
                    <button class="like-button" data-comment-id="${comment.id}">
                        <i class="fas fa-heart"></i> ${comment.likes}
                    </button>
                    <button class="reply-button" data-comment-id="${comment.id}">
                        <i class="fas fa-reply"></i> 返信
                    </button>
                </div>
                <div class="comment-replies">${replies}</div>
                <div class="reply-form" style="display: none;">
                    <textarea placeholder="返信を入力..."></textarea>
                    <button class="submit-reply" data-comment-id="${comment.id}">送信</button>
                </div>
            </div>
        `;
    }

    // 日付のフォーマット
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // 1分未満
            return '今すぐ';
        } else if (diff < 3600000) { // 1時間未満
            return `${Math.floor(diff / 60000)}分前`;
        } else if (diff < 86400000) { // 24時間未満
            return `${Math.floor(diff / 3600000)}時間前`;
        } else {
            return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        }
    }

    // イベントリスナーの設定
    attachEventListeners(articleId, containerId) {
        const container = document.getElementById(containerId);

        // いいねボタン
        container.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', () => {
                const commentId = button.dataset.commentId;
                if (this.toggleLike(articleId, commentId)) {
                    this.renderComments(articleId, containerId);
                }
            });
        });

        // 返信ボタン
        container.querySelectorAll('.reply-button').forEach(button => {
            button.addEventListener('click', () => {
                const commentId = button.dataset.commentId;
                const replyForm = button.closest('.comment').querySelector('.reply-form');
                replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
            });
        });

        // 返信送信
        container.querySelectorAll('.submit-reply').forEach(button => {
            button.addEventListener('click', () => {
                const commentId = button.dataset.commentId;
                const replyForm = button.closest('.reply-form');
                const content = replyForm.querySelector('textarea').value;

                if (content.trim()) {
                    this.addReply(articleId, commentId, {
                        content: content,
                        author: 'ゲスト'
                    });
                    this.renderComments(articleId, containerId);
                }
            });
        });
    }
}
