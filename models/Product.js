const mongoose=require('mongoose');
const { Schema } = mongoose; 
const productSchema = new mongoose.Schema({
  // Basic Information
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['books', 'electronics', 'jewelry', 'vehicles', 'other']
  },

  
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },

  
  startingPrice: {
    type: Number,
    required: true,
    min: 0.01
  },
  currentPrice: {
    type: Number,
    default: function() { return this.startingPrice; }
  },
 
  // Ownership
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'sold','unsold'],
    default: 'pending'
  },

  // Media
  images: [{
    url: { type: String, required: true },
    isPrimary: { type: Boolean, default: false }
  }],

  // Bids
   bids: [{
    bidder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    time: { type: Date, default: Date.now } 
  }]
}, { 
  timestamps: true 
});

// Auto-update currentPrice when bids change
// productSchema.pre('save', function(next) {
//   if (this.isModified('bids') && this.bids.length > 0) {
//     this.currentPrice = this.bids[this.bids.length - 1].amount;
//   }
//   next();
// });

module.exports = mongoose.model('Product', productSchema);