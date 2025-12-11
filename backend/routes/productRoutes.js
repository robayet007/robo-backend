import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const router = express.Router();

// ==================== GET ROUTES ====================

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ price: 1 });
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ 
      id: req.params.id,
      isActive: true 
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const products = await Product.find({ 
      categoryId,
      isActive: true 
    }).sort({ price: 1 });
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// ==================== POST ROUTES ====================

// Seed initial data (one-time use)
router.post('/seed', async (req, res) => {
  try {
    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    
    // Default categories
    const defaultCategories = [
      { id: 'c1', name: 'Diamond TopUp', badge: 'Free Fire', description: 'Fast delivery' },
      { id: 'c2', name: 'Weekly & Monthly', badge: 'Pass', description: 'Membership packs' },
      { id: 'c3', name: 'Special Deals', badge: 'Limited', description: 'Best offers' },
    ];
    
    // Default products
    const defaultProducts = [
      { id: 'p1', categoryId: 'c1', categoryName: 'Diamond TopUp', name: '50 Diamond', diamonds: 50, price: 45, tag: 'Hot' },
      { id: 'p2', categoryId: 'c1', categoryName: 'Diamond TopUp', name: '240 Diamond', diamonds: 240, price: 185, bonus: '+10 bonus' },
      { id: 'p3', categoryId: 'c1', categoryName: 'Diamond TopUp', name: '560 Diamond', diamonds: 560, price: 430, tag: 'Best value' },
      { id: 'p4', categoryId: 'c1', categoryName: 'Diamond TopUp', name: '1120 Diamond', diamonds: 1120, price: 780, bonus: '+60 bonus' },
      { id: 'p5', categoryId: 'c2', categoryName: 'Weekly & Monthly', name: 'Weekly Membership', diamonds: 0, price: 160, tag: 'Weekly' },
      { id: 'p6', categoryId: 'c2', categoryName: 'Weekly & Monthly', name: 'Monthly Membership', diamonds: 0, price: 750, tag: 'Monthly' },
      { id: 'p7', categoryId: 'c3', categoryName: 'Special Deals', name: 'Level Up Pass', diamonds: 0, price: 349, bonus: 'Exclusive' },
    ];
    
    // Insert categories
    const categories = await Category.insertMany(defaultCategories);
    
    // Insert products
    const products = await Product.insertMany(defaultProducts);
    
    res.status(201).json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        categories: categories.length,
        products: products.length
      }
    });
    
  } catch (error) {
    console.error('Seed database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed database'
    });
  }
});

// Create Category (POST)
router.post('/categories', async (req, res) => {
  try {
    const { id, name, description, badge } = req.body;
    
    // Validation
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and Name are required'
      });
    }
    
    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      $or: [{ id }, { name }] 
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }
    
    // Create new category
    const category = new Category({
      id,
      name,
      description: description || '',
      badge: badge || '',
      isActive: true
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
    
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// Create Product (POST)
router.post('/', async (req, res) => {
  try {
    const { id, categoryId, name, diamonds, price, bonus, tag } = req.body;
    
    // Validation
    if (!id || !categoryId || !name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, Category ID, Name and Price are required'
      });
    }
    
    // Check if product already exists
    const existingProduct = await Product.findOne({ id });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product ID already exists'
      });
    }
    
    // Get category name
    const category = await Category.findOne({ id: categoryId });
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Create new product
    const product = new Product({
      id,
      categoryId,
      categoryName: category.name,
      name,
      diamonds: diamonds || 0,
      price,
      bonus: bonus || '',
      tag: tag || '',
      isActive: true
    });
    
    await product.save();
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
});

// ==================== PUT ROUTES ====================

// Update Category (PUT)
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params; // Category ID from URL
    const updateData = req.body;
    
    // Find and update category
    const category = await Category.findOneAndUpdate(
      { id }, // Find by id field (not _id)
      { 
        ...updateData, 
        updatedAt: new Date() 
      },
      { new: true } // Return updated document
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
    
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// Update Product (PUT)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // If categoryId is being updated, get new category name
    if (updateData.categoryId) {
      const category = await Category.findOne({ id: updateData.categoryId });
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found'
        });
      }
      updateData.categoryName = category.name;
    }
    
    const product = await Product.findOneAndUpdate(
      { id },
      { 
        ...updateData, 
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// ==================== DELETE ROUTES ====================

// Delete Category (DELETE)
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete - set isActive to false
    const category = await Category.findOneAndUpdate(
      { id },
      { 
        isActive: false, 
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

// Delete Product (DELETE)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findOneAndUpdate(
      { id },
      { 
        isActive: false, 
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

export default router;