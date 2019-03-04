const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const validator = require('validator');

// define model for user account data
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true, // force lowercase to avoid duplicates
    validate: value => validator.isEmail(value),
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['standard', 'admin', 'guest'], default: 'standard' },
  visibility: {
    type: String,
    required: true,
    enum: [
      'public', //  visible to anyone even if not logged in
      'all', //     visible to all logged in users (including guests)
      'club', //    visible to logged in users that are members of the same club
      'private', // only visible to the user concerned (and admin users)
    ],
    default: 'all',
  },
  displayName: { type: String, required: true, unique: true },
  fullName: { type: String },
  location: { type: String },
  about: { type: String },
  contact: { // can flesh out with others if desired later
    email: { type: String, validate: value => validator.isEmail(value) },
    // not necessarily the same as the ACCOUNT email, UI needs to be clear on this
    facebook: { type: String },
  },
  memberOf: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club' }],
  profileImage: { type: String }, // reference to file in /uploads/user/user_id/profile.jpg
}, { timestamps: true });

// on save hook, encrypt password
userSchema.pre('save', function hashPassword(next) { // run this before saving a model
  const user = this; // i.e. this instance
  bcrypt.genSalt(10, (err, salt) => { // generate salt then run callback
    if (err) return next(err);
    return bcrypt.hash(user.password, salt, null, (err2, hash) => { // encrypt then...
      if (err2) return next(err2); // ...run callback to overwrite unencrypted password
      user.password = hash;
      return next();
    });
  });
});

userSchema.methods.comparePassword = function compare(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return callback(err);
    return callback(null, isMatch);
  });
};

// create model class
const ModelClass = mongoose.model('user', userSchema);

// export model
module.exports = ModelClass;
