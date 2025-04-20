const express = require('express');
const session = require('express-session');
const path = require('path');
const morgan = require('morgan');
const fs = require('fs');
const { blockingRead, nonBlockingRead } = require('./utils/fileOperations');
const multer = require("multer");
const app = express();
app.use(morgan('dev')); // Logs request in 'dev' format to the console



// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + "-" + file.originalname);
    },
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));


// 2. Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'flavorfusion-secret',
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Add this line

// Basic route
app.get("/", (req, res) => {
    res.render("index");
});

// Authentication routes
app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/about", (req, res) => {
    res.render("about");
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const users = require("./data/users.json").users;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Check if user exists
    const user = users.find((u) => u.email === email);
    if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
    }

    // Check password
    if (user.password !== password) {
        return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    req.session.user = user;
    res.json({ success: true });
});

app.post("/api/signup", (req, res) => {
    const { username, email, password } = req.body;
    const fs = require("fs");
    const usersFile = "./data/users.json";
    const users = require(usersFile);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Validate password length
    if (password.length < 8) {
        return res
            .status(400)
            .json({ success: false, message: "Password must be at least 8 characters long" });
    }

    // Check for existing email
    if (users.users.find((u) => u.email === email)) {
        return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // Save new user
    users.users.push({ username, email, password });
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    res.json({ success: true });
});

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    next();
};

// Dashboard route
app.get("/dashboard", requireLogin, (req, res) => {
    res.render("dashboard");
});

// Add recipe route
app.get("/add-recipe", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "add-recipe.html"));
});

// Recipe API endpoints
app.post('/api/recipes', requireLogin, upload.single('image'), (req, res) => {
    const fs = require('fs');
    const recipesFile = './data/recipes.json';
    let recipes;
    
    try {
        recipes = require(recipesFile);
    } catch (error) {
        recipes = { recipes: [] };
    }
    
    const newRecipe = {
        id: Date.now().toString(),
        title: req.body.title,
        description: req.body.description,
        ingredients: JSON.parse(req.body.ingredients),
        instructions: JSON.parse(req.body.instructions),
        prepTime: req.body.prepTime,
        dietaryType: req.body.dietaryType,
        image: req.file ? `/uploads/${req.file.filename}` : '/images/default-recipe.jpg',
        author: req.session.user.username,
        authorId: req.session.user.email,
        createdAt: new Date().toISOString(),
        ratings: [],
        comments: []
    };

    recipes.recipes.push(newRecipe);
    fs.writeFileSync(recipesFile, JSON.stringify(recipes, null, 2));
    
    res.json({ success: true, recipe: newRecipe });
});

// Recipe routes
app.get("/recipes", (req, res) => {
    res.render("recipes");
});

// Get all recipes
app.get("/api/recipes", (req, res) => {
    try {
        const fs = require("fs");
        const recipesPath = path.join(__dirname, "data", "recipes.json");

        // Create recipes.json if it doesn't exist
        if (!fs.existsSync(recipesPath)) {
            fs.writeFileSync(recipesPath, JSON.stringify({ recipes: [] }, null, 2));
        }

        // Read the file
        const fileContent = fs.readFileSync(recipesPath, "utf8");
        const recipes = JSON.parse(fileContent);

        // Ensure the response has the correct structure
        if (!recipes.hasOwnProperty("recipes")) {
            recipes.recipes = [];
        }

        res.json(recipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ error: "Failed to fetch recipes" });
    }
});

// Get single recipe
app.get("/api/recipes/:id", (req, res) => {
    const recipes = require("./data/recipes.json");
    const recipe = recipes.recipes.find((r) => r.id === req.params.id);

    if (recipe) {
        res.json(recipe);
    } else {
        res.status(404).json({ error: "Recipe not found" });
    }
});

// Recipe detail route
app.get("/recipe/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "recipe-detail.html"));
});

// Rating endpoint
app.post("/api/recipes/:id/rate", requireLogin, (req, res) => {
    const fs = require("fs");
    const recipesFile = "./data/recipes.json";
    const recipes = require(recipesFile);
    const recipe = recipes.recipes.find((r) => r.id === req.params.id);

    if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
    }

    if (!recipe.ratings) recipe.ratings = [];
    recipe.ratings.push({
        userId: req.session.user.email,
        rating: parseInt(req.body.rating),
        createdAt: new Date().toISOString(),
    });

    fs.writeFileSync(recipesFile, JSON.stringify(recipes, null, 2));
    res.json({ success: true });
});

// Comments endpoints
app.post("/api/recipes/:id/comments", requireLogin, (req, res) => {
    const fs = require("fs");
    const recipesFile = "./data/recipes.json";
    const recipes = require(recipesFile);
    const recipe = recipes.recipes.find((r) => r.id === req.params.id);

    if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
    }

    if (!recipe.comments) recipe.comments = [];
    recipe.comments.push({
        author: req.session.user.username,
        text: req.body.text,
        createdAt: new Date().toISOString(),
    });

    fs.writeFileSync(recipesFile, JSON.stringify(recipes, null, 2));
    res.json({ success: true });
});

app.get("/api/recipes/:id/comments", (req, res) => {
    const recipes = require("./data/recipes.json");
    const recipe = recipes.recipes.find((r) => r.id === req.params.id);

    if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
    }

    res.json(recipe.comments || []);
});

// Favorites endpoints
app.post("/api/favorites/:recipeId", requireLogin, (req, res) => {
    const fs = require("fs");
    const favoritesFile = "./data/favorites.json";
    const favorites = require(favoritesFile);

    const newFavorite = {
        userId: req.session.user.email,
        recipeId: req.params.recipeId,
        createdAt: new Date().toISOString(),
    };

    favorites.favorites.push(newFavorite);
    fs.writeFileSync(favoritesFile, JSON.stringify(favorites, null, 2));

    res.json({ success: true });
});

app.delete("/api/favorites/:recipeId", requireLogin, (req, res) => {
    const fs = require("fs");
    const favoritesFile = "./data/favorites.json";
    const favorites = require(favoritesFile);

    const index = favorites.favorites.findIndex(
        (f) => f.userId === req.session.user.email && f.recipeId === req.params.recipeId
    );

    if (index !== -1) {
        favorites.favorites.splice(index, 1);
        fs.writeFileSync(favoritesFile, JSON.stringify(favorites, null, 2));
    }

    res.json({ success: true });
});

app.get("/api/favorites/check/:recipeId", requireLogin, (req, res) => {
    const favorites = require("./data/favorites.json");

    const isFavorited = favorites.favorites.some(
        (f) => f.userId === req.session.user.email && f.recipeId === req.params.recipeId
    );

    res.json({ isFavorited });
});

app.get("/api/favorites", requireLogin, (req, res) => {
    const favorites = require("./data/favorites.json");
    const recipes = require("./data/recipes.json");

    const userFavorites = favorites.favorites
        .filter((f) => f.userId === req.session.user.email)
        .map((f) => {
            const recipe = recipes.recipes.find((r) => r.id === f.recipeId);
            return recipe ? {...recipe, favoritedAt: f.createdAt } : null;
        })
        .filter(Boolean);

    res.json(userFavorites);
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// Blog routes
app.get("/blog", (req, res) => {
    res.render("blog");
});

app.get("/blog/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "single-post.html"));
});

app.get("/add-blog", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "add-blog.html"));
});

// Blog API endpoints
app.get("/api/blogs", (req, res) => {
    try {
        const fs = require("fs");
        const blogsPath = path.join(__dirname, "data", "blogs.json");

        if (!fs.existsSync(blogsPath)) {
            fs.writeFileSync(blogsPath, JSON.stringify({ blogs: [] }, null, 2));
        }

        const blogs = require(blogsPath);
        res.json(blogs);
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({ error: "Failed to fetch blogs" });
    }
});

app.get("/api/blogs/:id", (req, res) => {
    try {
        const blogs = require("./data/blogs.json");
        const blog = blogs.blogs.find((b) => b.id === req.params.id);

        if (blog) {
            res.json(blog);
        } else {
            res.status(404).json({ error: "Blog post not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch blog post" });
    }
});

app.post("/api/blogs", requireLogin, upload.single("image"), (req, res) => {
    const fs = require("fs");
    const blogsFile = "./data/blogs.json";
    let blogs;

    try {
        blogs = require(blogsFile);
    } catch (error) {
        blogs = { blogs: [] };
    }

    const newBlog = {
        id: Date.now().toString(),
        title: req.body.title,
        content: req.body.content,
        image: req.file ? `/uploads/${req.file.filename}` : "/images/default-blog.jpg",
        category: req.body.category,
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        author: req.session.user.username,
        authorId: req.session.user.email,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: [],
    };

    blogs.blogs.push(newBlog);
    fs.writeFileSync(blogsFile, JSON.stringify(blogs, null, 2));

    res.json({ success: true, blog: newBlog });
});

// Recipe of the Day endpoint
app.get("/api/recipe-of-day", (req, res) => {
    const recipes = require("./data/recipes.json");

    // Get today's date as string (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];

    // Use the date to seed the random selection
    const seed = parseInt(today.replace(/-/g, ""));
    const randomIndex = seed % recipes.recipes.length;

    // Get recipe for today
    const recipeOfDay = recipes.recipes[randomIndex];

    if (recipeOfDay) {
        res.json(recipeOfDay);
    } else {
        res.status(404).json({ error: "No recipes available" });
    }
});

// Profile routes
app.get("/profile", requireLogin, (req, res) => {
    res.render("profile");
});

app.get("/api/user/profile", requireLogin, (req, res) => {
    res.json({
        username: req.session.user.username,
        email: req.session.user.email,
    });
});

app.get("/api/user/recipes", requireLogin, (req, res) => {
    const recipes = require("./data/recipes.json");
    const userRecipes = recipes.recipes.filter((r) => r.authorId === req.session.user.email);
    res.json(userRecipes);
});

app.get("/api/user/stats", requireLogin, (req, res) => {
    const recipes = require("./data/recipes.json");
    const favorites = require("./data/favorites.json");

    const userRecipes = recipes.recipes.filter((r) => r.authorId === req.session.user.email);
    const userFavorites = favorites.favorites.filter((f) => f.userId === req.session.user.email);

    const stats = {
        recipeCount: userRecipes.length,
        favoriteCount: userFavorites.length,
        averageRating: calculateAverageRating(userRecipes),
    };

    res.json(stats);
});

function calculateAverageRating(recipes) {
    let totalRating = 0;
    let ratedRecipes = 0;

    recipes.forEach((recipe) => {
        if (recipe.ratings && recipe.ratings.length > 0) {
            const recipeAvg =
                recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length;
            totalRating += recipeAvg;
            ratedRecipes++;
        }
    });

    return ratedRecipes > 0 ? totalRating / ratedRecipes : 0;
}

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Add these routes after your existing recipe routes

app.get("/recipe/:id/edit", requireLogin, async(req, res) => {
    const recipes = require("./data/recipes.json");
    const recipe = recipes.recipes.find((r) => r.id === req.params.id);

    if (!recipe || recipe.authorId !== req.session.user.email) {
        return res.redirect("/recipes");
    }

    res.sendFile(path.join(__dirname, "views", "edit-recipe.html"));
});

app.put("/api/recipes/:id", requireLogin, (req, res) => {
    const fs = require("fs");
    const recipesFile = "./data/recipes.json";
    const recipes = require(recipesFile);
    const index = recipes.recipes.findIndex((r) => r.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: "Recipe not found" });
    }

    if (recipes.recipes[index].authorId !== req.session.user.email) {
        return res.status(403).json({ error: "Not authorized to edit this recipe" });
    }

    recipes.recipes[index] = {
        ...recipes.recipes[index],
        ...req.body,
        updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(recipesFile, JSON.stringify(recipes, null, 2));
    res.json({ success: true });
});

// Meal planner routes
app.get("/meal-planner", requireLogin, (req, res) => {
    res.render("meal-planner");
});

app.get("/api/meal-plan", requireLogin, (req, res) => {
    const weekDate = new Date(req.query.week);
    const mealPlans = require("./data/meal-plans.json");
    const userPlan = mealPlans.plans.find(
        (p) => p.userId === req.session.user.email && new Date(p.week).getTime() === weekDate.getTime()
    );
    res.json(userPlan || { plan: {} });
});

app.post("/api/meal-plan", requireLogin, (req, res) => {
    const fs = require("fs");
    const mealPlansFile = "./data/meal-plans.json";
    const mealPlans = require(mealPlansFile);

    const weekDate = new Date(req.body.week);
    const planIndex = mealPlans.plans.findIndex(
        (p) => p.userId === req.session.user.email && new Date(p.week).getTime() === weekDate.getTime()
    );

    if (planIndex >= 0) {
        mealPlans.plans[planIndex].plan = req.body.plan;
    } else {
        mealPlans.plans.push({
            userId: req.session.user.email,
            week: weekDate.toISOString(),
            plan: req.body.plan,
        });
    }

    fs.writeFileSync(mealPlansFile, JSON.stringify(mealPlans, null, 2));
    res.json({ success: true });
});

// Reviews routes
app.get("/api/recipes/:id/reviews", requireLogin, (req, res) => {
    const reviews = require("./data/reviews.json");
    const recipeReviews = reviews.reviews.filter((r) => r.recipeId === req.params.id);
    res.json(recipeReviews);
});

app.post("/api/recipes/:id/reviews", requireLogin, (req, res) => {
    const fs = require("fs");
    const reviewsFile = "./data/reviews.json";
    const reviews = require(reviewsFile);

    const newReview = {
        id: Date.now().toString(),
        recipeId: req.params.id,
        userId: req.session.user.email,
        username: req.session.user.username,
        rating: parseInt(req.body.rating),
        comment: req.body.comment,
        date: new Date().toISOString(),
    };

    reviews.reviews.push(newReview);
    fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));

    // Update recipe average rating
    updateRecipeRating(req.params.id);

    res.json(newReview);
});

function updateRecipeRating(recipeId) {
    const fs = require("fs");
    const reviews = require("./data/reviews.json");
    const recipes = require("./data/recipes.json");

    const recipeReviews = reviews.reviews.filter((r) => r.recipeId === recipeId);
    const avgRating = recipeReviews.reduce((sum, r) => sum + r.rating, 0) / recipeReviews.length;

    const recipe = recipes.recipes.find((r) => r.id === recipeId);
    if (recipe) {
        recipe.rating = avgRating;
        fs.writeFileSync("./data/recipes.json", JSON.stringify(recipes, null, 2));
    }
}
// Add recipe route
app.post('/api/recipes', requireLogin, upload.single('image'), (req, res) => {
    try {
        const recipesPath = path.join(__dirname, 'data', 'recipes.json');
        let recipes = { recipes: [] };

        if (fs.existsSync(recipesPath)) {
            const fileContent = fs.readFileSync(recipesPath, 'utf8');
            recipes = JSON.parse(fileContent);
        }

        const newRecipe = {
            id: Date.now().toString(),
            ...req.body,
            ingredients: JSON.parse(req.body.ingredients),
            instructions: JSON.parse(req.body.instructions),
            image: req.file ? `/uploads/${req.file.filename}` : '/images/default-recipe.jpg',
            author: req.session.user.username,
            authorId: req.session.user.email,
            createdAt: new Date().toISOString(),
            ratings: [],
            comments: []
        };

        recipes.recipes.push(newRecipe);
        fs.writeFileSync(recipesPath, JSON.stringify(recipes, null, 2));

        res.json({ success: true, recipe: newRecipe });
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).json({ success: false, message: 'Failed to add recipe' });
    }
});

// 404 Error Handler - Catch all undefined routes
app.use((req, res) => {
    res.status(404).render("404", { url: req.originalUrl });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res
        .status(500)
        .render("error", { message: "Something went wrong on our end. Please try again later." });
});