const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const BillDraft = require('../models/BillDraft');

const router = express.Router();
const MAX_DRAFTS_PER_STORE = 60;
const MAX_ITEMS_PER_DRAFT = 100;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function normalizeLines(bodyItems) {
    if (!Array.isArray(bodyItems) || bodyItems.length === 0) return null;
    if (bodyItems.length > MAX_ITEMS_PER_DRAFT) return { error: `Too many line items (max ${MAX_ITEMS_PER_DRAFT}).` };
    const lines = [];
    for (const item of bodyItems) {
        const rawId = item.itemId ?? item._id ?? item.productId ?? item.id;
        const itemId = rawId != null ? String(rawId).trim() : '';
        if (!itemId || !isValidObjectId(itemId)) continue;
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const price = Math.max(0, Number(item.price) || 0);
        lines.push({
            itemId,
            name: String(item.name || 'Item').slice(0, 500),
            quantity: qty,
            price,
            originalPrice: item.originalPrice != null ? Math.max(0, Number(item.originalPrice)) : price,
            discountAmount: Math.max(0, Number(item.discountAmount) || 0),
            appliedOfferId: item.appliedOfferId && isValidObjectId(String(item.appliedOfferId)) ? item.appliedOfferId : null,
            appliedOfferTitle: String(item.appliedOfferTitle || '').slice(0, 200),
            variantId: item.variantId && isValidObjectId(String(item.variantId)) ? item.variantId : null,
            variantLabel: String(item.variantLabel || '').slice(0, 120),
            variantSize: String(item.variantSize || '').slice(0, 80),
            variantColor: String(item.variantColor || '').slice(0, 80),
        });
    }
    if (lines.length === 0) return { error: 'No valid line items.' };
    return { lines };
}

// List drafts for current outlet
router.get('/', protect, async (req, res) => {
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected.' });
    }
    try {
        const drafts = await BillDraft.find({ storeId: req.user.storeId })
            .sort({ updatedAt: -1 })
            .limit(MAX_DRAFTS_PER_STORE)
            .lean();
        res.json({ success: true, drafts });
    } catch (e) {
        console.error('BillDraft list error:', e);
        res.status(500).json({ error: 'Failed to load drafts.' });
    }
});

// Single draft
router.get('/:id', protect, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid draft id.' });
    }
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected.' });
    }
    try {
        const draft = await BillDraft.findOne({ _id: req.params.id, storeId: req.user.storeId }).lean();
        if (!draft) return res.status(404).json({ error: 'Draft not found.' });
        res.json({ success: true, draft });
    } catch (e) {
        console.error('BillDraft get error:', e);
        res.status(500).json({ error: 'Failed to load draft.' });
    }
});

router.post('/', protect, async (req, res) => {
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected.' });
    }
    const normalized = normalizeLines(req.body.items);
    if (normalized?.error) return res.status(400).json({ error: normalized.error });
    const { lines } = normalized;

    const totalBody = Number(req.body.totalAmount);
    const computed = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const totalAmount = Number.isFinite(totalBody) && totalBody >= 0 ? totalBody : computed;

    let customerId = req.body.customerId && isValidObjectId(String(req.body.customerId)) ? req.body.customerId : null;
    const customerName = String(req.body.customerName || '').slice(0, 200);
    let label = String(req.body.label || '').trim().slice(0, 120);
    if (!label) {
        const first = lines[0]?.name || 'Bill';
        label = `${first.slice(0, 40)}${lines.length > 1 ? ` +${lines.length - 1}` : ''}`;
    }

    try {
        const count = await BillDraft.countDocuments({ storeId: req.user.storeId });
        if (count >= MAX_DRAFTS_PER_STORE) {
            return res.status(400).json({
                error: `Maximum ${MAX_DRAFTS_PER_STORE} drafts reached. Delete an old draft first.`,
            });
        }

        const draft = await BillDraft.create({
            storeId: req.user.storeId,
            createdBy: req.user._id,
            label,
            customerId,
            customerName,
            totalAmount,
            items: lines,
        });
        res.status(201).json({ success: true, draft });
    } catch (e) {
        console.error('BillDraft create error:', e);
        res.status(500).json({ error: 'Failed to save draft.' });
    }
});

router.put('/:id', protect, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid draft id.' });
    }
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected.' });
    }
    const normalized = normalizeLines(req.body.items);
    if (normalized?.error) return res.status(400).json({ error: normalized.error });
    const { lines } = normalized;

    const totalBody = Number(req.body.totalAmount);
    const computed = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const totalAmount = Number.isFinite(totalBody) && totalBody >= 0 ? totalBody : computed;

    let customerId = req.body.customerId && isValidObjectId(String(req.body.customerId)) ? req.body.customerId : null;
    const customerName = String(req.body.customerName || '').slice(0, 200);
    let label = String(req.body.label || '').trim().slice(0, 120);

    try {
        const draft = await BillDraft.findOne({ _id: req.params.id, storeId: req.user.storeId });
        if (!draft) return res.status(404).json({ error: 'Draft not found.' });

        draft.items = lines;
        draft.totalAmount = totalAmount;
        draft.customerId = customerId;
        draft.customerName = customerName;
        if (label) draft.label = label;
        await draft.save();

        res.json({ success: true, draft });
    } catch (e) {
        console.error('BillDraft update error:', e);
        res.status(500).json({ error: 'Failed to update draft.' });
    }
});

router.delete('/:id', protect, async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid draft id.' });
    }
    if (!req.user.storeId) {
        return res.status(400).json({ error: 'No active outlet selected.' });
    }
    try {
        const result = await BillDraft.deleteOne({ _id: req.params.id, storeId: req.user.storeId });
        // Idempotent: already deleted or never existed for this outlet
        if (result.deletedCount === 0) {
            return res.json({ success: true, alreadyDeleted: true });
        }
        res.json({ success: true });
    } catch (e) {
        console.error('BillDraft delete error:', e);
        res.status(500).json({ error: 'Failed to delete draft.' });
    }
});

module.exports = router;
