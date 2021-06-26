const mongoose = require('mongoose');
const idValidator = require('mongoose-id-validator');
const convVie = require('../utils/convVie.js');

const ClubGroupMemberSchema = new mongoose.Schema({ 
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  role: {
    type: String,
    enum: ['collaborator','manager', 'member'],
    default: 'member',
  }
});

const clubGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A ClubGroup must have a name'],
      trim: true,
    },
    textSearch: {
      type: String,
      select: false,
    },
    description: {
      type: String,
      required: [true, 'A ClubGroup must have content'],
    },
    photo: {
      type: String,
      default() {
        return `https://via.placeholder.com/150?text=${this.name.charAt(0)}`;
      },
    },
    member: {
      type: [ClubGroupMemberSchema],
      select: false,
    },
    category: {
      type: String,
      enum: ['Học thuật','Tình nguyện', 'Phong trào', 'Văn nghệ', 'Main', 'Default'],
      default: 'Default',
    },
    isMain: {
      type: Boolean,
      default: false,
    },
    club: {
      type: mongoose.Schema.ObjectId,
      ref: 'Club',
      required: [true, 'ClubGroup must belong to an Club'],
    },
    createAt: {
      type: Date,
      default: Date.now(), // Mongoose will auto convert to today's date
    },
  },
  {
    toJSON: { virtuals: true }, // pass the virtuals properties to JSON
    toObject: { virtuals: true }, // --                        -- Object
  },
);


// mongo’s full-text search,
// we need to create indexes for the fields we need to search.
clubGroupSchema.index({textSearch: 'text'});

// Virtual populate for show up child referencing
// clubGroupSchema.virtual('clubGroupGroups', {
//   ref: 'ClubGroupGroup',
//   foreignField: 'clubGroup',
//   localField: '_id',
// });

clubGroupSchema.plugin(idValidator);

clubGroupSchema.pre('save',async function (next) {
  this.textSearch = convVie(this.name).toLowerCase();
  next();
});

clubGroupSchema.post('save', async function() {
  await this.model('Notification').create({
    content: `Your ClubGroup is created`,
    link: this._id,
    user: this.member[0].user
  })
});

// QUERY MIDDLEWARE - auto pupulate user in answer
clubGroupSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'member',
  //   select: '_id name photo', // just show name + photo and hide everything else for security
  // })
  // .populate({
  //   path: 'answers',
  //   select: '_id showcase'
  // });
  next();
});

// all middleware are trigger
clubGroupSchema.pre(
  /findOneAndUpdate|updateOne|update/ ,
  function(next) {
    const docUpdate = this.getUpdate();
    if (!docUpdate || !docUpdate.name) return next();
    this.findOneAndUpdate({}, { textSearch: convVie(docUpdate.name).toLowerCase() });
    return next();
});

clubGroupSchema.post(
  /findOneAndDelete|findOneAndRemove|deleteOne|remove/,
  { document: true },
  async function () {
    // await this.model('ClubGroupGroup').deleteMany({ clubGroup: this._id });
  },
);

const ClubGroup = mongoose.model('ClubGroup', clubGroupSchema);
module.exports = ClubGroup;
