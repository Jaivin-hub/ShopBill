const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');

const crypto = require('crypto');



const UserSchema = new mongoose.Schema({

    email: { type: String, required: true, unique: true, trim: true, lowercase: true },

    password: { type: String, required: false },

    phone: { type: String, trim: true },


    role: { type: String, enum: ['superadmin', 'owner', 'Manager', 'Cashier'], required: true },


    shopId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: true

    },


    shopName: {

        type: String,

        trim: true

    },


    isActive: {

        type: Boolean,

        default: true

    },



    resetPasswordToken: String,

    resetPasswordExpire: Date,


    plan: { type: String, enum: ['BASIC', 'PRO', 'PREMIUM'], default: null },

    // transactionId holds the current ACTIVE Razorpay Subscription ID

    transactionId: String,


    planEndDate: { type: Date, default: null },

    subscriptionStatus: { type: String, default: null },


    // NOTE: The temporary 'pendingTransactionId' field is intentionally removed/excluded

    // as the plan change verification now uses the secure User ID stored in Razorpay notes.



}, { timestamps: true });



// Pre-save hook to hash password before saving

UserSchema.pre('save', async function (next) {

    if (this.isModified('password') && this.password) {

        const salt = await bcrypt.genSalt(10);

        this.password = await bcrypt.hash(this.password, salt);

    }

    next();

});



// Instance methods

UserSchema.methods.getResetPasswordToken = function () {

    const resetToken = crypto.randomBytes(32).toString('hex');



    this.resetPasswordToken = crypto

        .createHash('sha256')

        .update(resetToken)

        .digest('hex');



    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;



    return resetToken;

};



UserSchema.methods.matchPassword = async function (enteredPassword) {

    return await bcrypt.compare(enteredPassword, this.password);

};



module.exports = mongoose.model('User', UserSchema);