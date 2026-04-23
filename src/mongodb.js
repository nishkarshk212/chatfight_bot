const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Define schemas
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, default: null },
  first_name: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

const groupSettingsSchema = new mongoose.Schema({
  group_id: { type: Number, required: true, unique: true },
  language: { type: String, default: 'EN' },
  daily_report: { type: Number, default: 0 },
  count_media: { type: Number, default: 1 },
  show_propic: { type: Number, default: 0 },
  show_chart: { type: Number, default: 1 },
  notifications: { type: Number, default: 1 },
  weekly_report: { type: Number, default: 0 },
  profile_view: { type: String, default: 'text_only' },
  objectives_rate: { type: Number, default: 500 },
  objectives_text: { type: String, default: 'default' },
  hangman_enabled: { type: Number, default: 0 },
  fast_typing_enabled: { type: Number, default: 0 },
  auto_delete_commands: { type: Number, default: 1 }
});

const statSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  group_id: { type: Number, required: true },
  date: { type: String, required: true },
  count: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Add compound index for better query performance
statSchema.index({ user_id: 1, group_id: 1, date: 1 }, { unique: true });

const dailyMilestoneSchema = new mongoose.Schema({
  group_id: { type: Number, required: true },
  date: { type: String, required: true },
  milestone_500: { type: Number, default: 0 },
  milestone_1000: { type: Number, default: 0 },
  milestone_1500: { type: Number, default: 0 }
}, {
  timestamps: true
});

dailyMilestoneSchema.index({ group_id: 1, date: 1 }, { unique: true });

// Create models
const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);
const GroupSettings = mongoose.model('GroupSettings', groupSettingsSchema);
const Stat = mongoose.model('Stat', statSchema);
const DailyMilestone = mongoose.model('DailyMilestone', dailyMilestoneSchema);

module.exports = {
  connectDB,
  models: {
    User,
    Group,
    GroupSettings,
    Stat,
    DailyMilestone
  }
};
