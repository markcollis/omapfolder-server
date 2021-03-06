// these functions validate not just that the parameters passed are the correct
// format for Mongodb ObjectIDs but actually exist in the relevant collection
// User IDs are always referenced singly, Club, Event and EventLink IDs as arrays.

const { ObjectID } = require('mongodb');
const User = require('../models/user');
const Club = require('../models/club');
const Event = require('../models/oevent');
const EventLink = require('../models/eventLink');
const logger = require('../services/logger');

// returns a Promise that resolves to an array of the valid IDs in the input array
const validateClubIds = (candidateClubIds) => {
  if (candidateClubIds.length === 0) return Promise.resolve([]);
  return Promise.all(candidateClubIds.map((clubId) => {
    if (ObjectID.isValid(clubId)) {
      return Club.find({ _id: clubId }).then((clubs) => {
        return (clubs[0]) ? clubs[0]._id : false;
      });
    }
    return false;
  })).then((valid) => {
    return valid.filter((id => id));
  }).catch((validateErr) => {
    logger('error')('Error validating club Ids:', validateErr.message);
  });
};

// returns a Promise that resolves to an array of the valid IDs in the input array
const validateEventIds = (candidateEventIds) => {
  if (candidateEventIds.length === 0) return Promise.resolve([]);
  return Promise.all(candidateEventIds.map((eventId) => {
    if (ObjectID.isValid(eventId)) {
      return Event.find({ _id: eventId }).then((events) => {
        return (events[0]) ? events[0]._id : false;
      });
    }
    return false;
  })).then((valid) => {
    return valid.filter((id => id));
  }).catch((validateErr) => {
    logger('error')('Error validating event Ids:', validateErr.message);
  });
};

// returns a Promise that resolves to an array of the valid IDs in the input array
const validateEventLinkIds = (candidateEventLinkIds) => {
  if (candidateEventLinkIds.length === 0) return Promise.resolve([]);
  return Promise.all(candidateEventLinkIds.map((eventLinkId) => {
    if (ObjectID.isValid(eventLinkId)) {
      return EventLink.find({ _id: eventLinkId }).then((eventLinks) => {
        return (eventLinks[0]) ? eventLinks[0]._id : false;
      });
    }
    return false;
  })).then((valid) => {
    return valid.filter((id => id));
  }).catch((validateErr) => {
    logger('error')('Error validating linked event Ids:', validateErr.message);
  });
};

// returns a Promise that resolves to true if the User ID is valid and false if not
const validateUserId = (candidateUserId) => {
  if (ObjectID.isValid(candidateUserId)) {
    return User.find({ _id: candidateUserId }).then((users) => {
      return !!users[0];
    }).then((valid) => {
      return valid;
    }).catch((validateErr) => {
      logger('error')('Error validating user Id:', validateErr.message);
    });
  }
  return Promise.resolve(false);
};

module.exports = {
  validateClubIds,
  validateEventIds,
  validateEventLinkIds,
  validateUserId,
};
