import mongoose from 'mongoose';

const collaborationSchema = new mongoose.Schema({
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'resourceType',
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['File', 'Folder'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessLevel: {
    type: String,
    enum: ['read', 'write', 'admin'],
    default: 'read',
  },
  invitationStatus: { // New field to track invitation status
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

const Collaboration = mongoose.model('Collaboration', collaborationSchema);

export default Collaboration;
