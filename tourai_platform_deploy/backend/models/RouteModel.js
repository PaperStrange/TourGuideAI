const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for travel route data
 */
const RouteSchema = new Schema(
  {
    route_name: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    destination: { type: String, required: true },
    duration: { type: String, required: true },
    overview: { type: String, required: true },
    highlights: [{ type: String }],
    daily_itinerary: [
      {
        day_title: { type: String, required: true },
        description: { type: String },
        activities: [
          {
            name: { type: String, required: true },
            description: { type: String },
            time: { type: String },
            location: {
              lat: { type: Number },
              lng: { type: Number },
              address: { type: String }
            }
          }
        ]
      }
    ],
    estimated_costs: { type: Map, of: String },
    poi_data: [{ type: Object }],
    accommodation_options: [{ type: Object }],
    transportation_options: [{ type: String }],
    creation_date: { type: Date, default: Date.now },
    last_modified: { type: Date, default: Date.now },
    is_public: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    is_favorite: { type: Boolean, default: false },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

// Static methods
RouteSchema.statics = {
  /**
   * Find a route by ID
   * @param {string} id - Route ID
   * @returns {Promise<Object>} - Route object
   */
  findById(id) {
    return this.findOne({ _id: id, is_deleted: false }).exec();
  },

  /**
   * Find and update a route
   * @param {string} id - Route ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object>} - Updated route
   */
  findByIdAndUpdate(id, updates) {
    return this.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { ...updates, last_modified: Date.now() },
      { new: true }
    ).exec();
  },

  /**
   * Find routes by creator
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Routes created by user
   */
  findByCreator(userId) {
    return this.find({ creator: userId, is_deleted: false }).sort({ last_modified: -1 }).exec();
  },

  /**
   * Find public routes
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Public routes
   */
  findPublicRoutes(filters = {}) {
    const query = { is_public: true, is_deleted: false, ...filters };
    return this.find(query).sort({ creation_date: -1 }).exec();
  },

  /**
   * Soft delete a route
   * @param {string} id - Route ID
   * @returns {Promise<Boolean>} - Success status
   */
  softDelete(id) {
    return this.findOneAndUpdate(
      { _id: id },
      { is_deleted: true, last_modified: Date.now() }
    ).exec();
  }
};

const RouteModel = mongoose.model('Route', RouteSchema);

module.exports = { RouteModel }; 