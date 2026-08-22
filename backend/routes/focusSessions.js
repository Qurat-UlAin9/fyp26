const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const { focusSessionFields } = require('../models/schemas');
module.exports = createUserCrudRouter({ table: 'focus_sessions', allowedInsert: focusSessionFields, allowedUpdate: focusSessionFields });
