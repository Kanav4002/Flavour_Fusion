// Blog Page JavaScript
let blogPosts = [];
let currentPostId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Blog: Initializing blog functionality");
    loadBlogPostsFromStorage();
    setupEventListeners();
    refreshBlogPage();
});

function refreshBlogPage() {
    refreshBlogPosts();
    populateSidebar();
}

function loadBlogPostsFromStorage() {
    const savedPosts = localStorage.getItem('blogPosts_FlavorFusion');
    if (savedPosts) {
        try {
            blogPosts = JSON.parse(savedPosts);
            if (!Array.isArray(blogPosts)) {
                console.warn("Stored blog posts data is not an array, resetting");
                blogPosts = [];
            } else {
                console.log(`Loaded ${blogPosts.length} posts from localStorage`);
            }
        } catch (error) {
            console.error('Error parsing posts from localStorage:', error);
            blogPosts = [];
        }
    } else {
        console.log('No posts found in localStorage, starting empty');
        blogPosts = [];
    }
}

function saveBlogPostsToStorage() {
    try {
        // Optimize storage by limiting image size
        const optimizedPosts = blogPosts.map(post => {
            // Create a clone of the post to avoid modifying the original
            const optimizedPost = {...post};
            
            // Check if the post has an image that's a data URL
            if (optimizedPost.image && optimizedPost.image.startsWith('data:image')) {
                // Truncate very large images to prevent storage issues
                if (optimizedPost.image.length > 500000) { // ~500KB limit
                    console.log('Large image detected, storing reference instead of full data');
                    // Store placeholder instead
                    optimizedPost.image = `https://source.unsplash.com/random/600x400?food&sig=${optimizedPost.id}`;
                    optimizedPost.originalImageTruncated = true;
                }
            }
            return optimizedPost;
        });
        
        // Try to save the optimized data
        localStorage.setItem('blogPosts_FlavorFusion', JSON.stringify(optimizedPosts));
        console.log(`Saved ${optimizedPosts.length} posts to localStorage`);
        return true;
    } catch (error) {
        console.error('Error saving posts to localStorage:', error);
        
        // Emergency save attempt - try to save without images
        try {
            const emergencyPosts = blogPosts.map(post => {
                const emergencyPost = {...post};
                // Replace all images with placeholders
                if (emergencyPost.image && emergencyPost.image.startsWith('data:image')) {
                    emergencyPost.image = `https://source.unsplash.com/random/600x400?food&sig=${emergencyPost.id}`;
                    emergencyPost.originalImageTruncated = true;
                }
                return emergencyPost;
            });
            
            localStorage.setItem('blogPosts_FlavorFusion', JSON.stringify(emergencyPosts));
            console.log('Emergency save successful - images were removed');
            return true;
        } catch (emergencyError) {
            console.error('Emergency save failed:', emergencyError);
            return false;
        }
    }
}

function setupEventListeners() {
    // New Post Button
    document.getElementById('newPostBtn')?.addEventListener('click', openNewPostModal);
    
    // Search
    document.getElementById('blogSearchForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const searchTerm = document.getElementById('blogSearchInput').value.trim();
        searchBlogPosts(searchTerm);
    });
    
    document.getElementById('blogSearchInput')?.addEventListener('input', e => {
        if (e.target.value.trim() === '') {
            refreshBlogPosts();
        }
    });
    
    // Post Form
    document.getElementById('postForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const postId = document.getElementById('editPostId').value;
        if (postId) {
            saveEditedPost(postId);
        } else {
            publishNewPost();
        }
    });
    
    // Image Preview
    document.getElementById('postImage')?.addEventListener('change', handleImagePreview);
    
    // Delete Post Button
    document.getElementById('deletePostBtn')?.addEventListener('click', () => {
        const postId = document.getElementById('editPostId').value;
        if (postId) {
            closeModal('postFormModal');
            openDeleteConfirmModal(postId);
        }
    });
    
    // Comment Form
    document.getElementById('commentForm')?.addEventListener('submit', e => {
        e.preventDefault();
        addComment();
    });
    
    // Delete Confirmation
    document.getElementById('deleteConfirmBtn')?.addEventListener('click', () => {
        if (currentPostId) {
            deletePost(currentPostId);
            closeModal('deleteConfirmModal');
        }
    });
    
    // Modal Closes
    document.querySelectorAll('.modal-close, .modal-btn-secondary[data-action="cancel"]').forEach(button => {
        button.addEventListener('click', e => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Close Modal on Overlay Click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === e.currentTarget) {
                closeModal(e.target.id);
            }
        });
    });
    
    // Newsletter Form
    document.getElementById('newsletterForm')?.addEventListener('submit', e => {
        e.preventDefault();
        alert('Newsletter subscription is currently unavailable. Thanks for your interest!');
        document.getElementById('newsletterEmail').value = '';
    });
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImage = document.getElementById('imagePreview');
    
    if (file && previewContainer && previewImage) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else if (previewContainer) {
        previewContainer.style.display = 'none';
    }
}

function publishNewPost() {
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const tags = document.getElementById('postTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const imageInput = document.getElementById('postImage');
    const content = document.getElementById('postContent').value.trim();
    
    if (!title || !content || !category) {
        alert('Title, Content, and Category are required!');
        return;
    }
    
    const imageFile = imageInput.files[0];
    
    const createPostAction = (imageUrl) => {
        const newPost = {
            id: Date.now(),
            title: title,
            author: "FlavorFusion User",
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            category: category,
            tags: tags,
            image: imageUrl || `https://source.unsplash.com/random/600x400?food&sig=${Date.now()}`,
            content: content,
            likes: 0,
            comments: []
        };
        
        blogPosts.unshift(newPost);
        const saveSuccess = saveBlogPostsToStorage();
        
        // Double check that data was saved by reading it back
        const verifyData = localStorage.getItem('blogPosts_FlavorFusion');
        const verificationSuccess = verifyData && verifyData.includes(title);
        
        refreshBlogPage();
        closeModal('postFormModal');
        
        if (saveSuccess && verificationSuccess) {
            alert('Blog post published successfully!');
        } else {
            // If verification failed but first save reported success
            if (saveSuccess && !verificationSuccess) {
                console.error('Storage verification failed');
                alert('Blog post published, but there may be issues with saving. Consider using smaller images or less content.');
            } else {
                alert('Blog post published to current session, but could not be saved to localStorage.');
            }
        }
    };
    
    if (imageFile) {
        // Check file size before processing
        if (imageFile.size > 1000000) { // 1MB
            if (!confirm('The selected image is large and may cause storage issues. Continue with this image?')) {
                return; // User chose to cancel
            }
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            // Get the image data
            const imageData = e.target.result;
            
            // Check if the data size is too large
            if (imageData.length > 500000) { // ~500KB
                // Try to resize the image
                resizeImage(imageData, 800, 600).then(resizedImage => {
                    createPostAction(resizedImage);
                }).catch(() => {
                    // If resize fails, use original but warn
                    console.warn('Image resize failed, using original');
                    createPostAction(imageData);
                });
            } else {
                createPostAction(imageData);
            }
        };
        reader.onerror = () => {
            alert("Error processing image. Using default image.");
            createPostAction(null);
        };
        reader.readAsDataURL(imageFile);
    } else {
        createPostAction(null);
    }
}

function resizeImage(dataUrl, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = Math.round(width * (maxHeight / height));
                height = maxHeight;
            }
            
            // Create canvas and resize
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            // Draw and export
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get new data URL (jpeg has better compression than png)
            const newDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(newDataUrl);
        };
        
        img.src = dataUrl;
    }).catch(() => {
        // If something goes wrong, return original
        return dataUrl;
    });
}

function saveEditedPost(postId) {
    const postIndex = blogPosts.findIndex(p => p.id == postId);
    if (postIndex === -1) {
        alert("Error: Could not find the post to update.");
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    const category = document.getElementById('postCategory').value;
    const tags = document.getElementById('postTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const imageInput = document.getElementById('postImage');
    const content = document.getElementById('postContent').value.trim();
    
    if (!title || !content || !category) {
        alert('Title, Content, and Category are required!');
        return;
    }
    
    const imageFile = imageInput.files[0];
    const originalPost = blogPosts[postIndex];
    
    const updateAction = (newImageUrl) => {
        blogPosts[postIndex] = {
            ...originalPost,
            title: title,
            category: category,
            tags: tags,
            content: content,
            image: newImageUrl !== undefined ? newImageUrl : originalPost.image,
            updatedAt: new Date().toISOString()
        };
        
        const saveSuccess = saveBlogPostsToStorage();
        
        // Verify save success
        const verifyData = localStorage.getItem('blogPosts_FlavorFusion');
        const verificationSuccess = verifyData && verifyData.includes(title);
        
        refreshBlogPage();
        closeModal('postFormModal');
        
        if (saveSuccess && verificationSuccess) {
            alert('Post updated successfully!');
        } else {
            alert('Post updated for current session, but there may be issues saving to localStorage. Changes may be lost when you refresh.');
        }
    };
    
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            // Check if the image data is too large
            if (imageData.length > 500000) { // ~500KB
                // Try to resize the image
                resizeImage(imageData, 800, 600).then(resizedImage => {
                    updateAction(resizedImage);
                }).catch(() => {
                    console.warn('Image resize failed, using original');
                    updateAction(imageData);
                });
            } else {
                updateAction(imageData);
            }
        };
        reader.onerror = () => {
            alert("Error processing new image. Keeping original image.");
            updateAction(originalPost.image);
        };
        reader.readAsDataURL(imageFile);
    } else {
        updateAction(originalPost.image);
    }
}

function deletePost(postId) {
    const initialLength = blogPosts.length;
    blogPosts = blogPosts.filter(p => p.id != postId);
    
    if (blogPosts.length < initialLength) {
        const saveSuccess = saveBlogPostsToStorage();
        refreshBlogPage();
        
        if (saveSuccess) {
            alert("Post deleted successfully.");
        } else {
            alert("Post deleted, but there was an issue saving to local storage. Changes may be lost when you reload the page.");
        }
    } else {
        alert("Error: Could not delete the post.");
    }
}

function addComment() {
    const commentContent = document.getElementById('commentContent').value.trim();
    
    if (!commentContent) {
        alert('Comment cannot be empty!');
        return;
    }
    
    if (!currentPostId) {
        alert("Error: Cannot add comment. Post context lost.");
        return;
    }
    
    const postIndex = blogPosts.findIndex(p => p.id == currentPostId);
    if (postIndex === -1) {
        alert("Error: Could not find the post to add comment to.");
        return;
    }
    
    const newComment = {
        author: "FlavorFusion User",
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        content: commentContent
    };
    
    if (!Array.isArray(blogPosts[postIndex].comments)) {
        blogPosts[postIndex].comments = [];
    }
    
    blogPosts[postIndex].comments.push(newComment);
    saveBlogPostsToStorage(); // We'll still try to save, but won't show an error if it fails
    
    loadComments(blogPosts[postIndex]);
    document.getElementById('commentContent').value = '';
    
    // Show only one success message
    alert('Comment added successfully!');
}

function refreshBlogPosts(postsToDisplay = blogPosts, searchTerm = null) {
    const container = document.getElementById('blogPosts');
    const containerWrapper = container?.parentElement;
    
    if (!container || !containerWrapper) {
        console.error("Blog posts container or wrapper not found!");
        return;
    }
    
    container.innerHTML = '';
    
    containerWrapper.querySelectorAll('.search-results-header, .no-search-results, .no-posts-message').forEach(el => el.remove());
    
    if (searchTerm) {
        const searchHeader = document.createElement('div');
        searchHeader.className = 'search-results-header';
        searchHeader.innerHTML = `<h2>Search Results for "${escapeHTML(searchTerm)}"</h2>`;
        containerWrapper.insertBefore(searchHeader, container);
    }
    
    if (postsToDisplay.length === 0) {
        const messageContainer = document.createElement('div');
        if (searchTerm) {
            messageContainer.className = 'no-search-results';
            messageContainer.innerHTML = `<p>No posts found matching "${escapeHTML(searchTerm)}".</p>
                <button class="modal-btn modal-btn-secondary" onclick="clearSearchAndRefresh()">Show All Posts</button>`;
        } else {
            messageContainer.className = 'no-posts-message';
            messageContainer.innerHTML = '<p>No blog posts yet. Be the first to create one!</p>';
        }
        containerWrapper.insertBefore(messageContainer, container);
        return;
    }
    
    const sortedPosts = [...postsToDisplay].sort((a, b) => {
        try {
            return new Date(b.date) - new Date(a.date);
        } catch (e) {
            return 0;
        }
    });
    
    sortedPosts.forEach(post => {
        try {
            container.appendChild(createPostCard(post, searchTerm));
        } catch (error) {
            console.error("Error creating post card:", error);
        }
    });
}

function createPostCard(post, searchTerm = null) {
    const postElement = document.createElement('article');
    postElement.className = 'blog-card';
    
    const imgContainer = document.createElement('div');
    imgContainer.className = 'blog-card-img';
    const img = document.createElement('img');
    const imgSrc = post.image || `https://source.unsplash.com/random/600x400?food&sig=${post.id}`;
    img.src = imgSrc;
    img.alt = post.title || 'Blog post image';
    img.onerror = () => { 
        img.src = `https://source.unsplash.com/random/600x400?food&sig=fallback${post.id}`; 
    };
    imgContainer.appendChild(img);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'blog-card-content';
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'blog-card-meta';
    const authorSpan = document.createElement('span');
    authorSpan.textContent = `By ${post.author || 'Unknown'}`;
    const dateSpan = document.createElement('span');
    dateSpan.textContent = post.date || 'Unknown Date';
    metaDiv.appendChild(authorSpan);
    metaDiv.appendChild(dateSpan);
    
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'blog-card-tags';
    if (post.tags && Array.isArray(post.tags)) {
        post.tags.slice(0, 4).forEach(tagText => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'blog-tag';
            tagSpan.innerHTML = searchTerm ? highlightText(tagText, searchTerm) : escapeHTML(tagText);
            tagsDiv.appendChild(tagSpan);
        });
    }
    
    const titleH3 = document.createElement('h3');
    const titleText = post.title || 'Untitled Post';
    titleH3.innerHTML = searchTerm ? highlightText(titleText, searchTerm) : escapeHTML(titleText);
    
    const contentP = document.createElement('p');
    const snippet = post.content ? 
        (post.content.length > 120 ? post.content.substring(0, 120) + '...' : post.content) : 
        'No preview available.';
    contentP.innerHTML = searchTerm ? highlightText(snippet, searchTerm) : escapeHTML(snippet);
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'blog-card-actions';
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'action-buttons';
    
    const readMoreBtn = document.createElement('button');
    readMoreBtn.className = 'blog-card-btn';
    readMoreBtn.textContent = 'Read More';
    readMoreBtn.onclick = () => openViewPostModal(post.id);
    
    const editBtn = document.createElement('button');
    editBtn.className = 'blog-card-btn secondary';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    editBtn.title = 'Edit Post';
    editBtn.onclick = () => openEditModal(post.id);
    
    buttonsDiv.appendChild(readMoreBtn);
    buttonsDiv.appendChild(editBtn);
    
    const statsDiv = document.createElement('div');
    statsDiv.className = 'blog-card-stats';
    
    const likesSpan = document.createElement('span');
    likesSpan.innerHTML = `<i class="far fa-heart"></i> ${post.likes || 0}`;
    likesSpan.title = `${post.likes || 0} Likes`;
    likesSpan.onclick = () => toggleLike(post.id);
    likesSpan.style.cursor = 'pointer';
    
    const commentsSpan = document.createElement('span');
    const commentCount = (post.comments && Array.isArray(post.comments)) ? post.comments.length : 0;
    commentsSpan.innerHTML = `<i class="far fa-comment"></i> ${commentCount}`;
    commentsSpan.title = `${commentCount} Comments`;
    
    statsDiv.appendChild(likesSpan);
    statsDiv.appendChild(commentsSpan);
    
    actionsDiv.appendChild(buttonsDiv);
    actionsDiv.appendChild(statsDiv);
    
    contentDiv.appendChild(metaDiv);
    contentDiv.appendChild(tagsDiv);
    contentDiv.appendChild(titleH3);
    contentDiv.appendChild(contentP);
    contentDiv.appendChild(actionsDiv);
    
    postElement.appendChild(imgContainer);
    postElement.appendChild(contentDiv);
    
    return postElement;
}

function loadComments(post) {
    const container = document.getElementById('commentsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (post.comments && post.comments.length > 0) {
        post.comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            
            const header = document.createElement('div');
            header.className = 'comment-header';
            
            const author = document.createElement('span');
            author.className = 'comment-author';
            author.textContent = comment.author || 'Anonymous';
            
            const date = document.createElement('span');
            date.className = 'comment-date';
            date.textContent = comment.date || 'Unknown Date';
            
            header.appendChild(author);
            header.appendChild(date);
            
            const content = document.createElement('div');
            content.className = 'comment-content';
            
            const contentP = document.createElement('p');
            contentP.textContent = comment.content || '';
            content.appendChild(contentP);
            
            commentDiv.appendChild(header);
            commentDiv.appendChild(content);
            container.appendChild(commentDiv);
        });
    } else {
        container.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
    }
}

function populateSidebar() {
    const categoriesList = document.getElementById('categoriesList');
    const recentPostsList = document.getElementById('recentPostsList');
    
    if (!categoriesList || !recentPostsList) {
        console.warn("Sidebar list containers not found.");
        return;
    }
    
    categoriesList.innerHTML = '';
    
    const categories = {};
    blogPosts.forEach(post => {
        const category = post.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + 1;
    });
    
    if (Object.keys(categories).length > 0) {
        Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, count]) => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.innerHTML = `<a href="#" title="View posts in ${escapeHTML(name)}">${escapeHTML(name)}</a> <span class="category-count">${count}</span>`;
            li.querySelector('a').onclick = (e) => {
                e.preventDefault();
                filterByCategory(name);
            };
            categoriesList.appendChild(li);
        });
    } else {
        categoriesList.innerHTML = '<li>No categories yet.</li>';
    }
    
    recentPostsList.innerHTML = '';
    
    const recentPosts = [...blogPosts].sort((a, b) => {
        try {
            return new Date(b.date) - new Date(a.date);
        } catch (e) {
            return 0;
        }
    }).slice(0, 5);
    
    if (recentPosts.length > 0) {
        recentPosts.forEach(post => {
            const li = document.createElement('li');
            li.className = 'recent-post-item';
            const title = escapeHTML(post.title || 'Untitled Post');
            li.innerHTML = `<a href="#" title="${title}">${title}</a> <span class="recent-post-date">${escapeHTML(post.date || '')}</span>`;
            li.querySelector('a').onclick = (e) => {
                e.preventDefault();
                openViewPostModal(post.id);
            };
            recentPostsList.appendChild(li);
        });
    } else {
        recentPostsList.innerHTML = '<li>No recent posts.</li>';
    }
}

function filterByCategory(categoryName) {
    const filtered = blogPosts.filter(post => (post.category || 'Uncategorized') === categoryName);
    refreshBlogPosts(filtered, `Category: ${categoryName}`);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        console.error(`Modal with ID ${modalId} not found!`);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        if (!document.querySelector('.modal.active')) {
            document.body.style.overflow = 'auto';
        }
    }
}

function openNewPostModal() {
    currentPostId = null;
    const form = document.getElementById('postForm');
    if (form) form.reset();
    
    document.getElementById('postFormModalTitle').textContent = 'Create New Blog Post';
    document.getElementById('postSubmitBtn').textContent = 'Publish';
    document.getElementById('deletePostBtn').style.display = 'none';
    document.getElementById('editPostId').value = '';
    
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    openModal('postFormModal');
}

function openEditModal(postId) {
    const post = blogPosts.find(p => p.id == postId);
    if (!post) {
        alert("Error: Post not found.");
        return;
    }
    
    currentPostId = postId;
    
    document.getElementById('editPostId').value = post.id;
    document.getElementById('postTitle').value = post.title || '';
    document.getElementById('postCategory').value = post.category || '';
    document.getElementById('postTags').value = (post.tags || []).join(', ');
    document.getElementById('postContent').value = post.content || '';
    
    const previewContainer = document.getElementById('imagePreviewContainer');
    const previewImage = document.getElementById('imagePreview');
    if (post.image && previewContainer && previewImage) {
        previewImage.src = post.image;
        previewContainer.style.display = 'block';
    } else if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    document.getElementById('postImage').value = '';
    
    document.getElementById('postFormModalTitle').textContent = 'Edit Blog Post';
    document.getElementById('postSubmitBtn').textContent = 'Save Changes';
    document.getElementById('deletePostBtn').style.display = 'inline-block';
    
    openModal('postFormModal');
}

function openViewPostModal(postId) {
    const post = blogPosts.find(p => p.id == postId);
    if (!post) {
        alert("Error: Post not found.");
        return;
    }
    
    currentPostId = postId;
    
    document.getElementById('viewPostTitle').textContent = post.title || 'Untitled Post';
    document.getElementById('viewPostAuthor').textContent = `By ${post.author || 'Unknown'}`;
    document.getElementById('viewPostDate').textContent = post.date || 'Unknown Date';
    document.getElementById('viewPostCategory').textContent = post.category || 'Uncategorized';
    
    const tagsContainer = document.getElementById('viewPostTags');
    tagsContainer.innerHTML = '';
    
    if (post.tags && post.tags.length > 0) {
        post.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'blog-tag';
            tagSpan.textContent = tag;
            tagsContainer.appendChild(tagSpan);
        });
    } else {
        tagsContainer.innerHTML = '<em>No tags</em>';
    }
    
    const imageElement = document.getElementById('viewPostImage');
    const imageContainer = imageElement.parentElement;
    
    if (post.image) {
        imageElement.src = post.image;
        imageElement.alt = post.title || 'Blog post image';
        imageElement.style.display = 'block';
        imageContainer.style.display = 'block';
        
        imageElement.onerror = () => {
            imageElement.style.display = 'none';
            imageContainer.style.display = 'none';
        };
    } else {
        imageElement.style.display = 'none';
        imageContainer.style.display = 'none';
    }
    
    const contentElement = document.getElementById('viewPostContent');
    contentElement.innerHTML = escapeHTML(post.content || 'No content available.').replace(/\n/g, '<br>');
    
    loadComments(post);
    
    document.getElementById('commentContent').value = '';
    
    openModal('viewPostModal');
}

function openDeleteConfirmModal(postId) {
    currentPostId = postId;
    openModal('deleteConfirmModal');
}

function searchBlogPosts(searchTerm) {
    if (!searchTerm) {
        refreshBlogPosts();
        return;
    }
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    
    const filteredPosts = blogPosts.filter(post => {
        const titleMatch = post.title?.toLowerCase().includes(lowerCaseSearchTerm);
        const contentMatch = post.content?.toLowerCase().includes(lowerCaseSearchTerm);
        const tagMatch = post.tags?.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm));
        const categoryMatch = post.category?.toLowerCase().includes(lowerCaseSearchTerm);
        const authorMatch = post.author?.toLowerCase().includes(lowerCaseSearchTerm);
        
        return titleMatch || contentMatch || tagMatch || categoryMatch || authorMatch;
    });
    
    refreshBlogPosts(filteredPosts, searchTerm);
}

function clearSearchAndRefresh() {
    document.getElementById('blogSearchInput').value = '';
    refreshBlogPosts();
}

function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return escapeHTML(text || '');
    
    try {
        const escapedSearchTerm = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        return escapeHTML(text).replace(regex, '<mark>$1</mark>');
    } catch (e) {
        console.warn("Highlighting regex error:", e);
        return escapeHTML(text);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[tag] || tag));
}

function toggleLike(postId) {
    const postIndex = blogPosts.findIndex(p => p.id == postId);
    if (postIndex !== -1) {
        blogPosts[postIndex].likes = (blogPosts[postIndex].likes || 0) + 1;
        saveBlogPostsToStorage();
        refreshBlogPage();
    }
}

window.clearSearchAndRefresh = clearSearchAndRefresh;