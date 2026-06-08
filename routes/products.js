const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

// GET /api/products — list with search, filter, sort, pagination
router.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = "-createdAt",
      page = 1,
      limit = 12,
      featured
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    if (category) query.category = category;
    if (featured === "true") query.featured = true;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "reviews.user",
      "name avatar"
    );
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found." });

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products — admin only
router.post(
  "/",
  protect,
  adminOnly,
  [
    body("name").notEmpty().withMessage("Name required"),
    body("price").isNumeric().withMessage("Price must be a number"),
    body("stock").isInt({ min: 0 }).withMessage("Stock must be non-negative integer"),
    body("category").notEmpty().withMessage("Category required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const product = await Product.create(req.body);
      res.status(201).json({ success: true, product });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/products/:id — admin only
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id — admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found." });
    res.json({ success: true, message: "Product deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/:id/reviews
router.post(
  "/:id/reviews",
  protect,
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
    body("comment").notEmpty().withMessage("Comment required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const product = await Product.findById(req.params.id);
      if (!product)
        return res.status(404).json({ success: false, message: "Product not found." });

      const alreadyReviewed = product.reviews.some(
        (r) => r.user.toString() === req.user._id.toString()
      );
      if (alreadyReviewed)
        return res.status(400).json({ success: false, message: "Already reviewed." });

      product.reviews.push({
        user: req.user._id,
        name: req.user.name,
        rating: req.body.rating,
        comment: req.body.comment
      });

      product.updateRating();
      await product.save();

      res.status(201).json({ success: true, message: "Review added." });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/products/seed — dev only
router.post("/seed/init", async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = await Product.insertMany([
      {
        name: "MacBook Pro M3",
        description: "Apple MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Lightning fast performance.",
        price: 189900,
        originalPrice: 210000,
        image: "https://placehold.co/400x300/0f172a/38bdf8?text=MacBook+Pro",
        category: "Electronics",
        brand: "Apple",
        stock: 15,
        featured: true,
        tags: ["laptop", "apple", "macbook"]
      },
      {
        name: "Samsung Galaxy S24",
        description: "Latest Samsung flagship with 200MP camera, AI features, and stunning AMOLED display.",
        price: 79999,
        originalPrice: 89999,
        image: "https://placehold.co/400x300/0f172a/a78bfa?text=Galaxy+S24",
        category: "Electronics",
        brand: "Samsung",
        stock: 30,
        featured: true,
        tags: ["phone", "samsung", "5g"]
      },
      {
        name: "Sony WH-1000XM5",
        description: "Industry-leading noise cancelling headphones with 30-hour battery and premium sound.",
        price: 24990,
        originalPrice: 34990,
        image: "https://placehold.co/400x300/0f172a/4ade80?text=Sony+WH1000XM5",
        category: "Electronics",
        brand: "Sony",
        stock: 50,
        tags: ["headphones", "sony", "wireless"]
      },
      {
        name: "Nike Air Max 270",
        description: "Iconic Air Max cushioning meets a bold upper design. Ultimate comfort for all-day wear.",
        price: 9995,
        originalPrice: 12999,
        image: "https://placehold.co/400x300/0f172a/fb923c?text=Nike+Air+Max",
        category: "Sports",
        brand: "Nike",
        stock: 100,
        featured: true,
        tags: ["shoes", "nike", "running"]
      },
      {
        name: "Atomic Habits",
        description: "James Clear's bestselling guide to building good habits and breaking bad ones.",
        price: 499,
        originalPrice: 799,
        image: "https://placehold.co/400x300/0f172a/f472b6?text=Atomic+Habits",
        category: "Books",
        brand: "Penguin",
        stock: 200,
        tags: ["book", "self-help", "habits"]
      },
      {
        name: "Dyson V15 Detect",
        description: "Most powerful cordless vacuum with laser dust detection and intelligent reporting.",
        price: 54900,
        image: "https://placehold.co/400x300/0f172a/facc15?text=Dyson+V15",
        category: "Home",
        brand: "Dyson",
        stock: 20,
        tags: ["vacuum", "dyson", "home"]
      }
    ]);

    res.json({ success: true, message: `${products.length} products seeded.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
