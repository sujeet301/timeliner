// models/Task.js
const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => (Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()) : tags),
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    // Set automatically whenever status transitions to 'completed' (and
    // cleared if it's moved back), so analytics can chart real completion
    // trends instead of approximating from updatedAt.
    completedAt: {
      type: Date,
      default: null,
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },

    // Soft delete / trash support
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Supports the "search" part of GET /api/tasks?search=...
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Convenience: mark task completed and cascade to subtasks status if desired
taskSchema.methods.softDelete = function softDelete() {
  this.isDeleted = true;
  this.deletedAt = new Date();
};

taskSchema.methods.restore = function restore() {
  this.isDeleted = false;
  this.deletedAt = null;
};

module.exports = mongoose.model('Task', taskSchema);
