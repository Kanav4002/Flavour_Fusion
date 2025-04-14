document.addEventListener('DOMContentLoaded', () => {
    const recipeOfDayContainer = document.getElementById('recipeOfDay');

    const loadRecipeOfDay = async () => {
        try {
            const response = await fetch('/api/recipe-of-day');
            const recipe = await response.json();
            displayRecipeOfDay(recipe);
        } catch (error) {
            console.error('Error loading recipe of the day:', error);
        }
    };

    const displayRecipeOfDay = (recipe) => {
        recipeOfDayContainer.innerHTML = `
            <img src="${recipe.image || '/images/default-recipe.jpg'}" 
                 alt="${recipe.title}" 
                 class="featured-recipe-image">
            <div class="featured-recipe-content">
                <h3 class="featured-recipe-title">${recipe.title}</h3>
                <p class="featured-recipe-description">${recipe.description}</p>
                <div class="featured-recipe-meta">
                    <span><i class="far fa-clock"></i> ${recipe.prepTime} mins</span>
                    <span><i class="fas fa-utensils"></i> ${recipe.dietaryType}</span>
                    <span><i class="fas fa-user"></i> By ${recipe.author}</span>
                </div>
                <a href="/recipe/${recipe.id}" class="view-recipe-btn">View Recipe</a>
            </div>
        `;
    };

    // Add this new function to load favorites
    const loadFavorites = async () => {
        try {
            const response = await fetch('/api/favorites');
            const favorites = await response.json();
            displayFavorites(favorites);
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };

    const displayFavorites = (favorites) => {
        const favoritesGrid = document.getElementById('favoritesGrid');
        if (favorites.length === 0) {
            favoritesGrid.innerHTML = '<p>No favorite recipes yet. Start exploring and add some!</p>';
            return;
        }

        favoritesGrid.innerHTML = favorites.map(recipe => {
            return `
            <a href="/recipe/${recipe.id}" class="recipe-card">
                <img src="${recipe.image || '/images/default-recipe.jpg'}" alt="${recipe.title}">
                <div class="recipe-content">
                    <h3 class="recipe-title">${recipe.title}</h3>
                    <div class="recipe-info">
                        <p><i class="fas fa-user"></i> ${recipe.author}</p>
                        <p><i class="far fa-calendar"></i> ${new Date(recipe.favoritedAt).toLocaleDateString()}</p>
                        ${recipe.prepTime ? `<p><i class="far fa-clock"></i> ${recipe.prepTime} mins</p>` : ''}
                        ${recipe.dietaryType ? `<p><i class="fas fa-utensils"></i> ${recipe.dietaryType}</p>` : ''}
                    </div>
                </div>
            </a>
        `}).join('');
    };

    // Call loadFavorites when page loads
    loadFavorites();
    loadRecipeOfDay();

    // Function to update dashboard statistics
    function updateDashboardStats() {
        // Try different possible localStorage keys
        let recipes = [];
        let favorites = [];
        
        // Check all localStorage keys to find recipe data
        const allKeys = Object.keys(localStorage);
        
        // Look for recipe data in various possible formats
        for (const key of allKeys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                
                if (Array.isArray(data)) {
                    // Check if this looks like recipe data
                    if (data.length > 0 && data[0] && 
                        (data[0].title || data[0].name || data[0].recipe)) {
                        recipes = data;
                    }
                    // Check if this looks like favorites data
                    else if (data.length > 0 && 
                            (typeof data[0] === 'number' || typeof data[0] === 'string')) {
                        favorites = data;
                    }
                }
            } catch (e) {
                // Not JSON data, skip
            }
        }
        
        // If no favorites found, check for other possible keys
        if (favorites.length === 0) {
            const possibleFavKeys = ['favoriteRecipes', 'favorites', 'userFavorites', 'savedRecipes'];
            for (const key of possibleFavKeys) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (Array.isArray(data) && data.length > 0) {
                        favorites = data;
                        break;
                    }
                } catch (e) {
                    // Not JSON data or doesn't exist
                }
            }
        }
        
        // Calculate stats
        const totalRecipes = recipes.length;
        const totalFavorites = favorites.length;
        
        // Calculate average rating
        let totalRating = 0;
        let ratedRecipes = 0;
        recipes.forEach(recipe => {
            const rating = recipe.rating || recipe.stars || recipe.score;
            if (rating) {
                totalRating += parseFloat(rating);
                ratedRecipes++;
            }
        });
        const averageRating = ratedRecipes > 0 ? (totalRating / ratedRecipes).toFixed(1) : '0.0';
        
        // Calculate total views
        const totalViews = recipes.reduce((sum, recipe) => {
            const views = recipe.views || recipe.viewCount || 0;
            return sum + views;
        }, 0);
        
        // Update the DOM
        document.getElementById('totalRecipes').textContent = totalRecipes;
        document.getElementById('favoriteRecipes').textContent = totalFavorites;
        document.getElementById('averageRating').textContent = averageRating;
        document.getElementById('recipeViews').textContent = totalViews;
    }

    // Call the function when the page loads
    updateDashboardStats();

    // Update when localStorage changes
    window.addEventListener('storage', (e) => {
        updateDashboardStats();
    });

    // Also update periodically to catch any changes
    setInterval(updateDashboardStats, 5000);
});