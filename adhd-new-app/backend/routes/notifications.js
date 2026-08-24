const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { notificationFields } = require('../models/schemas');
module.exports = createUserCrudRouter({ table: 'notifications', allowedInsert: notificationFields, allowedUpdate: notificationFields, defaultOrder: 'scheduled_at' });
