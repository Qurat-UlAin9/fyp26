const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { habitFields } = require('../models/schemas');
module.exports = createUserCrudRouter({ table: 'habits', allowedInsert: habitFields, allowedUpdate: habitFields });
