const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { taskFields } = require('../models/schemas');
module.exports = createUserCrudRouter({ table: 'tasks', allowedInsert: taskFields, allowedUpdate: taskFields });
