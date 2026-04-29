const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Offer = require('../models/Offer');
const Inventory = require('../models/Inventory');

const router = express.Router();

const canManageOffers = (role) => {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'owner' || normalized === 'manager';
};

const normalizeDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

router.get('/', protect, async (req, res) => {
  try {
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }
    const offers = await Offer.find({ storeId: req.user.storeId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ offers });
  } catch (error) {
    console.error('Offers GET error:', error);
    return res.status(500).json({ error: 'Failed to load offers.' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canManageOffers(req.user.role)) {
      return res.status(403).json({ error: 'Only owner or manager can create offers.' });
    }
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }

    const {
      title,
      description = '',
      offerType = 'custom',
      productId = null,
      discountType = 'percentage',
      discountValue,
      startDate,
      endDate,
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return res.status(400).json({ error: 'Offer title is required.' });

    const cleanOfferType = ['product', 'all_products', 'custom'].includes(offerType) ? offerType : null;
    if (!cleanOfferType) return res.status(400).json({ error: 'Invalid offer type.' });

    const cleanDiscountType = ['percentage', 'flat'].includes(discountType) ? discountType : null;
    if (!cleanDiscountType) return res.status(400).json({ error: 'Invalid discount type.' });

    const cleanDiscountValue = Number(discountValue);
    if (!Number.isFinite(cleanDiscountValue) || cleanDiscountValue <= 0) {
      return res.status(400).json({ error: 'Discount value must be greater than zero.' });
    }

    if (cleanDiscountType === 'percentage' && cleanDiscountValue > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100.' });
    }

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    if (!start || !end) return res.status(400).json({ error: 'Start and end dates are required.' });
    if (end < start) return res.status(400).json({ error: 'End date must be after start date.' });

    let selectedProductId = null;
    let selectedProductName = '';
    if (cleanOfferType === 'product') {
      if (!productId) return res.status(400).json({ error: 'Product is required for individual product offer.' });
      const product = await Inventory.findOne({ _id: productId, storeId: req.user.storeId }).select('name').lean();
      if (!product) return res.status(404).json({ error: 'Selected product not found in this outlet.' });
      selectedProductId = productId;
      selectedProductName = product.name || '';
    }

    const created = await Offer.create({
      storeId: req.user.storeId,
      createdBy: req.user._id,
      title: cleanTitle,
      description: String(description || '').trim(),
      offerType: cleanOfferType,
      productId: selectedProductId,
      productName: selectedProductName,
      discountType: cleanDiscountType,
      discountValue: cleanDiscountValue,
      startDate: start,
      endDate: end,
      isActive: true,
    });

    return res.status(201).json({ offer: created });
  } catch (error) {
    console.error('Offers POST error:', error);
    return res.status(500).json({ error: 'Failed to create offer.' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canManageOffers(req.user.role)) {
      return res.status(403).json({ error: 'Only owner or manager can update offers.' });
    }
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }

    const offer = await Offer.findOne({ _id: req.params.id, storeId: req.user.storeId });
    if (!offer) return res.status(404).json({ error: 'Offer not found.' });

    const nextTitle = req.body?.title !== undefined ? String(req.body.title || '').trim() : offer.title;
    const nextDescription = req.body?.description !== undefined ? String(req.body.description || '').trim() : offer.description;
    const nextOfferType = req.body?.offerType || offer.offerType;
    const nextDiscountType = req.body?.discountType || offer.discountType;
    const nextDiscountValue = req.body?.discountValue !== undefined ? Number(req.body.discountValue) : offer.discountValue;
    const nextStart = req.body?.startDate ? normalizeDate(req.body.startDate) : offer.startDate;
    const nextEnd = req.body?.endDate ? normalizeDate(req.body.endDate) : offer.endDate;

    if (!nextTitle) return res.status(400).json({ error: 'Offer title is required.' });
    if (!['product', 'all_products', 'custom'].includes(nextOfferType)) return res.status(400).json({ error: 'Invalid offer type.' });
    if (!['percentage', 'flat'].includes(nextDiscountType)) return res.status(400).json({ error: 'Invalid discount type.' });
    if (!Number.isFinite(nextDiscountValue) || nextDiscountValue <= 0) return res.status(400).json({ error: 'Discount value must be greater than zero.' });
    if (nextDiscountType === 'percentage' && nextDiscountValue > 100) return res.status(400).json({ error: 'Percentage discount cannot exceed 100.' });
    if (!nextStart || !nextEnd) return res.status(400).json({ error: 'Start and end dates are required.' });
    if (nextEnd < nextStart) return res.status(400).json({ error: 'End date must be after start date.' });

    let nextProductId = null;
    let nextProductName = '';
    if (nextOfferType === 'product') {
      const incomingProductId = req.body?.productId || offer.productId;
      if (!incomingProductId) return res.status(400).json({ error: 'Product is required for individual product offer.' });
      const product = await Inventory.findOne({ _id: incomingProductId, storeId: req.user.storeId }).select('name').lean();
      if (!product) return res.status(404).json({ error: 'Selected product not found in this outlet.' });
      nextProductId = incomingProductId;
      nextProductName = product.name || '';
    }

    offer.title = nextTitle;
    offer.description = nextDescription;
    offer.offerType = nextOfferType;
    offer.productId = nextProductId;
    offer.productName = nextProductName;
    offer.discountType = nextDiscountType;
    offer.discountValue = nextDiscountValue;
    offer.startDate = nextStart;
    offer.endDate = nextEnd;
    if (req.body?.isActive !== undefined) offer.isActive = !!req.body.isActive;
    await offer.save();

    return res.json({ offer });
  } catch (error) {
    console.error('Offers PUT error:', error);
    return res.status(500).json({ error: 'Failed to update offer.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canManageOffers(req.user.role)) {
      return res.status(403).json({ error: 'Only owner or manager can delete offers.' });
    }
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }

    const deleted = await Offer.findOneAndDelete({ _id: req.params.id, storeId: req.user.storeId });
    if (!deleted) return res.status(404).json({ error: 'Offer not found.' });

    return res.json({ success: true });
  } catch (error) {
    console.error('Offers DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete offer.' });
  }
});

module.exports = router;
const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const Offer = require('../models/Offer');
const Inventory = require('../models/Inventory');

const router = express.Router();

router.get('/', protect, authorize('owner', 'Manager'), async (req, res) => {
  try {
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }
    const offers = await Offer.find({ storeId: req.user.storeId })
      .lean()
      .sort({ createdAt: -1 });
    return res.json({ offers });
  } catch (error) {
    console.error('Offers GET error:', error);
    return res.status(500).json({ error: 'Failed to load offers.' });
  }
});

router.post('/', protect, authorize('owner', 'Manager'), async (req, res) => {
  try {
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }

    const {
      title,
      description = '',
      offerType = 'custom',
      productId = null,
      discountType = 'percentage',
      discountValue,
      startDate,
      endDate,
    } = req.body || {};

    if (!String(title || '').trim()) {
      return res.status(400).json({ error: 'Offer title is required.' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required.' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: 'Invalid offer date range.' });
    }

    const numericDiscount = Number(discountValue);
    if (!Number.isFinite(numericDiscount) || numericDiscount < 0) {
      return res.status(400).json({ error: 'Invalid discount value.' });
    }
    if (discountType === 'percentage' && numericDiscount > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100.' });
    }

    let finalProductId = null;
    let finalProductName = '';
    if (offerType === 'product') {
      if (!productId) {
        return res.status(400).json({ error: 'Please select a product for this offer.' });
      }
      const product = await Inventory.findOne({ _id: productId, storeId: req.user.storeId }).select('name').lean();
      if (!product) {
        return res.status(404).json({ error: 'Selected product not found in this store.' });
      }
      finalProductId = productId;
      finalProductName = product.name || '';
    }

    const offer = await Offer.create({
      storeId: req.user.storeId,
      createdBy: req.user._id,
      title: String(title).trim(),
      description: String(description || '').trim(),
      offerType,
      productId: finalProductId,
      productName: finalProductName,
      discountType,
      discountValue: numericDiscount,
      startDate: start,
      endDate: end,
      isActive: true,
    });

    return res.status(201).json({ offer });
  } catch (error) {
    console.error('Offers POST error:', error);
    return res.status(500).json({ error: 'Failed to create offer.' });
  }
});

router.put('/:id', protect, authorize('owner', 'Manager'), async (req, res) => {
  try {
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.startDate || updates.endDate) {
      const existing = await Offer.findOne({ _id: id, storeId: req.user.storeId }).lean();
      if (!existing) return res.status(404).json({ error: 'Offer not found.' });
      const start = new Date(updates.startDate || existing.startDate);
      const end = new Date(updates.endDate || existing.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return res.status(400).json({ error: 'Invalid offer date range.' });
      }
      updates.startDate = start;
      updates.endDate = end;
    }

    if (updates.discountValue !== undefined) {
      const numericDiscount = Number(updates.discountValue);
      if (!Number.isFinite(numericDiscount) || numericDiscount < 0) {
        return res.status(400).json({ error: 'Invalid discount value.' });
      }
      updates.discountValue = numericDiscount;
    }

    const updated = await Offer.findOneAndUpdate(
      { _id: id, storeId: req.user.storeId },
      { $set: updates },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Offer not found.' });
    return res.json({ offer: updated });
  } catch (error) {
    console.error('Offers PUT error:', error);
    return res.status(500).json({ error: 'Failed to update offer.' });
  }
});

router.delete('/:id', protect, authorize('owner', 'Manager'), async (req, res) => {
  try {
    if (!req.user.storeId) {
      return res.status(400).json({ error: 'No active outlet selected.' });
    }
    const { id } = req.params;
    const deleted = await Offer.findOneAndDelete({ _id: id, storeId: req.user.storeId }).lean();
    if (!deleted) return res.status(404).json({ error: 'Offer not found.' });
    return res.json({ success: true });
  } catch (error) {
    console.error('Offers DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete offer.' });
  }
});

module.exports = router;
