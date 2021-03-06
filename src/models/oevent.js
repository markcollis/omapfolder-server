// Note: 'oevent' has been used in place of the more natural 'event'
// to avoid any potential confusion with event handlers
const mongoose = require('mongoose');
const validator = require('validator');

// define model for event (and associated map) information
const oeventSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  // only owner (or admin) can delete, but all users linked to maps can edit event level fields
  date: { type: String, index: true, required: true }, // ORIS Data.Date YYYY-MM-DD
  name: { type: String, trim: true, required: true }, // ORIS Data.Name
  orisId: { // CZE specific but essential to support as it will enable a lot of auto-population
    type: String, // ORIS Data.ID
    trim: true,
    index: { // want to force to be unique, but only if it exists...
      unique: true,
      partialFilterExpression: { orisId: { $type: 'string' } },
    },
  },
  organisedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'club' }],
  // ORIS Data.Org1.ID, Data.Org2.ID (corresponding to Club.orisId)
  linkedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'linkedevent' }],
  // ORIS Data.ParentID, Data.Stages, Data.Stage1-7 have relevant information
  // also Data.Level.ShortName = ET (multi-day wrapper)
  mapName: { type: String, trim: true }, // ORIS Data.Map
  locPlace: { type: String, trim: true }, // ORIS Data.Place (nearby town, etc.)
  locRegions: [{ type: String, trim: true }], // ORIS Data.Regions
  locCountry: { type: String, trim: true, validate: value => (value === '' || validator.isISO31661Alpha3(value)) },
  // not in ORIS but assume CZE if auto-populating from ORIS API
  locLat: { type: Number, min: -90, max: 90 }, // ORIS Data.GPSLat
  locLong: { type: Number, min: -180, max: 180 }, // ORIS Data.GPSLon
  // if not from ORIS, auto-populate from first geotagged map upload? or perhaps not needed?
  locCornerSW: [{ type: Number }],
  locCornerNW: [{ type: Number }],
  locCornerNE: [{ type: Number }],
  locCornerSE: [{ type: Number }],
  types: [{ // discipline labels, fixed set, need to support everything from ORIS
    // Front end will handle translation, store as English strings in db not ORIS abbreviations
    // ORIS Data.Discipline is one field, not an array, but can be combined with
    // Data.Sport.NameCZ/EN for SkiO, MTBO and TrailO.
    type: String,
    enum: [
      'Sprint', // ORIS SP Sprint Sprint
      'Middle', // ORIS KT Middle Krátká trať
      'Long', // ORIS KL Long Klasická trať
      'Ultra-Long', // ORIS DT Ultra-Long Dlouhá trať
      'Relay', // ORIS ST Relay Štafety
      'Night', // ORIS NOB Night Noční (not combined with distance in ORIS)
      'TempO', // ORIS TeO TempO TempO
      'Mass start', // ORIS MS Mass start Hromadný start
      'MTBO', // ORIS MTBO MTBO
      'SkiO', // ORIS LOB SkiO
      'TrailO', // ORIS TRAIL TrailO
      // ORIS S Training (event officials) Školení (ignore)
      // ORIS OB FootO (ignore)
      // ORIS ET Multi-stage Etapový (flag as eventLink wrapper instead...)
      'Score',
      'Spanish Score',
      'non-standard', // i.e. either training or an event with an unusual format (e.g. some EPOs)
    ],
  }],
  tags: [{ type: String, trim: true }], // free list, not to be translated
  // auto-populate from ORIS Data.Level.NameCZ but exclude some (E, ET, S, OST, ?)
  website: { type: String, trim: true, validate: value => (value === '' || validator.isURL(value)) },
  // ORIS Data.Links.Link_nnnn.Url where Link_nnnn.SourceType.ID = 13, NameCZ = Web zavodu
  // or perhaps a better default is the ORIS page for the event itself?
  results: { type: String, trim: true, validate: value => (value === '' || validator.isURL(value)) },
  // not in ORIS data, format is https://oris.orientacnisporty.cz/Vysledky?id=eventid
  // but only where the full details are stored in ORIS. For other races there is an
  // uploaded PDF, found in Data.Documents.Document_nnnn.Url with SourceType.ID = 4
  // whereas others have never had results uploaded at all...
  runners: [{ // constrain so that only the logged in user can add (not admin for others)
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    visibility: { // top level event is visible to all logged in users, unless there
      // is a public map beneath in which case it is visible to the public too
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
    // course details from ORIS getEvent Data.Classes.Class_nnnn.
    courseTitle: { type: String, trim: true }, // ORIS Name
    courseLength: { type: String, trim: true }, // ORIS Distance (km)
    courseClimb: { type: String, trim: true }, // ORIS Climbing (m)
    courseControls: { type: String, trim: true }, // ORIS Controls
    fullResults: [{ // parse and store full results from ORIS - allow manual entry too?
      // this would be nice to display under the map, but would anyone bother
      // entering manually? Possibly yes for training sessions, esp. with links to other users
      place: { type: String, trim: true }, // ORIS Place
      sort: { type: String, trim: true }, // ORIS Sort
      name: { type: String, trim: true }, // ORIS Name
      regNumber: { type: String, trim: true }, // ORIS RegNo
      clubShort: { type: String, trim: true }, // first three characters of RegNo
      club: { type: String, trim: true }, // ORIS ClubNameResults
      time: { type: String, trim: true }, // ORIS Time
      loss: { type: String, trim: true }, // ORIS Loss
      // compare against the set of userIds with associated maps whenever edited?
    }],
    splitTimes: { type: Object }, // placeholder for future use, detailed structure TBD
    // performance fields all optional, enables detailed info to be captured if the user wants to
    // can be obtained if ORIS hosts results via getEventResults&eventid&classid
    // fields are defined to be compatible with ORIS, hence strings rather than numbers
    time: { type: String, trim: true }, // hhh:mm Data.Result_nnnnn.Time [UserID=orisId]
    place: { type: String, trim: true }, // Data.Result_nnnn.Place
    timeBehind: { type: String, trim: true }, // Data.Result_nnnn.Loss
    fieldSize: { type: String, trim: true }, // can work out from ORIS result set length
    tags: [{ type: String, trim: true }], // user-defined tags associated with map rather than event
    maps: [{ // one or more set, referred to by title
      title: { type: String, trim: true, default: 'map' }, // label e.g. 'part 1'
      course: { type: String, trim: true }, // URL for course map
      route: { type: String, trim: true }, // URL for course map with route marked
      overlay: { type: String, trim: true }, // URL for route overlay
      courseUpdated: { type: String, trim: true }, // strings derived from time to avoid browser
      routeUpdated: { type: String, trim: true }, // cache issues when updating an image file
      overlayUpdated: { type: String, trim: true },
      // thumbnail and extract are auto-generated each time another map is uploaded and
      // don't need their own field, just append '-thumb' or '-extract' to course/route
      // thumbnail: { type: String, trim: true }, // URL for thumbnail of whole map (200 x 200)
      // extract: { type: String, trim: true }, // URL for map extract (600 x 200?)
      isGeocoded: { type: Boolean, default: false }, // i.e. is there anything to find in 'geo'
      geo: { // information to be extracted from QR jpg on upload; only centre/corners set manually
        track: { type: Array }, // array of [lat, long] points *not easy to validate array format*
        distanceRun: { type: String, trim: true }, // actual km - from GPS track
        mapCentre: {
          lat: { type: Number, min: -90, max: 90 },
          long: { type: Number, min: -180, max: 180 },
        },
        mapCorners: {
          sw: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
          nw: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
          ne: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
          se: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
        },
        imageCorners: {
          sw: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
          nw: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
          ne: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
          se: {
            lat: { type: Number, min: -90, max: 90 },
            long: { type: Number, min: -180, max: 180 },
          },
        },
        locationSizePixels: {
          x: { type: Number, min: 0 },
          y: { type: Number, min: 0 },
          width: { type: Number, min: 0 },
          height: { type: Number, min: 0 },
        },
      },
    }],
    comments: [{
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      text: { type: String, trim: true, required: true },
      postedAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    }],
  }],
  active: { type: Boolean, default: true }, // set to false on 'deletion', recovery in db only
}, { timestamps: true });

// create model class
const ModelClass = mongoose.model('oevent', oeventSchema);

// export model
module.exports = ModelClass;
