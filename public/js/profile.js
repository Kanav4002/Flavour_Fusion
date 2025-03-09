document.addEventListener('DOMContentLoaded', () => {
    const avatarElement = document.getElementById('profileAvatar');
    const avatarUpload = document.getElementById('avatarUpload');
    const avatarImage = document.getElementById('avatarImage');
    const editProfileBtn = document.getElementById('editProfileBtn');

    // Set up avatar upload functionality
    if (avatarElement && avatarUpload) {
        avatarElement.addEventListener('click', () => {
            avatarUpload.click();
        });

        avatarUpload.addEventListener('change', async (event) => {
            if (event.target.files && event.target.files[0]) {
                const file = event.target.files[0];
                
                // Show preview immediately
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
                
                // Show loading state
                avatarElement.classList.add('loading');
                
                try {
                    // Create FormData object to send the file
                    const formData = new FormData();
                    formData.append('avatar', file);
                    
                    // Upload the file to the server
                    const response = await fetch('/api/user/avatar', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to upload avatar');
                    }
                    
                    const result = await response.json();
                    
                    // Update the avatar image with the new one from server
                    avatarImage.src = result.avatarUrl + '?t=' + new Date().getTime(); // Add timestamp to prevent caching
                    
                    // Show success message
                    showNotification('Profile picture updated successfully!', 'success');
                } catch (error) {
                    console.error('Error uploading avatar:', error);
                    showNotification('Failed to upload profile picture. Please try again.', 'error');
                } finally {
                    // Remove loading state
                    avatarElement.classList.remove('loading');
                }
            }
        });
    }

    // Simple notification system
    const showNotification = (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Show the notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Hide and remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    };

    const loadUserProfile = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const user = await response.json();
            displayUserInfo(user);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    const loadUserStats = async () => {
        try {
            const response = await fetch('/api/user/stats');
            const stats = await response.json();
            displayStats(stats);
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    };

    const displayUserInfo = (user) => {
        document.getElementById('username').textContent = user.username;
        document.getElementById('userEmail').textContent = user.email;
    };

    const displayStats = (stats) => {
        document.getElementById('recipeCount').textContent = stats.recipeCount;
        document.getElementById('favoriteCount').textContent = stats.favoriteCount;
        document.getElementById('avgRating').textContent = stats.averageRating.toFixed(1);
    };

    // Tab switching functionality
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabContents = document.querySelectorAll('.recipe-grid');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'my-recipes') {
                loadUserRecipes();
            } else {
                loadFavoriteRecipes();
            }
        });
    });

    const loadUserRecipes = async () => {
        try {
            const response = await fetch('/api/user/recipes');
            const recipes = await response.json();
            displayRecipes('my-recipes', recipes);
        } catch (error) {
            console.error('Error loading user recipes:', error);
        }
    };

    const loadFavoriteRecipes = async () => {
        try {
            const response = await fetch('/api/favorites');
            const recipes = await response.json();
            displayRecipes('favorites', recipes);
        } catch (error) {
            console.error('Error loading favorite recipes:', error);
        }
    };

    // Update the displayRecipes function to include edit buttons for user's recipes
    const displayRecipes = (containerId, recipes) => {
        const container = document.getElementById(containerId);
        if (recipes.length === 0) {
            container.innerHTML = `<p class="no-recipes">No recipes to display</p>`;
            return;
        }
    
        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card">
                <a href="/recipe/${recipe.id}" class="recipe-link">
                    <img src="${recipe.image || '/images/default-recipe.jpg'}" alt="${recipe.title}" class="recipe-image">
                    <div class="recipe-content">
                        <h3 class="recipe-title">${recipe.title}</h3>
                        <div class="recipe-info">
                            <p><i class="far fa-clock"></i> ${recipe.prepTime} mins</p>
                            <p><i class="fas fa-utensils"></i> ${recipe.category}</p>
                        </div>
                    </div>
                </a>
                ${containerId === 'my-recipes' ? 
                    `<a href="/recipe/${recipe.id}/edit" class="edit-btn">
                        <i class="fas fa-edit"></i> Edit Recipe
                    </a>` : ''
                }
            </div>
        `).join('');
    };

    // Add Edit Profile button functionality
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // You can either redirect to an edit profile page
            window.location.href = '/edit-profile';
            
            // Or open a modal for editing (if you prefer inline editing)
            // openEditProfileModal();
        });
    }

    // Initial load
    loadUserProfile();
    loadUserStats();
    loadUserRecipes(); // Load My Recipes tab by default
});