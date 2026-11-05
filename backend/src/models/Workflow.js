const mongoose = require('mongoose');

// Define the schema for storing workflow details in MongoDB.
const workflowSchema = new mongoose.Schema(
  {
    // Reference to the tenant who owns this workflow.
    // Used to maintain tenant-level data isolation.
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },

    // Name of the workflow.
    // This field is mandatory.
    name: { type: String, required: true },

    // Stores the workflow nodes (individual tasks or steps).
    // Defaults to an empty array when no nodes are provided.
    nodes: { type: Array, default: [] },

    // Stores the connections between workflow nodes.
    // Defaults to an empty array when no edges are provided.
    edges: { type: Array, default: [] },

    // Defines the current workflow status.
    // A workflow can either be in draft or active state.
    status: {
      type: String,
      enum: ['draft', 'active'],
      default: 'draft',
    },
  },

  // Automatically manages createdAt and updatedAt timestamps.
  { timestamps: true }
);

// Export the Workflow model for use in other application modules.
module.exports = mongoose.model('Workflow', workflowSchema);